# Building Pro from source (the `freepro` flavor)

Fenek Portfolio Companion is MIT-licensed and fully open source — including
every Pro feature. Paying for a license key is the convenient path; building
the extension yourself is the official free path. There is no catch: a
`freepro` build enables all Pro (crypto) tools permanently, performs **zero
license checks**, and never contacts a license server. Combined with the
extension's zero-telemetry policy this is also the maximum-privacy option.

## Requirements

- Node.js ≥ 20
- git

## Steps

```sh
git clone https://github.com/Guck111/fenek-portfolio-companion.git
cd fenek-portfolio-companion
npm ci
npm run pack:freepro
```

The pack script compiles TypeScript automatically before bundling — no
separate build step is needed. It produces `fenek-portfolio-companion.mcpb`
in the project root with the Pro flavor baked in at compile time. Double-click
the file — Claude Desktop will offer to install it. Configure your read-only
API keys as usual.

On Windows (PowerShell) set the flavor variable yourself and call the
underlying pack script (`pack:freepro` is a Unix-shell shorthand for exactly
this):

```powershell
$env:FENEK_BUILD_FLAVOR = "freepro"; npm run pack:local
```

## Notes

- The flavor is a compile-time constant (`src/generated/build-flavor.ts`),
  not an environment variable — a downloaded official build cannot be
  switched to `freepro` at runtime; you have to build it yourself. That
  effort is the entire price of the free path.
- Official releases on GitHub are always the standard flavor. CI never
  builds or publishes `freepro` artifacts.
- Manual builds don't auto-update. Subscribe to release notes or watch the
  repository to know when to rebuild.
- Verify what you built (after the pack step has created `dist/`):
  `grep -r "freepro" dist/generated/` should show the flavor constant, and
  `grep -rn 'fetch(' src/` still lists every outbound call in the codebase —
  none of them targets a license server in this flavor.
