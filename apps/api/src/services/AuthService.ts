// Authentication service
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { pool } from '../db/client.js'
import { config } from '../config/index.js'

const SALT_ROUNDS = 10

export class AuthService {
  async signup(email: string, username: string, password: string) {
    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1 OR username = $2',
      [email, username]
    )

    if (existingUser.rows.length > 0) {
      throw new Error('User with this email or username already exists')
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, SALT_ROUNDS)

    // Create user
    const result = await pool.query(
      `INSERT INTO users (email, username, password_hash, display_name)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, username, display_name, created_at`,
      [email, username, password_hash, username]
    )

    const user = result.rows[0]

    // Generate JWT token
    // @ts-expect-error - Zod type inference incompatible with jwt types, but works at runtime
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        username: user.username,
      },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    )

    return { user, token }
  }

  async login(email: string, password: string) {
    // Find user
    const result = await pool.query(
      'SELECT id, email, username, password_hash, display_name FROM users WHERE email = $1',
      [email]
    )

    if (result.rows.length === 0) {
      throw new Error('Invalid email or password')
    }

    const user = result.rows[0]

    // Verify password
    const isValid = await bcrypt.compare(password, user.password_hash)

    if (!isValid) {
      throw new Error('Invalid email or password')
    }

    // Generate JWT token
    // @ts-expect-error - Zod type inference incompatible with jwt types, but works at runtime
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        username: user.username,
      },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    )

    // Remove password_hash from response
    const { password_hash, ...userWithoutPassword } = user

    return { user: userWithoutPassword, token }
  }

  async getProfile(userId: string) {
    const result = await pool.query(
      'SELECT id, email, username, display_name, avatar_url, created_at FROM users WHERE id = $1',
      [userId]
    )

    if (result.rows.length === 0) {
      throw new Error('User not found')
    }

    return result.rows[0]
  }
}
