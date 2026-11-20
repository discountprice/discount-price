// Discount Price: static SEO page generator
// Supabase se stores / coupons / blogs / FAQs parhta hai aur har ek ka asli HTML page banata hai.
// Output: stores/<slug>/index.html, blog/<slug>/index.html, stores/index.html, blog/index.html,
//         sitemap.xml, robots.txt
// Node 18+ chahiye (GitHub Actions mein Node 20 use hota hai).

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = process.env.OUTPUT_DIR || path.resolve(__dirname, "..");

const SITE_URL = (process.env.SITE_URL || "https://discountprice.github.io/discount-price").replace(/\/+$/, "");
const BASE = SITE_URL + "/";
const SUPABASE_URL = process.env.SUPABASE_URL || "https://eyaukiovgugmiyytybdg.supabase.co";
// Ye publishable (public) key hai, wahi jo index.html mein hai.
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || "sb_publishable_qahiC18UeUqc6qVosbenCw_zKmQ7vb1";
const SITE_NAME = "Discount Price";

// ---------- helpers ----------
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const isActive = (row) => String(row?.status ?? "").toLowerCase() === "active";
const slugify = (s) => String(s ?? "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const trunc = (s, n) => { s = String(s ?? "").replace(/\s+/g, " ").trim(); return s.length <= n ? s : s.slice(0, n - 1).replace(/\s+\S*$/, "") + "…"; };
const jsonLd = (obj) => `<script type="application/ld+json">${JSON.stringify(obj).replace(/</g, "\\u003c")}</script>`;

async function fetchTable(table, select, extra = "") {
  const url = `${SUPABASE_URL}/rest/v1/${table}?select=${select}${extra}`;
  const res = await fetch(url, { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } });
  if (!res.ok) throw new Error(`Supabase ${table} fetch failed: ${res.status} ${await res.text()}`);
  return res.json();
}

async function loadData() {
  if (process.env.MOCK_DATA_FILE) return JSON.parse(fs.readFileSync(process.env.MOCK_DATA_FILE, "utf8"));
  const [stores, coupons, blogPosts, faqs] = await Promise.all([
    fetchTable("stores", "id,name,slug,web_url,logo_url,description,aff_url,status,seo_title,seo_description,created_at"),
    fetchTable("coupons", "id,store_id,title,coupon_type,code,discount,is_featured,sort_order,description,affiliate_url,status,created_at", "&order=created_at.desc"),
    fetchTable("blog_posts", "id,title,slug,excerpt,content,featured_image,external_url,seo_title,seo_description,status,published_at,updated_at,store_id", "&status=eq.published&order=published_at.desc"),
    fetchTable("faqs", "id,question,answer,sort_order,is_active,store_id", "&is_active=eq.true&order=sort_order"),
  ]);
  return { stores, coupons, blogPosts, faqs };
}

// Site ka asli CSS index.html se le lete hain, taake static pages bilkul same dikhein.
function readSiteCss() {
  const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
  const m = html.match(/<style>([\s\S]*?)<\/style>/);
  if (!m) throw new Error("index.html mein <style> nahi mila");
  return m[1];
}

const EXTRA_CSS = `
.content-layout{display:block}.main-column{max-width:100%}
.prose p{font-size:14px;line-height:1.8;margin:0 0 14px}.prose h2{font-size:18px;margin:22px 0 8px}.prose h3{font-size:15px;margin:18px 0 6px}
.crumbs{font-size:11px;color:var(--muted);margin:12px 0}.crumbs a{color:var(--red);font-weight:700}
.page-main{padding:12px 0 30px}.deal-card .deal-logo{min-width:90px}
`;

