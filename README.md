# blackgauss.github.io

Static portfolio site.

## Structure

```
├── index.html
├── about.html
├── projects.html
├── css/
│   ├── main.css
│   └── components.css
├── js/
│   ├── main.js
│   └── api.js
├── data/
│   └── config.js
└── assets/
```

## Setup

Edit content in `data/config.js`, then push to GitHub.

## Local Development

```bash
python -m http.server 8000
```

## Deploy

```bash
git add .
git commit -m "Update"
git push origin main
```

Site will be live at `https://blackgauss.github.io`