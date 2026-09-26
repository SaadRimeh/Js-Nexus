# JS Nexus branding

The gold N combines code brackets and a lightning-shaped diagonal on a dark desktop-app tile. The artwork was created with built-in image generation.

## Assets and usage

- `public/branding/logo-source.png`: original generated artwork.
- `public/branding/logo-{32,64,128,256,512,1024}.png`: resized exports for browser, interface, and desktop use.
- `public/branding/icon.ico`: multi-resolution Windows and browser icon.
- `public/branding/icon.icns`: macOS application icon.
- `src/renderer/components/BrandLogo.jsx`: shared login and header logo.

Run `npm run assets:icons` after replacing the source PNG to regenerate the desktop icons and PNG sizes. Run `npm run dist` to package the configured desktop icons into a new app build; existing installed shortcuts are not updated by the development server.

## Final generation prompt

```text
Use case: logo-brand.
Asset type: production square desktop application icon for JS Nexus, an offline-first JavaScript IDE.
Primary request: a distinctive original symbol merging a bold geometric N with the idea of connected code brackets and a central lightning-like diagonal. One coherent compact mark, confident, minimal, immediately recognizable at small sizes.
Style: precision flat vector-like logo, sharp geometric construction with subtly softened corners. Thick solid strokes, spacious negative space. No tiny nodes or fine circuitry.
Palette: the project's existing JavaScript amber/gold (#F7C948) against very dark graphite (#161B22), with only a restrained lighter gold accent if useful.
Composition: a single large centered gold symbol on a dark rounded-square app tile, square image. Tile occupies 94 percent of frame, transparent background outside its rounded corners. Symbol occupies about 65 percent of tile. Visually balanced, generous safe margins.
Constraints: no words, no letters other than the stylized N implicit in the symbol, no slogan, no watermark, no mockup, no perspective, no glow, no shadows outside tile, no texture, no decorative background. Deliver an actual transparent PNG, crisp and suitable for desktop app and favicon.
```
