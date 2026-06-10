# EUROART — one-page website

Static one-page site for the EUROART advertising agency (graphic design, print and publications since 1997). No build step — plain HTML/CSS/JS, ready for any static host (GitHub Pages, Netlify, …).

## Run locally

Open `index.html` in a browser, or serve the folder:

```sh
python3 -m http.server 8000
# → http://localhost:8000
```

(Serving is recommended — the language preference uses `localStorage`, which some browsers restrict on `file://`.)

## Structure

| Path | Purpose |
| --- | --- |
| `index.html` | Page markup, sections: Intro, O nás, Služby, Naša ponuka, Účtovníctvo, Kontakt |
| `css/style.css` | All styles, including the three theme variants |
| `js/content.js` | All copy in Slovak and English (`window.EUROART_I18N`) — edit text here |
| `js/main.js` | SK/EN toggle, services accordion, offer tabs, contact form, scroll-reveal |
| `assets/` | Brand chalk-sketch imagery (web-sized) |

## Features

- **SK / EN toggle** in the header; the choice is remembered in `localStorage`.
- **Blue→yellow duotone hover**: grey chalk images cross-fade into the EUROART palette on hover. The effect is a reusable SVG filter (`#ea-duotone`, defined at the top of `index.html`) — apply `filter: url(#ea-duotone)` to any element or `<image>` inside an SVG.
- **Themes**: the default look is *Galéria* (light). Two alternatives from the design phase are kept in the CSS — switch by changing `data-theme` on `<html>` to `krieda` (dark chalkboard) or `split` (white/grey bands).
- Image hover behaviour can be forced via a class on `<body>`: `img-hover` (default), `img-color` (always duotone), `img-grey` (never).

## Known placeholders

- Phone and address in the Kontakt section (`js/content.js` → `contact.phone` / `contact.address`).
- The contact form shows a sent-state only — wire it to a backend or form service before launch.
