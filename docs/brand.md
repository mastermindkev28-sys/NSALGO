# NSALGO brand

The logo files in `assets/brand/source/` are the source of truth. Never redraw, recolour or re-letter the marks. Use the derived files in `assets/brand/`; to regenerate them run `node scripts/brand-assets.mjs`. Always render them through the components in `components/brand/logo.tsx`: `Logo`, `Emblem`, `Wordmark`, `Lockup` and `EmblemHero`.

| File | Use |
| --- | --- |
| `source/lockup-chrome-dark.webp` | Master: emblem and "NS ALGO", bright chrome on black. Source for the emblem and lockup. |
| `source/wordmark-chrome-dark.webp` | Master wordmark: geometric "NS ALGO", chrome on black. |
| `source/lockup-chrome-light.webp` | Dark-chrome lockup on transparency, for **light** backgrounds only (print, partner decks). |
| `emblem.png`, `lockup.png`, `wordmark.png` | Web files: chrome on transparency, for dark surfaces. |
| `app/icon.png`, `app/apple-icon.png` | Emblem on obsidian. |

## The marks

- **Emblem:** a four-point north star with an elongated vertical axis. An S-twist runs through its centre, set inside a broken bezel ring with inner tick arcs. It stands for direction, navigation and precision.
- **Wordmark:** "NS ALGO", in geometric capitals. The "N" is notched and the "S" is drawn as a mirrored angular Z. In body copy the name is written **NSALGO**.

## Tone

The brand is polished chrome on deep black, with cold blue light glinting off the edges. It should feel precise, premium and instrument-like, never loud.

- **Surfaces:** near-black (`--color-void` #040506, `--color-obsidian` #07080a) and graphite panels.
- **Metal:** use `.chrome-text` and the primary button gradient. The polish is a bright crown, a dark horizon band and a lit lower edge.
- **Light:** a restrained cold blue (`--color-polar-*`, accent #5d8ef5), used only for glints, focus, glows and data accents.
- **Type:** uppercase display headlines with tight tracking and chrome fill. Mono eyebrows use wide tracking.
- **Motifs:** the compass star, bezel rings and hairline instrument geometry (`CompassField`), plus the emblem with a soft blue glow and a floor reflection (`EmblemHero`).
- **Data colours** keep their validated meanings: up #31a57f, down #e5484d, accent #5d8ef5. Don't reuse them as brand colours.

## Do and don't

- Do give the marks clear space of at least half the emblem's width. Don't add effects beyond glow and reflection.
- Do use the chrome-on-transparent web files on dark backgrounds. On light backgrounds use `lockup-chrome-light`.
- Don't stretch the marks, rotate them, use them as outlines, or place them on busy imagery.
