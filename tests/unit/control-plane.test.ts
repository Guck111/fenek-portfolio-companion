import { describe, expect, it, vi } from "vitest"

import { controlPlaneCheck } from "../../src/control-plane.js"

describe("controlPlaneCheck (inert seam)", () => {
  it("resolves to undefined and makes no network call while free", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch")
    // eslint-disable-next-line @typescript-eslint/no-confusing-void-expression -- intentional: test asserts resolved value is undefined
    const result = await controlPlaneCheck()
    expect(result).toBeUndefined()
    expect(fetchSpy).not.toHaveBeenCalled()
    fetchSpy.mockRestore()
  })
})
