// PostgreSQL database client
import pg from 'pg'
import { config } from '../config/index.js'

const { Pool } = pg

// Create connection pool
export const pool = new Pool({
  connectionString: config.database.url,
  ssl: config.database.ssl ? {
    rejectUnauthorized: false
  } : undefined,
  max: 20, // Maximum number of clients in pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
})

// Test connection on startup
pool.on('connect', () => {
  console.log('✅ Database connected')
})

pool.on('error', (err) => {
  console.error('❌ Unexpected database error:', err)
  process.exit(-1)
})

// Graceful shutdown
process.on('SIGINT', async () => {
  await pool.end()
  console.log('Database pool closed')
  process.exit(0)
})

export default pool
