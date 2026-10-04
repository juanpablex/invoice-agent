import type Anthropic from "@anthropic-ai/sdk";
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
assert(/rejected/.test(explainError({ status: 401 })), "errors are explained");
console.log("OK: invoice agent (fake model)");
