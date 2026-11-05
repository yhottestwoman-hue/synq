// Synq YouTube proxy (Vercel Serverless Function).
// The API key lives in the Vercel environment variable YT_API_KEY and is never sent to the browser.
const ALLOWED = {
  search: ['q', 'eventType'],
  videos: ['chart', 'regionCode', 'videoCategoryId'],
};

module.exports = async function handler(req, res) {
  const key = process.env.YT_API_KEY;
  if (!key) return res.status(500).json({ error: { message: 'YT_API_KEY is not set' } });

  const path = req.query.path;
  if (!ALLOWED[path]) return res.status(400).json({ error: { message: 'Not allowed' } });

  const u = new URL('https://www.googleapis.com/youtube/v3/' + path);
  for (const k of ALLOWED[path]) {
    if (req.query[k]) u.searchParams.set(k, String(req.query[k]).slice(0, 100));
  }
  u.searchParams.set('maxResults', '16');
  if (path === 'search') {
    u.searchParams.set('part', 'snippet');
    u.searchParams.set('type', 'video');
    u.searchParams.set('videoEmbeddable', 'true');
  } else {
    u.searchParams.set('part', 'snippet,status');
  }
  u.searchParams.set('key', key);

  try {
    const r = await fetch(u);
    const data = await r.json();
    // Same query within an hour is served from cache, which saves quota.
    if (r.ok) res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
    return res.status(r.status).json(data);
  } catch (e) {
    return res.status(502).json({ error: { message: 'Upstream error' } });
  }
};
