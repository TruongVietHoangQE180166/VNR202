import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useGameStore, Room as RoomType, Player, Message } from '../store/gameStore';
import Canvas from '../components/Canvas';
import Chat from '../components/Chat';
import WordDisplay from '../components/WordDisplay';
import confetti from 'canvas-confetti';
import { soundManager } from '../lib/sounds';

import RoomLoading from '../components/RoomLoading';
import GameResults from '../components/GameResults';
import RoomHeader from '../components/RoomHeader';
import RoomSidebar from '../components/RoomSidebar';
import GameOverlays from '../components/GameOverlays';
import WaitingRoom from '../components/WaitingRoom';

import WORDS from '../words.json';

export default function Room() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentPlayer, room, players, messages, setRoom, setPlayers, setMessages, addMessage } = useGameStore();
  const [loading, setLoading] = useState(true);
  const [channel, setChannel] = useState<any>(null);
  const [showYourTurn, setShowYourTurn] = useState(false);
  const [showCorrectGuess, setShowCorrectGuess] = useState(false);
  const [showTurnAnnouncement, setShowTurnAnnouncement] = useState(false);
  const [currentDrawerName, setCurrentDrawerName] = useState('');
  const [prevDrawerId, setPrevDrawerId] = useState<string | null>(null);
  const [prevScores, setPrevScores] = useState<Record<string, number>>({});
  const [scoreGains, setScoreGains] = useState<Record<string, number>>({});

  const [prevStatus, setPrevStatus] = useState<string | null>(null);
  const [isTransitioningToResults, setIsTransitioningToResults] = useState(false);
  const [prevPlayerCount, setPrevPlayerCount] = useState(0);
  const lastHandledGuessRef = useRef<boolean>(false);

  const triggerConfetti = () => {
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
  };

  useEffect(() => {
    if (!room || !currentPlayer) return;

    // Play start sound for everyone when room status changes to starting
    if (room.status === 'starting' && prevStatus !== 'starting') {
      soundManager.play('start');
    }
    
    // Play roundOver sound
    if (room.status === 'round_over' && prevStatus !== 'round_over') {
      soundManager.play('roundOver');
    }

    // Continually update score gains while in round_over to catch realtime updates
    if (room.status === 'round_over') {
      const gains: Record<string, number> = {};
      let hasChange = false;
      players.forEach(p => {
        const prevScore = prevScores[p.id] || 0;
        if (p.score !== prevScore) {
          const diff = p.score - prevScore;
          gains[p.id] = diff;
          if (scoreGains[p.id] !== diff) {
            hasChange = true;
          }
        }
      });
      // Update only if values actually changed to avoid unnecessary re-renders
      if (hasChange) {
        setScoreGains(gains);
      }
    }

    if (room.status === 'finished' && prevStatus && prevStatus !== 'finished') {
      setIsTransitioningToResults(true);
      setTimeout(() => setIsTransitioningToResults(false), 3000);
    }

    // Play join/leave sounds
    if (players.length > prevPlayerCount && prevPlayerCount > 0) {
      soundManager.play('join');
    } else if (players.length < prevPlayerCount) {
      soundManager.play('leave');
    }
    setPrevPlayerCount(players.length);

    // Update prevScores when round starts or ends
    if (room.status === 'playing' && prevStatus !== 'playing') {
      const scores: Record<string, number> = {};
      players.forEach(p => scores[p.id] = p.score);
      setPrevScores(scores);
      setScoreGains({});
      lastHandledGuessRef.current = false;
      setShowCorrectGuess(false);
    }

    setPrevStatus(room.status);
    
    // Check if it's now your turn to draw
    if (room.current_drawer_id === currentPlayer.id && prevDrawerId !== currentPlayer.id) {
      setShowYourTurn(true);
      setShowCorrectGuess(false); // Force hide correct guess modal
      soundManager.play('yourTurn');
      setTimeout(() => setShowYourTurn(false), 3000);
    }

    // Play turn sound for everyone when drawer changes
    if (room.current_drawer_id && room.current_drawer_id !== prevDrawerId) {
      soundManager.play('turn');
      const drawer = players.find(p => p.id === room.current_drawer_id);
      if (drawer) {
        setCurrentDrawerName(drawer.name);
        if (drawer.id !== currentPlayer.id) {
          setShowTurnAnnouncement(true);
          setTimeout(() => setShowTurnAnnouncement(false), 3000);
        }
      }
    }

    setPrevDrawerId(room.current_drawer_id);

    // Check if you just guessed correctly
    const me = players.find(p => p.id === currentPlayer.id);
    const isDrawer = room.current_drawer_id === currentPlayer.id;
    
    // Only trigger "Correct" confetti if we are actively playing and just guessed
    if (room.status === 'playing' && me && me.has_guessed && !lastHandledGuessRef.current && !isDrawer) {
      setShowCorrectGuess(true);
      soundManager.play('correct');
      triggerConfetti();
      setTimeout(() => setShowCorrectGuess(false), 3000);
      lastHandledGuessRef.current = true;
    } else if (me && !me.has_guessed) {
      lastHandledGuessRef.current = false;
    }
  }, [room?.status, room?.current_drawer_id, players, currentPlayer, prevDrawerId, prevStatus, prevScores, room?.id]);

  useEffect(() => {
    if (!id || !currentPlayer) {
      navigate('/');
      return;
    }

    const fetchInitialData = async () => {
      try {
        // Start BGM
        soundManager.playBGM();

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
        alert('Không thể tải dữ liệu phòng.');
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
          
          // Play message sound if it's not a system message and not from current player
          if (!msg.is_system && msg.player_id !== currentPlayer?.id) {
            soundManager.play('message');
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
      content: `Từ khóa là: ${room.current_word}`,
      is_system: true,
    });

    // Apply penalties and bonuses
    const nonDrawers = players.filter(p => p.id !== room.current_drawer_id);
    const guessersCount = nonDrawers.filter(p => p.has_guessed).length;
    const drawer = players.find(p => p.id === room.current_drawer_id);

    // 1. Penalty for guessers who didn't guess (-100)
    for (const p of nonDrawers) {
      if (!p.has_guessed) {
        await supabase.from('players').update({
          score: Math.max(0, p.score - 100)
        }).eq('id', p.id);
      }
    }

    // 2. Penalty/Bonus for drawer
    if (drawer) {
      if (guessersCount === 0) {
        // Nobody guessed - penalty for drawer (-200)
        await supabase.from('players').update({
          score: Math.max(0, drawer.score - 200)
        }).eq('id', drawer.id);
      } else if (guessersCount === nonDrawers.length && nonDrawers.length > 0) {
        // Everyone guessed - bonus for drawer (+300)
        await supabase.from('players').update({
          score: drawer.score + 300
        }).eq('id', drawer.id);
      }
    }

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
        content: `Trò chơi kết thúc!`,
        is_system: true,
        created_at: new Date().toISOString(),
      });
      await supabase.from('messages').insert({
        id: gameOverId,
        room_id: room.id,
        content: `Trò chơi kết thúc!`,
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
      content: `${drawer?.name || 'Ai đó'} đang bắt đầu vẽ!`,
      is_system: true,
      created_at: new Date().toISOString(),
    });

    await supabase.from('messages').insert({
      id: turnMsgId,
      room_id: room.id,
      content: `${drawer?.name || 'Ai đó'} đang bắt đầu vẽ!`,
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
    if (!room || players.length < 2) {
      alert("Cần ít nhất 2 người chơi để bắt đầu trò chơi.");
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
        content: `Trò chơi bắt đầu! Vòng 1 / ${room.settings.rounds}`,
        is_system: true,
      });

      await startTurn(players[0].id, 1, []);
    } catch (error) {
      console.error("Error starting game:", error);
      alert("Không thể bắt đầu trò chơi.");
      await supabase.from('rooms').update({ status: 'waiting' }).eq('id', room.id);
    }
  };

  const handleLeave = async () => {
    soundManager.stopBGM();
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

  if (loading || !room || room.status === 'starting' || isTransitioningToResults) {
    let title = "Vẽ & Đoán";
    let subtitle = "Vui lòng chờ...";

    if (loading) {
      title = currentPlayer?.isHost ? "Đang tạo phòng..." : "Đang tham gia...";
      subtitle = "Đang kết nối đến máy chủ";
    } else if (room?.status === 'starting') {
      title = "Sẵn sàng!";
      subtitle = "Bắt đầu vòng chơi đầu tiên";
    } else if (isTransitioningToResults) {
      title = "Kết thúc!";
      subtitle = "Đang tính toán kết quả...";
    }

    return <RoomLoading title={title} subtitle={subtitle} />;
  }

  if (room.status === 'finished' && !isTransitioningToResults) {
    return <GameResults onLeave={handleLeave} />;
  }

  const isDrawer = currentPlayer?.id === room.current_drawer_id;

  return (
    <div className="h-screen bg-background text-foreground flex flex-col overflow-hidden">
      <RoomHeader onLeave={handleLeave} />

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden">
        <RoomSidebar onStartGame={startGame} />

        {/* Center - Canvas & Word */}
        <section className="flex-1 flex flex-col bg-background relative overflow-hidden">
          {room.status === 'waiting' ? (
            <WaitingRoom />
          ) : (
            <>
              <div className="h-16 bg-card border-b border-border flex items-center justify-center flex-shrink-0">
                <WordDisplay />
              </div>
              <div className="flex-1 relative p-4 flex items-center justify-center overflow-hidden">
                <div className="w-full h-full max-w-4xl max-h-[600px] bg-white rounded-xl shadow-2xl overflow-hidden border-4 border-border">
                  <Canvas roomId={room.id} isDrawer={isDrawer} />
                </div>
                
                <GameOverlays 
                  showYourTurn={showYourTurn}
                  showCorrectGuess={showCorrectGuess}
                  showTurnAnnouncement={showTurnAnnouncement}
                  currentDrawerName={currentDrawerName}
                  scoreGains={scoreGains}
                />
              </div>
            </>
          )}
        </section>

        {/* Right Sidebar - Chat */}
        <aside className="w-80 bg-card border-l border-border flex flex-col h-full">
          <Chat />
        </aside>
      </main>
    </div>
  );
}
