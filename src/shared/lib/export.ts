/** Export a 2D array of rows as a CSV file download. */
export function exportCSV(headers: string[], rows: string[][], filename: string): void {
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const lines = [headers.map(escape).join(","), ...rows.map((r) => r.map(escape).join(","))];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Build a self-contained HTML string for the print page. */
function buildPrintHTML(title: string, headers: string[], rows: string[][]): string {
  const esc = (v: string) => v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const ths = headers
    .map(
      (h) =>
        `<th style="padding:8px 10px;border-bottom:2px solid #121d3f;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:#6b7280">${esc(h)}</th>`
    )
    .join("");

  const trs = rows
    .map(
      (row) =>
        `<tr>${row.map((cell) => `<td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;font-size:12px">${esc(cell)}</td>`).join("")}</tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html><head><title>${esc(title)}</title>
<style>@media print{body{margin:0}@page{margin:20mm}}</style>
</head><body>
<div style="font-family:system-ui,sans-serif;max-width:900px;margin:0 auto">
<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:20px;padding-bottom:12px;border-bottom:2px solid #121d3f">
<div><h1 style="margin:0;font-size:22px;font-weight:700;letter-spacing:-0.02em">${esc(title)}</h1>
<p style="margin:4px 0 0;font-size:12px;color:#6b7280">Exported ${new Date().toLocaleString()} - ${rows.length} records</p></div>
<div style="font-size:11px;color:#6b7280">Sansaar Platform</div></div>
<table style="width:100%;border-collapse:collapse">
<thead><tr>${ths}</tr></thead>
<tbody>${trs}</tbody>
</table></div>
</body></html>`;
}

/** Export data as a printable PDF using the browser's print dialog. */
export function exportPDF(
  title: string,
  headers: string[],
  rows: string[][],
  _filename: string
): void {
  const html = buildPrintHTML(title, headers, rows);

  // use an iframe instead of window.open to avoid popup blockers and null errors
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "none";
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument ?? iframe.contentWindow?.document;
  if (!doc) {
    document.body.removeChild(iframe);
    return;
  }

  doc.open();
  doc.write(html);
  doc.close();

  iframe.onload = () => {
    try {
      iframe.contentWindow?.print();
    } catch {
      // fallback: open in new tab if iframe print fails
      const blob = new Blob([html], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
    }
    setTimeout(() => document.body.removeChild(iframe), 1000);
  };
}
