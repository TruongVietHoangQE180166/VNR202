import React from 'react';
import { Users } from 'lucide-react';
import { useGameStore } from '../store/gameStore';

export default function WaitingRoom() {
  const { currentPlayer, room } = useGameStore();

  if (!room) return null;

  return (
    <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground overflow-y-auto p-4">
      <Users className="w-16 h-16 mb-4 opacity-50" />
      <h2 className="text-2xl font-bold text-foreground mb-2">Đang chờ người chơi khác...</h2>
      <p>Chia sẻ Mã phòng với bạn bè để cùng tham gia.</p>
      {currentPlayer?.isHost && (
        <p className="mt-4 text-sm text-primary">Bạn là chủ phòng. Nhấn Bắt đầu khi mọi người đã sẵn sàng.</p>
      )}
    </div>
  );
}
