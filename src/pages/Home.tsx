import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useGameStore } from '../store/gameStore';
import { Palette, Users, Settings, Play } from 'lucide-react';

export default function Home() {
  const navigate = useNavigate();
  const { setCurrentPlayer } = useGameStore();
  const [isCreating, setIsCreating] = useState(false);
  const [joinId, setJoinId] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [settings, setSettings] = useState({
    maxPlayers: 8,
    rounds: 3,
    drawTime: 80,
    hints: 2,
  });

  const handleCreateRoom = async () => {
    try {
      // Host creates room
      const hostId = crypto.randomUUID ? crypto.randomUUID() : '00000000-0000-4000-8000-' + Math.random().toString(16).substring(2, 14).padEnd(12, '0');
      const { data: room, error } = await supabase
        .from('rooms')
        .insert({
          host_id: hostId,
          settings,
        })
        .select()
        .single();

      if (error) throw error;

      setCurrentPlayer({ id: hostId, name: playerName || 'Host', isHost: true });
      navigate(`/room/${room.id}`);
    } catch (error: any) {
      console.error('Error creating room:', error);
      alert(`Failed to create room: ${error.message || error.toString()}`);
    }
  };

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinId || !playerName) return;

    try {
      // Check if room exists
      const { data: room, error: roomError } = await supabase
        .from('rooms')
        .select('*')
        .eq('id', joinId)
        .single();

      if (roomError || !room) {
        alert('Room not found!');
        return;
      }

      if (room.status !== 'waiting') {
        alert('Game has already started!');
        return;
      }

      // Add player to room
      const { data: player, error: playerError } = await supabase
        .from('players')
        .insert({
          room_id: joinId,
          name: playerName,
        })
        .select()
        .single();

      if (playerError) throw playerError;

      setCurrentPlayer({ id: player.id, name: player.name, isHost: false });
      navigate(`/room/${joinId}`);
    } catch (error) {
      console.error('Error joining room:', error);
      alert('Failed to join room.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <Palette className="w-16 h-16 text-indigo-500" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-white mb-2">Draw & Guess</h1>
          <p className="text-slate-400">Multiplayer drawing and guessing game</p>
        </div>

        <div className="bg-slate-800 p-6 rounded-2xl shadow-xl border border-slate-700">
          <div className="flex space-x-2 mb-6">
            <button
              onClick={() => setIsCreating(false)}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${!isCreating ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
            >
              Join Game
            </button>
            <button
              onClick={() => setIsCreating(true)}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${isCreating ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
            >
              Host Game
            </button>
          </div>

          {!isCreating ? (
            <form onSubmit={handleJoinRoom} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Your Name</label>
                <input
                  type="text"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Enter your name"
                  required
                  maxLength={20}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Room ID</label>
                <input
                  type="text"
                  value={joinId}
                  onChange={(e) => setJoinId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Enter room ID"
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4" />
                Join Room
              </button>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Max Players</label>
                  <input
                    type="number"
                    value={settings.maxPlayers}
                    onChange={(e) => setSettings({ ...settings, maxPlayers: parseInt(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    min={2}
                    max={20}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Rounds</label>
                  <input
                    type="number"
                    value={settings.rounds}
                    onChange={(e) => setSettings({ ...settings, rounds: parseInt(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    min={1}
                    max={10}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Draw Time (s)</label>
                  <input
                    type="number"
                    value={settings.drawTime}
                    onChange={(e) => setSettings({ ...settings, drawTime: parseInt(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    min={30}
                    max={180}
                    step={10}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Hints</label>
                  <input
                    type="number"
                    value={settings.hints}
                    onChange={(e) => setSettings({ ...settings, hints: parseInt(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    min={0}
                    max={5}
                  />
                </div>
              </div>
              <button
                onClick={handleCreateRoom}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Settings className="w-4 h-4" />
                Create Room (Host)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
