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
                ? 'bg-emerald-900/30 border-emerald-700/50'
                : isDrawer
                ? 'bg-indigo-900/30 border-indigo-700/50'
                : 'bg-slate-900/50 border-slate-700/50'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="font-bold text-slate-400 w-4">#{index + 1}</div>
              <div className="flex flex-col">
                <span className="font-medium text-white flex items-center gap-2">
                  {player.name}
                  {isDrawer && <Pencil className="w-3 h-3 text-indigo-400" />}
                  {player.has_guessed && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                </span>
                <span className="text-xs text-slate-400">{player.score} pts</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
