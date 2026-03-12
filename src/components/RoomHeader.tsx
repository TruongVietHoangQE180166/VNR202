import React, { useState } from 'react';
import { Palette, LogOut, Volume2, VolumeX } from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import { soundManager } from '../lib/sounds';
import Timer from './Timer';

interface RoomHeaderProps {
  onLeave: () => void;
}

export default function RoomHeader({ onLeave }: RoomHeaderProps) {
  const { room } = useGameStore();
  const [isMuted, setIsMuted] = useState(soundManager.getIsMuted());
  const [volume, setVolume] = useState(soundManager.getVolume());

  if (!room) return null;

  const toggleMute = () => {
    const newMuted = soundManager.toggleMute();
    setIsMuted(newMuted);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    soundManager.setVolume(newVolume);
    setVolume(newVolume);
  };

  return (
    <header className="h-16 bg-card border-b border-border px-4 flex items-center justify-between flex-shrink-0">
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-bold text-card-foreground flex items-center gap-2">
          <Palette className="w-6 h-6 text-primary" />
          Vẽ & Đoán
        </h1>
        <div className="bg-background px-3 py-1 rounded-md text-sm font-mono text-muted-foreground border border-border">
          Phòng: {room.id}
        </div>
      </div>
      
      {room.status === 'playing' && (
        <div className="flex items-center gap-6">
          <div className="text-center">
            <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Vòng</div>
            <div className="font-mono text-lg">{room.current_round} / {room.settings.rounds}</div>
          </div>
          <Timer />
        </div>
      )}

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 bg-secondary/50 px-3 py-1.5 rounded-lg border border-border/50">
          <button
            onClick={toggleMute}
            className="p-1 hover:bg-secondary rounded-md transition-colors text-muted-foreground hover:text-foreground"
            title={isMuted ? "Bật âm" : "Tắt âm"}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={handleVolumeChange}
            className="w-20 h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
          />
        </div>

        <button
          onClick={() => {
            soundManager.play('click');
            onLeave();
          }}
          className="flex items-center gap-2 px-4 py-2 bg-secondary hover:bg-secondary/80 rounded-lg text-sm font-medium transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Rời phòng
        </button>
      </div>
    </header>
  );
}
