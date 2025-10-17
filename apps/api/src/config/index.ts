// Application configuration
import dotenv from 'dotenv'
import { z } from 'zod'

dotenv.config()

// Configuration schema with validation
const configSchema = z.object({
  node: z.object({
    env: z.enum(['development', 'production', 'test']).default('development'),
  }),
  server: z.object({
    port: z.number().int().min(1000).max(65535).default(3001),
    cors: z.object({
      origin: z.string().default('http://localhost:5173'),
    }),
  }),
  database: z.object({
    url: z.string().url(),
    ssl: z.boolean().default(false),
  }),
  jwt: z.object({
    secret: z.string().min(32),
    expiresIn: z.string().default('7d'),
  }),
})

// Parse and validate configuration
export const config: {
  node: { env: 'development' | 'production' | 'test' }
  server: { port: number; cors: { origin: string } }
  database: { url: string; ssl: boolean }
  jwt: { secret: string; expiresIn: string }
} = configSchema.parse({
  node: {
    env: process.env.NODE_ENV || 'development',
  },
  server: {
    port: process.env.PORT ? parseInt(process.env.PORT) : 3001,
    cors: {
      origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    },
  },
  database: {
    url: process.env.DATABASE_URL || 'postgresql://localhost:5432/musicplayground',
    ssl: process.env.DATABASE_SSL === 'true',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'change-me-in-production-min-32-chars-long',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
})

export default config
