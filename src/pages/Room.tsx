import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useGameStore, Room as RoomType, Player, Message } from '../store/gameStore';
import Canvas from '../components/Canvas';
import Chat from '../components/Chat';
import PlayerList from '../components/PlayerList';
import WordDisplay from '../components/WordDisplay';
import Timer from '../components/Timer';
import { Users, LogOut, Play, Trophy, Palette, Loader2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'motion/react';
import { soundManager } from '../lib/sounds';

import WORDS from '../words.json';

export default function Room() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentPlayer, room, players, messages, setRoom, setPlayers, setMessages, addMessage } = useGameStore();
  const [loading, setLoading] = useState(true);
  const [channel, setChannel] = useState<any>(null);
  const [showRoundOver, setShowRoundOver] = useState(false);
  const [showYourTurn, setShowYourTurn] = useState(false);
  const [showCorrectGuess, setShowCorrectGuess] = useState(false);
  const [prevDrawerId, setPrevDrawerId] = useState<string | null>(null);
  const [prevHasGuessed, setPrevHasGuessed] = useState(false);

  const [prevStatus, setPrevStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!room || !currentPlayer) return;

    // Play start sound for everyone when room status changes to starting
    if (room.status === 'starting' && prevStatus !== 'starting') {
      soundManager.play('start');
    }
    setPrevStatus(room.status);
    
    // Check if it's now your turn to draw
    if (room.current_drawer_id === currentPlayer.id && prevDrawerId !== currentPlayer.id) {
      setShowYourTurn(true);
      setTimeout(() => setShowYourTurn(false), 3000);
    }

    // Play turn sound for everyone when drawer changes
    if (room.current_drawer_id && room.current_drawer_id !== prevDrawerId) {
      soundManager.play('turn');
    }

    setPrevDrawerId(room.current_drawer_id);

    // Check if you just guessed correctly
    const me = players.find(p => p.id === currentPlayer.id);
    if (me && me.has_guessed && !prevHasGuessed) {
      setShowCorrectGuess(true);
      soundManager.play('correct');
      setTimeout(() => setShowCorrectGuess(false), 3000);
    }
    if (me) {
      setPrevHasGuessed(me.has_guessed);
    }
  }, [room?.current_drawer_id, players, currentPlayer, prevDrawerId, prevHasGuessed]);

  useEffect(() => {
    if (!id || !currentPlayer) {
      navigate('/');
      return;
    }

    const fetchInitialData = async () => {
      try {
        // Fetch room
        const { data: roomData, error: roomError } = await supabase
          .from('rooms')
          .select('*')
          .eq('id', id)
          .single();
        
        if (roomError) throw roomError;
        setRoom(roomData);

        // Fetch players
        const { data: playersData, error: playersError } = await supabase
          .from('players')
          .select('*')
          .eq('room_id', id)
          .order('joined_at', { ascending: true });
        
        if (playersError) throw playersError;
        setPlayers(playersData);

        // Fetch messages
        const { data: messagesData, error: messagesError } = await supabase
          .from('messages')
          .select('*')
          .eq('room_id', id)
          .order('created_at', { ascending: false })
          .limit(50);
        
        if (messagesError) throw messagesError;
        setMessages(messagesData.reverse());

        setLoading(false);
      } catch (error) {
        console.error('Error fetching initial data:', error);
        alert('Failed to load room data.');
        navigate('/');
      }
    };

    fetchInitialData();

    // Set up realtime subscriptions
    const realtimeChannel = supabase.channel(`room:${id}`);
    setChannel(realtimeChannel);

    realtimeChannel
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, (payload) => {
        if (payload.new && (payload.new as RoomType).id === id) {
          setRoom(payload.new as RoomType);
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'players' }, async (payload) => {
        if ((payload.new && (payload.new as Player).room_id === id) || (payload.old && (payload.old as Player).room_id === id)) {
          const { data } = await supabase.from('players').select('*').eq('room_id', id).order('joined_at', { ascending: true });
          if (data) setPlayers(data);
        }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        if (payload.new && (payload.new as Message).room_id === id) {
          const msg = payload.new as Message;
          addMessage(msg);
          
          // Trigger confetti if someone guessed the word
          if (msg.is_system && msg.content.includes('guessed the word!') && msg.content.includes(currentPlayer?.name || '')) {
            const duration = 3 * 1000;
            const animationEnd = Date.now() + duration;
            const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

            const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

            const interval: any = setInterval(function() {
              const timeLeft = animationEnd - Date.now();

              if (timeLeft <= 0) {
                return clearInterval(interval);
              }

              const particleCount = 50 * (timeLeft / duration);
              confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } }));
              confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } }));
            }, 250);
          }
        }
      })
      .subscribe();

    // Polling fallback just in case realtime fails
    const pollingInterval = setInterval(async () => {
      const { data: roomData } = await supabase.from('rooms').select('*').eq('id', id).single();
      if (roomData) setRoom(roomData);

      const { data } = await supabase.from('players').select('*').eq('room_id', id).order('joined_at', { ascending: true });
      if (data) setPlayers(data);
      
      const { data: msgs } = await supabase.from('messages').select('*').eq('room_id', id).order('created_at', { ascending: false }).limit(50);
      if (msgs) setMessages(msgs.reverse());
    }, 3000);

    return () => {
      clearInterval(pollingInterval);
      supabase.removeChannel(realtimeChannel);
    };
  }, [id, currentPlayer, navigate]);

  const isEndingTurn = useRef(false);

  // Host game loop logic
  useEffect(() => {
    if (!currentPlayer?.isHost || !room || room.status !== 'playing') return;

    let interval: NodeJS.Timeout;

    const checkTurnStatus = async () => {
      if (!room.word_start_time || !room.current_word || isEndingTurn.current) return;

      const startTime = new Date(room.word_start_time).getTime();
      const now = new Date().getTime();
      const elapsed = (now - startTime) / 1000;

      // Check if time is up or all players guessed
      const nonDrawers = players.filter(p => p.id !== room.current_drawer_id);
      const allGuessed = nonDrawers.length > 0 && nonDrawers.every(p => p.has_guessed);
      
      if (elapsed >= room.settings.drawTime || allGuessed) {
        isEndingTurn.current = true;
        
        // Broadcast round over to show overlay for everyone
        await supabase.from('rooms').update({
          status: 'round_over'
        }).eq('id', room.id);

        await endTurn();
        
        // Reset after a short delay to allow DB updates to propagate
        setTimeout(() => {
          isEndingTurn.current = false;
        }, 3000);
      }
    };

    interval = setInterval(checkTurnStatus, 1000);

    return () => clearInterval(interval);
  }, [room, players, currentPlayer]);

  const endTurn = async () => {
    if (!room) return;

    // Set status to round_over to show the overlay
    await supabase.from('rooms').update({
      status: 'round_over',
    }).eq('id', room.id);

    // Send system message with answer
    const sysMsgId = crypto.randomUUID ? crypto.randomUUID() : '00000000-0000-4000-8000-' + Math.random().toString(16).substring(2, 14).padEnd(12, '0');
    
    await supabase.from('messages').insert({
      id: sysMsgId,
      room_id: room.id,
      content: `The word was: ${room.current_word}`,
      is_system: true,
    });

    // Find next drawer
    const currentIndex = players.findIndex(p => p.id === room.current_drawer_id);
    let nextIndex = currentIndex + 1;
    let nextRound = room.current_round;

    if (nextIndex >= players.length) {
      nextIndex = 0;
      nextRound++;
    }

    if (nextRound > room.settings.rounds) {
      // Game over
      soundManager.play('gameOver');
      const finalResults = [...players].sort((a, b) => b.score - a.score);
      
      setTimeout(async () => {
        await supabase.from('rooms').update({
          status: 'finished',
          current_drawer_id: null,
          current_word: null,
          word_start_time: null,
          settings: { ...room.settings, finalResults }
        }).eq('id', room.id);
      }, 3000);
      
      const gameOverId = crypto.randomUUID ? crypto.randomUUID() : '00000000-0000-4000-8000-' + Math.random().toString(16).substring(2, 14).padEnd(12, '0');
      addMessage({
        id: gameOverId,
        room_id: room.id,
        player_id: null,
        player_name: null,
        content: `Game Over!`,
        is_system: true,
        created_at: new Date().toISOString(),
      });
      await supabase.from('messages').insert({
        id: gameOverId,
        room_id: room.id,
        content: `Game Over!`,
        is_system: true,
      });
    } else {
      // Next turn
      const nextDrawer = players[nextIndex];
      setTimeout(() => {
        startTurn(nextDrawer.id, nextRound, room.used_words);
      }, 3000);
    }
  };

  const startTurn = async (drawerId: string, round: number, usedWords: string[]) => {
    if (!room) return;

    const safeUsedWords = usedWords || [];

    // Pick a new word
    let availableWords = WORDS.filter(w => !safeUsedWords.includes(w));
    if (availableWords.length === 0) {
      availableWords = WORDS; // Reset if all used
      safeUsedWords.length = 0;
    }
    
    const word = availableWords[Math.floor(Math.random() * availableWords.length)];
    const newUsedWords = [...safeUsedWords, word];

    const drawer = players.find(p => p.id === drawerId);
    const turnMsgId = crypto.randomUUID ? crypto.randomUUID() : '00000000-0000-4000-8000-' + Math.random().toString(16).substring(2, 14).padEnd(12, '0');
    
    // Add local message for the host/drawer
    addMessage({
      id: turnMsgId,
      room_id: room.id,
      player_id: null,
      player_name: null,
      content: `${drawer?.name || 'Someone'} is now drawing!`,
      is_system: true,
      created_at: new Date().toISOString(),
    });

    await supabase.from('messages').insert({
      id: turnMsgId,
      room_id: room.id,
      content: `${drawer?.name || 'Someone'} is now drawing!`,
      is_system: true,
    });

    // Reset players has_guessed
    const { error: pError } = await supabase.from('players').update({ has_guessed: false }).eq('room_id', room.id);
    if (pError) console.error("Error resetting players:", pError);

    // Update room
    const { error: rError } = await supabase.from('rooms').update({
      status: 'playing',
      current_drawer_id: drawerId,
      current_word: word,
      word_start_time: new Date().toISOString(),
      current_round: round,
      used_words: newUsedWords,
    }).eq('id', room.id);
    if (rError) console.error("Error updating room in startTurn:", rError);
  };

  const startGame = async () => {
    if (!room || players.length < 1) {
      alert("Need at least 1 player to start the game.");
      return;
    }
    
    // Update status to starting so everyone sees loading
    await supabase.from('rooms').update({ status: 'starting' }).eq('id', room.id);
    
    try {
      const startMsgId = crypto.randomUUID ? crypto.randomUUID() : '00000000-0000-4000-8000-' + Math.random().toString(16).substring(2, 14).padEnd(12, '0');
      
      // We don't add optimistic message for system messages to prevent duplication
      await supabase.from('messages').insert({
        id: startMsgId,
        room_id: room.id,
        content: `Game started! Round 1 of ${room.settings.rounds}`,
        is_system: true,
      });

      await startTurn(players[0].id, 1, []);
    } catch (error) {
      console.error("Error starting game:", error);
      alert("Failed to start game.");
      await supabase.from('rooms').update({ status: 'waiting' }).eq('id', room.id);
    }
  };

  const handleLeave = async () => {
    if (currentPlayer && !currentPlayer.isHost) {
      await supabase.from('players').delete().eq('id', currentPlayer.id);
    }
    navigate('/');
  };

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (currentPlayer && !currentPlayer.isHost) {
        // Use sendBeacon or synchronous fetch if possible, but standard Supabase delete might not complete
        // We'll just try to delete
        supabase.from('players').delete().eq('id', currentPlayer.id).then();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [currentPlayer]);

  if (loading || !room || room.status === 'starting') {
    const isStarting = room?.status === 'starting';
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center text-foreground relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div 
            animate={{ 
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.5, 0.3],
            }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -top-[20%] -left-[10%] w-[70vw] h-[70vw] rounded-full bg-primary/10 blur-3xl"
          />
          <motion.div 
            animate={{ 
              scale: [1, 1.5, 1],
              opacity: [0.2, 0.4, 0.2],
            }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            className="absolute -bottom-[20%] -right-[10%] w-[60vw] h-[60vw] rounded-full bg-accent/10 blur-3xl"
          />
        </div>

        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", damping: 20 }}
          className="relative z-10 flex flex-col items-center"
        >
          <div className="relative mb-8">
            <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
            <Palette className="w-24 h-24 text-primary relative z-10 drop-shadow-lg" />
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 border-4 border-dashed border-primary/30 rounded-full"
            />
          </div>
          
          <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent mb-6 drop-shadow-sm">
            {isStarting ? "Starting Game..." : "Draw & Guess"}
          </h1>
          
          <div className="w-64 h-2 bg-muted rounded-full overflow-hidden relative">
            <motion.div
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-primary to-accent rounded-full"
            />
          </div>
          <p className="mt-4 text-sm font-medium text-muted-foreground uppercase tracking-widest">
            {isStarting ? "Preparing the first round" : "Entering Room..."}
          </p>
        </motion.div>
      </div>
    );
  }

  if (room.status === 'finished') {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="bg-card border-b border-border p-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-card-foreground flex items-center gap-2">
            <Palette className="w-6 h-6 text-primary" />
            Draw & Guess - Game Over
          </h1>
          <button
            onClick={handleLeave}
            className="flex items-center gap-2 px-4 py-2 bg-secondary hover:bg-secondary/80 rounded-lg text-sm font-medium transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Back to Home
          </button>
        </header>
        
        <main className="flex-1 flex flex-col items-center justify-center p-4 bg-gradient-to-b from-background to-accent/5 overflow-y-auto">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", damping: 12 }}
            className="text-center mb-10"
          >
            <Trophy className="w-24 h-24 text-yellow-500 mx-auto mb-6 drop-shadow-lg" />
            <h2 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent mb-2">Final Standings</h2>
            <p className="text-xl text-muted-foreground">Well played, everyone!</p>
          </motion.div>
          
          <motion.div 
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-card rounded-3xl p-8 w-full max-w-2xl border border-border shadow-2xl relative overflow-hidden mb-8"
          >
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-primary via-accent to-primary" />
            <div className="grid gap-4">
              {(room.settings as any).finalResults ? (room.settings as any).finalResults.map((p: any, i: number) => (
                <motion.div 
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.3 + i * 0.1 }}
                  key={p.id} 
                  className={`flex items-center justify-between p-5 rounded-2xl border ${i === 0 ? 'bg-yellow-500/10 border-yellow-500/50 shadow-lg scale-105' : i === 1 ? 'bg-slate-500/10 border-slate-500/50' : i === 2 ? 'bg-amber-700/10 border-amber-700/50' : 'bg-background border-border'}`}
                >
                  <div className="flex items-center gap-5">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${i === 0 ? 'bg-yellow-500 text-white' : i === 1 ? 'bg-slate-400 text-white' : i === 2 ? 'bg-amber-600 text-white' : 'bg-muted text-muted-foreground'}`}>
                      {i + 1}
                    </div>
                    <div>
                      <span className={`font-bold text-xl block ${i === 0 ? 'text-yellow-600 dark:text-yellow-500' : 'text-foreground'}`}>
                        {p.name}
                        {p.id === currentPlayer?.id && <span className="ml-2 text-[10px] bg-primary/20 text-primary px-2 py-1 rounded-full uppercase font-bold align-middle">You</span>}
                      </span>
                      {i === 0 && <span className="text-xs text-yellow-600 font-bold uppercase tracking-wider">Winner!</span>}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-black text-2xl text-primary">{p.score}</span>
                    <span className="text-xs text-muted-foreground block uppercase font-bold">Points</span>
                  </div>
                </motion.div>
              )) : [...players].sort((a, b) => b.score - a.score).map((p, i) => (
                <motion.div 
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.3 + i * 0.1 }}
                  key={p.id} 
                  className={`flex items-center justify-between p-5 rounded-2xl border ${i === 0 ? 'bg-yellow-500/10 border-yellow-500/50 shadow-lg scale-105' : i === 1 ? 'bg-slate-500/10 border-slate-500/50' : i === 2 ? 'bg-amber-700/10 border-amber-700/50' : 'bg-background border-border'}`}
                >
                  <div className="flex items-center gap-5">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${i === 0 ? 'bg-yellow-500 text-white' : i === 1 ? 'bg-slate-400 text-white' : i === 2 ? 'bg-amber-600 text-white' : 'bg-muted text-muted-foreground'}`}>
                      {i + 1}
                    </div>
                    <div>
                      <span className={`font-bold text-xl block ${i === 0 ? 'text-yellow-600 dark:text-yellow-500' : 'text-foreground'}`}>
                        {p.name}
                        {p.id === currentPlayer?.id && <span className="ml-2 text-[10px] bg-primary/20 text-primary px-2 py-1 rounded-full uppercase font-bold align-middle">You</span>}
                      </span>
                      {i === 0 && <span className="text-xs text-yellow-600 font-bold uppercase tracking-wider">Winner!</span>}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-black text-2xl text-primary">{p.score}</span>
                    <span className="text-xs text-muted-foreground block uppercase font-bold">Points</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
          
          {currentPlayer?.isHost && (
            <button
              onClick={async () => {
                await supabase.from('rooms').update({ status: 'waiting', current_round: 1, used_words: [] }).eq('id', room.id);
              }}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-4 px-8 rounded-2xl shadow-xl transition-all hover:scale-105 active:scale-95 flex items-center gap-3"
            >
              <Play className="w-6 h-6" />
              Play Again
            </button>
          )}
        </main>
      </div>
    );
  }

  const isDrawer = currentPlayer?.id === room.current_drawer_id;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <header className="bg-card border-b border-border p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-card-foreground flex items-center gap-2">
            <Palette className="w-6 h-6 text-primary" />
            Draw & Guess
          </h1>
          <div className="bg-background px-3 py-1 rounded-md text-sm font-mono text-muted-foreground border border-border">
            Room: {room.id}
          </div>
        </div>
        
        {room.status === 'playing' && (
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Round</div>
              <div className="font-mono text-lg">{room.current_round} / {room.settings.rounds}</div>
            </div>
            <Timer />
          </div>
        )}

        <button
          onClick={handleLeave}
          className="flex items-center gap-2 px-4 py-2 bg-secondary hover:bg-secondary/80 rounded-lg text-sm font-medium transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Leave
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Players */}
        <aside className="w-64 bg-card border-r border-border flex flex-col">
          <div className="p-4 border-b border-border">
            <h2 className="font-semibold flex items-center gap-2 text-primary">
              <Users className="w-4 h-4" />
              Host
            </h2>
            <div className="mt-2 flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold">
                H
              </div>
              <span className="font-medium text-card-foreground">Host</span>
            </div>
          </div>

          <div className="p-4 border-b border-border flex items-center justify-between">
            <h2 className="font-semibold flex items-center gap-2">
              <Users className="w-4 h-4" />
              Players ({players.length}/{room.settings.maxPlayers})
            </h2>
          </div>
          <PlayerList />
          
          {currentPlayer?.isHost && room.status === 'waiting' && (
            <div className="p-4 mt-auto border-t border-border">
              <button
                onClick={startGame}
                disabled={players.length < 1}
                className="w-full bg-accent hover:bg-accent/90 disabled:bg-muted disabled:text-muted-foreground text-accent-foreground font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Play className="w-5 h-5" />
                Start Game
              </button>
            </div>
          )}
        </aside>

        {/* Center - Canvas & Word */}
        <section className="flex-1 flex flex-col bg-background relative overflow-hidden">
          {room.status === 'waiting' ? (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground overflow-y-auto p-4">
              <Users className="w-16 h-16 mb-4 opacity-50" />
              <h2 className="text-2xl font-bold text-foreground mb-2">Waiting for players...</h2>
              <p>Share the Room ID with your friends to join.</p>
              {currentPlayer?.isHost && (
                <p className="mt-4 text-sm text-primary">You are the host. Click Start Game when ready.</p>
              )}
            </div>
          ) : (
            <>
              <div className="h-16 bg-card border-b border-border flex items-center justify-center flex-shrink-0">
                <WordDisplay />
              </div>
              <div className="flex-1 relative p-4 flex items-center justify-center overflow-hidden">
                <div className="w-full h-full max-w-4xl max-h-[600px] bg-white rounded-xl shadow-2xl overflow-hidden border-4 border-border">
                  <Canvas roomId={room.id} isDrawer={isDrawer} />
                </div>
                
                {/* Overlay if not drawer and waiting for turn */}
                <AnimatePresence>
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
                        <div className="text-2xl font-bold text-foreground mb-2">Waiting for next round...</div>
                        <p className="text-muted-foreground">Get ready to guess!</p>
                      </motion.div>
                    </motion.div>
                  )}
                  
                  {/* Time up overlay */}
                  {room.status === 'round_over' && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 bg-background/90 backdrop-blur-md flex items-center justify-center z-20 rounded-xl border-4 border-transparent"
                    >
                      <motion.div 
                        initial={{ scale: 0.5, opacity: 0, rotate: -10 }}
                        animate={{ scale: 1, opacity: 1, rotate: 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                        className="bg-card p-10 rounded-3xl shadow-2xl border border-border text-center max-w-lg w-full mx-4 relative overflow-hidden"
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-accent/10 pointer-events-none" />
                        <h3 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent mb-6 drop-shadow-sm relative z-10">Round Over!</h3>
                        <p className="text-2xl text-muted-foreground relative z-10">
                          The word was: <br/>
                          <span className="font-black text-foreground text-4xl mt-2 block tracking-widest uppercase">{room.current_word}</span>
                        </p>
                      </motion.div>
                    </motion.div>
                  )}

                  {/* Your Turn Overlay */}
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
                        <h3 className="text-4xl font-extrabold mb-2">Your Turn!</h3>
                        <p className="text-xl opacity-90">Get ready to draw</p>
                      </motion.div>
                    </motion.div>
                  )}

                  {/* Correct Guess Overlay */}
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
                        <h3 className="text-4xl font-extrabold mb-2">Correct!</h3>
                        <p className="text-xl opacity-90">You guessed the word</p>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </>
          )}
        </section>

        {/* Right Sidebar - Chat */}
        <aside className="w-80 bg-card border-l border-border flex flex-col">
          <Chat />
        </aside>
      </main>
    </div>
  );
}
