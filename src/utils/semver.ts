// Strict X.Y.Z comparison for the update check. Anything that is not a plain
// numeric triple (optional leading "v") is rejected — a pre-release tag, a
// "latest" string, or an overflowing field all return false rather than
// risk a wrong "update available" nudge.
const FIELD_RE = /^\d{1,6}$/

const parseVersion = (s: string): [number, number, number] | null => {
  const parts = s.trim().replace(/^v/, "").split(".")
  if (parts.length !== 3) return null
  const nums = parts.map((p) => (FIELD_RE.test(p) ? Number(p) : Number.NaN))
  if (nums.some((n) => Number.isNaN(n))) return null
  return [nums[0] ?? 0, nums[1] ?? 0, nums[2] ?? 0]
}

export const isNewerVersion = (candidate: string, current: string): boolean => {
  const a = parseVersion(candidate)
  const b = parseVersion(current)
  if (a === null || b === null) return false
  for (let i = 0; i < 3; i++) {
    const ai = a[i] ?? 0
    const bi = b[i] ?? 0
    if (ai !== bi) return ai > bi
  }
  return false
}
