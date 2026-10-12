/** RFC 4180 CSV: quoted fields, doubled quotes, and newlines inside quotes (LinkedIn descriptions have them). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (ch === '"') quoted = false;
      else field += ch;
      continue;
    }
    if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += ch;
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((cell) => cell.trim()));
}

/**
 * Rows as objects keyed by header. LinkedIn puts note lines above the header in some files, so the
 * header is the first row containing `mustHave`.
 */
export function csvRecords(text: string, mustHave: string): Record<string, string>[] {
  const rows = parseCsv(text.replace(/^﻿/, ""));
  const headerIndex = rows.findIndex((r) => r.some((cell) => cell.trim().toLowerCase() === mustHave.toLowerCase()));
  if (headerIndex === -1) return [];
  const header = rows[headerIndex].map((h) => h.trim().toLowerCase());
  return rows.slice(headerIndex + 1).map((r) => Object.fromEntries(header.map((h, i) => [h, (r[i] ?? "").trim()])));
}
