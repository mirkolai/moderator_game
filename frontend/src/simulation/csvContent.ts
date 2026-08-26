/**
 * Minimal RFC 4180-style CSV parser used to extract post content bundled as
 * static assets (see `simulation/data/*.csv`). Only what the post datasets
 * need is implemented: quoted fields, escaped quotes ("") and a single
 * `post_content` column, with a graceful fallback to the first column.
 */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  let i = 0;

  while (i < text.length) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += char;
      i += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (char === ',') {
      row.push(field);
      field = '';
      i += 1;
      continue;
    }
    if (char === '\r') {
      i += 1;
      continue;
    }
    if (char === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      i += 1;
      continue;
    }

    field += char;
    i += 1;
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

/** Extracts non-empty post texts from a bundled CSV's `post_content` column. */
export function extractPostContents(csvText: string): string[] {
  const rows = parseCsv(csvText).filter((row) => row.some((cell) => cell.trim().length > 0));
  if (rows.length === 0) {
    return [];
  }

  const [header, ...dataRows] = rows;
  const columnIndex = header.findIndex((cell) => cell.trim() === 'post_content');
  const index = columnIndex >= 0 ? columnIndex : 0;

  return dataRows.map((row) => (row[index] ?? '').trim()).filter((content) => content.length > 0);
}
