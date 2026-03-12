import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Loader2, Palette, Trophy, Pencil } from 'lucide-react';
import { useGameStore } from '../store/gameStore';

interface GameOverlaysProps {
  showYourTurn: boolean;
  showCorrectGuess: boolean;
  showTurnAnnouncement: boolean;
  currentDrawerName: string;
  scoreGains: Record<string, number>;
}

export default function GameOverlays({
  showYourTurn,
  showCorrectGuess,
  showTurnAnnouncement,
  currentDrawerName,
  scoreGains,
}: GameOverlaysProps) {
  const { room, players, currentPlayer } = useGameStore();
  const isDrawer = currentPlayer?.id === room?.current_drawer_id;

  if (!room) return null;

  return (
    <AnimatePresence>
      {/* Waiting for round overlay */}
      {!isDrawer && !room.current_drawer_id && room.status === 'playing' && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-10 rounded-xl border-4 border-transparent"
        >
          <motion.div 
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            className="bg-card p-8 rounded-2xl shadow-2xl border border-border text-center max-w-md w-full mx-4"
          >
            <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
            <div className="text-2xl font-bold text-foreground mb-2">Đang chờ vòng tiếp theo...</div>
            <p className="text-muted-foreground">Chuẩn bị để đoán nào!</p>
          </motion.div>
        </motion.div>
      )}
      
      {/* Round over overlay */}
      {room.status === 'round_over' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-background/95 backdrop-blur-md flex items-center justify-center z-20 rounded-xl border-4 border-transparent"
        >
          <motion.div 
            initial={{ scale: 0.5, opacity: 0, rotate: -5 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="bg-card p-8 rounded-3xl shadow-2xl border border-border text-center max-w-lg w-full mx-4 relative overflow-hidden flex flex-col max-h-[90%]"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5 pointer-events-none" />
            <h3 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent mb-4 drop-shadow-sm relative z-10">Kết thúc vòng chơi!</h3>
            <p className="text-xl text-muted-foreground relative z-10 mb-6">
              Từ khóa là: <br/>
              <span className="font-black text-foreground text-3xl mt-1 block tracking-widest uppercase">{room.current_word}</span>
            </p>

            <div className="relative z-10 flex-1 overflow-y-auto pr-2 space-y-2">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Thay đổi điểm số</h4>
                {(() => {
                  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
                  const myRank = sortedPlayers.findIndex(p => p.id === currentPlayer?.id) + 1;
                  return (
                    <span className="text-xs font-bold px-2 py-1 bg-primary/20 text-primary rounded-lg">
                      Hạng của bạn: #{myRank}
                    </span>
                  );
                })()}
              </div>
              {[...players].sort((a, b) => b.score - a.score).map((p, index) => {
                const isMe = p.id === currentPlayer?.id;
                const gain = scoreGains[p.id];
                const isTop3 = index < 3 && p.score > 0;
                
                return (
                  <div 
                    key={p.id} 
                    className={`flex items-center justify-between transition-all duration-300 ${
                      isTop3 ? 'p-4 rounded-2xl border-2 mb-1 scale-[1.02]' : 'p-3 rounded-xl border mb-0.5'
                    } ${
                      index === 0 ? 'bg-yellow-500/15 border-yellow-500/50 shadow-lg shadow-yellow-500/10' : 
                      index === 1 ? 'bg-slate-400/15 border-slate-400/50' : 
                      index === 2 ? 'bg-amber-700/15 border-amber-700/50' : 
                      isMe ? 'bg-primary/10 border-primary/30' : 'bg-background/50 border-border/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className={`font-black flex items-center justify-center rounded-full ${
                          isTop3 ? 'w-10 h-10 text-base' : 'w-7 h-7 text-xs'
                        } ${
                          index === 0 ? 'bg-yellow-500 text-white animate-pulse' : 
                          index === 1 ? 'bg-slate-400 text-white' : 
                          index === 2 ? 'bg-amber-700 text-white' : 
                          'bg-muted text-muted-foreground'
                        }`}>
                          {index + 1}
                        </div>
                        {index === 0 && p.score > 0 && (
                          <div className="absolute -top-3 -left-1 rotate-[-20deg] text-xl">👑</div>
                        )}
                      </div>
                      <div className="flex flex-col">
                        <span className={`font-bold flex items-center gap-2 ${
                          isTop3 ? 'text-lg' : 'text-sm'
                        } ${
                          index === 0 ? 'text-yellow-600 dark:text-yellow-400' : ''
                        }`}>
                          {p.name}
                          {isMe && (
                            <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full uppercase font-black">Bạn</span>
                          )}
                        </span>
                        {isTop3 && (
                          <span className={`text-[10px] font-black uppercase tracking-wider opacity-70 ${
                            index === 0 ? 'text-yellow-600' : index === 1 ? 'text-slate-500' : 'text-amber-800'
                          }`}>
                            {index === 0 ? 'Đang dẫn đầu' : index === 1 ? 'Hạng 2' : 'Hạng 3'}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className={`font-mono font-black ${isTop3 ? 'text-xl' : 'text-sm'}`}>{p.score}</div>
                        <div className="text-[10px] text-muted-foreground uppercase font-black">Tổng điểm</div>
                      </div>
                      {gain !== undefined && (
                        <div className={`font-black rounded-lg px-2.5 py-1 flex items-center justify-center ${
                          isTop3 ? 'text-sm min-w-[50px]' : 'text-xs min-w-[40px]'
                        } ${
                          gain > 0 ? 'text-emerald-500 bg-emerald-500/15 ring-1 ring-emerald-500/30' : 
                          'text-rose-500 bg-rose-500/15 ring-1 ring-rose-500/30'
                        }`}>
                          {gain > 0 ? `+${gain}` : gain}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Your turn overlay */}
      {showYourTurn && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-30 rounded-xl border-4 border-transparent pointer-events-none"
        >
          <motion.div 
            initial={{ scale: 0.5, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: -50 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="bg-primary text-primary-foreground p-8 rounded-3xl shadow-2xl text-center max-w-md w-full mx-4"
          >
            <Palette className="w-16 h-16 mx-auto mb-4" />
            <h3 className="text-4xl font-extrabold mb-2">Đến lượt bạn!</h3>
            <p className="text-xl opacity-90">Chuẩn bị bắt đầu vẽ</p>
          </motion.div>
        </motion.div>
      )}

      {/* Correct guess overlay */}
      {showCorrectGuess && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-background/40 backdrop-blur-sm flex items-center justify-center z-30 rounded-xl border-4 border-transparent pointer-events-none"
        >
          <motion.div 
            initial={{ scale: 0.5, opacity: 0, rotate: 10 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            exit={{ scale: 0.8, opacity: 0, rotate: -10 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="bg-accent text-accent-foreground p-8 rounded-3xl shadow-2xl text-center max-w-md w-full mx-4"
          >
            <Trophy className="w-16 h-16 mx-auto mb-4" />
            <h3 className="text-4xl font-extrabold mb-2">Chính xác!</h3>
            <p className="text-xl opacity-90">Bạn đã đoán trúng từ khóa</p>
          </motion.div>
        </motion.div>
      )}

      {/* Turn announcement overlay */}
      {showTurnAnnouncement && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-background/40 backdrop-blur-sm flex items-center justify-center z-30 rounded-xl border-4 border-transparent pointer-events-none"
        >
          <motion.div 
            initial={{ scale: 0.5, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: -50 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="bg-secondary text-secondary-foreground p-8 rounded-3xl shadow-2xl text-center max-w-md w-full mx-4"
          >
            <Pencil className="w-16 h-16 mx-auto mb-4 text-primary" />
            <h3 className="text-3xl font-extrabold mb-2">{currentDrawerName} đang vẽ!</h3>
            <p className="text-lg opacity-90">Chuẩn bị để đoán nào</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
