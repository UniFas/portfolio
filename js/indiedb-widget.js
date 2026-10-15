/* ------------------------------------------------------------------
   indiedb-widget.js: shows your latest IndieDB blog posts in two places:
     1. the "Devlog" section (3 newest posts as cards)
     2. a small floating side promo (bottom-right) for the newest post

   Data comes from /api/indiedb (see api/indiedb.js), which reads your
   IndieDB RSS feed on the server. If that endpoint is missing or fails
   (for example when opening the file locally), the FALLBACK list below
   is used, so the section never looks empty.

   Update FALLBACK now and then if you like; it is only a safety net.
------------------------------------------------------------------- */

(function () {
  "use strict";

  var API_URL = "/api/indiedb";
  var BLOG_URL = "https://www.indiedb.com/members/unifasdraws/blogs";
  var SEEN_KEY = "fs_devlog_seen";
  var NEW_FOR_DAYS = 30;

  var FALLBACK = [
    {
      title: "Building My Own Game Engine for Horror Games - Devlog #1",
      link: "https://www.indiedb.com/members/unifasdraws/blogs/building-my-own-game-engine-for-horror-games-devlog-1",
      date: "2026-10-02T17:07:50.000Z",
      summary: "Starting a from-scratch engine for a horror game as a degree project, currently at a window and triangle stage.",
      image: null
    },
    {
      title: "The Things Left Behind, the idea I can't stop thinking about",
      link: "https://www.indiedb.com/members/unifasdraws/blogs/the-things-left-behind-the-idea-i-cant-stop-thinking-about",
      date: "2026-07-26T13:32:01.000Z",
      summary: "A building inspector documents a closed department store, where mannequins can only change while unobserved.",
      image: null
    },
    {
      title: "Putting Our Cards on the Table: The Card Manifestation System",
      link: "https://www.indiedb.com/members/unifasdraws/blogs/putting-our-cards-on-the-table-the-card-manifestation-system",
      date: "2026-03-04T13:52:36.000Z",
      summary: "Placing a card spawns its bound actor in the 3D world for the puzzle game Once Upon a Page, and new cards only need data.",
      image: null
    }
  ];

  /* ---------- tiny helpers ---------- */

  function make(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function isIndieDbLink(url) {
    return typeof url === "string" && url.indexOf("https://www.indiedb.com/") === 0;
  }

  function formatDate(iso) {
    var d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  }

  function isRecent(iso) {
    var age = Date.now() - new Date(iso).getTime();
    return age >= 0 && age < NEW_FOR_DAYS * 24 * 60 * 60 * 1000;
  }

  function storageGet(key) {
    try { return window.localStorage.getItem(key); } catch (e) { return null; }
  }
  function storageSet(key, value) {
    try { window.localStorage.setItem(key, value); } catch (e) { /* storage blocked: ignore */ }
  }

  /* ---------- data ---------- */

  function clean(posts) {
    if (!Array.isArray(posts)) return [];
    return posts
      .filter(function (p) {
        return p && typeof p.title === "string" && isIndieDbLink(p.link) && !isNaN(new Date(p.date).getTime());
      })
      .map(function (p) {
        return {
          title: p.title,
          link: p.link,
          date: p.date,
          summary: typeof p.summary === "string" ? p.summary : "",
          image: typeof p.image === "string" && p.image.indexOf("https://") === 0 ? p.image : null
        };
      });
  }

  function loadPosts() {
    var controller = "AbortController" in window ? new AbortController() : null;
    var timer = controller ? setTimeout(function () { controller.abort(); }, 6000) : null;

    return fetch(API_URL, { headers: { accept: "application/json" }, signal: controller ? controller.signal : undefined })
      .then(function (res) {
        if (!res.ok) throw new Error("status " + res.status);
        return res.json();
      })
      .then(function (data) {
        var posts = clean(data && data.posts);
        if (posts.length === 0) throw new Error("no posts");
        return posts;
      })
      .catch(function () { return clean(FALLBACK); })
      .then(function (posts) { if (timer) clearTimeout(timer); return posts; });
  }

  /* ---------- section cards ---------- */

  function renderCards(posts) {
    var grid = document.getElementById("devlogGrid");
    if (!grid) return;

    grid.textContent = "";

    // homepage shows 3; a page can ask for more with data-limit="6" on the grid
    var limit = parseInt(grid.getAttribute("data-limit"), 10) || 3;

    posts.slice(0, limit).forEach(function (post) {
      var card = make("article", "dl-card");

      var thumb = make("a", "dl-thumb");
      thumb.href = post.link;
      thumb.target = "_blank";
      thumb.rel = "noopener noreferrer";
      thumb.setAttribute("aria-label", "Read " + post.title + " on IndieDB");

      var placeholder = make("div", "dl-ph", "</>");
      placeholder.setAttribute("aria-hidden", "true");
      thumb.appendChild(placeholder);

      if (post.image) {
        var img = document.createElement("img");
        img.alt = "";
        img.loading = "lazy";
        img.referrerPolicy = "no-referrer";
        img.addEventListener("load", function () { if (placeholder.parentNode) placeholder.remove(); });
        img.addEventListener("error", function () { img.remove(); });
        img.src = post.image;
        thumb.appendChild(img);
      }

      if (isRecent(post.date)) thumb.appendChild(make("span", "dl-new", "NEW"));

      var body = make("div", "dl-body");
      body.appendChild(make("div", "dl-date", formatDate(post.date)));

      var h3 = make("h3");
      var titleLink = make("a", "", post.title);
      titleLink.href = post.link;
      titleLink.target = "_blank";
      titleLink.rel = "noopener noreferrer";
      h3.appendChild(titleLink);
      body.appendChild(h3);

      if (post.summary) body.appendChild(make("p", "", post.summary));

      var more = make("a", "dl-more", "Read on IndieDB ↗");
      more.href = post.link;
      more.target = "_blank";
      more.rel = "noopener noreferrer";
      body.appendChild(more);

      card.appendChild(thumb);
      card.appendChild(body);
      grid.appendChild(card);
    });

    grid.setAttribute("aria-busy", "false");
  }

  /* ---------- floating side promo ---------- */

  function renderFloat(post) {
    var box = document.getElementById("devlogFloat");
    var tab = document.getElementById("dfTab");
    var card = document.getElementById("dfCard");
    var closeBtn = document.getElementById("dfClose");
    if (!box || !tab || !card || !post) return;

    document.getElementById("dfTabText").textContent =
      (isRecent(post.date) ? "New devlog" : "Latest devlog") + " · " +
      new Date(post.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

    document.getElementById("dfKicker").textContent = isRecent(post.date) ? "NEW DEVLOG" : "LATEST DEVLOG";

    var title = document.getElementById("dfTitle");
    title.textContent = post.title;
    title.href = post.link;

    document.getElementById("dfSummary").textContent = post.summary;
    document.getElementById("dfDate").textContent = formatDate(post.date);
    document.getElementById("dfMore").href = post.link;

    if (storageGet(SEEN_KEY) === post.link) box.classList.add("seen");

    function setOpen(open) {
      card.hidden = !open;
      tab.setAttribute("aria-expanded", String(open));
      if (open) {
        storageSet(SEEN_KEY, post.link);
        box.classList.add("seen");
      }
    }

    tab.addEventListener("click", function () { setOpen(card.hidden); });
    closeBtn.addEventListener("click", function () { setOpen(false); tab.focus(); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !card.hidden) { setOpen(false); tab.focus(); }
    });
    document.addEventListener("click", function (e) {
      if (!card.hidden && !box.contains(e.target)) setOpen(false);
    });

    // show the tab once the visitor starts scrolling (or after a long pause)
    box.hidden = false;
    var shown = false;
    function reveal() {
      if (shown) return;
      shown = true;
      box.classList.add("show");
      window.removeEventListener("scroll", onScroll);
    }
    function onScroll() { if (window.scrollY > 300) reveal(); }
    window.addEventListener("scroll", onScroll, { passive: true });
    // keep the first screen clean: only show on its own after a long pause
    setTimeout(reveal, 15000);
  }

  /* ---------- go ---------- */

  loadPosts().then(function (posts) {
    renderCards(posts);
    renderFloat(posts[0]);
  });
})();
