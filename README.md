# EUROART — one-page website

A one-page scrolling website for **EUROART**, a Slovak advertising agency working in computer graphics and publishing since 1997. The agency designs and produces promotional and informational print — leaflets, calendars, cycling maps, brochures, books and monographs — primarily for municipalities, towns, educational institutions, civic associations and micro-regions, and also offers accounting services.

The site is a static build (plain HTML/CSS/JS, no framework) implemented from a [Claude Design](https://claude.ai/design) prototype. It is runnable and buildable with Bun, and the generated `dist/` folder is ready for any static host: Cloud Storage, GitHub Pages, Netlify, etc.

## Goals

- **Present the agency** and its track record (since 1997, award-winning publications) in a modern, cozy way that still feels like a print-and-craft studio.
- **Showcase the brand imagery**: the agency's grey "chalk sketch" photo series (hand-drawn chalk concepts held by real hands) is the visual backbone of every section.
- **Convert visitors into meetings** — every path leads to the contact section ("Dohodnite si stretnutie" / "Book a meeting"); the first consultation is free.
- **Serve two audiences**: Slovak is the primary language with a full English translation behind an SK/EN toggle.

## Page structure

One scrolling page with a sticky, blurred header. Sections in order:

| # | Section (SK) | Anchor | Content |
| --- | --- | --- | --- |
| 1 | Intro | `#top` | Full-width hero panel on the falling-cubes image, headline with a hand-written sub-line, floating paper-plane accent, two CTAs |
| 2 | O nás | `#about` | Agency story, "Čo pre Vás môžeme urobiť?" pitch, badge chips (1997 → today, EIZO · Canon EOS, target clients), marionette sketch |
| 3 | Služby | `#services` | Five services in an accordion (Grafický dizajn, Redakčné práce, Fotografia, Výroba web-stránok, Doplnkové reklamné služby) next to a sticky idea-board sketch |
| 4 | Naša ponuka | `#offer` | What the agency prints, in three tabs (Firemné tlačoviny / Tlačoviny pre inštitúcie / Tlačoviny pre obce a mestá) plus an awards grid of six prize-winning publications |
| 5 | Účtovníctvo | `#accounting` | Deep-blue band describing the bookkeeping services, with a CTA card ("first consultation is free") |
| 6 | Kontakt | `#contact` | Contact rows (e-mail, phone, address), coffee-cup sketch, and a contact form with a sent-state |
| — | Footer | | Logo, tagline, rights |

## Design

### Brand & visual language

- **Logo**: an isometric cube in brand yellow + two blues (inline SVG, `index.html`), wordmark "EURO" (blue) + "ART" (ink).
- **Palette**: brand yellow `#FFD500` and EUROART blue `#1B3FA0` / deep blue `#16337F` over warm paper neutrals.
- **Typography** (Google Fonts):
  - *Bricolage Grotesque* — headings, expressive and modern;
  - *Figtree* — body text and UI;
  - *Caveat* — the "hand-written" accent lines (e.g. "… my vieme, ako na to!"), slightly rotated (−1°) for a chalk-on-board feel.
- **Shape language**: large rounded corners (`--r-lg: 22px`, `--r: 14px`), pill buttons and chips, soft long-throw shadows.

### The duotone hover effect

The signature interaction. Every grey chalk image cross-fades into a **blue→yellow duotone** version of itself on hover ("naše farby ✦" tooltip appears). Implementation:

- A reusable SVG filter `#ea-duotone` is defined once at the top of `index.html`: a luminance `feColorMatrix` followed by an `feComponentTransfer` mapping shadows→deep blue and highlights→yellow.
- Each `figure.sketch` holds the grey `<img>` plus an absolutely positioned duplicate inside `.duo` with `filter: url(#ea-duotone)`; hovering fades `.duo` from 0 to 1 and gently zooms the image.
- The filter is intentionally portable — apply `filter="url(#ea-duotone)"` to any `<image>` inside an SVG, or `filter: url(#ea-duotone)` in CSS, to reuse the effect elsewhere.
- Global override classes on `<body>`: `img-hover` (default, duotone on hover), `img-color` (always duotone), `img-grey` (never).

### Themes

Three complete looks were explored during the design phase; all are kept in `css/style.css` as CSS-variable sets, switched by `data-theme` on `<html>`:

| Theme | Value | Look |
| --- | --- | --- |
| **Galéria** (default) | `galeria` | Light, warm paper background — cozy gallery feel |
| Krieda | `krieda` | Dark chalkboard greys with brightened blues |
| Split | `split` | Pure white page with alternating dark-grey bands (`.sec-grey`) echoing the photo backdrops |

Only `data-theme` needs to change — every component reads the variables (`--bg`, `--ink`, `--muted`, `--blue`, `--surface`, `--line`, …).

### Motion

- **Scroll reveal**: elements with class `.rv` fade/slide in when entering the viewport. Implemented with `requestAnimationFrame` + `getBoundingClientRect` (no IntersectionObserver — chosen for reliability in embedded webviews).
- **Floating paper plane** in the hero and on the form's sent-state (`@keyframes float`).
- Accordion, tabs, buttons and cards have soft 0.2–0.5 s transitions.
- All non-essential motion is disabled under `prefers-reduced-motion`, and can be force-disabled with the `no-motion` class on `<body>`.

## Architecture

| Path | Purpose |
| --- | --- |
| `index.html` | All markup. Static skeleton with `data-i18n="path.to.key"` attributes for translatable text and `data-*` mount points for JS-rendered lists. Contains the `#ea-duotone` SVG filter and the inline logo SVGs. |
| `css/style.css` | Full design system: theme variable sets, header, hero, sections, sketch/duotone, accordion, tabs, awards, accounting band, contact form, footer, reveal animations, responsive rules. |
| `js/content.js` | **All copy lives here** — `window.EUROART_I18N` with complete `sk` and `en` trees (nav, hero, about, services, offer incl. tabs and awards, accounting, contact incl. form strings, footer). Edit text here, not in the HTML. |
| `js/main.js` | Behaviour: language toggle (persisted to `localStorage` as `euroart-lang`), i18n application, accordion/tabs/awards rendering from the content tree, contact-form sent-state, scroll reveal. No dependencies. |
| `assets/` | Web-optimized imagery (see below). |
| `scripts/dev.ts` | Bun-native static development server for the source tree or `dist/`. |
| `scripts/build.ts` | Bun-native build script that recreates `dist/` from the deployable static files. |
| `deploy/bootstrap-gcp.sh` | Interactive GCP deployment setup (see Deploying). |

The design prototype was React-based; the production implementation deliberately re-creates the same visual output in dependency-free vanilla JS (~200 lines) since a one-page marketing site needs no framework runtime.

### Internationalisation

- `index.html` ships language-neutral; `js/main.js` fills every `[data-i18n]` element from `EUROART_I18N[lang]` on load and on toggle.
- Dynamic blocks (services accordion, offer tabs, awards) re-render on language switch.
- `<html lang>` is kept in sync; the choice persists across visits via `localStorage`.
- Adding a language = adding one more top-level tree in `js/content.js` plus a button in the header `.lang` group.

### Imagery

All images live in `assets/`, downscaled to ≤1600 px and recompressed (60–110 KB each) from 6000×4000 originals.

**Currently used on the page:** all core visual assets are placed across the hero, process strip, about visuals, service thumbnails, offer visuals, accounting grid and contact band: `brain-web.jpg`, `bulb-handover-web.jpg`, `bulb-handover-2-web.jpg`, `coffee-vaping.svg`, `coffee-web.png`, `coffee-wide-web.jpg`, `cubes-web.png`, `cubes-wide-web.jpg`, `globe-wide-web.jpg`, `graphs-web.jpg`, `hammer-money-web.jpg`, `idea-web.png`, `ideas-web.jpg`, `marionette-web.png`, `marionette-wide-web.jpg`, `money-web.jpg`, `money-2-web.jpg`, `phone-web.png`, `phone-wide-web.jpg` and `plane.png`.

### Accessibility

- Semantic landmarks (`header`/`nav`/`main`/`section`/`footer`), labelled controls (`aria-label`, `aria-expanded` on the accordion, `role="tablist"`/`tab` + `aria-selected` on tabs).
- Keyboard-reachable interactive elements (real `<button>`/`<a>`), visible focus rings on form fields.
- Reduced-motion support as described above; decorative images carry empty `alt`.

## Run And Build With Bun

Install Bun if needed, then run the source site locally:

```sh
bun i
bun dev
# -> http://localhost:3000
```

Build the deployable static site:

```sh
bun run build
```

Preview the built `dist/` folder:

```sh
bun run preview
# -> http://localhost:4173
```

Serving is recommended because the language preference uses `localStorage`, which some browsers restrict on `file://`.

## Deploying to GCP Cloud Run

Run the interactive bootstrap script:

```sh
./deploy/bootstrap-gcp.sh
```

It asks for the path to your service-account JSON key (kept out of the repo; stored as the `GCP_SA_KEY` GitHub Actions secret), the GCP project, Cloud Run service name, region, Artifact Registry repository and deploy branch. It then generates `.github/workflows/deploy-gcp.yml`, which builds the Bun static site into a container, pushes it to Artifact Registry, and deploys it to Cloud Run on every push.

The deployment service account needs:

- `roles/run.admin`
- `roles/artifactregistry.admin`
- `roles/serviceusage.serviceUsageAdmin`
- `roles/iam.serviceAccountUser` on the Cloud Run runtime service account

## Known placeholders / pre-launch checklist

- **Phone and address** in the Kontakt section are placeholders (`js/content.js` → `contact.phone` / `contact.address`).
- **Contact form** shows a client-side sent-state only — wire it to a backend or form service (the submit handler is in `js/main.js`).
- **Theme choice**: Galéria is live; decide whether Krieda or Split should replace it (one-attribute change).
- The outdated "Kalendáre a diáre na rok 2021" link from the old site was intentionally dropped during the design phase.
