import mongoose from 'mongoose'
import { mongoUrl } from './site.js'

let memoryServer = null

export async function connectMongo() {
  let uri = mongoUrl

  if (!uri) {
    throw new Error('MONGO_URL is missing. Set it in backend/.env.development or .env.production')
  }

  if (uri === 'memory' || uri === 'mongodb-memory') {
    const { MongoMemoryServer } = await import('mongodb-memory-server')
    memoryServer = await MongoMemoryServer.create()
    uri = memoryServer.getUri('dance')
    console.log('MongoDB memory server started (dev)')
  }

  mongoose.set('strictQuery', true)
  await mongoose.connect(uri)
  console.log(`MongoDB connected: ${mongoose.connection.name}`)
  return mongoose.connection
}

export async function disconnectMongo() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect()
  }
  if (memoryServer) {
    await memoryServer.stop()
    memoryServer = null
  }
}
