import type Anthropic from "@anthropic-ai/sdk";
import { runAccount, explainSampleError as explainAccountError, type SampleFn } from "../src/core/accountAgent";
import { runClaude, runScripted, toolParams, explainError, type LlmClient } from "../src/core/agent";
import { bookProposal, createLedger } from "../src/core/ledger";
import { SAMPLE_INVOICES } from "../src/core/samples";

/** Checks the agent loop and the approval rule with a fake model: no network, no key, no image. */
function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) {
    console.error(`FAIL: ${msg}`);
    process.exit(1);
  }
}
const usage = { input_tokens: 100, output_tokens: 20 };
const msg = (stop_reason: string, content: unknown[]) => ({ stop_reason, content, usage }) as unknown as Anthropic.Message;
const fake = (script: Anthropic.Message[]): LlmClient => ({ messages: { create: async () => { const n = script.shift(); if (!n) throw new Error("script ended"); return n; } } });
const img = { base64: "AAAA", mediaType: "image/png" as const };
const sample = SAMPLE_INVOICES[0]!.invoice;

assert(!toolParams.some((t) => /book|approve|decide/.test(t.name)), "no tool can book or approve");

{
  const l = createLedger();
  const before = l.expenses.length;
  const r = await runScripted(sample, l, () => {});
  assert(r.steps.map((s) => s.tool).join() === "lookup_vendor,check_duplicate,propose_expense", "scripted run uses the three tools in order");
  assert(r.proposal?.status === "pending" && l.expenses.length === before, "a proposal books nothing");
  assert(r.proposal.category === "Office supplies" && !r.proposal.duplicateOf, "known vendor gets its category");
  bookProposal(l, r.proposal.id);
  assert(l.expenses.length === before + 1 && l.expenses[0]!.invoiceNo === "NW-5611", "approval books exactly one expense");
}
{
  const l = createLedger();
  const dup = { ...SAMPLE_INVOICES[1]!.invoice }; // PC-88213 is already in the seed data
  const r = await runScripted(dup, l, () => {});
  assert(r.proposal?.duplicateOf === "EX-2", "a duplicate invoice is flagged on the proposal");
}
{
  const l = createLedger();
  const seen: string[] = [];
  const llm = fake([
    msg("tool_use", [{ type: "tool_use", id: "a", name: "lookup_vendor", input: { name: "Brightline Energy" } }]),
    msg("tool_use", [{ type: "tool_use", id: "b", name: "book_expense", input: {} }]),
    msg("tool_use", [{ type: "tool_use", id: "c", name: "propose_expense", input: { ...sample, category: "Utilities", total: 50 } }]),
  ]);
  const r = await runClaude(img, l, (s) => seen.push(s.tool + (s.ok ? "" : "!")), llm, "m");
  assert(seen.join() === "lookup_vendor,book_expense!,propose_expense", "an unknown tool is an error result, not an action");
  assert(r.proposal?.status === "pending" && l.expenses.length === 5, "the model can only propose");
  assert(r.usage?.calls === 3 && r.usage.inputTokens === 300, "usage is summed from the API");
}
{
  const r = await runClaude(img, createLedger(), () => {}, fake([msg("end_turn", [{ type: "text", text: "This is a cat photo." }])]), "m");
  assert(!r.proposal && /cat/.test(r.note ?? ""), "a non-invoice image gets an explanation and no proposal");
  const bad = await runClaude(img, createLedger(), () => {}, fake([msg("tool_use", [{ type: "tool_use", id: "x", name: "propose_expense", input: { ...sample, category: "Meals", total: -5 } }]), msg("end_turn", [{ type: "text", text: "Could not." }])]), "m");
  assert(!bad.proposal && bad.steps[0]?.ok === false, "an invalid total is rejected by the tool");
}
{
  const seen: Anthropic.MessageCreateParamsNonStreaming[] = [];
  const llm: LlmClient = { messages: { create: async (p) => { seen.push(p); return msg("end_turn", [{ type: "text", text: "ok" }]); } } };
  await runClaude({ base64: "JVBERi0=", mediaType: "application/pdf" }, createLedger(), () => {}, llm, "m");
  await runClaude(img, createLedger(), () => {}, llm, "m");
  const kind = (i: number) => ((seen[i]!.messages[0]!.content as { type: string }[])[0]!.type);
  assert(kind(0) === "document" && kind(1) === "image", "a PDF is sent as a document block and an image as an image block");
}
// Claude-account mode (Artifact `sample` capability), with a fake sample function
{
  const l = createLedger();
  let offered: string[] = [];
  let image: Blob | undefined;
  const fakeSample = Object.assign(
    async (_input: string, opts?: { tools?: { name: string; execute: (i: Record<string, unknown>) => unknown }[]; images?: Blob | Blob[] }) => {
      offered = (opts?.tools ?? []).map((t) => t.name);
      image = opts?.images as Blob;
      const run = (n: string, a: Record<string, unknown>) => opts!.tools!.find((t) => t.name === n)!.execute(a);
      run("lookup_vendor", { name: "Brightline Energy" });
      run("propose_expense", { ...sample, category: "Utilities" });
      return { text: "Prepared.", truncated: false };
    },
    { limits: async () => ({ tools: { maxCount: 10 }, images: { maxCount: 1, mediaTypes: ["image/png"] } }) },
  ) as unknown as SampleFn;
  const steps: string[] = [];
  const r = await runAccount(img, l, (s) => steps.push(s.tool), fakeSample, "quick");
  assert(r.proposal?.status === "pending" && l.expenses.length === 5, "account mode: the model can only propose");
  assert(offered.join() === "lookup_vendor,check_duplicate,propose_expense" && image instanceof Blob && image.type === "image/png", "account mode: the three tools and the image are sent");
  assert(steps.join() === "lookup_vendor,propose_expense", "account mode: steps are traced");
  let code = "";
  try { await runAccount({ base64: "AA", mediaType: "application/pdf" }, l, () => {}, fakeSample, "quick"); } catch (e) { code = (e as { code: string }).code; }
  assert(code === "images_unavailable" && /images/.test(explainAccountError({ code })), "account mode: PDFs are refused with a clear message");
  const noImages = Object.assign(fakeSample, { limits: async () => ({ tools: { maxCount: 10 } }) }) as SampleFn;
  code = "";
  try { await runAccount(img, l, () => {}, noImages, "quick"); } catch (e) { code = (e as { code: string }).code; }
  assert(code === "images_unavailable", "account mode: a viewer that cannot send images gets a clear message");
}
assert(/rejected/.test(explainError({ status: 401 })), "errors are explained");
console.log("OK: invoice agent (fake model)");
