// Database migration script
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { pool } from './client.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

async function migrate() {
  try {
    console.log('🔄 Running database migrations...')

    // Read schema SQL file
    const schemaPath = join(__dirname, 'schema.sql')
    const schemaSql = readFileSync(schemaPath, 'utf-8')

    // Execute schema
    await pool.query(schemaSql)

    console.log('✅ Database migrations completed successfully')

    // Close pool
    await pool.end()
    process.exit(0)
  } catch (error) {
    console.error('❌ Migration failed:', error)
    await pool.end()
    process.exit(1)
  }
}

migrate()
