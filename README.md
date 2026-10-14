# DARKSKY Hookah Lounge — digital menu

Mobile-first menu for the lounge, ported to Next.js from the `DarkSky_Menu.html` design export.

- 10 languages (auto-detected, remembered per device), RTL for Arabic
- Hookah lines with strength scale and taste tags, kitchen, cocktails, tea, bar, soft drinks
- Search, item sheets with variants and pairings, order cart with table number and −15% cash/crypto discount
- Promotions (Business Hookah −20% 14:00–17:00 shows live) and house rules
- Three.js smoke intro with the logo and 3D section tiles; falls back to a static logo on weak GPUs

## Where things live

| What | File |
| --- | --- |
| Menu content: items, prices, translations, promos, rules | `src/lib/darksky-data.js` |
| Product photos / videos / 3D models (`id → path in public/`) | `MEDIA` in `src/lib/darksky-data.js` |
| UI and logic | `src/components/DarkskyMenu.jsx` |
| Smoke intro / section tiles (three.js) | `src/lib/smoke-scene.js`, `src/lib/tiles-scene.js` |
| Fonts (Manrope, Michroma), logo | `public/fonts`, `public/darksky-logo.jpg` |

## Run

```bash
npm install
npm run dev      # http://localhost:3000
npm run build && npm start
```

"Send to waiter" currently only shows a confirmation on the guest's phone; it is not wired to any backend yet.
