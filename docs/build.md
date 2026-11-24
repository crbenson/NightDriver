---
title: Build guide
layout: default
---

# Build guide

The **Build Studio** on the [home page](index.html#build) turns a pattern you designed into a small downloadable kit with everything needed to compile it for a specific NightDriver device. This page explains the pieces and the manual route.

## Before you start

Install the two tools the firmware needs:

- [PlatformIO Core](https://docs.platformio.org/en/latest/core/installation/index.html) — provides the `pio` command.
  ```sh
  python3 -m pip install --upgrade platformio
  ```
- [Node.js and npm](https://nodejs.org/) — the device web UI is compiled as part of a PlatformIO build. The project has been tested with Node 16.15.1 / 18.17.1 and npm 8.13.2.

You also need a supported ESP32 board and a USB cable. If you would rather avoid a local toolchain entirely, use the [web installer](https://plummerssoftwarellc.github.io/NightDriverStrip) to flash a prebuilt image.

## Using the Build Studio

1. Design a pattern in the [Pattern Lab](index.html#lab), or generate one.
2. Scroll to **Build Studio** and choose your device from the environment list. The list is taken from the 35 `[env:…]` sections in the repository's `platformio.ini`.
3. Press **Download build kit (.zip)**.
4. Unzip it inside a clone of this repository and follow its `BUILD.md`.

The kit contains:

| File | Purpose |
|---|---|
| `BUILD.md` | Steps tailored to the selected environment. |
| `pattern.json` | Your design in a firmware-neutral format. |
| `custom_effect.h` | A `LEDStripEffect` subclass with your 16-stop palette and parameters. |
| `generated_effect.snippet.cpp` | An `ADD_EFFECT(EFFECT_STRIP_PALETTE, PaletteEffect, …)` registration line. |
| `build_commands.sh` | The exact build, upload, and monitor commands. |

## Installing a generated effect manually

1. Clone the repository:
   ```sh
   git clone https://github.com/crbenson/NightDriver.git
   cd NightDriver
   ```
2. Copy `custom_effect.h` to `include/effects/strip/generated_pattern.h`.
3. Add the include to `src/effects.cpp`:
   ```cpp
   #include "effects/strip/generated_pattern.h"
   ```
4. Add the lines from `generated_effect.snippet.cpp` inside `LoadEffectFactories()`.
5. Set the default environment in `platformio.ini`, for example:
   ```ini
   [platformio]
   default_envs = palette
   ```
   Or just pass `-e <env>` on each command.

The generated effect reuses `EFFECT_STRIP_PALETTE` so it compiles immediately. For a permanent addition, append a new effect number to `include/effects.h` and use it in the effect's constructor and factory registration. **Never renumber an existing effect** — saved effect JSON refers to those IDs.

## Common environments

| Environment | Device |
|---|---|
| `demo` | Simple WS2812B strip, rainbow on pin 5 — good first build. |
| `palette` | Palette effect demo, and the repository's current default. |
| `ledstrip` | WiFi-controlled LED strip. |
| `spectrum` | M5StickC Plus with a 48×16 WS2812B matrix. |
| `mesmerizer` | HUB75 matrix info panel with the most features. |
| `carnival`, `crawl`, `mardigras` variants | Custom effects on this branch. |

Run `pio project config` or inspect `platformio.ini` for the full list of 35 environments.

## Build and flash

```sh
pio run -e demo          # compile
pio run -e demo -t upload # flash the board
pio device monitor -e demo
```

Useful variants:

```sh
pio run                  # build every environment (slow)
pio run -e demo -t uploadfs  # upload the filesystem / web UI
pio pkg update           # refresh libraries
```

If `pio` is not found, check [PlatformIO's shell integration instructions](https://docs.platformio.org/en/stable/core/installation/shell-commands.html).

## Troubleshooting

- **Compilation fails in FastLED with `register` errors** — the base build flags already redefine `register`; avoid overriding `build_flags` without including the base section.
- **No serial port found** — check `upload_port` in `platformio.ini`, or let PlatformIO auto-detect. On macOS you may need to install the USB driver for your board.
- **Web UI missing on the device** — build with an environment that enables the web server, or run `-t uploadfs` if the build uses a separate filesystem image.
- **Pattern does not appear** — confirm the effect was registered in `LoadEffectFactories()` and that the build uses the environment you edited.

For firmware-level details, see the repository [README](https://github.com/crbenson/NightDriver/blob/main/README.md) and the [pattern guide](patterns.md).
