export interface LineItem {
  description: string;
  qty: number;
  unit: number;
}

export interface InvoiceData {
  vendor: string;
  invoiceNo: string;
  date: string;
  currency: string;
  items: LineItem[];
  total: number;
}

export interface Expense {
  id: string;
  vendor: string;
  invoiceNo: string;
  date: string;
  category: string;
  total: number;
}

/** A change the agent wants to make. Nothing is booked until a person approves it. */
export interface Proposal {
  id: string;
  invoice: InvoiceData;
  category: string;
  duplicateOf?: string;
  status: "pending";
}

export interface TraceStep {
  tool: string;
  args: Record<string, unknown>;
  ok: boolean;
  ms: number;
  summary: string;
}
