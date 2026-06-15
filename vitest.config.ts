import { configDefaults, defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    // Keep Vitest's built-in excludes (node_modules, dist, .git, …) and add
    // `.claude/` so harness-created git worktrees don't get their test copies
    // collected and run alongside the real suite in the repo root.
    exclude: [...configDefaults.exclude, ".claude/**"],
  },
})
