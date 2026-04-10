/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const https = require('https');

const projectRoot = path.resolve(__dirname, '..');
const outputPath = path.join(projectRoot, 'content-templates', 'public-domain-movies.csv');
const targetCount = Number.parseInt(process.argv[2] || '100', 10);
const pageSize = 50;

function requestJson(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { 'User-Agent': 'AliControlContentBuilder/1.0' } }, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (error) {
            reject(error);
          }
        });
      })
      .on('error', reject);
  });
}

function csvEscape(value) {
  const stringValue = String(value ?? '');
  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

function normalizeText(value) {
  return String(value || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function pickDescription(doc) {
  const raw = Array.isArray(doc.description) ? doc.description[0] : doc.description;
  return normalizeText(raw).slice(0, 420);
}

function inferGenres(doc) {
  const source = [
    doc.subject,
    doc.collection,
    doc.creator,
    doc.title,
    doc.description,
  ]
    .flat()
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  const genres = [];
  const rules = [
    ['horror', 'Horror'],
    ['comedy', 'Comedy'],
    ['western', 'Western'],
    ['crime', 'Crime'],
    ['drama', 'Drama'],
    ['romance', 'Romance'],
    ['sci-fi', 'Sci-Fi'],
    ['science fiction', 'Sci-Fi'],
    ['adventure', 'Adventure'],
    ['animation', 'Animation'],
    ['war', 'War'],
    ['thriller', 'Thriller'],
    ['mystery', 'Mystery'],
    ['documentary', 'Documentary'],
  ];

  for (const [needle, label] of rules) {
    if (source.includes(needle) && !genres.includes(label)) {
      genres.push(label);
    }
  }

  if (genres.length === 0) genres.push('Classic');
  return genres.slice(0, 3).join('|');
}

function parseYear(doc) {
  const candidates = [doc.year, doc.date, doc.publicdate]
    .flat()
    .map((value) => String(value || ''))
    .join(' ');
  const match = candidates.match(/\b(18|19|20)\d{2}\b/);
  return match ? Number.parseInt(match[0], 10) : 1950;
}

function parseDuration(metadataFile) {
  const length = Number.parseFloat(metadataFile.length || '0');
  if (!Number.isFinite(length) || length <= 0) return '';
  const totalMinutes = Math.round(length / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours <= 0) return `${minutes}m`;
  return `${hours}h ${minutes.toString().padStart(2, '0')}m`;
}

function buildStreamUrl(identifier, fileName) {
  return `https://archive.org/download/${encodeURIComponent(identifier)}/${encodeURIComponent(fileName).replace(/%2F/g, '/')}`;
}

async function fetchSearchPage(page) {
  const query = new URLSearchParams({
    q: 'mediatype:movies AND collection:feature_films AND licenseurl:*publicdomain*',
    'fl[]': ['identifier', 'title', 'description', 'year', 'subject', 'collection', 'creator', 'downloads'],
    rows: String(pageSize),
    page: String(page),
    output: 'json',
  });
  return requestJson(`https://archive.org/advancedsearch.php?${query.toString()}`);
}

async function fetchMovieDetails(identifier) {
  const data = await requestJson(`https://archive.org/metadata/${encodeURIComponent(identifier)}`);
  const files = Array.isArray(data.files) ? data.files : [];
  const chosenFile =
    files.find((file) => /(\.ia\.mp4|\.mp4|\.m4v|\.webm)$/i.test(file.name || '') && Number.parseFloat(file.size || '0') > 0) ||
    null;

  if (!chosenFile) return null;

  const metadata = data.metadata || {};
  const title = normalizeText(metadata.title || identifier);
  const description = pickDescription(metadata);

  return {
    title,
    description,
    poster: `https://archive.org/services/img/${encodeURIComponent(identifier)}`,
    backdrop: `https://archive.org/services/img/${encodeURIComponent(identifier)}`,
    trailer_url: '',
    stream_url: buildStreamUrl(identifier, chosenFile.name),
    genre: inferGenres(metadata),
    year: parseYear(metadata),
    duration: parseDuration(chosenFile),
    rating: '7.0',
    cast_members: '',
    quality: 'Auto|720p',
    subtitle_url: '',
    is_featured: 'false',
    is_trending: 'false',
    is_new: 'false',
    is_exclusive: 'false',
    is_published: 'true',
    view_count: '0',
    category_id: 'public-domain',
  };
}

async function main() {
  const rows = [];
  let page = 1;

  while (rows.length < targetCount) {
    console.log(`Fetching archive search page ${page}...`);
    const search = await fetchSearchPage(page);
    const docs = search?.response?.docs || [];
    if (docs.length === 0) break;

    for (const doc of docs) {
      if (rows.length >= targetCount) break;
      console.log(`Resolving ${doc.identifier} (${rows.length + 1}/${targetCount})`);
      try {
        const detail = await fetchMovieDetails(doc.identifier);
        if (detail) rows.push(detail);
      } catch (error) {
        console.warn(`Skipped ${doc.identifier}: ${error.message}`);
      }
    }

    page += 1;
  }

  const headers = [
    'title',
    'description',
    'poster',
    'backdrop',
    'trailer_url',
    'stream_url',
    'genre',
    'year',
    'duration',
    'rating',
    'cast_members',
    'quality',
    'subtitle_url',
    'is_featured',
    'is_trending',
    'is_new',
    'is_exclusive',
    'is_published',
    'view_count',
    'category_id',
  ];

  const lines = [
    headers.join(','),
    ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(',')),
  ];

  fs.writeFileSync(outputPath, `${lines.join('\n')}\n`, 'utf8');
  console.log(`Generated ${rows.length} public-domain movies into ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
