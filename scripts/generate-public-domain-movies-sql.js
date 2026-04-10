/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const csvPath = path.join(projectRoot, 'content-templates', 'public-domain-movies.csv');
const outputPath = path.join(projectRoot, 'supabase', 'import-public-domain-movies.sql');

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        cell += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      row.push(cell);
      cell = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') i += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
      continue;
    }

    cell += char;
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  return rows;
}

function readCsv(filePath) {
  const content = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
  const rows = parseCsv(content);
  const [headers, ...dataRows] = rows;

  return dataRows
    .filter((row) => row.some((cell) => String(cell || '').trim() !== ''))
    .map((row) => {
      const record = {};
      headers.forEach((header, index) => {
        record[header] = row[index] ?? '';
      });
      return record;
    });
}

function sqlString(value) {
  return `'${String(value ?? '').replace(/'/g, "''")}'`;
}

function sqlNullable(value) {
  const normalized = String(value ?? '').trim();
  return normalized ? sqlString(normalized) : 'null';
}

function sqlBool(value) {
  return String(value).trim().toLowerCase() === 'true' ? 'true' : 'false';
}

function sqlInt(value, fallback = 0) {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) ? String(parsed) : String(fallback);
}

function sqlFloat(value, fallback = 0) {
  const parsed = Number.parseFloat(String(value));
  return Number.isFinite(parsed) ? String(parsed) : String(fallback);
}

function sqlArray(value) {
  const items = String(value || '')
    .split('|')
    .map((item) => item.trim())
    .filter(Boolean);

  if (items.length === 0) return "ARRAY[]::text[]";
  return `ARRAY[${items.map((item) => sqlString(item)).join(', ')}]::text[]`;
}

function buildInsert(row) {
  return `(
  ${sqlString(row.title)},
  ${sqlString(row.description)},
  ${sqlString(row.poster)},
  ${sqlString(row.backdrop)},
  ${sqlString(row.trailer_url)},
  ${sqlString(row.stream_url)},
  ${sqlArray(row.genre)},
  ${sqlFloat(row.rating, 7.0)},
  ${sqlInt(row.year, 1950)},
  ${sqlString(row.duration)},
  ${sqlArray(row.cast_members)},
  ${sqlArray(row.quality)},
  ${sqlString(row.subtitle_url)},
  ${sqlBool(row.is_featured)},
  ${sqlBool(row.is_trending)},
  ${sqlBool(row.is_new)},
  ${sqlBool(row.is_exclusive)},
  ${sqlBool(row.is_published)},
  ${sqlInt(row.view_count, 0)},
  ${sqlNullable(row.category_id)}
)`;
}

function main() {
  if (!fs.existsSync(csvPath)) {
    throw new Error(`Missing CSV file: ${csvPath}`);
  }

  const rows = readCsv(csvPath);
  const inserts = rows.map(buildInsert).join(',\n');

  const sql = `-- Public domain movie import for Ali Control
-- Generated from content-templates/public-domain-movies.csv

insert into public.movies (
  title,
  description,
  poster,
  backdrop,
  trailer_url,
  stream_url,
  genre,
  rating,
  year,
  duration,
  cast_members,
  quality,
  subtitle_url,
  is_featured,
  is_trending,
  is_new,
  is_exclusive,
  is_published,
  view_count,
  category_id
)
values
${inserts}
on conflict do nothing;
`;

  fs.writeFileSync(outputPath, sql, 'utf8');
  console.log(`Generated SQL import file at ${outputPath}`);
}

main();
