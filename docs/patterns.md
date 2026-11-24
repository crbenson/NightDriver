---
title: Pattern guide
layout: default
---

# Pattern guide

The Pattern Lab is a browser-based simulator for NightDriver effects. It runs entirely on your machine — nothing is uploaded. Use it to explore a design, then export it as JSON or as a C++ starting point for the firmware.

## Quick start

1. Open the [Pattern Lab home page](index.html).
2. Pick an **effect** and a **palette**.
3. Move the sliders until the preview looks right.
4. Press **Generate new pattern** to let the lab invent a fresh combination, or **Surprise me** to randomize the layout too.
5. Click a card in the gallery to load that design again.
6. Open the **Export** panel to copy JSON or C++.

Keyboard shortcuts: <kbd>Space</kbd> play/pause · <kbd>G</kbd> generate · <kbd>R</kbd> surprise me.

## Effects

| Effect in the lab | Firmware effect | What it does |
|---|---|---|
| Palette Wave | `EFFECT_STRIP_PALETTE` (#21) | Smooth scrolling gradient. Closest visual match to the firmware's `PaletteEffect`. |
| Rainbow Fill | `EFFECT_STRIP_RAINBOW_FILL` (#16) | Full hue wheel distributed across the LEDs. |
| Chase / Carnival | `EFFECT_STRIP_CARNIVAL` (#39) | Pulsing light segments with adjustable spacing. |
| Bouncing Ball | `EFFECT_STRIP_BOUNCING_BALL` (#1) | A head that bounces end to end with a fading tail. |
| Fire | `EFFECT_STRIP_FIRE` (#8) | Layered noise through a warm palette. |
| Twinkle | `EFFECT_STRIP_TWINKLE` (#19) | Independent, seeded blinking points. |
| Meteor | `EFFECT_STRIP_METEOR` (#13) | Streaks sweeping across the strip. |
| Snake | `EFFECT_STRIP_SNAKE` (#28) | Moving head with a solid body. |
| Plasma | *visual only* | Interfering sine waves. Use it as inspiration for a custom effect class. |
| Slow Crawl | `EFFECT_STRIP_CRAWL` (#40) | Gentle crawling gradient with fine ripples. |

Effect numbers come from [`include/effects.h`](https://github.com/crbenson/NightDriver/blob/main/include/effects.h). They are stable identifiers — never renumber an existing effect in the firmware, because persisted effect JSON refers to them.

## Palettes

The built-in palettes are `sunset`, `neon`, `ocean`, `aurora`, `fire`, `ice`, `candy`, and `mono`. Choose **Custom** to provide your own four colors; the Color Pickers become active and the palette is interpolated between those stops.

Generated exports store the palette colors as hex strings, so a custom design can be shared without needing the same browser or local storage.

## Parameters

| Parameter | Firmware equivalent | Range | Notes |
|---|---|---|---|
| LED count | number of LEDs in the device config | 8–256 | Preview density only; does not change firmware config. |
| Speed | `paletteSpeed` / effect interval | 0.1–4.0× | How fast the pattern animates. |
| Density | `density` (`dns`) | 0.2–6.0 | How many repetitions of the pattern fit on the strip. |
| Brightness | `brightness` (`bns`) | 10–100% | Scales all channel values. |
| Gap | `gapSize` (`gsz`) | 0–0.9 | Space between repeating light segments. |
| Glow | *preview only* | 0–28 | Canvas glow; there is no direct firmware setting. |
| Trail | *preview only* | 0–0.95 | Controls tail falloff in chase/bounce/meteor/snake effects. |

Layouts: **strip** (1D), **matrix** (HUB75-style 2D grid), and **ring**. Matrix size presets are 8×8, 16×16, and 32×16. Some effects respond to the second dimension (notably Plasma and Fire).

## Export formats

### JSON

A firmware-neutral description of the design:

```json
{
  "name": "Solar Bloom",
  "generator": "NightDriver Pattern Lab",
  "version": 1,
  "effect": { "id": "palette", "firmwareEffectId": 21, "name": "Palette Wave" },
  "palette": "sunset",
  "colors": ["#ff2d95", "#ff6b35", "#ffd23f", "#7b2cbf"],
  "params": { "ledCount": 64, "speed": 1, "density": 1.4 }
}
```

Downloaded files are named `<pattern-name>.nightdriver.json` and can be stored alongside your project notes or fed into a future importer.

### C++

The C++ tab emits a 16-stop `CRGB` palette built by interpolating your chosen colors, plus an `ADD_EFFECT(EFFECT_STRIP_PALETTE, PaletteEffect, …)` registration line using the same constructor signature as [`src/effects.cpp`](https://github.com/crbenson/NightDriver/blob/main/src/effects.cpp). It is a starting point — review it against your device's feature flags and build configuration before flashing.

## Saving your work

- **Gallery** keeps the last 12 generated patterns in memory for the current page session.
- **Save** stores a named preset in your browser's `localStorage` so it survives reloads. Nothing leaves your computer.
- Clearing browser site data removes saved presets; download the JSON if you want a permanent copy.

## From design to device

1. Export a JSON design and keep it with your project.
2. Use the C++ snippet as a basis for a new effect registration in `src/effects.cpp`, or translate the parameters into the `PaletteEffect` constructor in your own effect class.
3. Build and upload with PlatformIO (`pio run -t upload`) or use the [web installer](https://plummerssoftwarellc.github.io/NightDriverStrip) for a prebuilt image.
4. Adjust from the device's web UI if your build includes the web server.

See the main [README](https://github.com/crbenson/NightDriver/blob/main/README.md) for build commands, WiFi setup, and feature flags.
