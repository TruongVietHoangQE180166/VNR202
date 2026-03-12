import React from 'react';
import { motion } from 'motion/react';
import { Palette } from 'lucide-react';

interface RoomLoadingProps {
  title?: string;
  subtitle?: string;
}

export default function RoomLoading({ title, subtitle }: RoomLoadingProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center text-foreground relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-[20%] -left-[10%] w-[70vw] h-[70vw] rounded-full bg-primary/10 blur-3xl"
        />
        <motion.div 
          animate={{ 
            scale: [1, 1.5, 1],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute -bottom-[20%] -right-[10%] w-[60vw] h-[60vw] rounded-full bg-accent/10 blur-3xl"
        />
      </div>

      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", damping: 20 }}
        className="relative z-10 flex flex-col items-center"
      >
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
          <Palette className="w-24 h-24 text-primary relative z-10 drop-shadow-lg" />
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 border-4 border-dashed border-primary/30 rounded-full"
          />
        </div>
        
        <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent mb-6 drop-shadow-sm">
          {title || "Vẽ & Đoán"}
        </h1>
        
        <div className="w-64 h-2 bg-muted rounded-full overflow-hidden relative">
          <motion.div
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-0 left-0 h-full bg-gradient-to-r from-primary to-accent rounded-full"
          />
        </div>
        <p className="mt-4 text-sm font-medium text-muted-foreground uppercase tracking-widest">
          {subtitle || "Vui lòng chờ..."}
        </p>
      </motion.div>
    </div>
  );
}
