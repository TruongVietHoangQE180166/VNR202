import React, { useEffect, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { Clock } from 'lucide-react';

export default function Timer() {
  const { room } = useGameStore();
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    if (!room || !room.word_start_time || room.status !== 'playing') {
      setTimeLeft(0);
      return;
    }

    const updateTimer = () => {
      const startTime = new Date(room.word_start_time!).getTime();
      const now = new Date().getTime();
      const elapsed = (now - startTime) / 1000;
      const remaining = Math.max(0, Math.ceil(room.settings.drawTime - elapsed));
      setTimeLeft(remaining);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [room]);

  if (!room || room.status !== 'playing') return null;

  return (
    <div className="flex items-center gap-2 bg-slate-900 px-4 py-2 rounded-lg border border-slate-700">
      <Clock className={`w-5 h-5 ${timeLeft <= 10 ? 'text-red-500 animate-pulse' : 'text-indigo-400'}`} />
      <span className={`font-mono text-xl font-bold ${timeLeft <= 10 ? 'text-red-500' : 'text-white'}`}>
        {timeLeft}s
      </span>
    </div>
  );
}
