import React, { useState, useRef, useEffect } from 'react';
import { useGameStore, Message } from '../store/gameStore';
import { supabase } from '../lib/supabase';
import { Send } from 'lucide-react';
import confetti from 'canvas-confetti';
import { soundManager } from '../lib/sounds';

export default function Chat() {
  const { currentPlayer, room, messages, players } = useGameStore();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !currentPlayer || !room) return;

    const messageContent = input.trim();
    setInput('');

    const isDrawer = room.current_drawer_id === currentPlayer.id;

    // Check if it's a guess
    if (room.status === 'playing' && room.current_word && !currentPlayer.isHost) {
      const player = players.find(p => p.id === currentPlayer.id);
      
      if (messageContent.toLowerCase() === room.current_word.toLowerCase()) {
        if (isDrawer) {
          // Drawer can't guess
          return;
        }
        
        if (player?.has_guessed) {
          // Already guessed, don't leak
          return;
        }

        // Correct guess!
        // Update player score and has_guessed
        const startTime = new Date(room.word_start_time!).getTime();
        const now = new Date().getTime();
        const elapsed = (now - startTime) / 1000;
        const remaining = Math.max(0, room.settings.drawTime - elapsed);
        
        // Fairer formula: Base 500 + Time Bonus up to 500
        const scoreGained = 500 + Math.floor((remaining / room.settings.drawTime) * 500);

        // Update player score and has_guessed
        await supabase
          .from('players')
          .update({
            score: (player?.score || 0) + scoreGained,
            has_guessed: true,
          })
          .eq('id', currentPlayer.id);

        // Update drawer score
        const drawer = players.find(p => p.id === room.current_drawer_id);
        if (drawer) {
          await supabase
            .from('players')
            .update({
              score: (drawer.score || 0) + 150, // Drawer gets 150 points per correct guess
            })
            .eq('id', drawer.id);
        }

        // Send system message
        const sysMsgId = crypto.randomUUID ? crypto.randomUUID() : '00000000-0000-4000-8000-' + Math.random().toString(16).substring(2, 14).padEnd(12, '0');
        
        await supabase.from('messages').insert({
          id: sysMsgId,
          room_id: room.id,
          content: `${currentPlayer.name} guessed the word!`,
          is_system: true,
        });

        return;
      }
    }

    // Normal message
    const tempMessage: Message = {
      id: crypto.randomUUID ? crypto.randomUUID() : '00000000-0000-4000-8000-' + Math.random().toString(16).substring(2, 14).padEnd(12, '0'),
      room_id: room.id,
      player_id: currentPlayer.isHost ? null : currentPlayer.id,
      player_name: currentPlayer.name,
      content: messageContent,
      is_system: false,
      created_at: new Date().toISOString(),
    };
    
    // Optimistic update
    useGameStore.getState().addMessage(tempMessage);
    soundManager.play('send');

    await supabase.from('messages').insert({
      id: tempMessage.id,
      room_id: room.id,
      player_id: currentPlayer.isHost ? null : currentPlayer.id,
      player_name: currentPlayer.name,
      content: messageContent,
      is_system: false,
    });
  };

  const isDrawer = room?.current_drawer_id === currentPlayer?.id;

  return (
    <div className="flex flex-col h-full bg-card">
      <div className="p-4 border-b border-border">
        <h2 className="font-semibold text-card-foreground">Chat</h2>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`text-sm py-1 px-2 rounded-md ${
              msg.is_system 
                ? 'bg-primary/10 text-primary font-bold italic border border-primary/20 text-center my-2' 
                : 'text-muted-foreground'
            }`}
          >
            {!msg.is_system && (
              <span className="font-bold text-primary mr-2">
                {msg.player_id === currentPlayer?.id ? 'You' : msg.player_name}:
              </span>
            )}
            <span className="break-words">{msg.content}</span>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSend} className="p-4 border-t border-border bg-background flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={
            currentPlayer?.isHost 
              ? "Hosts can only observe" 
              : isDrawer 
                ? "You are drawing..." 
                : "Type your guess..."
          }
          disabled={currentPlayer?.isHost || isDrawer}
          className="flex-1 bg-background border border-input rounded-lg px-3 py-2 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
          maxLength={100}
        />
        <button
          type="submit"
          disabled={!input.trim() || currentPlayer?.isHost || isDrawer}
          className="bg-primary hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground text-primary-foreground p-2 rounded-lg transition-colors flex items-center justify-center"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
