import React, { useRef, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

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

    canvasChannel
      .on('broadcast', { event: 'draw' }, handleDrawEvent)
      .on('broadcast', { event: 'clear' }, handleClearEvent)
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
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      channel.send({
        type: 'broadcast',
        event: 'clear',
        payload: {},
      });
    }
  };

  return (
    <div className="relative w-full h-full flex flex-col">
      {isDrawer && (
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between bg-white/90 backdrop-blur-sm p-2 rounded-lg shadow-sm border border-slate-200 z-10">
          <div className="flex items-center gap-2">
            {['#000000', '#EF4444', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#FFFFFF'].map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${color === c ? 'border-slate-800 scale-110' : 'border-transparent shadow-sm'}`}
                style={{ backgroundColor: c }}
                title={c === '#FFFFFF' ? 'Eraser' : 'Color'}
              />
            ))}
          </div>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min="1"
              max="20"
              value={lineWidth}
              onChange={(e) => setLineWidth(parseInt(e.target.value))}
              className="w-24 accent-indigo-600"
            />
            <button
              onClick={clearCanvas}
              className="px-3 py-1 bg-red-100 text-red-600 hover:bg-red-200 rounded-md text-sm font-medium transition-colors"
            >
              Clear
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
