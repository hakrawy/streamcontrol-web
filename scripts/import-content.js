/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const projectRoot = path.resolve(__dirname, '..');
loadEnv(path.join(projectRoot, '.env'));

const supabaseUrl = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const dryRun = process.argv.includes('--dry-run');

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing SUPABASE URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  const templatesDir = path.join(projectRoot, 'content-templates');
  const moviesRows = readCsv(path.join(templatesDir, 'movies.csv'));
  const seriesRows = readCsv(path.join(templatesDir, 'series.csv'));
  const episodesRows = readCsv(path.join(templatesDir, 'episodes.csv'));
  const channelsRows = readCsv(path.join(templatesDir, 'channels.csv'));
  const bannersRows = readCsv(path.join(templatesDir, 'banners.csv'));

  const movieIdByTitle = new Map();
  const seriesIdByKey = new Map();
  const seriesIdByTitle = new Map();

  console.log(dryRun ? 'Running content import in DRY RUN mode' : 'Running content import');

  await importMovies(moviesRows, movieIdByTitle);
  await importSeries(seriesRows, seriesIdByKey, seriesIdByTitle);
  await importEpisodes(episodesRows, seriesIdByKey);
  await importChannels(channelsRows);
  await importBanners(bannersRows, movieIdByTitle, seriesIdByKey, seriesIdByTitle);

  console.log(dryRun ? 'Dry run completed successfully.' : 'Import completed successfully.');
}

async function importMovies(rows, movieIdByTitle) {
  for (const row of rows) {
    const payload = {
      title: required(row.title, 'movies.title'),
      description: row.description || '',
      poster: row.poster || '',
      backdrop: row.backdrop || '',
      trailer_url: row.trailer_url || '',
      stream_url: row.stream_url || '',
      genre: splitArray(row.genre),
      year: parseInteger(row.year, new Date().getFullYear()),
      duration: row.duration || '',
      rating: parseFloatSafe(row.rating, 0),
      cast_members: splitArray(row.cast_members),
      quality: splitArray(row.quality),
      subtitle_url: row.subtitle_url || '',
      is_featured: parseBoolean(row.is_featured),
      is_trending: parseBoolean(row.is_trending),
      is_new: parseBoolean(row.is_new),
      is_exclusive: parseBoolean(row.is_exclusive),
      is_published: parseBoolean(row.is_published),
      view_count: parseInteger(row.view_count, 0),
      category_id: row.category_id || null,
    };

    const existing = await findSingle('movies', 'title', payload.title);
    const saved = await upsertRow('movies', existing?.id, payload);
    if (saved?.id) {
      movieIdByTitle.set(payload.title, saved.id);
    }
  }
}

async function importSeries(rows, seriesIdByKey, seriesIdByTitle) {
  for (const row of rows) {
    const payload = {
      title: required(row.title, 'series.title'),
      description: row.description || '',
      poster: row.poster || '',
      backdrop: row.backdrop || '',
      trailer_url: row.trailer_url || '',
      genre: splitArray(row.genre),
      year: parseInteger(row.year, new Date().getFullYear()),
      rating: parseFloatSafe(row.rating, 0),
      cast_members: splitArray(row.cast_members),
      is_featured: parseBoolean(row.is_featured),
      is_trending: parseBoolean(row.is_trending),
      is_new: parseBoolean(row.is_new),
      is_exclusive: parseBoolean(row.is_exclusive),
      is_published: parseBoolean(row.is_published),
      view_count: parseInteger(row.view_count, 0),
      category_id: row.category_id || null,
    };

    const existing = await findSingle('series', 'title', payload.title);
    const saved = await upsertRow('series', existing?.id, payload);
    if (saved?.id) {
      if (row.series_key) seriesIdByKey.set(row.series_key, saved.id);
      seriesIdByTitle.set(payload.title, saved.id);
    }
  }
}

async function importEpisodes(rows, seriesIdByKey) {
  for (const row of rows) {
    const seriesKey = required(row.series_key, 'episodes.series_key');
    const seriesId = seriesIdByKey.get(seriesKey);

    if (!seriesId) {
      throw new Error(`No series found for series_key "${seriesKey}" while importing episodes.`);
    }

    const seasonNumber = parseInteger(row.season_number, null);
    const episodeNumber = parseInteger(row.episode_number, null);
    if (seasonNumber === null || episodeNumber === null) {
      throw new Error(`Invalid season/episode number for series_key "${seriesKey}".`);
    }

    const seasonTitle = row.season_title || `Season ${seasonNumber}`;
    let season = await findSeason(seriesId, seasonNumber);
    if (!season) {
      season = await upsertRow('seasons', null, {
        series_id: seriesId,
        number: seasonNumber,
        title: seasonTitle,
      });
    }

    const existingEpisode = await findEpisode(season.id, episodeNumber);
    await upsertRow('episodes', existingEpisode?.id, {
      season_id: season.id,
      series_id: seriesId,
      number: episodeNumber,
      title: required(row.title, 'episodes.title'),
      description: row.description || '',
      thumbnail: row.thumbnail || '',
      stream_url: row.stream_url || '',
      subtitle_url: row.subtitle_url || '',
      duration: row.duration || '',
    });
  }

  for (const seriesId of new Set(seriesIdByKey.values())) {
    await refreshSeriesCounts(seriesId);
  }
}