function layout({ title, description, canonical, ogType = "website", image, body, schema = [] }) {
  const css = readSiteCss.cache ?? (readSiteCss.cache = readSiteCss());
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="robots" content="index,follow,max-image-preview:large">
<link rel="canonical" href="${esc(canonical)}">
<meta property="og:type" content="${ogType}">
<meta property="og:site_name" content="${SITE_NAME}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(canonical)}">
${image ? `<meta property="og:image" content="${esc(image)}">\n` : ""}<meta name="twitter:card" content="${image ? "summary_large_image" : "summary"}">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
${schema.map(jsonLd).join("\n")}
<style>${css}${EXTRA_CSS}</style>
</head>
<body>
<div class="topbar"></div>
<header class="header"><div class="container header-inner">
  <a class="logo" href="${BASE}">Discount<span>Price</span></a>
  <span style="flex:1"></span>
  <a class="header-link" href="${BASE}#latest-deals">Latest Deals</a>
  <a class="header-link" href="${BASE}stores/">Stores</a>
  <a class="header-link" href="${BASE}blog/">Blog</a>
  <a class="header-link" href="${BASE}#faqs">FAQs</a>
</div></header>
<main class="container page-main">
${body}
</main>
<footer><div class="container">
  <div class="footer-inner">
    <div><div class="logo">Discount<span style="color:#fff">Price</span></div><p>Find deals, coupons and special offers from stores around the world. Shop smarter and save more with Discount Price.</p></div>
    <div class="footer-links"><a href="${BASE}">Home</a><a href="${BASE}stores/">Stores</a><a href="${BASE}blog/">Blog</a><a href="${BASE}#faqs">FAQs</a></div>
  </div>
  <div class="copyright">© ${new Date().getFullYear()} ${SITE_NAME}. All rights reserved.</div>
</div></footer>
<script>document.addEventListener("click",function(e){var b=e.target.closest("[data-copy]");if(!b)return;var t=b.getAttribute("data-copy");if(navigator.clipboard)navigator.clipboard.writeText(t);var o=b.textContent;b.textContent="Copied!";setTimeout(function(){b.textContent=o},1500)});</script>
</body>
</html>
`;
}

const logoHtml = (store) => {
  const name = esc(store.name || "Store");
  return store.logo_url
    ? `<img src="${esc(store.logo_url)}" alt="${name}" loading="lazy">`
    : `<span class="letter-logo">${name.charAt(0).toUpperCase()}</span>`;
};

function couponCard(c, store, storeHref) {
  const hasCode = String(c.coupon_type || "").toLowerCase().includes("code") || Boolean(c.code);
  const codeBtn = hasCode && c.code ? `<button class="code-btn" type="button" data-copy="${esc(c.code)}">Copy Code: ${esc(c.code)}</button>` : "";
  const link = c.affiliate_url || store.aff_url || store.web_url || BASE;
  return `<article class="deal-card">
  <a class="deal-logo" href="${storeHref}"><div class="store-logo">${logoHtml(store)}</div></a>
  <div class="deal-content">
    ${c.is_featured ? `<span class="pill">FEATURED DEAL</span>` : ""}
    <div class="deal-store"><a href="${storeHref}">${esc(store.name)}</a></div>
    <h3>${esc(c.title || "Special Offer")}</h3>
    ${c.description ? `<p class="deal-desc">${esc(c.description)}</p>` : ""}
    <div class="deal-actions">${codeBtn}<a class="claim-btn" href="${esc(link)}" target="_blank" rel="nofollow sponsored noopener">Get Deal</a></div>
  </div>
</article>`;
}

// Blog text ko paragraphs mein badalta hai. "# " / "## " se shuru hone wali line heading banti hai.
function renderContent(text) {
  return String(text ?? "").replace(/\r\n/g, "\n").split(/\n{2,}/).map((block) => {
    const b = block.trim();
    if (!b) return "";
    if (/^##\s+/.test(b)) return `<h3>${esc(b.replace(/^##\s+/, ""))}</h3>`;
    if (/^#\s+/.test(b)) return `<h2>${esc(b.replace(/^#\s+/, ""))}</h2>`;
    return `<p>${esc(b).replace(/\n/g, "<br>")}</p>`;
  }).join("\n");
}

const write = (rel, content) => {
  const file = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
};

// ---------- main ----------
const { stores: allStores, coupons: allCoupons, blogPosts: allPosts, faqs: allFaqs } = await loadData();

const stores = allStores.filter(isActive).map((s) => ({ ...s, slug: slugify(s.slug || s.name) })).filter((s) => s.slug);
const storeById = new Map(stores.map((s) => [String(s.id), s]));
const coupons = allCoupons.filter(isActive).filter((c) => storeById.has(String(c.store_id)))
  .sort((a, b) => Number(b.is_featured === true) - Number(a.is_featured === true) || Number(a.sort_order || 0) - Number(b.sort_order || 0));
const posts = allPosts.filter((p) => p.status === "published" && !p.external_url).map((p) => ({ ...p, slug: slugify(p.slug || p.title) })).filter((p) => p.slug);
const faqs = allFaqs.filter((f) => f.is_active);

// Purane generated folders saaf karo (delete / unpublish hue pages hat jayein)
fs.rmSync(path.join(ROOT, "stores"), { recursive: true, force: true });
fs.rmSync(path.join(ROOT, "blog"), { recursive: true, force: true });

const sitemap = [{ loc: BASE, priority: "1.0", lastmod: new Date().toISOString().slice(0, 10) },
  { loc: BASE + "stores/", priority: "0.8" }, { loc: BASE + "blog/", priority: "0.8" }];

// --- store pages ---
for (const store of stores) {
  const url = `${BASE}stores/${store.slug}/`;
  const storeCoupons = coupons.filter((c) => String(c.store_id) === String(store.id));
  const related = posts.filter((p) => String(p.store_id || "") === String(store.id));
  const sFaqs = faqs.filter((f) => String(f.store_id || "") === String(store.id));
  const desc = store.description || `Find current deals, offers and discount codes for ${store.name} at ${SITE_NAME}.`;
  const title = store.seo_title || `${store.name} Deals & Promo Codes | ${SITE_NAME}`;
  const metaDesc = store.seo_description || trunc(desc, 155);

  const body = `<div class="crumbs"><a href="${BASE}">Home</a> › <a href="${BASE}stores/">Stores</a> › ${esc(store.name)}</div>
<div class="store-page-head">
  <div class="store-logo">${logoHtml(store)}</div>
  <div><h1>${esc(store.name)} Deals &amp; Promo Codes</h1><p>${esc(desc)}</p></div>
</div>
<section class="section"><div class="section-head"><div><h2>${esc(store.name)} Deals &amp; Coupons</h2></div></div>
<div class="deal-list">${storeCoupons.length ? storeCoupons.map((c) => couponCard(c, store, `${BASE}stores/${store.slug}/`)).join("\n") : `<div class="empty">There are currently no active deals for this store.</div>`}</div></section>
${related.length ? `<section class="section"><div class="section-head"><div><h2>${esc(store.name)} Guides &amp; Tips</h2></div></div><div class="deal-list">${related.map((p) => `<article class="blog-card"><h3>${esc(p.title)}</h3><p>${esc(p.excerpt || "")}</p><a href="${BASE}blog/${p.slug}/">Read guide</a></article>`).join("")}</div></section>` : ""}
${sFaqs.length ? `<section class="section"><div class="section-head"><div><h2>${esc(store.name)} FAQs</h2></div></div><div class="faq-list">${sFaqs.map((f) => `<article class="faq-item"><h3>${esc(f.question)}</h3><p>${esc(f.answer)}</p></article>`).join("")}</div></section>` : ""}
<p style="font-size:11px;color:var(--muted)">Offers and codes can change. Always check the terms on the store website before you buy. Some links are affiliate links.</p>`;

  const schema = [{
    "@context": "https://schema.org", "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: BASE },
      { "@type": "ListItem", position: 2, name: "Stores", item: BASE + "stores/" },
      { "@type": "ListItem", position: 3, name: store.name, item: url },
    ],
  }];
  if (sFaqs.length) schema.push({
    "@context": "https://schema.org", "@type": "FAQPage",
    mainEntity: sFaqs.map((f) => ({ "@type": "Question", name: f.question, acceptedAnswer: { "@type": "Answer", text: f.answer } })),
  });

  write(`stores/${store.slug}/index.html`, layout({ title, description: metaDesc, canonical: url, image: store.logo_url, body, schema }));
  sitemap.push({ loc: url, priority: "0.9", lastmod: new Date().toISOString().slice(0, 10) });
}

// --- stores index ---
write("stores/index.html", layout({
  title: `All Stores — Deals & Coupons | ${SITE_NAME}`,
  description: `Browse all stores with current deals, coupons and discount codes at ${SITE_NAME}.`,
  canonical: BASE + "stores/",
  body: `<div class="crumbs"><a href="${BASE}">Home</a> › Stores</div><h1 style="font-size:22px">All Stores</h1>
<div class="store-grid">${stores.map((s) => {
    const n = coupons.filter((c) => String(c.store_id) === String(s.id)).length;
    return `<article class="store-card"><a href="${BASE}stores/${s.slug}/"><div class="store-logo">${logoHtml(s)}</div><h3>${esc(s.name)}</h3><div class="store-count">${n} active deal${n === 1 ? "" : "s"}</div><span class="small-red-btn">View Store Deals</span></a></article>`;
  }).join("")}</div>`,
}));

// --- blog pages ---
for (const post of posts) {
  const url = `${BASE}blog/${post.slug}/`;
  const store = post.store_id ? storeById.get(String(post.store_id)) : null;
  const title = post.seo_title || `${post.title} | ${SITE_NAME}`;
  const desc = post.seo_description || trunc(post.excerpt || post.content || post.title, 155);
  const published = post.published_at || null;
  const body = `<div class="crumbs"><a href="${BASE}">Home</a> › <a href="${BASE}blog/">Blog</a> › ${esc(trunc(post.title, 60))}</div>
<article class="prose" style="max-width:760px">
<h1 style="font-size:26px;line-height:1.25">${esc(post.title)}</h1>
${published ? `<p style="font-size:11px;color:var(--muted)">Published ${esc(String(published).slice(0, 10))}</p>` : ""}
${post.featured_image ? `<img src="${esc(post.featured_image)}" alt="${esc(post.title)}" style="width:100%;max-height:360px;object-fit:cover;border-radius:8px;margin-bottom:14px">` : ""}
${renderContent(post.content || post.excerpt)}
${store ? `<p><a class="claim-btn" href="${BASE}stores/${store.slug}/">See ${esc(store.name)} deals &amp; coupons</a></p>` : ""}
</article>`;
  const schema = [{
    "@context": "https://schema.org", "@type": "Article",
    headline: trunc(post.title, 110), description: desc,
    ...(post.featured_image ? { image: [post.featured_image] } : {}),
    ...(published ? { datePublished: published } : {}),
    dateModified: post.updated_at || published || undefined,
    author: { "@type": "Organization", name: SITE_NAME },
    publisher: { "@type": "Organization", name: SITE_NAME },
    mainEntityOfPage: url,
  }];
  write(`blog/${post.slug}/index.html`, layout({ title, description: desc, canonical: url, ogType: "article", image: post.featured_image, body, schema }));
  sitemap.push({ loc: url, priority: "0.7", lastmod: String(post.updated_at || published || new Date().toISOString()).slice(0, 10) });
}

// --- blog index ---
write("blog/index.html", layout({
  title: `Shopping Tips & Guides | ${SITE_NAME}`,
  description: `Helpful shopping guides, coupon tips and deal advice from ${SITE_NAME}.`,
  canonical: BASE + "blog/",
  body: `<div class="crumbs"><a href="${BASE}">Home</a> › Blog</div><h1 style="font-size:22px">Shopping Tips &amp; Guides</h1>
<div class="deal-list">${posts.length ? posts.map((p) => `<article class="blog-card"><h3>${esc(p.title)}</h3><p>${esc(p.excerpt || "")}</p><a href="${BASE}blog/${p.slug}/">Read more</a></article>`).join("") : `<div class="empty">New shopping guides are coming soon.</div>`}</div>`,
}));

// --- sitemap + robots ---
write("sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemap.map((u) => `  <url><loc>${esc(u.loc)}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ""}<priority>${u.priority}</priority></url>`).join("\n")}
</urlset>
`);
write("robots.txt", `User-agent: *\nAllow: /\n\nSitemap: ${BASE}sitemap.xml\n`);

console.log(`Done: ${stores.length} store pages, ${posts.length} blog pages, ${sitemap.length} sitemap URLs.`);
