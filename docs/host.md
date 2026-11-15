# What the host serves

## Files

- `theme.css` - the whole design system: HDS type, neutral palette, status pills, owner
  chips, elevated cards, light and dark, responsive. Edit it to restyle every portal.
  - Release v21 and later load Plus Jakarta Sans and IBM Plex Mono from the HDS package.
  - Release v20 and earlier embed Satoshi as a data URI, so it works cross-origin.
- `portal.js` - the shared renderer. It builds the full page from a client's JSON data
  block, so structure and behavior are shared too.
- `index.html` - a live demo that renders sample data through the kit.
- `clients/EXAMPLE-client-page.html` - copy this file to start a new client page.
- `fonts/` - the self-hosted Satoshi source for release v20 and earlier. Those releases embed
  it. The files stay for reference and for pages that link the font directly.
- `vercel.json` - CORS headers for the fonts, and a short cache on `theme.css` and
  `portal.js`, so an edit reaches pages in about 5 minutes.

## Access and privacy

This host serves presentation code only (CSS, JS, fonts). It holds no client data, so it is
public by design. Each client's page stays behind that page's own password gate. Only its
non-secret styling and structure come from this host.
