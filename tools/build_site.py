#!/usr/bin/env python3
"""
Static multi-page builder for the Lumenara Surgical site.

Every menu item gets its own page (and URL):

    /                 home          src/pages/home.html
    /platform/        platform      src/pages/platform.html
    /technology/      technology    src/pages/technology.html
    /specialties/     specialties   src/pages/specialties.html
    /outcomes/        outcomes      src/pages/outcomes.html
    /training/        training      src/pages/training.html
    /company/         company       src/pages/company.html
    /demo/            demo request  src/pages/demo.html
    /404.html         not found     src/pages/404.html

Each page source starts with a front-matter comment:

    <!--
    title: Platform
    description: One sentence for search engines.
    eyebrow: The platform                (sub-pages: page-hero label)
    heading: One system. Open, laparoscopic and micro-surgical.
    lead: Intro paragraph under the heading.
    image: media/macro.jpg               (page-hero background, relative to assets/)
    position: 50% 40%                    (optional object-position for the image)
    -->
    ...page body HTML...

Inside the body, write `{{root}}` before any site-relative link or asset
(`{{root}}assets/...`, `{{root}}platform/`). The builder replaces it with the
right relative prefix ("" on the home page, "../" on sub-pages), so the output
works on Vercel, GitHub Pages (sub-path) and a plain local static server alike.

Usage:  python3 tools/build_site.py
"""

from __future__ import annotations

import html
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "src" / "pages"
SITE_NAME = "Lumenara Surgical"

# order = menu order = "next page" order
NAV = [
    ("platform", "Platform"),
    ("technology", "Technology"),
    ("specialties", "Specialties"),
    ("outcomes", "Outcomes"),
    ("training", "Training"),
    ("company", "Company"),
    ("press", "Press"),
]
# press releases: src/pages/press/<slug>.html -> /press/<slug>/
RELEASES = sorted((p.stem for p in (SRC / "press").glob("*.html")), reverse=False)
PAGES = ["home"] + [slug for slug, _ in NAV] + [f"press/{r}" for r in RELEASES] + ["demo", "404"]

LOGO = (
    '<svg class="brand__mark" viewBox="0 0 32 32" aria-hidden="true">'
    '<circle cx="16" cy="16" r="14.5" fill="none" stroke="currentColor" stroke-width="1.5" opacity=".35"/>'
    '<path d="M6 21c3-9 7-13 10-13s7 4 10 13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>'
    '<circle cx="16" cy="8" r="2.4" fill="var(--accent)"/></svg>'
)
ARROW = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>'


def parse(path: Path) -> tuple[dict, str]:
    text = path.read_text(encoding="utf-8")
    m = re.match(r"\s*<!--(.*?)-->\s*", text, re.S)
    meta: dict[str, str] = {}
    if m:
        for line in m.group(1).strip().splitlines():
            if ":" in line:
                k, v = line.split(":", 1)
                meta[k.strip()] = v.strip()
        text = text[m.end():]
    return meta, text


def href(slug: str, root: str) -> str:
    return f"{root}{'' if slug == 'home' else slug + '/'}" or "./"


