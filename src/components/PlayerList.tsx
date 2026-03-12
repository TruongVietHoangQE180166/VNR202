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
                <span className="text-[10px] bg-secondary/50 text-secondary-foreground px-1.5 py-0.5 rounded-full uppercase font-bold">Host (You)</span>
              </span>
              <span className="text-xs text-muted-foreground">Observing</span>
            </div>
          </div>
        </div>
      )}
      {sortedPlayers.map((player, index) => {
        const isDrawer = room?.current_drawer_id === player.id;
        
        return (
          <div
            key={player.id}
            className={`flex items-center justify-between p-3 rounded-lg border ${
              player.has_guessed
                ? 'bg-green-500/10 border-green-500/50'
                : isDrawer
                ? 'bg-primary/20 border-primary/50'
                : 'bg-background/50 border-border/50'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="font-bold text-muted-foreground w-4">#{index + 1}</div>
              <div className="flex flex-col">
                <span className="font-medium text-foreground flex items-center gap-2">
                  {player.name}
                  {player.id === currentPlayer?.id && (
                    <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full uppercase font-bold">You</span>
                  )}
                  {isDrawer && <Pencil className="w-3 h-3 text-primary" />}
                  {player.has_guessed && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                </span>
                <span className="text-xs text-muted-foreground">{player.score} pts</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
