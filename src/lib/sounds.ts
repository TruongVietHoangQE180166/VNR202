
const SOUNDS = {
  correct: 'https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3',
  start: 'https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3',
  turn: 'https://assets.mixkit.co/active_storage/sfx/2018/2018-preview.mp3',
  gameOver: 'https://assets.mixkit.co/active_storage/sfx/2020/2020-preview.mp3',
  roundOver: 'https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3',
  message: 'https://assets.mixkit.co/active_storage/sfx/2018/2018-preview.mp3',
  tick: 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3',
};

class SoundManager {
  private audios: Record<string, HTMLAudioElement> = {};

  constructor() {
    if (typeof window !== 'undefined') {
      Object.entries(SOUNDS).forEach(([key, url]) => {
        this.audios[key] = new Audio(url);
        this.audios[key].preload = 'auto';
      });
    }
  }

  play(sound: keyof typeof SOUNDS) {
    const audio = this.audios[sound];
    if (audio) {
      audio.currentTime = 0;
      audio.play().catch(e => console.log('Audio play blocked:', e));
    }
  }
}

export const soundManager = new SoundManager();
