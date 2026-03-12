import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import { Palette, LogOut, Trophy, Play } from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import { soundManager } from '../lib/sounds';
import { supabase } from '../lib/supabase';
import confetti from 'canvas-confetti';

interface GameResultsProps {
  onLeave: () => void;
}

export default function GameResults({ onLeave }: GameResultsProps) {
  const { room, players, currentPlayer } = useGameStore();

  useEffect(() => {
    soundManager.play('gameOver');
    
    // Trigger confetti
    const duration = 5 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 1000 };
    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

    const interval: any = setInterval(function() {
      const timeLeft = animationEnd - Date.now();
      if (timeLeft <= 0) return clearInterval(interval);
      const particleCount = 50 * (timeLeft / duration);
      confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } }));
      confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } }));
    }, 250);

    return () => clearInterval(interval);
  }, []);

  if (!room) return null;

  const finalResults = (room.settings as any).finalResults || [...players].sort((a, b) => b.score - a.score);
  const podium = finalResults.slice(0, 3);

  const handlePlayAgain = async () => {
    soundManager.play('click');
    // Reset room status
    await supabase.from('rooms').update({ 
      status: 'waiting', 
      current_round: 1, 
      used_words: [] 
    }).eq('id', room.id);

    // Reset all players
    await supabase.from('players').update({
      score: 0,
      has_guessed: false
    }).eq('room_id', room.id);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col overflow-hidden">
      <header className="h-16 bg-card border-b border-border px-6 flex items-center justify-between flex-shrink-0 z-20">
        <h1 className="text-xl font-bold text-card-foreground flex items-center gap-2">
          <Palette className="w-6 h-6 text-primary" />
          Vẽ & Đoán - Kết quả
        </h1>
        <button
          onClick={onLeave}
          className="flex items-center gap-2 px-4 py-2 bg-secondary hover:bg-secondary/80 rounded-lg text-sm font-medium transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Về trang chủ
        </button>
      </header>
      
      <main className="flex-1 relative flex flex-col items-center p-6 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary/5 via-background to-background overflow-y-auto">
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary blur-[120px] rounded-full animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent blur-[120px] rounded-full animate-pulse delay-1000" />
        </div>

        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-center mb-8 relative z-10"
        >
          <motion.div
            animate={{ rotate: [0, -10, 10, -10, 0], scale: [1, 1.1, 1] }}
            transition={{ duration: 4, repeat: Infinity }}
          >
            <Trophy className="w-16 h-16 text-yellow-500 mx-auto mb-3 drop-shadow-[0_0_15px_rgba(234,179,8,0.4)]" />
          </motion.div>
          <h2 className="text-3xl font-black text-foreground mb-1 tracking-tight">Bảng xếp hạng chung cuộc</h2>
          <p className="text-sm text-muted-foreground font-medium uppercase tracking-widest">Một trận đấu thật tuyệt vời!</p>
        </motion.div>
        
        
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="w-full max-w-lg bg-card/50 backdrop-blur-sm rounded-2xl p-4 border border-border shadow-lg mb-8 relative z-10"
        >
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3 px-1">Thứ hạng chung cuộc</h3>
          <div className="space-y-1.5">
            {finalResults.map((p: any, i: number) => (
              <div 
                key={p.id} 
                className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${
                  i === 0 ? 'bg-yellow-500/10 border-yellow-500/30' : 
                  i === 1 ? 'bg-slate-400/10 border-slate-400/30' : 
                  i === 2 ? 'bg-amber-700/10 border-amber-700/30' : 
                  'bg-background/50 border-border/50 hover:border-primary/30'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`font-mono font-bold w-4 text-xs text-center ${
                    i === 0 ? 'text-yellow-500' : 
                    i === 1 ? 'text-slate-400' : 
                    i === 2 ? 'text-amber-700' : 
                    'text-muted-foreground'
                  }`}>
                    {i + 1}
                  </span>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                    i === 0 ? 'bg-yellow-500 text-white' : 
                    i === 1 ? 'bg-slate-400 text-white' : 
                    i === 2 ? 'bg-amber-700 text-white' : 
                    'bg-muted text-muted-foreground'
                  }`}>
                    {p.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-sm flex items-center gap-2">
                      {p.name}
                      {p.id === currentPlayer?.id && (
                        <span className="text-[8px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full uppercase font-bold">Bạn</span>
                      )}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono font-bold text-primary text-sm">{p.score}</div>
                  <div className="text-[8px] text-muted-foreground uppercase font-bold tracking-tighter">Điểm</div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
        
        <div className="flex flex-col sm:flex-row items-center gap-3 mb-10 relative z-10">
          {currentPlayer?.isHost && (
            <button
              onClick={handlePlayAgain}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-black py-3 px-8 rounded-xl shadow-lg transition-all hover:scale-105 active:scale-95 flex items-center gap-2 text-lg"
            >
              <Play className="w-5 h-5 fill-current" />
              Chơi lại
            </button>
          )}
          <button
            onClick={onLeave}
            className="bg-secondary hover:bg-secondary/80 text-secondary-foreground font-bold py-3 px-8 rounded-xl shadow-md transition-all hover:scale-105 active:scale-95 flex items-center gap-2 text-lg"
          >
            <LogOut className="w-5 h-5" />
            Thoát ra menu
          </button>
        </div>
      </main>
    </div>
  );
}
