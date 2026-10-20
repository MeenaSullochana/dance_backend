import { config } from 'dotenv'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const backendRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const nodeEnv = process.env.NODE_ENV || 'development'
const envFile = join(backendRoot, `.env.${nodeEnv}`)
const fallback = join(backendRoot, '.env')

if (existsSync(envFile)) {
  config({ path: envFile })
} else if (existsSync(fallback)) {
  config({ path: fallback })
} else {
  config()
}

export { nodeEnv }
