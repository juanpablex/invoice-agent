import type Anthropic from "@anthropic-ai/sdk";
import { runTool, TOOLS, type LedgerState } from "./ledger";
import type { InvoiceData, Proposal, TraceStep } from "./types";

export const MODELS = [
  { id: "claude-haiku-4-5-20251001", label: "Haiku 4.5", note: "cheapest" },
  { id: "claude-sonnet-5-5", label: "Sonnet 5.5", note: "balanced" },
  { id: "claude-opus-5-5", label: "Opus 5.5", note: "most capable" },
] as const;
export const DEFAULT_MODEL: string = MODELS[0].id;

export interface AgentResult {
  steps: TraceStep[];
  proposal?: Proposal;
  note?: string;
  usage?: { model: string; calls: number; inputTokens: number; outputTokens: number };
}

export type OnStep = (step: TraceStep) => void;

async function call(ledger: LedgerState, steps: TraceStep[], onStep: OnStep, tool: string, args: Record<string, unknown>): Promise<unknown> {
  const t = Date.now();
  let step: TraceStep;
  try {
    const result = await runTool(ledger, tool, args);
    step = { tool, args, ok: true, ms: Date.now() - t, summary: JSON.stringify(result).slice(0, 120) };
    steps.push(step);
    onStep(step);
    return result;
  } catch (err) {
    step = { tool, args, ok: false, ms: Date.now() - t, summary: String(err instanceof Error ? err.message : err) };
    steps.push(step);
    onStep(step);
    throw err;
  }
}

const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Scripted mode: the extraction is canned for the bundled samples (no model, no image reading),
 * but the tool calls and the approval flow are the same ones a real model uses.
 */
export async function runScripted(invoice: InvoiceData, ledger: LedgerState, onStep: OnStep): Promise<AgentResult> {
  const steps: TraceStep[] = [];
  await pause(700); // pretend to read the document so the scanning animation is visible
  const vendor = (await call(ledger, steps, onStep, "lookup_vendor", { name: invoice.vendor })) as { category: string | null };
  await pause(350);
  await call(ledger, steps, onStep, "check_duplicate", { vendor: invoice.vendor, invoiceNo: invoice.invoiceNo });
  await pause(350);
  const proposal = (await call(ledger, steps, onStep, "propose_expense", { ...invoice, category: vendor.category ?? "Office supplies" })) as Proposal;
  return { steps, proposal };
}

const SYSTEM =
  "You are an accounts-payable agent. You receive an invoice as a photo or a PDF. Read it, then use the tools: look up the vendor, check for a duplicate, and finally call propose_expense once with the data you read and the best category. " +
  "propose_expense only creates a proposal that a person approves in the app, so never say the expense was booked. If the file is not an invoice or is unreadable, do not call propose_expense: explain briefly instead. Dates must be YYYY-MM-DD.";

/** The subset of the SDK the loop needs, so tests can pass a fake. */
export interface LlmClient {
  messages: { create(params: Anthropic.MessageCreateParamsNonStreaming): Promise<Anthropic.Message> };
}

export const toolParams: Anthropic.Tool[] = TOOLS.map((t) => ({ name: t.name, description: t.description, input_schema: t.input_schema as Anthropic.Tool.InputSchema }));

/** An invoice file for the model: an image or a PDF. */
export interface ImageInput {
  base64: string;
  mediaType: "image/png" | "image/jpeg" | "image/webp" | "image/gif" | "application/pdf";
}

const MAX_ITERATIONS = 6;

export function explainError(err: unknown): string {
  const status = (err as { status?: number })?.status;
  if (status === 401) return "The API key was rejected. Check that you pasted the whole key.";
  if (status === 403) return "This key is not allowed to use that model.";
  if (status === 404) return "That model was not found for this key. Pick another one in Settings.";
  if (status === 413) return "The file is too large. Try a smaller one.";
  if (status === 429) return "Rate limit reached. Wait a moment and try again.";
  if (status === 400 && /credit|balance/i.test(String((err as Error).message))) return "The account behind this key has no API credit left.";
  if (status === 529 || (status !== undefined && status >= 500)) return "The API is overloaded or unavailable. Try again shortly.";
  if (status === undefined) return "Could not reach the API. Check your connection.";
  const detail = status === 400 ? `: ${String((err as Error).message).slice(0, 160)}` : "";
  return `The API returned an error (${status})${detail}.`;
}

/** Real-model mode: a Claude model reads the image and drives the same tools. */
export async function runClaude(image: ImageInput, ledger: LedgerState, onStep: OnStep, llm: LlmClient, model: string): Promise<AgentResult> {
  const steps: TraceStep[] = [];
  const usage = { model, calls: 0, inputTokens: 0, outputTokens: 0 };
  const messages: Anthropic.MessageParam[] = [
    {
      role: "user",
      content: [
        image.mediaType === "application/pdf"
          ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: image.base64 } }
          : { type: "image", source: { type: "base64", media_type: image.mediaType, data: image.base64 } },
        { type: "text", text: "Process this invoice." },
      ],
    },
  ];
  let proposal: Proposal | undefined;
  let note: string | undefined;
  for (let i = 0; i < MAX_ITERATIONS && !proposal; i++) {
    const res = await llm.messages.create({ model, max_tokens: 2048, system: SYSTEM, tools: toolParams, messages });
    usage.calls += 1;
    usage.inputTokens += res.usage.input_tokens;
    usage.outputTokens += res.usage.output_tokens;
    messages.push({ role: "assistant", content: res.content });
    const text = res.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("\n").trim();
    if (res.stop_reason === "refusal") { note = "The model declined to process this image."; break; }
    if (res.stop_reason !== "tool_use") { note = text || "The model did not find an invoice in this image."; break; }
    const results: Anthropic.ToolResultBlockParam[] = [];
    for (const block of res.content) {
      if (block.type !== "tool_use") continue;
      try {
        const out = await call(ledger, steps, () => {}, block.name, (block.input ?? {}) as Record<string, unknown>);
        if (block.name === "propose_expense") proposal = out as Proposal;
        results.push({ type: "tool_result", tool_use_id: block.id, content: JSON.stringify(out) });
      } catch (err) {
        results.push({ type: "tool_result", tool_use_id: block.id, content: err instanceof Error ? err.message : String(err), is_error: true });
      }
      onStep(steps[steps.length - 1]!);
    }
    messages.push({ role: "user", content: results });
  }
  if (!proposal && !note) note = "I stopped after too many steps without a proposal.";
  return { steps, proposal, note, usage };
}