def header(active: str, root: str) -> str:
    links = []
    for slug, label in NAV:
        cur = ' aria-current="page" class="is-active"' if slug == active else ""
        links.append(f'<a href="{href(slug, root)}"{cur}>{label}</a>')
    nav = "\n        ".join(links)
    mob = "\n      ".join(links)
    home = href("home", root)
    return f"""<header class="nav" id="top">
    <div class="nav__inner">
      <a class="brand" href="{home}" aria-label="{SITE_NAME} home">
        {LOGO}
        <span>Lumenara<small>Surgical</small></span>
      </a>
      <nav class="nav__links" aria-label="Primary">
        {nav}
      </nav>
      <div class="nav__actions">
        <a class="btn btn--sm btn--ghost btn--doc nav__doc" href="{root}assets/docs/Lumenara_Company_Profile.pdf" target="_blank" rel="noopener" aria-label="Company profile, PDF, opens in a new tab"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M12 11v6M9 14l3 3 3-3"/></svg> Company profile <span class="btn__tag">PDF</span></a>
        <a class="btn btn--sm btn--primary nav__cta" href="{href('demo', root)}">Request a demo</a>
      </div>
      <button class="nav__burger" aria-label="Open menu" aria-expanded="false" aria-controls="mobile-menu">
        <span></span><span></span>
      </button>
    </div>
    <div class="mobile-menu" id="mobile-menu" hidden>
      {mob}
      <a class="btn btn--ghost btn--doc" href="{root}assets/docs/Lumenara_Company_Profile.pdf" target="_blank" rel="noopener" aria-label="Company profile, PDF, opens in a new tab"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M12 11v6M9 14l3 3 3-3"/></svg> Company profile <span class="btn__tag">PDF</span></a>
      <a class="btn btn--primary" href="{href('demo', root)}">Request a demo</a>
    </div>
  </header>"""


def footer(root: str) -> str:
    h = lambda s: href(s, root)  # noqa: E731
    return f"""<footer class="footer">
    <div class="container footer__grid">
      <div>
        <a class="brand" href="{h('home')}">{LOGO}<span>Lumenara<small>Surgical</small></span></a>
        <p class="footer__tag">Precision beyond the human hand.</p>
      </div>
      <nav aria-label="Footer: Platform"><h4>Platform</h4><a href="{h('platform')}">Arc System</a><a href="{h('platform')}#microwrist">MicroWrist instruments</a><a href="{h('technology')}">Motion engine</a><a href="{h('training')}">Training</a></nav>
      <nav aria-label="Footer: Company"><h4>Company</h4><a href="{h('company')}">About</a><a href="{h('press')}">Press releases</a><a href="{root}assets/docs/Lumenara_Company_Profile.pdf" target="_blank" rel="noopener">Company profile (PDF)</a><a href="{h('company')}">Careers</a><a href="{h('demo')}">Contact</a></nav>
      <nav aria-label="Footer: Resources"><h4>Resources</h4><a href="{h('outcomes')}">Clinical outcomes</a><a href="{h('specialties')}">Specialties</a><a href="{h('demo')}">Customer support</a><a href="{h('demo')}">Safety information</a></nav>
    </div>
    <div class="container footer__legal">
      <p>&copy; <span data-year>2026</span> {SITE_NAME}. Concept website &mdash; Lumenara is a fictional company; product names, specifications and figures are illustrative only.</p>
      <p>Hero and instrument imagery procedurally modelled and rendered in <a href="https://www.blender.org/" rel="noopener" target="_blank">Blender</a> (Cycles).</p>
    </div>
  </footer>"""


def page_hero(meta: dict, root: str, slug: str) -> str:
    img = meta.get("image", "media/hero-poster.jpg")
    pos = meta.get("position", "60% 50%")
    top = slug.split("/")[0]
    label = dict(NAV).get(slug, meta.get("crumb", meta.get("title", "")))
    trail = f'<a href="{href("home", root)}">Home</a><span aria-hidden="true">/</span>'
    if "/" in slug:
        trail += f'<a href="{href(top, root)}">{dict(NAV).get(top, top.title())}</a><span aria-hidden="true">/</span>'
    return f"""<section class="page-hero{' page-hero--article' if '/' in slug else ''}">
      <div class="page-hero__media" aria-hidden="true"><img src="{root}assets/{img}" alt="" style="object-position:{pos}" width="1920" height="1080"></div>
      <div class="container page-hero__inner">
        <nav class="crumbs" aria-label="Breadcrumb">{trail}<span aria-current="page">{html.escape(label)}</span></nav>
        <p class="eyebrow">{meta.get('eyebrow', '')}</p>
        <h1>{meta.get('heading', '')}</h1>
        {f'<p class="page-hero__lead">{meta["lead"]}</p>' if meta.get('lead') else ''}
      </div>
    </section>"""


