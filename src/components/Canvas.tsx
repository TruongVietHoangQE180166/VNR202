import React, { useRef, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';
import { Eraser, Trash2, Paintbrush, Undo2 } from 'lucide-react';

interface CanvasProps {
  roomId: string;
  isDrawer: boolean;
}

export default function Canvas({ roomId, isDrawer }: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#000000');
  const [lineWidth, setLineWidth] = useState(5);
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);
  const [history, setHistory] = useState<string[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas resolution
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    // Handle resize
    const handleResize = () => {
      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d');
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      tempCtx?.drawImage(canvas, 0, 0);

      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      ctx.drawImage(tempCanvas, 0, 0);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!roomId) return;

    const canvasChannel = supabase.channel(`canvas:${roomId}`);
    setChannel(canvasChannel);

    const handleDrawEvent = (payload: any) => {
      const { x0, y0, x1, y1, color: strokeColor, width } = payload.payload;
      drawLine(x0, y0, x1, y1, strokeColor, width, false);
    };

    const handleClearEvent = () => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (ctx && canvas) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    };

    const handleSyncEvent = (payload: any) => {
      const { image } = payload.payload;
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (ctx && canvas && image) {
        const img = new Image();
        img.onload = () => {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
        };
        img.src = image;
      }
    };

    canvasChannel
      .on('broadcast', { event: 'draw' }, handleDrawEvent)
      .on('broadcast', { event: 'clear' }, handleClearEvent)
      .on('broadcast', { event: 'sync' }, handleSyncEvent)
      .subscribe();

    return () => {
      supabase.removeChannel(canvasChannel);
    };
  }, [roomId]);

  const drawLine = (x0: number, y0: number, x1: number, y1: number, strokeColor: string, width: number, emit: boolean) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;

    ctx.beginPath();
    ctx.moveTo(x0 * canvas.width, y0 * canvas.height);
    ctx.lineTo(x1 * canvas.width, y1 * canvas.height);
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.closePath();

    if (!emit || !channel) return;

    channel.send({
      type: 'broadcast',
      event: 'draw',
      payload: { x0, y0, x1, y1, color: strokeColor, width },
    });
  };

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;

    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    return {
      x: (clientX - rect.left) / canvas.width,
      y: (clientY - rect.top) / canvas.height,
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawer) return;
    setIsDrawing(true);
    const { x, y } = getCoordinates(e);
    // Store current position
    canvasRef.current?.setAttribute('data-x', x.toString());
    canvasRef.current?.setAttribute('data-y', y.toString());

    // Save state for undo
    const canvas = canvasRef.current;
    if (canvas) {
      const dataUrl = canvas.toDataURL();
      setHistory(prev => [...prev.slice(-19), dataUrl]);
    }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !isDrawer) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const prevX = parseFloat(canvas.getAttribute('data-x') || '0');
    const prevY = parseFloat(canvas.getAttribute('data-y') || '0');
    const { x, y } = getCoordinates(e);

    drawLine(prevX, prevY, x, y, color, lineWidth, true);

    canvas.setAttribute('data-x', x.toString());
    canvas.setAttribute('data-y', y.toString());
  };

  const stopDrawing = () => {
    if (!isDrawer) return;
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    if (!isDrawer || !channel) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx && canvas) {
      setHistory(prev => [...prev.slice(-19), canvas.toDataURL()]);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      channel.send({
        type: 'broadcast',
        event: 'clear',
        payload: {},
      });
    }
  };

  const undo = () => {
    if (!isDrawer || history.length === 0 || !channel) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx && canvas) {
      const previousState = history[history.length - 1];
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        channel.send({
          type: 'broadcast',
          event: 'sync',
          payload: { image: previousState },
        });
      };
      img.src = previousState;
      setHistory(prev => prev.slice(0, -1));
    }
  };

  return (
    <div className="relative w-full h-full flex flex-col">
      {isDrawer && (
        <div className="absolute top-4 left-4 right-4 flex flex-wrap items-center justify-between bg-card/95 backdrop-blur-md p-3 rounded-2xl shadow-lg border border-border z-10 gap-4">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Color Picker */}
            <div className="relative w-8 h-8 rounded-full overflow-hidden border-2 border-border shadow-sm shrink-0 cursor-pointer hover:scale-110 transition-transform">
              <input 
                type="color" 
                value={color === '#FFFFFF' ? '#000000' : color} 
                onChange={(e) => setColor(e.target.value)}
                className="absolute -top-2 -left-2 w-12 h-12 cursor-pointer"
                title="Custom Color"
              />
            </div>
            
            <div className="w-px h-6 bg-border mx-1" />

            {/* Preset Colors */}
            {['#000000', '#EF4444', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'].map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 shrink-0 ${color === c ? 'border-foreground scale-110' : 'border-transparent shadow-sm'}`}
                style={{ backgroundColor: c }}
                title="Color"
              />
            ))}

            <div className="w-px h-6 bg-border mx-1" />

            {/* Eraser */}
            <button
              onClick={() => setColor('#FFFFFF')}
              className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-transform hover:scale-110 shrink-0 ${color === '#FFFFFF' ? 'border-foreground bg-muted scale-110' : 'border-transparent bg-background shadow-sm'}`}
              title="Eraser"
            >
              <Eraser className="w-4 h-4 text-foreground" />
            </button>
          </div>

          <div className="flex items-center gap-4">
            {/* Brush Size */}
            <div className="flex items-center gap-2 bg-background px-3 py-1.5 rounded-xl border border-border">
              <Paintbrush className="w-4 h-4 text-muted-foreground" />
              <input
                type="range"
                min="1"
                max="30"
                value={lineWidth}
                onChange={(e) => setLineWidth(parseInt(e.target.value))}
                className="w-20 sm:w-24 accent-primary"
                title="Brush Size"
              />
              <div 
                className="w-4 h-4 rounded-full bg-foreground flex items-center justify-center"
                style={{ transform: `scale(${lineWidth / 30})` }}
              />
            </div>

            {/* Undo */}
            <button
              onClick={undo}
              disabled={history.length === 0}
              className="p-2 bg-secondary text-secondary-foreground hover:bg-secondary/80 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-colors"
              title="Undo"
            >
              <Undo2 className="w-5 h-5" />
            </button>

            {/* Clear Canvas */}
            <button
              onClick={clearCanvas}
              className="p-2 bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground rounded-xl transition-colors"
              title="Clear Canvas"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
      <canvas
        ref={canvasRef}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseOut={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
        className={`w-full h-full touch-none ${isDrawer ? 'cursor-crosshair' : 'cursor-default'}`}
      />
    </div>
  );
}
