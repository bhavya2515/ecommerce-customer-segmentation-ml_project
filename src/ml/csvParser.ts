import { RawTransactionRow } from "./types";

const COLUMN_ALIASES: Record<string, string> = {
  invoiceno: "InvoiceNo",
  invoice: "InvoiceNo",
  invoice_no: "InvoiceNo",
  stockcode: "StockCode",
  stock_code: "StockCode",
  description: "Description",
  quantity: "Quantity",
  invoicedate: "InvoiceDate",
  invoice_date: "InvoiceDate",
  unitprice: "UnitPrice",
  price: "UnitPrice",
  unit_price: "UnitPrice",
  customerid: "CustomerID",
  "customer id": "CustomerID",
  customer_id: "CustomerID",
  country: "Country",
};

export const REQUIRED_COLUMNS = [
  "InvoiceNo",
  "Quantity",
  "InvoiceDate",
  "UnitPrice",
  "CustomerID",
];

function parseCsvMatrix(text: string): string[][] {
  const cleanText = text.replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < cleanText.length; i++) {
    const ch = cleanText[i];
    const next = cleanText[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        row.push(current);
        current = "";
      } else if (ch === "\r" && next === "\n") {
        row.push(current);
        rows.push(row);
        row = [];
        current = "";
        i++;
      } else if (ch === "\n" || ch === "\r") {
        row.push(current);
        rows.push(row);
        row = [];
        current = "";
      } else {
        current += ch;
      }
    }
  }

  if (current.length > 0 || row.length > 0) {
    row.push(current);
    rows.push(row);
  }

  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

export function parseCsvContent(csvText: string): {
  headers: string[];
  rows: RawTransactionRow[];
} {
  const matrix = parseCsvMatrix(csvText);
  if (matrix.length < 2) {
    throw new Error("CSV file must include a header row and at least one transaction row.");
  }

  const rawHeaders = matrix[0].map((h) => h.trim());
  const normalizedHeaders = rawHeaders.map((h) => {
    const key = h.toLowerCase();
    return COLUMN_ALIASES[key] || h;
  });

  const missing = REQUIRED_COLUMNS.filter((col) => !normalizedHeaders.includes(col));
  if (missing.length > 0) {
    throw new Error(
      `Missing required columns: ${missing.join(", ")}. Expected Online Retail columns: InvoiceNo, Quantity, InvoiceDate, UnitPrice, CustomerID.`
    );
  }

  const rows: RawTransactionRow[] = [];
  for (let i = 1; i < matrix.length; i++) {
    const cells = matrix[i];
    const obj: RawTransactionRow = {};
    for (let j = 0; j < normalizedHeaders.length; j++) {
      obj[normalizedHeaders[j]] = (cells[j] ?? "").trim();
    }
    rows.push(obj);
  }

  return { headers: normalizedHeaders, rows };
}
