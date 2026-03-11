-- Run this in your Supabase SQL Editor

-- Create rooms table
CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  status TEXT DEFAULT 'waiting', -- waiting, playing, finished
  settings JSONB DEFAULT '{"maxPlayers": 8, "rounds": 3, "drawTime": 80, "hints": 2}'::jsonb,
  current_round INTEGER DEFAULT 1,
  current_drawer_id UUID,
  current_word TEXT,
  word_start_time TIMESTAMP WITH TIME ZONE,
  used_words TEXT[] DEFAULT '{}',
  host_id UUID NOT NULL
);

-- Create players table
CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  score INTEGER DEFAULT 0,
  has_guessed BOOLEAN DEFAULT false,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create messages table
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  player_name TEXT,
  content TEXT NOT NULL,
  is_system BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Realtime for these tables
ALTER PUBLICATION supabase_realtime ADD TABLE rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE players;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- Enable Row Level Security (RLS)
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Create policies to allow public access (for this game prototype)
CREATE POLICY "Allow public read/write on rooms" ON rooms FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read/write on players" ON players FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read/write on messages" ON messages FOR ALL USING (true) WITH CHECK (true);
