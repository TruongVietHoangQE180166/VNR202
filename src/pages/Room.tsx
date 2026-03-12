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

import WORDS from '../words.json';

export default function Room() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentPlayer, room, players, messages, setRoom, setPlayers, setMessages, addMessage } = useGameStore();
  const [loading, setLoading] = useState(true);
  const [channel, setChannel] = useState<any>(null);
  const [showRoundOver, setShowRoundOver] = useState(false);

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
          if (msg.is_system && msg.content.includes('guessed the word!')) {
            confetti({
              particleCount: 100,
              spread: 70,
              origin: { y: 0.6 },
              colors: ['#4f46e5', '#10b981', '#f59e0b', '#ec4899']
            });
          }
        }
      })
      .subscribe();

    // Polling fallback just in case realtime fails
    const pollingInterval = setInterval(async () => {
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

    // Send system message with answer
    const sysMsgId = crypto.randomUUID ? crypto.randomUUID() : '00000000-0000-4000-8000-' + Math.random().toString(16).substring(2, 14).padEnd(12, '0');
    addMessage({
      id: sysMsgId,
      room_id: room.id,
      player_id: null,
      player_name: null,
      content: `The word was: ${room.current_word}`,
      is_system: true,
      created_at: new Date().toISOString(),
    });
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
      setTimeout(async () => {
        await supabase.from('rooms').update({
          status: 'finished',
          current_drawer_id: null,
          current_word: null,
          word_start_time: null,
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

    // Pick a new word
    let availableWords = WORDS.filter(w => !usedWords.includes(w));
    if (availableWords.length === 0) {
      availableWords = WORDS; // Reset if all used
      usedWords = [];
    }
    
    const word = availableWords[Math.floor(Math.random() * availableWords.length)];
    const newUsedWords = [...usedWords, word];

    // Reset players has_guessed
    await supabase.from('players').update({ has_guessed: false }).eq('room_id', room.id);

    // Update room
    await supabase.from('rooms').update({
      status: 'playing',
      current_drawer_id: drawerId,
      current_word: word,
      word_start_time: new Date().toISOString(),
      current_round: round,
      used_words: newUsedWords,
    }).eq('id', room.id);

    const drawer = players.find(p => p.id === drawerId);
    const drawerMsgId = crypto.randomUUID ? crypto.randomUUID() : '00000000-0000-4000-8000-' + Math.random().toString(16).substring(2, 14).padEnd(12, '0');
    addMessage({
      id: drawerMsgId,
      room_id: room.id,
      player_id: null,
      player_name: null,
      content: `${drawer?.name || 'Someone'} is drawing now!`,
      is_system: true,
      created_at: new Date().toISOString(),
    });
    await supabase.from('messages').insert({
      id: drawerMsgId,
      room_id: room.id,
      content: `${drawer?.name || 'Someone'} is drawing now!`,
      is_system: true,
    });
  };

  const startGame = async () => {
    if (!room || players.length < 2) return;
    
    await supabase.from('rooms').update({
      status: 'playing',
      current_round: 1,
      used_words: [],
    }).eq('id', room.id);

    const startMsgId = crypto.randomUUID ? crypto.randomUUID() : '00000000-0000-4000-8000-' + Math.random().toString(16).substring(2, 14).padEnd(12, '0');
    addMessage({
      id: startMsgId,
      room_id: room.id,
      player_id: null,
      player_name: null,
      content: `Game started! Round 1 of ${room.settings.rounds}`,
      is_system: true,
      created_at: new Date().toISOString(),
    });
    await supabase.from('messages').insert({
      id: startMsgId,
      room_id: room.id,
      content: `Game started! Round 1 of ${room.settings.rounds}`,
      is_system: true,
    });

    startTurn(players[0].id, 1, []);
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

  if (loading || !room) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center text-foreground">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        >
          <Loader2 className="w-12 h-12 text-primary" />
        </motion.div>
        <motion.h2 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 text-xl font-semibold text-muted-foreground"
        >
          Loading Room...
        </motion.h2>
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
                disabled={players.length < 2}
                className="w-full bg-accent hover:bg-accent/90 disabled:bg-muted disabled:text-muted-foreground text-accent-foreground font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Play className="w-5 h-5" />
                Start Game
              </button>
            </div>
          )}
        </aside>

        {/* Center - Canvas & Word */}
        <section className="flex-1 flex flex-col bg-background relative">
          {room.status === 'waiting' ? (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
              <Users className="w-16 h-16 mb-4 opacity-50" />
              <h2 className="text-2xl font-bold text-foreground mb-2">Waiting for players...</h2>
              <p>Share the Room ID with your friends to join.</p>
              {currentPlayer?.isHost && (
                <p className="mt-4 text-sm text-primary">You are the host. Click Start Game when ready.</p>
              )}
            </div>
          ) : room.status === 'finished' ? (
            <div className="flex-1 flex flex-col items-center justify-center">
              <Trophy className="w-24 h-24 text-yellow-500 mb-6" />
              <h2 className="text-4xl font-bold text-foreground mb-8">Game Over!</h2>
              <div className="bg-card rounded-xl p-6 w-full max-w-md border border-border">
                <h3 className="text-xl font-bold mb-4 text-center">Final Scores</h3>
                <div className="space-y-3">
                  {[...players].sort((a, b) => b.score - a.score).map((p, i) => (
                    <div key={p.id} className="flex items-center justify-between bg-background p-3 rounded-lg border border-border">
                      <div className="flex items-center gap-3">
                        <span className={`font-bold ${i === 0 ? 'text-yellow-500' : i === 1 ? 'text-muted-foreground' : i === 2 ? 'text-amber-600' : 'text-muted-foreground'}`}>
                          #{i + 1}
                        </span>
                        <span className="font-medium">{p.name}</span>
                      </div>
                      <span className="font-mono font-bold text-primary">{p.score} pts</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="h-16 bg-card border-b border-border flex items-center justify-center">
                <WordDisplay />
              </div>
              <div className="flex-1 relative p-4 flex items-center justify-center">
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
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: "spring", damping: 15 }}
                        className="text-center"
                      >
                        <h3 className="text-4xl font-extrabold text-foreground mb-4">Round Over!</h3>
                        <p className="text-xl text-muted-foreground mb-2">The word was:</p>
                        <div className="text-5xl font-mono font-bold text-primary tracking-widest bg-card px-8 py-4 rounded-2xl border border-border shadow-xl inline-block">
                          {room.current_word}
                        </div>
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
