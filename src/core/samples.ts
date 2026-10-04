import type { InvoiceData } from "./types";

/** Sample invoices (fictional). The scripted mode "reads" these; a real model reads the image instead. */
export interface Sample {
  id: string;
  title: string;
  vendor: string;
  image: number; // require() asset id
  invoice: InvoiceData;
}

export const SAMPLE_INVOICES: Omit<Sample, "image">[] = [
  {
    id: "paper",
    title: "Office paper order",
    vendor: "Northwind Paper Co.",
    invoice: {
      vendor: "Northwind Paper Co.", invoiceNo: "NW-5611", date: "2026-09-28", currency: "USD", total: 142.5,
      items: [{ description: "A4 paper, 5 reams", qty: 5, unit: 8.5 }, { description: "Toner cartridge", qty: 1, unit: 89 }, { description: "Delivery", qty: 1, unit: 11 }],
    },
  },
  {
    id: "cloud",
    title: "Cloud hosting, September",
    vendor: "Pixel Cloud Hosting",
    invoice: {
      vendor: "Pixel Cloud Hosting", invoiceNo: "PC-88213", date: "2026-09-28", currency: "USD", total: 129,
      items: [{ description: "Compute, 2 instances", qty: 2, unit: 45 }, { description: "Storage 500 GB", qty: 1, unit: 25 }, { description: "Backups", qty: 1, unit: 14 }],
    },
  },
  {
    id: "catering",
    title: "Team lunch catering",
    vendor: "Fresh Fields Catering",
    invoice: {
      vendor: "Fresh Fields Catering", invoiceNo: "FF-1004", date: "2026-10-01", currency: "USD", total: 236.4,
      items: [{ description: "Lunch boxes", qty: 12, unit: 16.5 }, { description: "Drinks", qty: 12, unit: 2.2 }, { description: "Service fee", qty: 1, unit: 12 }],
    },
  },
];
