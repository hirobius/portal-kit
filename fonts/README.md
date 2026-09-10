# Fonts

Self-hosted **Satoshi** variable fonts, served from this host so every client
portal renders in the same typeface.

Add these two files here (they can't be committed through the GitHub API because
they're binary — push them with `git`):

- `Satoshi-Variable.woff2`
- `Satoshi-VariableItalic.woff2`

Until they're present, `theme.css` falls back to `system-ui` with no broken
request. `vercel.json` serves this directory with `Access-Control-Allow-Origin: *`
so client pages on other domains can load the fonts cross-origin.

Satoshi is by Indian Type Foundry, free under the Fontshare license — keep the
license file alongside the woff2 files (see the copy in the lilac repo).
