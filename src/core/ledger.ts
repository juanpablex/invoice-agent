import type { Expense, InvoiceData, Proposal } from "./types";

export const CATEGORIES = ["Office supplies", "Utilities", "Shipping", "Meals", "Software"] as const;

/** Fictional vendors the agent can recognise. */
export const VENDORS: Record<string, string> = {
  "northwind paper co.": "Office supplies",
  "brightline energy": "Utilities",
  "harbor freight logistics": "Shipping",
  "fresh fields catering": "Meals",
  "pixel cloud hosting": "Software",
};

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);

export const seedExpenses = (): Expense[] => [
  { id: "EX-1", vendor: "Brightline Energy", invoiceNo: "BE-20417", date: daysAgo(3), category: "Utilities", total: 318.4 },
  { id: "EX-2", vendor: "Pixel Cloud Hosting", invoiceNo: "PC-88213", date: daysAgo(6), category: "Software", total: 129 },
  { id: "EX-3", vendor: "Fresh Fields Catering", invoiceNo: "FF-0932", date: daysAgo(9), category: "Meals", total: 212.75 },
  { id: "EX-4", vendor: "Northwind Paper Co.", invoiceNo: "NW-5530", date: daysAgo(14), category: "Office supplies", total: 86.2 },
  { id: "EX-5", vendor: "Harbor Freight Logistics", invoiceNo: "HF-7714", date: daysAgo(18), category: "Shipping", total: 540 },
];

export interface LedgerState {
  expenses: Expense[];
  proposals: Map<string, Proposal>;
  seq: number;
}

export const createLedger = (): LedgerState => ({ expenses: seedExpenses(), proposals: new Map(), seq: 1 });

const money = (n: number) => Math.round(n * 100) / 100;

export interface ToolSpec {
  name: string;
  description: string;
  input_schema: { type: "object"; properties: Record<string, unknown>; required: string[] };
  run: (ledger: LedgerState, args: Record<string, unknown>) => unknown;
}

const itemsSchema = {
  type: "array",
  items: {
    type: "object",
    properties: { description: { type: "string" }, qty: { type: "number" }, unit: { type: "number", description: "Unit price" } },
    required: ["description", "qty", "unit"],
  },
};

/**
 * Tools the agent may call. There is deliberately no tool that books an expense:
 * propose_expense only creates a pending proposal, and booking happens in the app
 * when a person swipes to approve.
 */
export const TOOLS: ToolSpec[] = [
  {
    name: "lookup_vendor",
    description: "Checks whether a vendor is already known and returns its default expense category.",
    input_schema: { type: "object", properties: { name: { type: "string", description: "Vendor name as printed on the invoice" } }, required: ["name"] },
    run: (_l, args) => {
      const category = VENDORS[String(args.name ?? "").trim().toLowerCase()];
      return category ? { known: true, category } : { known: false, category: null, categories: [...CATEGORIES] };
    },
  },
  {
    name: "check_duplicate",
    description: "Checks whether an invoice with the same vendor and invoice number was already booked.",
    input_schema: {
      type: "object",
      properties: { vendor: { type: "string" }, invoiceNo: { type: "string" } },
      required: ["vendor", "invoiceNo"],
    },
    run: (l, args) => {
      const hit = l.expenses.find((e) => e.vendor.toLowerCase() === String(args.vendor).toLowerCase() && e.invoiceNo === String(args.invoiceNo));
      return hit ? { duplicate: true, expenseId: hit.id } : { duplicate: false };
    },
  },
  {
    name: "propose_expense",
    description:
      "Proposes booking this invoice as an expense. It does NOT book anything: it creates a pending proposal that a person must approve in the app. Call it once, after looking up the vendor and checking for duplicates.",
    input_schema: {
      type: "object",
      properties: {
        vendor: { type: "string" },
        invoiceNo: { type: "string" },
        date: { type: "string", description: "YYYY-MM-DD" },
        currency: { type: "string", description: "ISO code such as USD" },
        items: itemsSchema,
        total: { type: "number" },
        category: { type: "string", enum: [...CATEGORIES] },
      },
      required: ["vendor", "invoiceNo", "date", "currency", "items", "total", "category"],
    },
    run: (l, args) => {
      const invoice: InvoiceData = {
        vendor: String(args.vendor),
        invoiceNo: String(args.invoiceNo),
        date: String(args.date),
        currency: String(args.currency ?? "USD"),
        items: (Array.isArray(args.items) ? args.items : []).map((i: any) => ({ description: String(i.description), qty: Number(i.qty), unit: Number(i.unit) })),
        total: money(Number(args.total)),
      };
      if (!Number.isFinite(invoice.total) || invoice.total <= 0) throw new Error("total must be a positive number");
      const dup = l.expenses.find((e) => e.vendor.toLowerCase() === invoice.vendor.toLowerCase() && e.invoiceNo === invoice.invoiceNo);
      const proposal: Proposal = { id: `PR-${l.seq++}`, invoice, category: String(args.category), duplicateOf: dup?.id, status: "pending" };
      l.proposals.set(proposal.id, proposal);
      return proposal;
    },
  },
];

export function runTool(ledger: LedgerState, name: string, args: Record<string, unknown>): unknown {
  const tool = TOOLS.find((t) => t.name === name);
  if (!tool) throw new Error(`Unknown tool: ${name}`);
  return tool.run(ledger, args);
}

/** The only write path. Called by the UI after a human decision, never by the agent. */
export function bookProposal(ledger: LedgerState, id: string): Expense {
  const p = ledger.proposals.get(id);
  if (!p) throw new Error(`Unknown proposal: ${id}`);
  const expense: Expense = { id: `EX-${ledger.expenses.length + 1}`, vendor: p.invoice.vendor, invoiceNo: p.invoice.invoiceNo, date: p.invoice.date, category: p.category, total: p.invoice.total };
  ledger.proposals.delete(id);
  ledger.expenses = [expense, ...ledger.expenses];
  return expense;
}

export function rejectProposal(ledger: LedgerState, id: string): void {
  ledger.proposals.delete(id);
}
