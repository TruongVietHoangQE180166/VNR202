import { create } from 'zustand';

export interface RoomSettings {
  maxPlayers: number;
  rounds: number;
  drawTime: number;
  hints: number;
}

export interface Room {
  id: string;
  status: 'waiting' | 'playing' | 'round_over' | 'finished';
  settings: RoomSettings;
  current_round: number;
  current_drawer_id: string | null;
  current_word: string | null;
  word_start_time: string | null;
  used_words: string[];
  host_id: string;
}

export interface Player {
  id: string;
  room_id: string;
  name: string;
  score: number;
  has_guessed: boolean;
}

export interface Message {
  id: string;
  room_id: string;
  player_id: string | null;
  player_name: string | null;
  content: string;
  is_system: boolean;
  created_at: string;
}

interface GameState {
  currentPlayer: { id: string; name: string; isHost: boolean } | null;
  room: Room | null;
  players: Player[];
  messages: Message[];
  
  setCurrentPlayer: (player: { id: string; name: string; isHost: boolean } | null) => void;
  setRoom: (room: Room | null) => void;
  setPlayers: (players: Player[]) => void;
  addMessage: (message: Message) => void;
  setMessages: (messages: Message[]) => void;
  reset: () => void;
}

export const useGameStore = create<GameState>((set) => ({
  currentPlayer: null,
  room: null,
  players: [],
  messages: [],
  
  setCurrentPlayer: (player) => set({ currentPlayer: player }),
  setRoom: (room) => set((state) => ({ 
    room: room && state.room ? { ...state.room, ...room } : room 
  })),
  setPlayers: (players) => set({ players }),
  addMessage: (message) => set((state) => {
    if (state.messages.some(m => m.id === message.id)) return state;
    return { messages: [...state.messages, message] };
  }),
  setMessages: (messages) => set({ messages }),
  reset: () => set({ currentPlayer: null, room: null, players: [], messages: [] }),
}));
