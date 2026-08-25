# blackgauss.github.io

A plain-text notebook on distributed systems and advertising engineering, rendered with GitHub Pages' native Jekyll engine.

## Structure

- `index.html` — 1990s-style landing page (raw HTML, browser-default rendering)
- `adtech.md` — journal index at `/adtech`, auto-listed from `site.posts`
- `_posts/YYYY-MM-DD-slug.md` — dated journal entries; Jekyll groups and dates them for you

## Writing

Add a file to `_posts/`:

```text
_posts/2026-08-25-auction-latency.md
```

```markdown
---
layout: default
title: Notes on Sub-100ms Auction Latency
---

Your writing here.
```

Push and it appears at `/2026/08/25/auction-latency/`, linked from `/adtech`. No front-matter dates, no manual index updates.

## Local Development

```bash
jekyll serve
```

## Deploy

```bash
git push origin main
```

Site is live at `https://blackgauss.github.io`.