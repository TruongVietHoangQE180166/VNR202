import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Pencil, MessageSquare, Trophy, Users, Star, 
  Lightbulb, ShieldCheck, Zap, MousePointer2 
} from 'lucide-react';

interface GameplayModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function GameplayModal({ isOpen, onClose }: GameplayModalProps) {
  const sections = [
    {
      icon: <Pencil className="w-6 h-6" />,
      title: "Kỹ Thuật Vẽ",
      desc: "Sử dụng bảng màu và độ dày cọ linh hoạt. Hãy ưu tiên phác thảo hình khối chính trước khi tô điểm chi tiết để người khác dễ đoán.",
      color: "from-blue-500/20 to-cyan-500/20",
      iconColor: "text-blue-500"
    },
    {
      icon: <MessageSquare className="w-6 h-6" />,
      title: "Chiến Thuật Đoán",
      desc: "Gõ dự đoán vào ô chat. Không phân biệt hoa thường. Đoán càng sớm, điểm cộng (bonus) thời gian càng lớn!",
      color: "from-emerald-500/20 to-teal-500/20",
      iconColor: "text-emerald-500"
    },
    {
      icon: <Trophy className="w-6 h-6" />,
      title: "Hệ Thống Điểm",
      desc: "Tối đa 1000đ cho người đầu tiên. Người vẽ nhận 150đ/người đoán trúng. Sự chính xác của bạn là chìa khóa chiến thắng.",
      color: "from-yellow-500/20 to-orange-500/20",
      iconColor: "text-yellow-500"
    },
    {
      icon: <Users className="w-6 h-6" />,
      title: "Quy Tắc Phòng",
      desc: "Host là người quan sát. Game tự động chuyển lượt. Hãy tôn trọng mọi người và không viết chữ lên hình vẽ.",
      color: "from-purple-500/20 to-pink-500/20",
      iconColor: "text-purple-500"
    }
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-background/40 backdrop-blur-xl"
          />
          
          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 40, rotateX: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0, rotateX: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 40 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="bg-card w-full max-w-5xl max-h-[85vh] overflow-hidden rounded-[3rem] shadow-[0_0_100px_rgba(var(--primary),0.1)] border border-border/50 relative z-10 flex flex-col"
          >
            {/* Header */}
            <div className="p-8 md:p-10 border-b border-border/50 flex items-center justify-between bg-gradient-to-r from-primary/5 to-transparent">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20 rotate-3">
                  <Star className="w-6 h-6 text-primary-foreground fill-current" />
                </div>
                <div>
                  <h2 className="text-3xl font-black tracking-tighter uppercase italic">Cẩm Nang Chiến Thắng</h2>
                  <p className="text-muted-foreground text-sm font-bold uppercase tracking-widest opacity-70">Hướng dẫn chi tiết từ A - Z</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-3 rounded-2xl bg-muted hover:bg-muted/80 transition-all hover:rotate-90 active:scale-90"
              >
                <X className="w-6 h-6 text-foreground" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-8 md:p-10 space-y-12 scrollbar-hide">
              {/* Introduction */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-4">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent text-xs font-black uppercase tracking-tighter">
                    <Zap className="w-3 h-3 fill-current" />
                    Bắt đầu nhanh
                  </div>
                  <h3 className="text-4xl font-black text-foreground leading-[1.1]">
                    Vẽ sự sáng tạo, <span className="text-primary">Đoán</span> niềm vui.
                  </h3>
                  <p className="text-muted-foreground text-lg leading-relaxed">
                    Chào mừng bạn đến với Vẽ & Đoán! Một trò chơi đòi hỏi sự nhanh nhẹn, khả năng hội họa tiềm ẩn và một chút suy luận logic. Dưới đây là những gì bạn cần biết để trở thành một siêu sao.
                  </p>
                </div>
                <div className="bg-muted/30 rounded-[2rem] p-6 border border-border/50 flex flex-col justify-center">
                  <div className="flex items-center gap-3 mb-4">
                    <MousePointer2 className="w-5 h-5 text-primary" />
                    <span className="font-black uppercase text-xs tracking-widest">Cách tham gia</span>
                  </div>
                  <ul className="space-y-3">
                    <li className="flex gap-2 text-sm">
                      <span className="text-primary font-bold">01.</span> Nhập tên & mã phòng
                    </li>
                    <li className="flex gap-2 text-sm">
                      <span className="text-primary font-bold">02.</span> Chờ Host bắt đầu game
                    </li>
                    <li className="flex gap-2 text-sm">
                      <span className="text-primary font-bold">03.</span> Tận hưởng cuộc chơi!
                    </li>
                  </ul>
                </div>
              </div>

              {/* Core Mechanics Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {sections.map((section, i) => (
                  <motion.div
                    key={i}
                    whileHover={{ y: -5 }}
                    className={`p-8 rounded-[2.5rem] bg-gradient-to-br border border-white/5 shadow-xl relative overflow-hidden group ${section.color}`}
                  >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 blur-3xl -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700" />
                    <div className={`w-14 h-14 rounded-2xl bg-white flex items-center justify-center shadow-lg mb-6 ${section.iconColor}`}>
                      {section.icon}
                    </div>
                    <h4 className="text-xl font-black mb-3 uppercase tracking-tight text-foreground">{section.title}</h4>
                    <p className="text-muted-foreground leading-relaxed font-medium">{section.desc}</p>
                  </motion.div>
                ))}
              </div>

              {/* Advanced Tips */}
              <div className="bg-primary/5 rounded-[3rem] p-10 border border-primary/10 relative overflow-hidden group">
                <div className="absolute bottom-0 right-0 opacity-10 translate-x-10 translate-y-10 group-hover:translate-x-0 group-hover:translate-y-0 transition-transform duration-1000">
                  <Lightbulb className="w-64 h-64 text-primary" />
                </div>
                
                <h4 className="text-2xl font-black mb-6 flex items-center gap-3">
                  <Lightbulb className="w-6 h-6 text-primary fill-current" />
                  MẸO CHUYÊN GIA
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
                  <div className="space-y-2">
                    <span className="text-xs font-black text-primary uppercase">Mẹo 01</span>
                    <p className="font-bold text-foreground">Sử dụng gợi ý: Quan sát số lượng ký tự ở thanh tiêu đề để thu hẹp phạm vi từ khóa.</p>
                  </div>
                  <div className="space-y-2">
                    <span className="text-xs font-black text-primary uppercase">Mẹo 02</span>
                    <p className="font-bold text-foreground">Không gõ spam: Hãy quan sát kỹ nét vẽ trước khi gõ để tránh bỏ lỡ thời gian bonus.</p>
                  </div>
                  <div className="space-y-2">
                    <span className="text-xs font-black text-primary uppercase">Mẹo 03</span>
                    <p className="font-bold text-foreground">Dùng phím tắt: Nhấn Enter để gửi dự đoán thật nhanh, tay luôn đặt trên bàn phím!</p>
                  </div>
                </div>
              </div>

              {/* Ethics Footer */}
              <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-8 border-t border-border/50">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="w-5 h-5 text-emerald-500" />
                  <span className="text-sm font-black text-muted-foreground uppercase tracking-widest">Chơi đẹp để cuộc vui trọn vẹn</span>
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={onClose}
                  className="w-full md:w-auto bg-primary text-primary-foreground font-black py-4 px-12 rounded-2xl shadow-xl shadow-primary/20 hover:shadow-primary/40 transition-all"
                >
                  XÁC NHẬN & CHIẾN THẮNG!
                </motion.button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
