import { runTool, TOOLS, type LedgerState } from "./ledger";
import type { AgentResult, ImageInput, OnStep } from "./agent";
import type { Proposal, TraceStep } from "./types";

/**
 * Real-model mode for the claude.ai Artifact: the page asks Claude through the viewer's own Claude account
 * (the `sample` capability), so no API key is involved and the viewer's own usage pays. The model gets the same
 * three tools as the API-key mode and no tool can book anything. Outside an Artifact `window.claude` does not
 * exist and this mode is simply unavailable. This capability reads images, not PDFs.
 */
export type Tier = "quick" | "default" | "complex";
export const TIERS: { id: Tier; label: string }[] = [
  { id: "quick", label: "Quick" },
  { id: "default", label: "Balanced" },
  { id: "complex", label: "Thorough" },
];

export interface SampleTool {
  name: string;
  description: string;
  inputSchema?: Record<string, unknown>;
  execute(input: Record<string, unknown>): unknown;
}
export interface SampleFn {
  (input: string, options?: { tools?: SampleTool[]; images?: Blob | Blob[]; modelTier?: Tier }): Promise<{ text: string; truncated: boolean }>;
  limits?: () => Promise<{ tools?: { maxCount: number }; images?: { maxCount: number; mediaTypes: string[] } }>;
}

let cached: Promise<SampleFn | null> | undefined;

/** Resolves the `sample` function, or null when this page is not running inside a Claude viewer. */
export function getSample(): Promise<SampleFn | null> {
  cached ??= (async () => {
    const c = (globalThis as unknown as { claude?: { use?: (name: string) => Promise<unknown> } }).claude;
    if (!c?.use) return null;
    try {
      return ((await c.use("sample")) as SampleFn | null) ?? null;
    } catch {
      return null;
    }
  })();
  return cached;
}

export function explainSampleError(err: unknown): string {
  const code = (err as { code?: string })?.code;
  switch (code) {
    case "not_granted": return "Claude was not allowed for this page. Allow it when the permission window appears to use the real model.";
    case "sampling_disabled": return "Claude is not available for this account or organization.";
    case "session_expired": return "Your Claude session expired. Sign in again and retry.";
    case "rate_limited": return "Claude usage limit reached. Wait a while and try again.";
    case "refused": return "The model declined to read that image.";
    case "empty_completion": return "The model gave no answer. Try another image.";
    case "tools_unavailable": return "This viewer cannot run the page's tools, so the real model cannot use them here.";
    case "images_unavailable": return "This viewer cannot send images to Claude, so the real model cannot read the invoice here.";
    case "image_rejected": return "Claude could not read that image. Try a different file (JPG, PNG, WebP or GIF).";
    default: return `Claude could not answer (${code ?? "unknown error"}). Try again.`;
  }
}

const INSTRUCTIONS =
  "You are an accounts-payable agent. The attached image is an invoice. Read it, then use the tools: look up the vendor, check for a duplicate, and finally call propose_expense once with the data you read and the best category. " +
  "propose_expense only creates a proposal that a person approves in the app, so never say the expense was booked. If the image is not an invoice or is unreadable, do not call propose_expense: explain briefly instead. Dates must be YYYY-MM-DD.";

const toBlob = (img: ImageInput): Blob => {
  const bin = atob(img.base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: img.mediaType });
};

/** Reads the invoice image through the viewer's Claude account and drives the same tools. */
export async function runAccount(image: ImageInput, ledger: LedgerState, onStep: OnStep, sample: SampleFn, tier: Tier): Promise<AgentResult> {
  if (image.mediaType === "application/pdf") throw Object.assign(new Error("pdf"), { code: "images_unavailable" });
  const limits = await sample.limits?.().catch(() => undefined);
  if (!limits?.tools) throw Object.assign(new Error("tools unavailable"), { code: "tools_unavailable" });
  if (!limits.images) throw Object.assign(new Error("images unavailable"), { code: "images_unavailable" });
  const steps: TraceStep[] = [];
  let proposal: Proposal | undefined;
  const tools: SampleTool[] = TOOLS.slice(0, limits.tools.maxCount).map((t) => ({
    name: t.name,
    description: t.description,
    inputSchema: t.input_schema as Record<string, unknown>,
    execute: (input) => {
      const started = Date.now();
      try {
        const out = runTool(ledger, t.name, input);
        if (t.name === "propose_expense") proposal = out as Proposal;
        const step: TraceStep = { tool: t.name, args: input, ok: true, ms: Date.now() - started, summary: JSON.stringify(out).slice(0, 120) };
        steps.push(step);
        onStep(step);
        return out;
      } catch (err) {
        const step: TraceStep = { tool: t.name, args: input, ok: false, ms: Date.now() - started, summary: err instanceof Error ? err.message : String(err) };
        steps.push(step);
        onStep(step);
        throw err;
      }
    },
  }));
  const { text } = await sample(INSTRUCTIONS, { tools, images: toBlob(image), modelTier: tier });
  return { steps, proposal, note: proposal ? undefined : text };
}
