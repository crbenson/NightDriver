# NightDriver documentation site

This folder is a self-contained, static documentation site for the [NightDriver repository](https://github.com/crbenson/NightDriver). It is designed to publish through GitHub Pages and requires no build step, package install, or server-side code.

## Pages

- `index.html` — the home page and **Pattern Lab**: a live LED simulator with 10 effects, 8 palettes, strip/matrix/ring layouts, random pattern generation, a gallery, browser-local presets, and JSON/C++ export.
- `patterns.md` — reference guide for effects, palettes, parameters, export formats, and moving a design into firmware.
- `styles.css` — all styling.
- `app.js` — all interaction and rendering. Uses only browser APIs (Canvas, localStorage, Clipboard).
- `assets/NightDriverLogo-small.png` — logo copied from the repository's `assets/` folder so the site works when Pages serves only `/docs`.

## Publish with GitHub Pages

In the repository settings:

1. Go to **Settings → Pages**.
2. Under **Build and deployment**, set **Source** to **Deploy from a branch**.
3. Choose branch `main` and folder `/docs`, then save.

The site will be available at `https://crbenson.github.io/NightDriver/`. To publish locally first, open `docs/index.html` directly in a browser — all features work from `file://` except clipboard fallback, which is handled.

## How the Pattern Lab works

- `app.js` defines effect functions that map normalized LED coordinates to RGB values. The same renderer drives the main preview and the gallery thumbnails.
- **Generate** randomizes effect, palette, and animation parameters while keeping your layout. **Surprise me** also randomizes layout and LED count.
- Generated designs are added to an in-memory gallery (last 12). Presets saved with **Save** go to `localStorage` under `nightdriver.patternlab.presets.v1`.
- Export produces either a neutral JSON description or a C++ snippet using the repository's `PaletteEffect` constructor and `ADD_EFFECT` macro. The C++ output is a starting point, not a drop-in firmware build.

## Maintaining the site

- Add a new effect by extending the `EFFECTS` list and adding a renderer to `EFFECT_FNS` in `app.js`, then document it in `patterns.md`.
- Add a palette by extending `PALETTES`. Custom color pickers work independently of that list.
- Firmware effect numbers must stay in sync with `include/effects.h`. Additions belong at the end with a new number; never renumber existing effects, because saved effect JSON references them.

No build tooling is used. Please avoid adding dependencies that would require a bundler — the site should keep working by opening a single HTML file.
