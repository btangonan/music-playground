// ID generation utility
import { v4 as uuidv4 } from 'uuid'

/**
 * Generate a new UUID v4 for loops, songs, and timeline blocks
 * Database uses UUID format, not nanoid
 */
export function generateId(): string {
  return uuidv4()
}
