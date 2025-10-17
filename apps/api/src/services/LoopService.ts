// Loop management service
import { pool } from '../db/client.js'
import { LoopSchema } from '@music/types/schemas'
import { randomUUID } from 'crypto'

export class LoopService {
  async createLoop(userId: string, loopData: unknown) {
    // Validate with Zod - omit id and updatedAt as backend generates these
    const validated = LoopSchema.omit({ id: true, updatedAt: true }).parse(loopData)

    // Generate UUID and timestamp
    const loopId = randomUUID()
    const updatedAt = new Date().toISOString()

    const result = await pool.query(
      `INSERT INTO loops (
        id, user_id, name, bars, color, bpm, schema_version,
        chord_progression, icon_sequence, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        loopId,
        userId,
        validated.name,
        validated.bars,
        validated.color,
        validated.bpm,
        validated.schemaVersion,
        JSON.stringify(validated.chordProgression),
        JSON.stringify(validated.iconSequence),
        updatedAt,
      ]
    )

    return this.transformDbLoop(result.rows[0])
  }

  async getLoop(loopId: string, requesterId?: string) {
    const result = await pool.query(
      'SELECT * FROM loops WHERE id = $1',
      [loopId]
    )

    if (result.rows.length === 0) {
      throw new Error('Loop not found')
    }

    const loop = result.rows[0]

    // Check permissions
    if (!loop.is_public && loop.user_id !== requesterId) {
      throw new Error('Unauthorized to access this loop')
    }

    return this.transformDbLoop(loop)
  }

  async updateLoop(loopId: string, userId: string, loopData: unknown) {
    // Verify ownership
    const existingLoop = await pool.query(
      'SELECT user_id FROM loops WHERE id = $1',
      [loopId]
    )

    if (existingLoop.rows.length === 0) {
      throw new Error('Loop not found')
    }

    if (existingLoop.rows[0].user_id !== userId) {
      throw new Error('Unauthorized to update this loop')
    }

    // Validate with Zod
    const validated = LoopSchema.parse(loopData)

    const result = await pool.query(
      `UPDATE loops SET
        name = $1, bars = $2, color = $3, bpm = $4,
        chord_progression = $5, icon_sequence = $6, updated_at = $7
      WHERE id = $8
      RETURNING *`,
      [
        validated.name,
        validated.bars,
        validated.color,
        validated.bpm,
        JSON.stringify(validated.chordProgression),
        JSON.stringify(validated.iconSequence),
        validated.updatedAt,
        loopId,
      ]
    )

    return this.transformDbLoop(result.rows[0])
  }

  async deleteLoop(loopId: string, userId: string) {
    const result = await pool.query(
      'DELETE FROM loops WHERE id = $1 AND user_id = $2 RETURNING id',
      [loopId, userId]
    )

    if (result.rows.length === 0) {
      throw new Error('Loop not found or unauthorized')
    }
  }

  async listLoops(filters: { public?: boolean; userId?: string; limit?: number; offset?: number }) {
    let query = 'SELECT * FROM loops WHERE 1=1'
    const params: any[] = []
    let paramCount = 1

    if (filters.public !== undefined) {
      query += ` AND is_public = $${paramCount++}`
      params.push(filters.public)
    }

    if (filters.userId) {
      query += ` AND user_id = $${paramCount++}`
      params.push(filters.userId)
    }

    query += ' ORDER BY created_at DESC'

    if (filters.limit) {
      query += ` LIMIT $${paramCount++}`
      params.push(filters.limit)
    }

    if (filters.offset) {
      query += ` OFFSET $${paramCount++}`
      params.push(filters.offset)
    }

    const result = await pool.query(query, params)
    return result.rows.map(row => this.transformDbLoop(row))
  }

  async duplicateLoop(loopId: string, userId: string) {
    const original = await this.getLoop(loopId, userId)

    // Create copy with new UUID and owner
    const newLoopId = randomUUID()
    const result = await pool.query(
      `INSERT INTO loops (
        id, user_id, name, bars, color, bpm, schema_version,
        chord_progression, icon_sequence, parent_loop_id, updated_at
      )
      SELECT $1, $2, $3, bars, color, bpm, schema_version,
        chord_progression, icon_sequence, $4, NOW()
      FROM loops WHERE id = $4
      RETURNING *`,
      [newLoopId, userId, `Remix of ${original.name}`, loopId]
    )

    return this.transformDbLoop(result.rows[0])
  }

  // Transform database row to frontend Loop format
  private transformDbLoop(dbLoop: any) {
    return {
      id: dbLoop.id,
      name: dbLoop.name,
      bars: dbLoop.bars,
      color: dbLoop.color,
      bpm: dbLoop.bpm,
      chordProgression: dbLoop.chord_progression,
      iconSequence: dbLoop.icon_sequence,
      schemaVersion: dbLoop.schema_version,
      updatedAt: dbLoop.updated_at.toISOString(),
    }
  }
}
