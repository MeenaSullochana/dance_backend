import { nodeEnv } from './config/env.js'
import { createApp } from './app.js'
import { backendUrl, frontendUrl, port } from './config/site.js'

try {
  const app = await createApp()
  app.listen(port, () => {
    console.log(`API ready at ${backendUrl} (${nodeEnv})`)
    console.log(`Allowing site ${frontendUrl}`)
    console.log('Database: MongoDB')
  })
} catch (error) {
  console.error('Failed to start API:', error.message)
  process.exit(1)
}
