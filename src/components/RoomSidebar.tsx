import React from 'react';
import { Users, Play } from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import { soundManager } from '../lib/sounds';
import PlayerList from './PlayerList';

interface RoomSidebarProps {
  onStartGame: () => void;
}

export default function RoomSidebar({ onStartGame }: RoomSidebarProps) {
  const { players, room, currentPlayer } = useGameStore();

  if (!room) return null;

  return (
    <aside className="w-64 bg-card border-r border-border flex flex-col h-full">
      <div className="p-4 border-b border-border">
        <h2 className="font-semibold flex items-center gap-2 text-primary">
          <Users className="w-4 h-4" />
          Chủ phòng
        </h2>
        <div className="mt-2 flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold">
            C
          </div>
          <span className="font-medium text-card-foreground">Chủ phòng</span>
        </div>
      </div>

      <div className="p-4 border-b border-border flex items-center justify-between">
        <h2 className="font-semibold flex items-center gap-2">
          <Users className="w-4 h-4" />
          Người chơi ({players.length}/{room.settings.maxPlayers})
        </h2>
      </div>
      <PlayerList />
      
      {currentPlayer?.isHost && room.status === 'waiting' && (
        <div className="p-4 mt-auto border-t border-border">
          <button
            onClick={() => {
              soundManager.play('click');
              onStartGame();
            }}
            disabled={players.length < 2}
            className="w-full bg-accent hover:bg-accent/90 disabled:bg-muted disabled:text-muted-foreground text-accent-foreground font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Play className="w-5 h-5" />
            Bắt đầu
          </button>
        </div>
      )}
    </aside>
  );
}
