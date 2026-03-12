import React from 'react';
import { useGameStore } from '../store/gameStore';
import { Pencil, CheckCircle2 } from 'lucide-react';

export default function PlayerList() {
  const { players, room } = useGameStore();

  return (
    <div className="flex-1 overflow-y-auto p-2 space-y-2">
      {players.map((player, index) => {
        const isDrawer = room?.current_drawer_id === player.id;
        
        return (
          <div
            key={player.id}
            className={`flex items-center justify-between p-3 rounded-lg border ${
              player.has_guessed
                ? 'bg-accent/20 border-accent/50'
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
                  {isDrawer && <Pencil className="w-3 h-3 text-primary" />}
                  {player.has_guessed && <CheckCircle2 className="w-4 h-4 text-accent" />}
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