def next_link(slug: str, root: str) -> str:
    order = [s for s, _ in NAV]
    if slug not in order:
        return ""
    i = order.index(slug)
    nxt = order[(i + 1) % len(order)]
    label = dict(NAV)[nxt]
    return f"""<section class="next-page">
      <div class="container next-page__inner">
        <a class="next-page__link" href="{href(nxt, root)}"><span class="mono">Next</span><b>{label}</b>{ARROW}</a>
        <a class="btn btn--primary" href="{href('demo', root)}">Request a demo {ARROW}</a>
      </div>
    </section>"""


def press_list(root: str, exclude: str = "", compact: bool = False) -> str:
    items = []
    for r in RELEASES:
        if r == exclude:
            continue
        meta, _ = parse(SRC / "press" / f"{r}.html")
        items.append((meta.get("date_iso", ""), r, meta))
    items.sort(reverse=True)
    cards = []
    for _, r, m in items:
        img = m.get("image", "media/hero-poster.jpg")
        pos = m.get("position", "50% 50%")
        media = "" if compact else f'<div class="release-card__media"><img src="{root}assets/{img}" alt="" style="object-position:{pos}" loading="lazy" width="1600" height="900"></div>'
        cards.append(f"""<a class="release-card reveal{' release-card--compact' if compact else ''}" href="{root}press/{r}/">
          {media}<div class="release-card__body"><span class="mono">{m.get('category', 'Press release')} · {m.get('date', '')}</span>
          <h3>{m.get('heading', m.get('title', ''))}</h3>{'' if compact else f'<p>{m.get("lead", "")}</p>'}<span class="release-card__go">Read the release →</span></div>
        </a>""")
    return "\n".join(cards)


def render(slug: str) -> tuple[Path, str]:
    meta, body = parse(SRC / f"{slug}.html")
    root = "" if slug in ("home", "404") else "../" * (slug.count("/") + 1)
    # 404 is served from arbitrary depths, so it uses absolute site paths
    if slug == "404":
        root = "/"
    title = meta.get("title", SITE_NAME)
    full_title = SITE_NAME if slug == "home" else f"{title} | {SITE_NAME}"
    full_title = meta.get("full_title", full_title)
    desc = html.escape(meta.get("description", ""), quote=True)
    if "{{press_list}}" in body:
        body = body.replace("{{press_list}}", press_list(root))
    if "{{more_releases}}" in body:
        body = body.replace("{{more_releases}}", press_list(root, exclude=slug.split("/")[-1], compact=True))
    body = body.replace("{{root}}", root).replace("{{demo}}", href("demo", root))
    hero = page_hero(meta, root, slug) if slug not in ("home", "404") else ""
    nxt = next_link(slug, root)
    out = f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{html.escape(full_title)}</title>
  <meta name="description" content="{desc}">
  <meta name="theme-color" content="#05090d">
  <meta property="og:site_name" content="{SITE_NAME}">
  <meta property="og:title" content="{html.escape(full_title, quote=True)}">
  <meta property="og:description" content="{desc}">
  <meta property="og:image" content="{root}assets/media/hero-poster.jpg">
  <link rel="icon" href="{root}assets/img/favicon.svg" type="image/svg+xml">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="{root}assets/css/style.css">
</head>
<body class="page page--{slug}">
  <a class="skip" href="#main">Skip to content</a>

  {header(slug.split("/")[0], root)}

  <main id="main">
    {hero}
{body.rstrip()}
    {nxt}
  </main>

  {footer(root)}

  <script src="{root}assets/js/main.js" defer></script>
</body>
</html>
"""
    if slug == "home":
        path = ROOT / "index.html"
    elif slug == "404":
        path = ROOT / "404.html"
    else:
        path = ROOT / slug / "index.html"
    return path, out


def main() -> None:
    for slug in PAGES:
        path, out = render(slug)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(out, encoding="utf-8")
        print(f"built {path.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
