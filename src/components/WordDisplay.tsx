import React, { useEffect, useState } from 'react';
import { useGameStore } from '../store/gameStore';

export default function WordDisplay() {
  const { room, currentPlayer } = useGameStore();
  const [displayWord, setDisplayWord] = useState('');

  useEffect(() => {
    if (!room || !room.current_word || !room.word_start_time) {
      setDisplayWord('');
      return;
    }

    const isDrawer = room.current_drawer_id === currentPlayer?.id;
    
    if (isDrawer) {
      setDisplayWord(room.current_word);
      return;
    }

    // Calculate hints based on time
    const updateDisplay = () => {
      const startTime = new Date(room.word_start_time!).getTime();
      const now = new Date().getTime();
      const elapsed = (now - startTime) / 1000;
      const totalTime = room.settings.drawTime;
      const progress = elapsed / totalTime;

      const word = room.current_word!;
      const hintsCount = room.settings.hints;
      
      let charsToShow = 0;
      if (hintsCount > 0) {
        if (progress > 0.3) charsToShow = 1;
        if (progress > 0.6 && hintsCount >= 2) charsToShow = 2;
        if (progress > 0.8 && hintsCount >= 3) charsToShow = 3;
      }

      // We need consistent hints, so we pick the first 'charsToShow' characters that are not spaces
      const words = word.split(' ');
      const displayWords = words.map(w => {
        let display = '';
        for (let i = 0; i < w.length; i++) {
          display += '_';
        }
        return display;
      });

      if (isDrawer) {
        setDisplayWord(word);
        return;
      }

      // Apply hints
      let hintsApplied = 0;
      let finalDisplay = words.map((w, wordIdx) => {
        let chars = w.split('');
        return chars.map((char, charIdx) => {
          if (hintsApplied < charsToShow) {
            hintsApplied++;
            return char;
          }
          return '_';
        }).join('');
      }).join(' ');

      setDisplayWord(finalDisplay);
    };

    updateDisplay();
    const interval = setInterval(updateDisplay, 1000);
    return () => clearInterval(interval);
  }, [room, currentPlayer]);

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
