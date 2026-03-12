import React from 'react';
import { useGameStore } from '../store/gameStore';
import { Pencil, CheckCircle2 } from 'lucide-react';

export default function PlayerList() {
  const { players, room, currentPlayer } = useGameStore();
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);

  return (
    <div className="flex-1 overflow-y-auto p-2 space-y-2">
      {currentPlayer?.isHost && (
        <div className="flex items-center justify-between p-3 rounded-lg border bg-secondary/20 border-secondary/50 mb-4">
          <div className="flex items-center gap-3">
            <div className="flex flex-col">
              <span className="font-medium text-foreground flex items-center gap-2">
                {currentPlayer.name}
                <span className="text-[10px] bg-secondary/50 text-secondary-foreground px-1.5 py-0.5 rounded-full uppercase font-bold">Chủ phòng (Bạn)</span>
              </span>
              <span className="text-xs text-muted-foreground">Đang quan sát</span>
            </div>
          </div>
        </div>
      )}
      {sortedPlayers.map((player, index) => {
        const isDrawer = room?.current_drawer_id === player.id;
        const isMe = player.id === currentPlayer?.id;
        const isTop3 = index < 3;
        
        return (
          <div
            key={player.id}
            className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
              isTop3 && player.score > 0
                ? index === 0 
                  ? 'bg-yellow-500/10 border-yellow-500/50 shadow-[0_0_10px_rgba(234,179,8,0.2)]' 
                  : index === 1 
                  ? 'bg-slate-400/10 border-slate-400/50 shadow-[0_0_10px_rgba(148,163,184,0.1)]' 
                  : 'bg-amber-700/10 border-amber-700/50 shadow-[0_0_10px_rgba(180,83,9,0.1)]'
                : player.has_guessed
                ? 'bg-emerald-500/10 border-emerald-500/50'
                : isDrawer
                ? 'bg-primary/20 border-primary/50'
                : isMe
                ? 'bg-background/80 border-primary/30 ring-1 ring-primary/20'
                : 'bg-background/50 border-border/50'
            }`}
          >
            <div className="flex items-center gap-3 w-full">
              <div className={`font-black text-xs w-6 h-6 rounded-full flex items-center justify-center ${
                index === 0 ? 'bg-yellow-500 text-white' : 
                index === 1 ? 'bg-slate-400 text-white' : 
                index === 2 ? 'bg-amber-700 text-white' : 
                'text-muted-foreground'
              }`}>
                {index + 1}
              </div>
              <div className="flex flex-col flex-1 overflow-hidden">
                <span className={`font-bold text-sm truncate flex items-center gap-1.5 ${
                  index === 0 ? 'text-yellow-600 dark:text-yellow-500' : ''
                }`}>
                  {player.name}
                  {isMe && (
                    <span className="text-[8px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full uppercase font-black">Bạn</span>
                  )}
                  {index === 0 && player.score > 0 && <span className="text-yellow-500">👑</span>}
                </span>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold text-muted-foreground uppercase">{player.score} điểm</span>
                  <div className="flex items-center gap-1">
                    {isDrawer && <Pencil className="w-3 h-3 text-primary animate-bounce" />}
                    {player.has_guessed && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
