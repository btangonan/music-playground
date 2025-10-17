-- Music Playground Database Schema
-- Compatible with PostgreSQL 15+

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username VARCHAR(30) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  display_name VARCHAR(50),
  avatar_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT username_length CHECK (LENGTH(username) >= 3),
  CONSTRAINT email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$')
);

CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);

-- Loops table (matches frontend Loop interface)
CREATE TABLE IF NOT EXISTS loops (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Loop metadata
  name VARCHAR(100) NOT NULL,
  bars INTEGER NOT NULL CHECK (bars IN (1,2,4,8)),
  color VARCHAR(7) DEFAULT '#FFD11A',
  bpm INTEGER CHECK (bpm BETWEEN 40 AND 300),
  schema_version INTEGER NOT NULL DEFAULT 1,

  -- Musical data (JSONB for flexibility)
  chord_progression JSONB NOT NULL DEFAULT '[]',
  icon_sequence JSONB NOT NULL DEFAULT '[]',

  -- Social metadata
  is_public BOOLEAN NOT NULL DEFAULT false,
  plays_count INTEGER NOT NULL DEFAULT 0,
  likes_count INTEGER NOT NULL DEFAULT 0,
  remixes_count INTEGER NOT NULL DEFAULT 0,
  parent_loop_id UUID REFERENCES loops(id),

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT color_format CHECK (color ~* '^#[0-9A-F]{6}$')
);

CREATE INDEX idx_loops_user_id ON loops(user_id);
CREATE INDEX idx_loops_is_public ON loops(is_public);
CREATE INDEX idx_loops_created_at ON loops(created_at DESC);
CREATE INDEX idx_loops_plays_count ON loops(plays_count DESC);
CREATE INDEX idx_loops_likes_count ON loops(likes_count DESC);

-- Gin index for JSON queries
CREATE INDEX idx_loops_chord_progression ON loops USING GIN (chord_progression);
CREATE INDEX idx_loops_icon_sequence ON loops USING GIN (icon_sequence);

-- Songs table (matches frontend Song interface)
CREATE TABLE IF NOT EXISTS songs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Song metadata
  name VARCHAR(100) NOT NULL,
  bpm INTEGER NOT NULL CHECK (bpm BETWEEN 40 AND 300),
  time_signature VARCHAR(5) NOT NULL DEFAULT '4/4',
  total_bars INTEGER NOT NULL DEFAULT 0,
  schema_version INTEGER NOT NULL DEFAULT 1,

  -- Timeline data
  timeline JSONB NOT NULL DEFAULT '[]',

  -- Social metadata
  is_public BOOLEAN NOT NULL DEFAULT false,
  plays_count INTEGER NOT NULL DEFAULT 0,
  likes_count INTEGER NOT NULL DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT time_signature_format CHECK (time_signature IN ('4/4', '3/4'))
);

CREATE INDEX idx_songs_user_id ON songs(user_id);
CREATE INDEX idx_songs_is_public ON songs(is_public);
CREATE INDEX idx_songs_created_at ON songs(created_at DESC);

-- Loop likes (many-to-many)
CREATE TABLE IF NOT EXISTS loop_likes (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  loop_id UUID NOT NULL REFERENCES loops(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (user_id, loop_id)
);

CREATE INDEX idx_loop_likes_loop_id ON loop_likes(loop_id);

-- Song likes (many-to-many)
CREATE TABLE IF NOT EXISTS song_likes (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  song_id UUID NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (user_id, song_id)
);

CREATE INDEX idx_song_likes_song_id ON song_likes(song_id);

-- Update updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables
CREATE TRIGGER users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER loops_updated_at BEFORE UPDATE ON loops
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER songs_updated_at BEFORE UPDATE ON songs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
