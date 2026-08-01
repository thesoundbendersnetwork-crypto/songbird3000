"use client";

import React, { useEffect, useRef } from 'react';

interface AudioVisualizerProps {
  isPlaying?: boolean;
  barCount?: number;
  height?: number;
  className?: string;
  colorScheme?: 'cyan-purple' | 'pink-purple' | 'neon';
  audioRef?: React.RefObject<HTMLAudioElement | null>;
}

export default function AudioVisualizer({
  isPlaying = false,
  barCount = 28,
  height = 48,
  className = '',
  colorScheme = 'cyan-purple',
  audioRef
}: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let bars = Array.from({ length: barCount }, () => Math.random() * 0.2 + 0.1);

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / barCount) - 2;
      
      for (let i = 0; i < barCount; i++) {
        let barHeight = bars[i] * canvas.height;

        if (isPlaying) {
          // Dynamic simulation / animation of audio frequencies
          const speed = (i % 3 === 0 ? 0.12 : 0.07) + (i * 0.01);
          const target = Math.sin(Date.now() * 0.005 + i * 0.4) * 0.4 + 0.5 + (Math.random() * 0.2);
          bars[i] += (target - bars[i]) * speed;
        } else {
          // Idle ambient pulse
          const idleTarget = 0.12 + Math.sin(Date.now() * 0.002 + i * 0.3) * 0.06;
          bars[i] += (idleTarget - bars[i]) * 0.05;
        }

        barHeight = Math.max(3, Math.min(canvas.height, bars[i] * canvas.height));
        const x = i * (barWidth + 2);
        const y = canvas.height - barHeight;

        // Gradient styling based on color scheme
        const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
        if (colorScheme === 'pink-purple') {
          gradient.addColorStop(0, '#ec4899');
          gradient.addColorStop(0.6, '#a855f7');
          gradient.addColorStop(1, '#06b6d4');
        } else if (colorScheme === 'neon') {
          gradient.addColorStop(0, '#22c55e');
          gradient.addColorStop(0.5, '#eab308');
          gradient.addColorStop(1, '#ef4444');
        } else {
          gradient.addColorStop(0, '#06b6d4');
          gradient.addColorStop(0.6, '#8b5cf6');
          gradient.addColorStop(1, '#ec4899');
        }

        ctx.fillStyle = gradient;
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(x, y, barWidth, barHeight, [2, 2, 0, 0]);
        } else {
          ctx.rect(x, y, barWidth, barHeight);
        }
        ctx.fill();

        // Glow peak cap
        if (isPlaying && barHeight > canvas.height * 0.5) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(x, y - 2, barWidth, 2);
        }
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isPlaying, barCount, colorScheme]);

  return (
    <div className={`relative flex items-center justify-center overflow-hidden rounded-lg bg-black/30 border border-white/5 p-1 ${className}`}>
      <canvas
        ref={canvasRef}
        width={barCount * 8}
        height={height}
        className="w-full h-full object-contain"
      />
    </div>
  );
}
