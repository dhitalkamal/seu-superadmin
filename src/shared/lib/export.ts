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

/** Export data as a printable PDF using the browser's print dialog. */
export function exportPDF(title: string, headers: string[], rows: string[][], _filename: string): void {
  const win = window.open("", "_blank");
  if (!win) return;

  const doc = win.document;
  doc.open();

  const style = doc.createElement("style");
  style.textContent = "@media print{body{margin:0}@page{margin:20mm}}";
  doc.head.appendChild(style);

  const titleEl = doc.createElement("title");
  titleEl.textContent = title;
  doc.head.appendChild(titleEl);

  const container = doc.createElement("div");
  container.style.cssText = "font-family:system-ui,sans-serif;max-width:900px;margin:0 auto";

  // header section
  const header = doc.createElement("div");
  header.style.cssText = "display:flex;justify-content:space-between;align-items:baseline;margin-bottom:20px;padding-bottom:12px;border-bottom:2px solid #121d3f";
  const headerLeft = doc.createElement("div");
  const h1 = doc.createElement("h1");
  h1.style.cssText = "margin:0;font-size:22px;font-weight:700;letter-spacing:-0.02em";
  h1.textContent = title;
  const sub = doc.createElement("p");
  sub.style.cssText = "margin:4px 0 0;font-size:12px;color:#6b7280";
  sub.textContent = `Exported ${new Date().toLocaleString()} - ${rows.length} records`;
  headerLeft.appendChild(h1);
  headerLeft.appendChild(sub);
  const headerRight = doc.createElement("div");
  headerRight.style.cssText = "font-size:11px;color:#6b7280";
  headerRight.textContent = "Sansaar Platform";
  header.appendChild(headerLeft);
  header.appendChild(headerRight);
  container.appendChild(header);

  // table
  const table = doc.createElement("table");
  table.style.cssText = "width:100%;border-collapse:collapse";
  const thead = doc.createElement("thead");
  const headRow = doc.createElement("tr");
  for (const h of headers) {
    const th = doc.createElement("th");
    th.style.cssText = "padding:8px 10px;border-bottom:2px solid #121d3f;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:#6b7280";
    th.textContent = h;
    headRow.appendChild(th);
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = doc.createElement("tbody");
  for (const row of rows) {
    const tr = doc.createElement("tr");
    for (const cell of row) {
      const td = doc.createElement("td");
      td.style.cssText = "padding:6px 10px;border-bottom:1px solid #e5e7eb;font-size:12px";
      td.textContent = cell;
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  container.appendChild(table);

  doc.body.appendChild(container);
  doc.close();

  win.onload = () => {
    win.print();
    win.onafterprint = () => win.close();
  };
}
