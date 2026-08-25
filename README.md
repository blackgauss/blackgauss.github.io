# Notes on Adtech & Systems

A plain-text notebook on distributed systems and advertising engineering, rendered with GitHub Pages' native Jekyll engine.

## Setup

Write Markdown posts as `*.md` files with YAML front matter (`layout: default`), then push. GitHub Pages builds and serves them with no local tooling.

## Local Development

```bash
jekyll serve
```

## Deploy

```bash
git push origin main
```

Site is live at `https://blackgauss.github.io`. In repo Settings → Pages, ensure the source is **Deploy from a branch**, branch `main` at `/ (root)`.