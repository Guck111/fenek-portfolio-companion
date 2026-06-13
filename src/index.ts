import { controlPlaneCheck } from "./control-plane.js"
import { BybitBroker } from "./brokers/bybit/index.js"
import { createBybitTools } from "./brokers/bybit/tools.js"
import { CryptoBroker } from "./brokers/crypto/index.js"
import { createCryptoTools } from "./brokers/crypto/tools.js"
import { register, registerPrompts, registerTools } from "./brokers/registry.js"
import { Trading212Broker } from "./brokers/trading212/index.js"
import { createTrading212Tools } from "./brokers/trading212/tools.js"
import { BUILD_FLAVOR } from "./generated/build-flavor.js"
import { PAYWALL_ENABLED } from "./license/config.js"
import { initLicensing } from "./license/manager.js"
import { createPolarProvider, POLAR_PRODUCTION_CONFIG } from "./license/polar.js"
import { createCorePrompts } from "./prompts/index.js"
import { startServer } from "./server.js"
import { createAnalyticsTools } from "./tools/analytics/index.js"
import { createGettingStartedTool } from "./tools/getting_started.js"
import { createPlaybookTools } from "./tools/playbooks/index.js"
import { readUpdateState, runUpdateCheckIfDue } from "./utils/update-check.js"

async function configureBrokers(): Promise<void> {
  const apiKey = process.env["T212_API_KEY"]
  const apiSecret = process.env["T212_API_SECRET"]
  if (apiKey === undefined || apiSecret === undefined) return

  const broker = new Trading212Broker()
  await broker.authenticate({
    credentials: { T212_API_KEY: apiKey, T212_API_SECRET: apiSecret },
  })
  register(broker, createTrading212Tools(broker))
}

async function configureCryptoBroker(): Promise<void> {
  const walletAddresses = process.env["WALLET_ADDRESSES"]
  if (walletAddresses === undefined || walletAddresses.trim() === "") return

  const broker = new CryptoBroker()
  await broker.authenticate({ credentials: { WALLET_ADDRESSES: walletAddresses } })
  register(broker, createCryptoTools(broker))
}

async function configureBybitBroker(): Promise<void> {
  const apiKey = process.env["BYBIT_API_KEY"]
  const apiSecret = process.env["BYBIT_API_SECRET"]
  if (apiKey === undefined || apiSecret === undefined) return

  const broker = new BybitBroker()
  await broker.authenticate({
    credentials: { BYBIT_API_KEY: apiKey, BYBIT_API_SECRET: apiSecret },
  })
  register(broker, createBybitTools(broker))
}

async function main(): Promise<void> {
  initLicensing({
    paywallEnabled: PAYWALL_ENABLED,
    buildFlavor: BUILD_FLAVOR,
    licenseKey: process.env["LICENSE_KEY"],
    // The live Polar provider. Only consulted when the paywall is active
    // (standard build + PAYWALL_ENABLED); a freepro build never calls it.
    provider: createPolarProvider(POLAR_PRODUCTION_CONFIG),
  })
  await configureBrokers()
  await configureCryptoBroker()
  await configureBybitBroker()
  registerTools([createGettingStartedTool()])
  registerTools(createAnalyticsTools())
  registerTools(createPlaybookTools())
  registerPrompts(createCorePrompts())
  await startServer()
  // Fire-and-forget: never blocks initialize. Rejection-proof today; the
  // catch guards future edits to the warmup path from killing the server.
  void controlPlaneCheck().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`fenek: control-plane check failed: ${message}`)
  })
  // Weekly version check (opt-out via the CHECK_UPDATES toggle). Default on when
  // the var is unset; a present value must be explicitly truthy, so an ambiguous
  // host serialization of "off" (e.g. "", "0", "False") fails toward no network
  // rather than leaking the version check. Fire-and-forget, after startServer so
  // it never delays the initialize handshake.
  const checkUpdatesRaw = process.env["CHECK_UPDATES"]
  const checkUpdates =
    checkUpdatesRaw === undefined ||
    ["true", "1", "on", "yes"].includes(checkUpdatesRaw.trim().toLowerCase())
  void runUpdateCheckIfDue({ checkUpdates, state: readUpdateState() }).catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`fenek: update check failed: ${message}`)
  })
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`fenek-portfolio-companion failed to start: ${message}`)
  process.exit(1)
})
