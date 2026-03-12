import React, { useEffect, useState } from 'react';
import { useGameStore } from '../store/gameStore';

export default function WordDisplay() {
  const { room, currentPlayer, players } = useGameStore();
  const [displayWord, setDisplayWord] = useState('');

  useEffect(() => {
    if (!room || !room.current_word || !room.word_start_time) {
      setDisplayWord('');
      return;
    }

    const isDrawer = room.current_drawer_id === currentPlayer?.id;
    const me = players.find(p => p.id === currentPlayer?.id);
    const hasGuessed = me?.has_guessed;
    
    if (isDrawer || hasGuessed) {
      setDisplayWord(room.current_word);
      return;
    }

    // Generate a deterministic random order of indices for hints
    const word = room.current_word;
    const startTime = room.word_start_time;
    
    // Simple hash function for deterministic randomness
    const hash = (str: string) => {
      let h = 0;
      for (let i = 0; i < str.length; i++) {
        h = ((h << 5) - h) + str.charCodeAt(i);
        h |= 0;
      }
      return h;
    };

    const validIndices = word.split('').map((_, i) => i).filter(i => word[i] !== ' ');
    const shuffledIndices = [...validIndices].sort((a, b) => {
      return hash(word + startTime + a) - hash(word + startTime + b);
    });

    const updateDisplay = () => {
      const startTimeMs = new Date(room.word_start_time!).getTime();
      const now = new Date().getTime();
      const elapsed = (now - startTimeMs) / 1000;
      const totalTime = room.settings.drawTime;
      const progress = elapsed / totalTime;

      const hintsCount = room.settings.hints;
      
      let charsToShow = 0;
      if (hintsCount > 0) {
        if (progress > 0.3) charsToShow = 1;
        if (progress > 0.6 && hintsCount >= 2) charsToShow = 2;
        if (progress > 0.8 && hintsCount >= 3) charsToShow = 3;
      }

      const activeHintIndices = shuffledIndices.slice(0, charsToShow);

      let finalDisplay = '';
      for (let i = 0; i < word.length; i++) {
        if (word[i] === ' ') {
          finalDisplay += ' ';
        } else if (activeHintIndices.includes(i)) {
          finalDisplay += word[i];
        } else {
          finalDisplay += '_';
        }
      }

      setDisplayWord(finalDisplay);
    };

    updateDisplay();
    const interval = setInterval(updateDisplay, 1000);
    return () => clearInterval(interval);
  }, [room, currentPlayer, players]);

  if (!room || !room.current_word) return null;

  const isDrawer = room.current_drawer_id === currentPlayer?.id;

  return (
    <div className="flex flex-wrap justify-center gap-8">
      {displayWord.split(' ').map((wordPart, wordIdx) => (
        <div key={wordIdx} className="flex gap-2">
          {wordPart.split('').map((char, charIdx) => (
            <div 
              key={charIdx} 
              className={`w-8 h-10 border-b-4 flex items-center justify-center text-3xl font-black uppercase ${
                char === '_' ? 'border-muted-foreground/30 text-transparent' : 'border-primary text-foreground'
              }`}
            >
              {char !== '_' ? char : ''}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
