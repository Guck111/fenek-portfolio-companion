import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { _resetLicensingForTests, initLicensing } from "../../src/license/manager.js"
import { PRO_INSTRUCTIONS_SENTENCE } from "../../src/license/texts.js"
import { buildServerInstructions } from "../../src/server.js"

describe("server instructions", () => {
  beforeEach(() => {
    _resetLicensingForTests()
  })
  afterEach(() => {
    _resetLicensingForTests()
  })

  it("omits the Pro sentence while the paywall is off", () => {
    expect(buildServerInstructions()).not.toContain(PRO_INSTRUCTIONS_SENTENCE)
  })

  it("appends the Pro sentence when the paywall is armed on a standard build", () => {
    initLicensing({
      paywallEnabled: true,
      buildFlavor: "standard",
      licenseKey: undefined,
      provider: null,
    })
    expect(buildServerInstructions()).toContain(PRO_INSTRUCTIONS_SENTENCE)
  })

  it("omits the Pro sentence on a freepro build", () => {
    initLicensing({
      paywallEnabled: true,
      buildFlavor: "freepro",
      licenseKey: undefined,
      provider: null,
    })
    expect(buildServerInstructions()).not.toContain(PRO_INSTRUCTIONS_SENTENCE)
  })
})