async function importChannels(rows) {
  for (const row of rows) {
    const payload = {
      name: required(row.name, 'channels.name'),
      logo: row.logo || '',
      stream_url: row.stream_url || '',
      category: row.category || 'general',
      current_program: row.current_program || '',
      is_live: parseBoolean(row.is_live),
      is_featured: parseBoolean(row.is_featured),
      viewers: parseInteger(row.viewers, 0),
      sort_order: parseInteger(row.sort_order, 0),
    };

    const existing = await findSingle('channels', 'name', payload.name);
    await upsertRow('channels', existing?.id, payload);
  }
}

async function importBanners(rows, movieIdByTitle, seriesIdByKey, seriesIdByTitle) {
  for (const row of rows) {
    const contentType = required(row.content_lookup_type, 'banners.content_lookup_type');
    const contentLookup = required(row.content_lookup_value, 'banners.content_lookup_value');

    let contentId = null;
    if (contentType === 'movie') {
      contentId = movieIdByTitle.get(contentLookup);
      if (!contentId) {
        const existingMovie = await findSingle('movies', 'title', contentLookup);
        contentId = existingMovie?.id || null;
      }
    } else if (contentType === 'series') {
      contentId = seriesIdByKey.get(contentLookup) || seriesIdByTitle.get(contentLookup) || null;
      if (!contentId) {
        const existingSeries = await findSingle('series', 'title', contentLookup);
        contentId = existingSeries?.id || null;
      }
    } else {
      throw new Error(`Unsupported banner content_lookup_type "${contentType}".`);
    }

    if (!contentId) {
      throw new Error(`Banner "${row.title}" could not resolve content "${contentLookup}".`);
    }

    const payload = {
      title: required(row.title, 'banners.title'),
      subtitle: row.subtitle || '',
      backdrop: row.backdrop || '',
      content_id: contentId,
      content_type: contentType,
      badge: row.badge || null,
      genre: splitArray(row.genre),
      rating: parseFloatSafe(row.rating, 0),
      year: parseInteger(row.year, new Date().getFullYear()),
      sort_order: parseInteger(row.sort_order, 0),
      is_active: parseBoolean(row.is_active),
    };

    const existing = await findBanner(payload.title, payload.sort_order);
    await upsertRow('banners', existing?.id, payload);
  }
}

async function refreshSeriesCounts(seriesId) {
  const { count: totalEpisodes, error: episodeError } = await supabase
    .from('episodes')
    .select('*', { count: 'exact', head: true })
    .eq('series_id', seriesId);
  if (episodeError) throw episodeError;

  const { count: totalSeasons, error: seasonError } = await supabase
    .from('seasons')
    .select('*', { count: 'exact', head: true })
    .eq('series_id', seriesId);
  if (seasonError) throw seasonError;

  await upsertRow('series', seriesId, {
    total_episodes: totalEpisodes || 0,
    total_seasons: totalSeasons || 0,
  });
}

async function findSingle(table, column, value) {
  const { data, error } = await supabase.from(table).select('*').eq(column, value).maybeSingle();
  if (error) throw error;
  return data;
}

async function findSeason(seriesId, number) {
  const { data, error } = await supabase
    .from('seasons')
    .select('*')
    .eq('series_id', seriesId)
    .eq('number', number)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function findEpisode(seasonId, number) {
  const { data, error } = await supabase
    .from('episodes')
    .select('*')
    .eq('season_id', seasonId)
    .eq('number', number)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function findBanner(title, sortOrder) {
  const { data, error } = await supabase
    .from('banners')
    .select('*')
    .eq('title', title)
    .eq('sort_order', sortOrder)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function upsertRow(table, id, payload) {
  if (dryRun) {
    console.log(`[DRY RUN] ${id ? 'update' : 'insert'} ${table}`, id || '', payload.title || payload.name || '');
    return id ? { id, ...payload } : { id: `dry-run-${table}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, ...payload };
  }

  if (id) {
    const { data, error } = await supabase
      .from(table)
      .update(payload)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  const { data, error } = await supabase
    .from(table)
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data;
}

function parseBoolean(value) {
  return String(value).trim().toLowerCase() === 'true';
}

function parseInteger(value, fallback) {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseFloatSafe(value, fallback) {
  const parsed = Number.parseFloat(String(value));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function splitArray(value) {
  return String(value || '')
    .split('|')
    .map((item) => item.trim())
    .filter(Boolean);
}

function required(value, label) {
  const normalized = String(value || '').trim();
  if (!normalized) {
    throw new Error(`Missing required field: ${label}`);
  }
  return normalized;
}

function readCsv(filePath) {
  const content = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
  const rows = parseCsv(content);
  if (rows.length === 0) return [];

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

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return;

  const content = fs.readFileSync(filePath, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

main().catch((error) => {
  console.error('Content import failed:', error.message);
  process.exit(1);
});
