# Dynalimb website

Static marketing site for Dynalimb Technologies (Lagos). No build step: plain HTML, CSS and JS.
Built from the Figma "Full landing page" design; keep the section order and layout exactly as designed.

## Structure
- `index.html` – all sections (announcement bar, header, hero video, Our Story, What We Do, Therapay, Impact, Patient Stories, Christmas Campaign, Partners, Contact, footer)
- `css/styles.css` – design tokens in `:root` (colours, fonts, radii); design width 1440, content width 1152
- `js/main.js` – applies the media manifest, patient-story cards, carousels, nav behaviour
- `media/media.js` – THE manifest for swapping images/video (hero mp4/webm/poster, image slots, patient stories text)
- `media/placeholders/` – generated placeholder SVGs; `media/hero-placeholder.mp4` – placeholder hero video

## Rules
- To swap a photo or video, edit its `src` in `media/media.js` only. Never hard-code image paths in HTML.
- Add `?media=1` to the URL to see every slot's name and recommended size.
- Brand: teal `#15c9d0`, navy `#0a1342`; body font Manrope, headings Schibsted Grotesk (confirm against Figma).
- Keep it accessible: alt text in the manifest, visible focus states, hero video respects reduced motion.
- Patient story quotes other than Daniel Okafor's are placeholders; real, consented stories only.

## Open items
- Real hero video and photos
- Donate / payment link, social URLs, final contact form or email handling
- Confirm heading font from Figma
