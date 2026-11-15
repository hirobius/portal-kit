# Restyle every portal

1. Edit `theme.css`. The colors, spacing, type and card style are CSS tokens at the top.
2. Commit and push. Vercel deploys this host again.
3. Each client page that links the edge build gets the change on its next load. The cache
   is about 5 minutes. A page pinned to a release changes when its pin moves. See
   [RELEASES.md](../RELEASES.md).

For a change to structure or behavior, edit `portal.js` the same way.

Keep both changes backward-compatible. Existing client pages must keep rendering. The simple
top-level layout and every section type in [data-shape.md](data-shape.md) are a contract.
