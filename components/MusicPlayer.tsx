"use client";

import { useState, useEffect, useRef } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Radio } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AudioVisualizer from '@/components/AudioVisualizer';

interface MusicPlayerProps {
  track: {
    title: string;
    artist: string;
    image: string;
    audioSrc: string;
  } | null;
}

export default function MusicPlayer({ track }: MusicPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (track && audioRef.current) {
      const srcToPlay = track.audioSrc || "/audio/midnight_horizon.wav";
      audioRef.current.src = srcToPlay;
      audioRef.current.load();
      audioRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch(err => {
        console.warn("Primary audio source error, using fallback local track:", err);
        if (audioRef.current && !audioRef.current.src.endsWith("/audio/midnight_horizon.wav")) {
          audioRef.current.src = "/audio/midnight_horizon.wav";
          audioRef.current.load();
          audioRef.current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
        } else {
          setIsPlaying(false);
        }
      });
    }
  }, [track]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateProgress = () => {
      setCurrentTime(audio.currentTime);
      setDuration(audio.duration || 0);
      if (audio.duration) {
        setProgress((audio.currentTime / audio.duration) * 100);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
    };

    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateProgress);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [track]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(console.error);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current || !duration) return;
    const newTime = (parseFloat(e.target.value) / 100) * duration;
    audioRef.current.currentTime = newTime;
    setProgress(parseFloat(e.target.value));
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
    setIsMuted(newVolume === 0);
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    if (isMuted) {
      audioRef.current.volume = volume;
      setIsMuted(false);
    } else {
      audioRef.current.volume = 0;
      setIsMuted(true);
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time) || !isFinite(time)) return '00:00';
    try {
      const mins = Math.floor(time / 60);
      const secs = Math.floor(time % 60);
      return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
    } catch (e) {
      return '00:00';
    }
  };

  if (!track) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#0c051a]/95 backdrop-blur-xl border-t border-purple-500/30 shadow-2xl">
      <audio
        ref={audioRef}
        onError={() => {
          console.warn("Audio element failed to load source.");
          setIsPlaying(false);
        }}
      />
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <div className="flex items-center justify-between h-20 gap-4">
          
          {/* Left Track Info */}
          <div className="flex items-center gap-3 w-1/4 min-w-0">
            <img src={track.image} alt={track.title} className="w-12 h-12 rounded-lg object-cover border border-white/10 shrink-0" />
            <div className="min-w-0">
              <p className="font-bold text-[#f5e6d3] truncate text-sm">{track.title}</p>
              <p className="text-xs text-[#f5e6d3]/60 truncate">{track.artist}</p>
            </div>
          </div>

          {/* Center Play Controls & Visualizer */}
          <div className="flex flex-col items-center gap-1.5 flex-1 max-w-xl">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" className="w-8 h-8 rounded-full hover:bg-white/10 text-[#f5e6d3]/70">
                <SkipBack className="w-4 h-4" />
              </Button>
              <Button onClick={togglePlay} size="icon" className="w-10 h-10 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-md hover:scale-105 transition-transform">
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-white ml-0.5" />}
              </Button>
              <Button variant="ghost" size="icon" className="w-8 h-8 rounded-full hover:bg-white/10 text-[#f5e6d3]/70">
                <SkipForward className="w-4 h-4" />
              </Button>
            </div>

            <div className="w-full flex items-center gap-2">
              <span className="text-[10px] font-mono text-[#f5e6d3]/50 w-9 text-right shrink-0">
                {formatTime(currentTime)}
              </span>
              
              {/* Audio Scrubber + Visualizer overlay */}
              <div className="relative flex-1 flex items-center h-5">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={progress || 0}
                  onChange={handleSeek}
                  className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-purple-400 z-10"
                />
              </div>

              <span className="text-[10px] font-mono text-[#f5e6d3]/50 w-9 shrink-0">
                {formatTime(duration)}
              </span>
            </div>
          </div>

          {/* Right Visualizer & Volume */}
          <div className="flex items-center gap-3 w-1/4 justify-end">
            <div className="hidden sm:block w-28">
              <AudioVisualizer isPlaying={isPlaying} barCount={18} height={28} colorScheme="cyan-purple" />
            </div>

            <Button onClick={toggleMute} variant="ghost" size="icon" className="w-8 h-8 rounded-full text-[#f5e6d3]/70 hover:text-white">
              {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </Button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              className="w-16 sm:w-20 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-purple-400"
            />
          </div>

        </div>
      </div>
    </div>
  );
}
