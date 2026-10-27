import { nodeEnv } from './config/env.js'
import { createApp } from './app.js'
import { backendUrl, frontendUrl, port } from './config/site.js'

try {
  const app = await createApp()
  const server = app.listen(port, '0.0.0.0', () => {
    console.log(`API ready at ${backendUrl} (${nodeEnv})`)
    console.log(`Allowing site ${frontendUrl}`)
    console.log('Database: MongoDB')
  })
  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`Port ${port} is already in use. Stop the other API, then start again.`)
    } else {
      console.error('Failed to start API:', error.message)
    }
    process.exit(1)
  })
} catch (error) {
  console.error('Failed to start API:', error.message)
  process.exit(1)
}
