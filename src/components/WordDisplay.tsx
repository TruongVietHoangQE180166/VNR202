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
    
    if (isDrawer || currentPlayer?.isHost) {
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
      let newDisplay = '';
      let shown = 0;
      for (let i = 0; i < word.length; i++) {
        if (word[i] === ' ') {
          newDisplay += '  ';
        } else if (shown < charsToShow) {
          newDisplay += word[i] + ' ';
          shown++;
        } else {
          newDisplay += '_ ';
        }
      }
      setDisplayWord(newDisplay.trim());
    };

    updateDisplay();
    const interval = setInterval(updateDisplay, 1000);
    return () => clearInterval(interval);
  }, [room, currentPlayer]);

  if (!room || !room.current_word) return null;

  return (
    <div className="text-3xl font-mono tracking-[0.5em] font-bold text-white">
      {displayWord}
    </div>
  );
}
