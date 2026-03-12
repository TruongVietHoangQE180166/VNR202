
const SOUNDS = {
  correct: 'https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3',
  start: 'https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3',
  turn: 'https://assets.mixkit.co/active_storage/sfx/2018/2018-preview.mp3',
  yourTurn: 'https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3',
  gameOver: 'https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3', // Using a more triumphant sound
  roundOver: 'https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3',
  tick: 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3',
  message: 'https://assets.mixkit.co/active_storage/sfx/2018/2018-preview.mp3',
  join: 'https://assets.mixkit.co/active_storage/sfx/2017/2017-preview.mp3',
  leave: 'https://assets.mixkit.co/active_storage/sfx/2016/2016-preview.mp3',
  click: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3',
  send: 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3',
};

class SoundManager {
  private audios: Record<string, HTMLAudioElement> = {};
  private bgm: HTMLAudioElement | null = null;
  private isMuted: boolean = false;
  private volume: number = 0.5; // Default volume 50%

  constructor() {
    if (typeof window !== 'undefined') {
      Object.entries(SOUNDS).forEach(([key, url]) => {
        this.audios[key] = new Audio(url);
        this.audios[key].preload = 'auto';
      });

      // Auto-unlock audio on first user interaction
      const unlock = () => {
        if (this.bgm && this.bgm.paused && !this.isMuted) {
          this.bgm.play().catch(() => {});
        } else if (!this.bgm && !this.isMuted) {
          this.playBGM();
        }
        window.removeEventListener('click', unlock);
        window.removeEventListener('keydown', unlock);
        window.removeEventListener('touchstart', unlock);
      };
      window.addEventListener('click', unlock);
      window.addEventListener('keydown', unlock);
      window.addEventListener('touchstart', unlock);
    }
  }

  play(sound: keyof typeof SOUNDS) {
    if (this.isMuted) return;
    const audio = this.audios[sound];
    if (audio) {
      audio.currentTime = 0;
      audio.volume = this.volume;
      audio.play().catch(e => console.log('Audio play blocked:', e));
    }
  }

  playBGM() {
    if (typeof window === 'undefined') return;
    
    if (!this.bgm) {
      // Upbeat background music
      this.bgm = new Audio('https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3');
      this.bgm.loop = true;
      this.bgm.volume = this.volume * 0.3; // BGM is usually quieter
    }
    
    if (!this.isMuted && this.bgm.paused) {
      this.bgm.play().catch(e => console.log('BGM play blocked:', e));
    }
  }

  stopBGM() {
    if (this.bgm) {
      this.bgm.pause();
      this.bgm.currentTime = 0;
    }
  }

  setVolume(newVolume: number) {
    this.volume = Math.max(0, Math.min(1, newVolume));
    
    // Update BGM volume immediately
    if (this.bgm) {
      this.bgm.volume = this.volume * 0.3;
    }
    
    // Update all preloaded sounds volume
    Object.values(this.audios).forEach(audio => {
      audio.volume = this.volume;
    });
  }

  getVolume() {
    return this.volume;
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.isMuted) {
      if (this.bgm) this.bgm.pause();
    } else {
      if (this.bgm) this.bgm.play().catch(() => {});
    }
    return this.isMuted;
  }

  getIsMuted() {
    return this.isMuted;
  }
}

export const soundManager = new SoundManager();
