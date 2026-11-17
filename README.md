# Dynalimb website

Open `index.html` in a browser (or deploy the folder to any static host: Netlify, Vercel, GitHub Pages, cPanel).

## Swapping media (no code needed)
Everything lives in **`media/media.js`**.
1. Drop your file into `/media` (e.g. `media/hero.mp4`, `media/story-1.jpg`).
2. Change that slot's `src` in `media/media.js`.
3. Reload.

Add `?media=1` to the URL (`index.html?media=1`) to see every slot's name and recommended size drawn on the page.

| Slot | What it is | Size |
|---|---|---|
| `hero.mp4` / `hero.webm` / `hero.poster` | Hero background video (muted, looping) + still image | 1920×1080, <8 MB |
| `story-1…4` | Our Story gallery | 900×800 (centre one 1200×800) |
| `service-*` | The four service cards | 960×560 |
| `therapay-bg` | Full-width Therapay band | 1920×900 |
| `impact-center` | Tall image between the stats | 700×900 |
| `patient-1/2` | Photo cards in Patient Stories | 980×1000 |
| `contact-*` | Two contact cards | 960×480 |
| `footer-photo` | Footer photo | 820×860 |
| `partner-*`, `collab-*` | Partner / collaborator logos | transparent PNG or SVG |

Patient story text is edited in the `stories` list in the same file.

## Notes
- Fonts load from Google Fonts: Manrope (body) and Schibsted Grotesk (headings). Swap `--font-head` in `css/styles.css` if the Figma heading font is different.
- The hero video pauses automatically for visitors who have "reduce motion" turned on.
- Button links currently jump to the Contact section / mailto. Point the donate buttons at your payment page.
