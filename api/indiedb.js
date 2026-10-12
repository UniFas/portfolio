/* ------------------------------------------------------------------
   /api/indiedb: Vercel serverless function.

   Browsers cannot read IndieDB's RSS feed directly (cross-origin),
   so the site asks THIS function, which fetches the feed on the
   server, turns it into small clean JSON and lets Vercel's CDN cache
   it for 30 minutes. js/indiedb-widget.js falls back to a built-in
   list if this endpoint is unavailable.

   The feed URL is fixed on purpose: the function never fetches an
   address supplied by a visitor.
------------------------------------------------------------------- */

const FEED_URL = "https://rss.indiedb.com/members/unifasdraws/blogs/feed/rss.xml";
const MAX_POSTS = 6;
const SUMMARY_LENGTH = 190;

/* ---------- small parsing helpers (no dependencies) ---------- */

function decodeEntities(str) {
  return String(str)
    .replace(/&#(\d+);/g, (_, n) => safeCodePoint(parseInt(n, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => safeCodePoint(parseInt(h, 16)))
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&"); // last, so "&amp;lt;" stays "&lt;" and is not decoded twice
}

function safeCodePoint(n) {
  try { return String.fromCodePoint(n); } catch (e) { return ""; }
}

function unwrapCdata(str) {
  const m = /^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/.exec(str);
  return m ? m[1] : str;
}

function readTag(block, name) {
  const m = new RegExp("<" + name + "(?:\\s[^>]*)?>([\\s\\S]*?)</" + name + ">", "i").exec(block);
  return m ? unwrapCdata(m[1]) : "";
}

function htmlToText(html) {
  return decodeEntities(
    html
      .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
      .replace(/<br\s*\/?>|<\/(p|div|h[1-6]|li)>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\[\/?[a-z]+(?:=[^\]]*)?\]/gi, " ") // BBCode such as [center]
  )
    .replace(/\s+/g, " ")
    .trim();
}

// "Hey everyone! 👋 ..." makes every card start the same way, so drop a short greeting
function stripGreeting(text) {
  const stripped = text.replace(/^(?:hey|hi|hello|greetings)\b[^.!?]{0,30}[.!?]+[\s\p{Extended_Pictographic}️‍]*/iu, "");
  return stripped.length >= 60 ? stripped : text;
}

function truncate(text, max) {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[\s,.;:!-]+$/, "") + "…";
}

function firstImage(html) {
  const m = /<img[^>]+src=["']([^"']+)["']/i.exec(html);
  if (!m) return null;
  try {
    const url = new URL(decodeEntities(m[1]));
    return url.protocol === "https:" ? url.href : null;
  } catch (e) {
    return null;
  }
}

function safeIndieDbLink(link) {
  try {
    const url = new URL(decodeEntities(link).trim());
    return url.protocol === "https:" && url.hostname === "www.indiedb.com" ? url.href : null;
  } catch (e) {
    return null;
  }
}

/* ---------- feed -> posts ---------- */

function parseFeed(xml) {
  const items = String(xml).match(/<item[\s>][\s\S]*?<\/item>/gi) || [];
  const posts = [];

  for (const block of items) {
    const title = htmlToText(readTag(block, "title"));
    const link = safeIndieDbLink(readTag(block, "link"));
    const published = new Date(readTag(block, "pubDate").trim());
    if (!title || !link || isNaN(published.getTime())) continue;

    // description is HTML escaped inside the XML: decode once to get real HTML
    const html = decodeEntities(readTag(block, "description"));

    posts.push({
      title,
      link,
      date: published.toISOString(),
      summary: truncate(stripGreeting(htmlToText(html)), SUMMARY_LENGTH),
      image: firstImage(html)
    });
  }

  posts.sort((a, b) => b.date.localeCompare(a.date));
  return posts.slice(0, MAX_POSTS);
}

/* ---------- handler ---------- */

async function handler(req, res) {
  if (req.method && req.method !== "GET" && req.method !== "HEAD") {
    res.setHeader("Allow", "GET, HEAD");
    return res.status(405).json({ error: "method_not_allowed" });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const upstream = await fetch(FEED_URL, {
      signal: controller.signal,
      headers: {
        "user-agent": "Mozilla/5.0 (compatible; portfolio-devlog-widget/1.0)",
        accept: "application/rss+xml, application/xml;q=0.9, */*;q=0.8"
      }
    });
    if (!upstream.ok) throw new Error("upstream " + upstream.status);

    const posts = parseFeed(await upstream.text());
    if (posts.length === 0) throw new Error("no posts found in feed");

    res.setHeader("Cache-Control", "public, s-maxage=1800, stale-while-revalidate=86400");
    return res.status(200).json({ source: "indiedb", fetchedAt: new Date().toISOString(), posts });
  } catch (err) {
    res.setHeader("Cache-Control", "public, s-maxage=60");
    return res.status(502).json({ error: "feed_unavailable" });
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = handler;
module.exports.parseFeed = parseFeed; // exported for testing
