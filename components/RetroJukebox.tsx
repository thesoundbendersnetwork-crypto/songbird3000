'use client';

import React, { useState, useRef } from 'react';
import { jukeboxSongs } from '@/lib/jukebox-data';

export default function RetroJukebox() {
  const [marqueeText, setMarqueeText] = useState('select a song!');
  const audioRefs = useRef<(HTMLAudioElement | null)[]>([]);

  const stopmusic = () => {
    audioRefs.current.forEach((audio) => {
      if (audio) {
        audio.pause();
      }
    });
    setMarqueeText('no music is playing');
  };

  const playsong = (index: number, fullTitle: string) => {
    audioRefs.current.forEach((audio) => {
      if (audio) {
        audio.pause();
      }
    });
    
    const currentAudio = audioRefs.current[index];
    if (currentAudio) {
      currentAudio.currentTime = 0;
      currentAudio.play().catch(e => console.error(e));
      setMarqueeText(fullTitle);
    }
  };

  const handleSongEnd = () => {
    setMarqueeText('select a song!');
  };

  return (
    <div className="flex items-center gap-4">
      <div className="w-[180px] h-8 bg-black/40 border border-green-500/20 rounded flex items-center overflow-hidden">
        <div className="w-full whitespace-nowrap">
          <div className="inline-block animate-marquee-slow text-[10px] font-mono text-green-400 px-2" id="marq">
            {marqueeText}
          </div>
        </div>
      </div>

      <div className="jukebox relative group">
        <button className="activate p-2 rounded-full hover:bg-white/10 transition-colors flex items-center justify-center">
          <img 
            src="https://solaria.neocities.org/smallgifs/cdspin.gif" 
            alt="Jukebox" 
            className="w-8 h-8 rounded-full"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        </button>
        
        <div className="hidden group-hover:block absolute right-0 top-10 bg-[#1a1512] border border-[#3a3520] p-2 rounded-xl shadow-2xl z-50 min-w-[220px] max-h-[300px] overflow-y-auto">
          <div className="mb-2 border-b border-white/10 pb-2">
            <button 
              onClick={stopmusic}
              className="w-full text-left text-red-400 hover:text-red-300 font-bold text-xs uppercase tracking-widest"
            >
              STOP MUSIC
            </button>
          </div>
          <ul className="space-y-1">
            {jukeboxSongs.map((song, index) => (
              <li key={song.id}>
                <button 
                  onClick={() => playsong(index, `${song.title} - ${song.artist}`)}
                  className="w-full text-left p-2 rounded-lg hover:bg-white/5 transition-colors group/item"
                >
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-[#f5e6d3] group-hover/item:text-green-400 transition-colors truncate">
                      {song.title}
                    </span>
                    <span className="text-[9px] text-[#f5e6d3]/40 truncate">
                      {song.artist}
                    </span>
                  </div>
                  <audio 
                    ref={(el) => { audioRefs.current[index] = el; }}
                    onEnded={handleSongEnd}
                  >
                    <source src={song.audioUrl} type="audio/mp3" />
                  </audio>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
