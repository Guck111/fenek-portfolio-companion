import { controlPlaneCheck } from "./control-plane.js"
import { BybitBroker } from "./brokers/bybit/index.js"
import { createBybitTools } from "./brokers/bybit/tools.js"
import { CryptoBroker } from "./brokers/crypto/index.js"
import { createCryptoTools } from "./brokers/crypto/tools.js"
import { register, registerPrompts, registerTools } from "./brokers/registry.js"
import { Trading212Broker } from "./brokers/trading212/index.js"
import { createTrading212Tools } from "./brokers/trading212/tools.js"
import { createCorePrompts } from "./prompts/index.js"
import { startServer } from "./server.js"
import { createAnalyticsTools } from "./tools/analytics/index.js"
import { createGettingStartedTool } from "./tools/getting_started.js"
import { createPlaybookTools } from "./tools/playbooks/index.js"

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
  const solanaAddress = process.env["SOLANA_ADDRESS"]
  const tonAddress = process.env["TON_ADDRESS"]
  const heliusApiKey = process.env["HELIUS_API_KEY"]
  if (solanaAddress === undefined && tonAddress === undefined) return

  const broker = new CryptoBroker()
  await broker.authenticate({
    credentials: {
      ...(solanaAddress !== undefined ? { SOLANA_ADDRESS: solanaAddress } : {}),
      ...(tonAddress !== undefined ? { TON_ADDRESS: tonAddress } : {}),
      ...(heliusApiKey !== undefined ? { HELIUS_API_KEY: heliusApiKey } : {}),
    },
  })
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
  await controlPlaneCheck()
  await configureBrokers()
  await configureCryptoBroker()
  await configureBybitBroker()
  registerTools([createGettingStartedTool()])
  registerTools(createAnalyticsTools())
  registerTools(createPlaybookTools())
  registerPrompts(createCorePrompts())
  await startServer()
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`fenek-portfolio-companion failed to start: ${message}`)
  process.exit(1)
})
