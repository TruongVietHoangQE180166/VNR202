import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useGameStore } from '../store/gameStore';
import { Palette, Users, Settings, Play, Pencil, Volume2, VolumeX, Trophy, MessageSquare, Info, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { soundManager } from '../lib/sounds';
import GameplayModal from '../components/GameplayModal';

export default function Home() {
  const navigate = useNavigate();
  const { setCurrentPlayer } = useGameStore();
  const [isCreating, setIsCreating] = useState(false);
  const [joinId, setJoinId] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [isMuted, setIsMuted] = useState(soundManager.getIsMuted());
  const [volume, setVolume] = useState(soundManager.getVolume());
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    soundManager.playBGM();
  }, []);

  const toggleMute = () => {
    const newMuted = soundManager.toggleMute();
    setIsMuted(newMuted);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    soundManager.setVolume(newVolume);
    setVolume(newVolume);
  };
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
      const { data: room, error: roomError } = await supabase
        .from('rooms')
        .insert({
          host_id: hostId,
          settings,
        })
        .select()
        .single();

      if (roomError) throw roomError;

      setCurrentPlayer({ id: hostId, name: 'Chủ phòng', isHost: true });
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
        alert('Không tìm thấy phòng!');
        return;
      }

      if (room.status !== 'waiting') {
        alert('Trò chơi đã bắt đầu!');
        return;
      }

      // Check for unique name
      const { data: existingPlayers, error: playersError } = await supabase
        .from('players')
        .select('name')
        .eq('room_id', joinId);
      
      if (playersError) throw playersError;

      if (existingPlayers.some(p => p.name.toLowerCase() === playerName.toLowerCase())) {
        alert('Tên này đã có người sử dụng! Vui lòng chọn tên khác.');
        return;
      }

      if (existingPlayers.length >= room.settings.maxPlayers) {
        alert('Phòng đã đầy!');
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
      alert('Không thể vào phòng.');
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
        <motion.div
          animate={{
            rotate: [0, 360],
            scale: [1, 1.2, 1],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-primary/5 blur-[120px]"
        />
        <motion.div
          animate={{
            rotate: [360, 0],
            scale: [1, 1.5, 1],
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute -bottom-[20%] -right-[10%] w-[60%] h-[60%] rounded-full bg-accent/5 blur-[120px]"
        />
        
        {/* Floating game elements */}
        <div className="absolute top-4 right-4 z-50 pointer-events-auto flex items-center gap-3">
          <div className="flex items-center gap-2 bg-card/50 backdrop-blur-md px-4 py-2 rounded-full border border-border/50 shadow-lg">
            <button
              onClick={toggleMute}
              className="p-1 hover:bg-secondary rounded-md transition-all text-muted-foreground hover:text-foreground"
              title={isMuted ? "Bật âm" : "Tắt âm"}
            >
              {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={handleVolumeChange}
              className="w-24 h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
            />
          </div>
        </div>
        <motion.div
          animate={{ y: [0, -20, 0], rotate: [0, 10, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[15%] left-[15%] opacity-20"
        >
          <Pencil className="w-16 h-16 text-primary" />
        </motion.div>
        <motion.div
          animate={{ y: [0, 20, 0], rotate: [0, -15, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute bottom-[20%] right-[15%] opacity-20"
        >
          <Palette className="w-20 h-20 text-accent" />
        </motion.div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full space-y-8 relative z-10"
      >
        <div className="text-center">
          <motion.div 
            initial={{ scale: 0, rotate: -15 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.1 }}
            className="flex justify-center mb-4 relative"
          >
            <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
            <Palette className="w-20 h-20 text-primary relative z-10 drop-shadow-lg" />
            <motion.div
              animate={{ y: [-5, 5, -5], x: [5, -5, 5] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -right-4 -top-2"
            >
              <Pencil className="w-8 h-8 text-accent drop-shadow-md" />
            </motion.div>
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-5xl font-extrabold tracking-tight mb-3 bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent"
          >
            Vẽ & Đoán
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-muted-foreground text-lg"
          >
            Phát huy tư duy sáng tạo và cùng đoán bức vẽ!
          </motion.p>
        </div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4, type: "spring", stiffness: 300, damping: 25 }}
          className="bg-card/80 backdrop-blur-xl text-card-foreground p-8 rounded-3xl shadow-2xl border border-border/50 relative overflow-hidden"
        >
          {/* Subtle inner glow */}
          <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
          
          <div className="flex space-x-2 mb-8 relative z-10 bg-muted/50 p-1 rounded-xl">
            <button
              onClick={() => setIsCreating(false)}
              className={`flex-1 py-2.5 px-4 rounded-lg font-semibold transition-all duration-200 ${!isCreating ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Tham gia
            </button>
            <button
              onClick={() => setIsCreating(true)}
              className={`flex-1 py-2.5 px-4 rounded-lg font-semibold transition-all duration-200 ${isCreating ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Tạo phòng
            </button>
          </div>

          <div className="relative z-10">
            {!isCreating ? (
              <motion.form 
                key="join"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                onSubmit={handleJoinRoom} 
                className="space-y-5"
              >
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Tên của bạn</label>
                <input
                  type="text"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  className="w-full bg-background border border-input rounded-lg px-4 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Nhập tên của bạn"
                  required
                  maxLength={20}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Mã phòng</label>
                <input
                  type="text"
                  value={joinId}
                  onChange={(e) => setJoinId(e.target.value)}
                  className="w-full bg-background border border-input rounded-lg px-4 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Nhập mã phòng"
                  required
                />
              </div>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg shadow-primary/25 mt-6"
              >
                <Play className="w-5 h-5" />
                Vào phòng
              </motion.button>
            </motion.form>
          ) : (
            <motion.div 
              key="host"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-5"
            >
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">Người chơi tối đa</label>
                  <input
                    type="number"
                    value={settings.maxPlayers}
                    onChange={(e) => setSettings({ ...settings, maxPlayers: parseInt(e.target.value) })}
                    className="w-full bg-background border border-input rounded-lg px-4 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    min={2}
                    max={20}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">Số vòng</label>
                  <input
                    type="number"
                    value={settings.rounds}
                    onChange={(e) => setSettings({ ...settings, rounds: parseInt(e.target.value) })}
                    className="w-full bg-background border border-input rounded-lg px-4 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    min={1}
                    max={10}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">Thời gian vẽ (s)</label>
                  <input
                    type="number"
                    value={settings.drawTime}
                    onChange={(e) => setSettings({ ...settings, drawTime: parseInt(e.target.value) })}
                    className="w-full bg-background border border-input rounded-lg px-4 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    min={30}
                    max={180}
                    step={10}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">Gợi ý</label>
                  <input
                    type="number"
                    value={settings.hints}
                    onChange={(e) => setSettings({ ...settings, hints: parseInt(e.target.value) })}
                    className="w-full bg-background border border-input rounded-lg px-4 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    min={0}
                    max={5}
                  />
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleCreateRoom}
                className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-bold py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg shadow-accent/25 mt-6"
              >
                <Settings className="w-5 h-5" />
                Tạo phòng (Chủ phòng)
              </motion.button>
            </motion.div>
          )}
          <div className="flex flex-col gap-4 mt-8 relative z-10">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowGuide(true)}
              className="flex items-center justify-center gap-2 text-sm font-bold text-muted-foreground hover:text-primary transition-colors py-2"
            >
              <Info className="w-4 h-4" />
              Hướng dẫn cách chơi
            </motion.button>
          </div>
        </div>
      </motion.div>
    </motion.div>

    <GameplayModal 
      isOpen={showGuide} 
      onClose={() => setShowGuide(false)} 
    />
  </div>
  );
}
