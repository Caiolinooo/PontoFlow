import xlsx from 'xlsx';
import path from 'node:path';
import fs from 'node:fs';

const file = path.resolve('docs/export/OMEGA - Maximus Project  -Monthly Charge Rates 09.2025 (1).xlsx');
if (!fs.existsSync(file)) {
  console.error('File not found:', file);
  process.exit(1);
}
const wb = xlsx.readFile(file, { cellDates: true });
console.log('SHEETS:', wb.SheetNames);

function getFirstNonEmptyRow(ws) {
  const ref = ws['!ref'];
  if (!ref) return null;
  const range = xlsx.utils.decode_range(ref);
  for (let R = range.s.r; R <= Math.min(range.s.r + 50, range.e.r); R++) {
    let nonEmpty = 0;
    for (let C = range.s.c; C <= range.e.c; C++) {
      const cell = ws[xlsx.utils.encode_cell({ r: R, c: C })];
      if (cell && String(cell.v).trim() !== '') nonEmpty++;
    }
    if (nonEmpty >= 3) return R; // assume header row
  }
  return null;
}

for (const name of wb.SheetNames) {
  const ws = wb.Sheets[name];
  const headerRow = getFirstNonEmptyRow(ws);
  if (headerRow == null) {
    console.log(`SHEET ${name}: no header detected`);
    continue;
  }
  const ref = ws['!ref'];
  const range = xlsx.utils.decode_range(ref);
  const headers = [];
  for (let C = range.s.c; C <= range.e.c; C++) {
    const cell = ws[xlsx.utils.encode_cell({ r: headerRow, c: C })];
    const v = cell ? String(cell.v).trim() : '';
    headers.push(v);
  }
  while (headers.length && headers[headers.length - 1] === '') headers.pop();
  console.log(`HEADERS[${name}]:`, JSON.stringify(headers));
}

