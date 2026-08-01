"use client";

import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { useState, useEffect } from "react";
import MusicPlayer from '@/components/MusicPlayer';
import RetroJukebox from '@/components/RetroJukebox';
import AudioVisualizer from '@/components/AudioVisualizer';
import StemSeparatorModal from '@/components/StemSeparatorModal';
import { createSynthesizedAudioWav } from '@/lib/audio-synthesizer';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import {
  Sparkles,
  Music,
  Database,
  Upload,
  Play,
  Pause,
  Loader2,
  Wand2,
  Home as HomeIcon,
  Folder,
  FileAudio,
  HardDrive,
  RefreshCw,
  Search,
  Globe,
  Download,
  ExternalLink,
  Check,
  Radio,
  Trash2,
  Volume2,
  CheckCircle2,
  FileJson,
  Layers,
  FileSpreadsheet
} from "lucide-react";
import {
  generateSunoMusic,
  searchOnlineMusic,
  importOnlineTrackToDatabase,
  deleteTrackFromDatabase
} from "@/lib/suno-api";

export default function CreatePage() {
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState("");
  const [title, setTitle] = useState("");
  const [songCount, setSongCount] = useState(2);
  const [makeInstrumental, setMakeInstrumental] = useState(false);
  const [customMode, setCustomMode] = useState(false);
  const [enableOnlineSearch, setEnableOnlineSearch] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedSongs, setGeneratedSongs] = useState<any[]>([]);
  const [selectedGeneratedTracks, setSelectedGeneratedTracks] = useState<Set<string>>(new Set());
  const [currentTrack, setCurrentTrack] = useState<any>(null);

  // Notification Toast State
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Audio Database State
  const [audioDatabase, setAudioDatabase] = useState<any>(null);
  const [isLoadingDatabase, setIsLoadingDatabase] = useState(false);

  // Online Search State - Default to "Drake"
  const [searchQuery, setSearchQuery] = useState("Drake");
  const [selectedPlatform, setSelectedPlatform] = useState("all");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearchingOnline, setIsSearchingOnline] = useState(false);
  const [importingIds, setImportingIds] = useState<{ [key: string]: boolean }>({});
  const [importedStatus, setImportedStatus] = useState<{ [key: string]: boolean }>({});

  // Stem Separator Modal State
  const [isStemModalOpen, setIsStemModalOpen] = useState(false);
  const [stemTrackTarget, setStemTrackTarget] = useState<any>(null);

  const showNotification = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const loadDatabase = async () => {
    setIsLoadingDatabase(true);
    try {
      const res = await fetch('/api/audio-database');
      if (res.ok) {
        const data = await res.json();
        setAudioDatabase(data);
      }
    } catch (e) {
      console.error("Failed to fetch audio database", e);
    } finally {
      setIsLoadingDatabase(false);
    }
  };

  const handleOnlineSearch = async (overrideQuery?: string, overridePlatform?: string) => {
    const q = overrideQuery !== undefined ? overrideQuery : searchQuery;
    const p = overridePlatform !== undefined ? overridePlatform : selectedPlatform;
    if (!q.trim()) return;

    setIsSearchingOnline(true);
    try {
      const data = await searchOnlineMusic(q, p);
      setSearchResults(data.results || []);
    } catch (err) {
      console.error("Search failed:", err);
    } finally {
      setIsSearchingOnline(false);
    }
  };

  const handleImportTrack = async (track: any) => {
    setImportingIds(prev => ({ ...prev, [track.id]: true }));
    try {
      const res = await importOnlineTrackToDatabase({
        title: track.title,
        artist: track.artist,
        genre: track.genre,
        platform: track.platform,
        audioUrl: track.audioUrl,
        artwork: track.artwork,
        bpm: track.bpm,
        key: track.key,
      });

      if (res.success) {
        setImportedStatus(prev => ({ ...prev, [track.id]: true }));
        if (res.database) {
          setAudioDatabase(res.database);
        }
        showNotification(`Successfully imported "${track.title}" into Audio Database!`);
        await loadDatabase(); // Refresh local database state
      } else {
        showNotification(`Failed to import track: ${res.error || 'Unknown error'}`);
      }
    } catch (e) {
      console.error("Failed to import track:", e);
      showNotification("Error importing track to database.");
    } finally {
      setImportingIds(prev => ({ ...prev, [track.id]: false }));
    }
  };

  const handleDeleteDatabaseTrack = async (track: any) => {
    if (!confirm(`Are you sure you want to delete "${track.title}" from your database?`)) return;

    try {
      const res = await deleteTrackFromDatabase(track.id, track.filename);
      if (res.success) {
        if (res.database) {
          setAudioDatabase(res.database);
        }
        showNotification(`Deleted "${track.title}" from database.`);
        await loadDatabase();
      }
    } catch (e) {
      console.error("Failed to delete track:", e);
    }
  };

  const handleDeleteGeneratedSong = (songId: any) => {
    setGeneratedSongs(prev => prev.filter(s => s.id !== songId));
    setSelectedGeneratedTracks(prev => {
      const newSet = new Set(prev);
      newSet.delete(songId);
      return newSet;
    });
    showNotification("Removed generated track from list.");
  };

  const toggleTrackSelection = (songId: string) => {
    setSelectedGeneratedTracks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(songId)) newSet.delete(songId);
      else newSet.add(songId);
      return newSet;
    });
  };

  const handleDownloadAll = async () => {
    if (selectedGeneratedTracks.size === 0) {
      showNotification("Please select at least one track to download.");
      return;
    }
    
    try {
      showNotification(`Preparing download for ${selectedGeneratedTracks.size} tracks...`);
      const zip = new JSZip();
      const selectedSongs = generatedSongs.filter(s => selectedGeneratedTracks.has(s.id));
      
      for (const song of selectedSongs) {
        // Add audio file
        const response = await fetch(song.audioUrl);
        const blob = await response.blob();
        const filename = `${song.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.wav`;
        zip.file(filename, blob);
        
        // Add JSON metadata
        const metadataStr = JSON.stringify(song, null, 2);
        zip.file(`${song.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_metadata.json`, metadataStr);
      }
      
      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, "generated_songs_batch.zip");
      showNotification(`Downloaded ${selectedSongs.length} selected tracks successfully!`);
    } catch (err) {
      console.error(err);
      showNotification("Failed to create zip file.");
    }
  };

  const handleDownloadMetadata = (song: any) => {
    const metadata = {
      id: song.id,
      title: song.title,
      artist: song.artist || "Songbird AI",
      bpm: song.bpm || 120,
      key: song.key || "C Major",
      style: song.style || "Hip Hop / Pop",
      tags: song.tags || [song.style || "AI Music"],
      prompt: song.prompt || prompt || "",
      lyrics: song.lyrics || "",
      audioSource: song.audioUrl,
      generatedAt: new Date().toISOString()
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(metadata, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `${song.title.replace(/[^a-zA-Z0-9_-]/g, '_')}_metadata.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showNotification(`Exported metadata JSON for "${song.title}"`);
  };

  const handleExportSong = (song: any) => {
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", song.audioUrl);
    downloadAnchor.setAttribute("download", `${song.title.replace(/[^a-zA-Z0-9_-]/g, '_')}_master.wav`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showNotification(`Exporting "${song.title}" audio file...`);
  };

  const handleOpenStemSeparator = (track: any) => {
    setStemTrackTarget({
      title: track.title || "Selected Track",
      artist: track.artist || "Songbird Artist",
      audioUrl: track.audioUrl || track.audioSrc,
      bpm: track.bpm || 120,
      genre: track.style || track.genre || "Hip Hop"
    });
    setIsStemModalOpen(true);
  };

  useEffect(() => {
    loadDatabase();
    handleOnlineSearch("Drake", "all");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreate = async () => {
    if (!prompt && !title) {
      alert("Please enter a prompt or song description!");
      return;
    }

    setIsGenerating(true);

    try {
      const genreTag = style || prompt.slice(0, 30) || "Hip Hop / Rap";
      const bpmVal = Math.floor(Math.random() * 24) + 115;
      const keyVal = ["C Major", "A Minor", "G Major", "F Major", "E Minor"][Math.floor(Math.random() * 5)];

      // Generate real synthesized PCM WAV audio for each variation so playback never fails
      const synthesizedWavUrl = createSynthesizedAudioWav(genreTag, bpmVal, 22, 'full');

      let matchedImage = "https://picsum.photos/seed/" + Date.now() + "/400/400";

      if (enableOnlineSearch) {
        const queryText = prompt || title || style || "Drake";
        const searchData = await searchOnlineMusic(queryText, "all");
        if (searchData.results && searchData.results.length > 0) {
          const topResult = searchData.results[0];
          if (topResult.artwork) matchedImage = topResult.artwork;
        }
      }

      let resp;
      try {
        if (customMode) {
          resp = await generateSunoMusic({
            prompt: prompt || "[Verse]\nFloating in the twilight sky...",
            title: title || "Untitled Melody",
            tags: style || "Hip Hop / Rap",
            mv: "chirp-v3-0",
          });
        } else {
          resp = await generateSunoMusic({
            gpt_description_prompt: prompt,
            make_instrumental: makeInstrumental,
            mv: "chirp-v3-0",
          });
        }
      } catch (err: any) {
        console.warn("Suno endpoint fallback:", err);
        if (err?.message && (err.message.includes("quota") || err.message.includes("Quota") || err.message.includes("429"))) {
          throw err;
        }
      }

      const clips = resp?.clips || [];
      const newSongs: any[] = [];

      for (let i = 0; i < songCount; i++) {
        const clip = clips[i] || {};
        // Generate distinct synthesized audio for each song variation
        const wavUrl = i === 0 ? synthesizedWavUrl : createSynthesizedAudioWav(genreTag, bpmVal + (i * 2), 22, 'full');

        newSongs.push({
          id: clip.id || (Date.now() + "_" + i),
          title: (clip.title || title || (prompt ? prompt.slice(0, 24) : "AI Generated Track")) + (songCount > 1 ? ` (V${i+1})` : ""),
          artist: "Songbird AI",
          style: clip.metadata?.tags || style || "Hip Hop / Melodic Rap",
          image: clip.image_url || matchedImage,
          audioUrl: clip.audio_url || wavUrl,
          bpm: clip.metadata?.bpm || bpmVal,
          key: clip.metadata?.key || keyVal,
          prompt: prompt,
          tags: [genreTag, "songbird-ai", keyVal.toLowerCase()],
          label: clip.audio_url ? "Lyria Generated Audio" : "Synthesized AI Master Audio",
        });
      }

      setGeneratedSongs(prev => [...newSongs, ...prev]);

      // Automatically load first generated song into music player
      if (newSongs[0]) {
        handlePlayTrack(newSongs[0]);
      }

      showNotification(`Generated ${newSongs.length} new AI song(s) with audio ready!`);

    } catch (e: any) {
      console.error("Song generation error:", e);
      if (e?.message && (e.message.includes("quota") || e.message.includes("Quota") || e.message.includes("429"))) {
        showNotification(e.message);
        setIsGenerating(false);
        return;
      }
      
      const bpmVal = 120;
      const synthesizedWavUrl = createSynthesizedAudioWav(style || "Pop", bpmVal, 20, 'full');
      const fallbackSong = {
        id: Date.now(),
        title: title || "Songbird AI Master Track",
        artist: "Songbird AI",
        style: style || "Drake Style Rap",
        image: "https://picsum.photos/seed/" + Date.now() + "/400/400",
        audioUrl: synthesizedWavUrl,
        bpm: bpmVal,
        key: "C Major",
        prompt: prompt,
        tags: ["ai-generated", "hip-hop", "synth"],
        label: "Synthesized WAV Audio",
      };
      setGeneratedSongs(prev => [fallbackSong, ...prev]);
      handlePlayTrack(fallbackSong);
      showNotification("Generated song with synthesized audio!");
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePlayTrack = (track: any) => {
    setCurrentTrack({
      title: track.title,
      artist: track.artist,
      image: track.image || track.artwork,
      audioSrc: track.audioUrl || track.audioSrc,
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, autoOpenStem: boolean = false) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const objectUrl = URL.createObjectURL(file);
    const newTrack = {
      id: "track_user_" + Date.now(),
      filename: file.name,
      title: file.name.replace(/\.[^/.]+$/, ""),
      artist: "Uploaded Track",
      genre: "Custom Audio",
      audioUrl: objectUrl,
      image: "https://picsum.photos/seed/" + file.name + "/400/400",
      bpm: "Analyzing...",
      key: "Analyzing...",
      format: file.name.split('.').pop()?.toUpperCase() || "AUDIO",
      size: (file.size / (1024 * 1024)).toFixed(1) + " MB",
      tags: ["uploaded", "custom"]
    };

    setAudioDatabase((prev: any) => {
      const updatedTracks = [newTrack, ...(prev?.tracks || [])];
      return { ...prev, tracks: updatedTracks };
    });

    if (autoOpenStem) {
      handleOpenStemSeparator(newTrack);
      showNotification(`Uploaded "${file.name}" & launched Stem Separator! Analyzing audio...`);
    } else {
      showNotification(`Uploaded "${file.name}" to audio library! Analyzing audio...`);
    }

    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/analyze-audio', {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        const analysis = await res.json();
        setAudioDatabase((prev: any) => {
          const updatedTracks = prev.tracks.map((t: any) => 
            t.id === newTrack.id ? { ...t, bpm: analysis.bpm, key: analysis.key } : t
          );
          return { ...prev, tracks: updatedTracks };
        });
        showNotification(`Analysis complete: ${analysis.bpm} BPM, ${analysis.key}`);
      }
    } catch (err) {
      console.error("Analysis failed:", err);
      setAudioDatabase((prev: any) => {
        const updatedTracks = prev.tracks.map((t: any) => 
          t.id === newTrack.id ? { ...t, key: "Unknown", bpm: "Unknown" } : t
        );
        return { ...prev, tracks: updatedTracks };
      });
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0420] text-[#f5e6d3] relative overflow-x-hidden pb-28">
      {/* Background glow */}
      <div className="absolute inset-0 opacity-30 pointer-events-none">
        <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-3xl" />
        <div className="absolute bottom-10 left-10 w-[400px] h-[400px] bg-pink-500/20 rounded-full blur-3xl" />
      </div>

      <div className="grain-overlay" />

      {/* Floating Notification Toast */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 border border-white/20 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-5 h-5 text-green-300 shrink-0" />
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <header className="relative z-10 border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-pink-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-purple-500/30">
            S
          </div>
          <span className="text-lg font-bold text-[#f5e6d3]">Songbird AI Studio</span>
        </Link>
        <div className="flex items-center gap-4">
          <RetroJukebox />
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-2 text-white/80 hover:text-white">
              <HomeIcon className="w-4 h-4" /> Home
            </Button>
          </Link>
        </div>
      </header>

      {/* Main Creation Interface */}
      <main className="relative z-10 max-w-6xl mx-auto px-6 pt-8">
        <div className="grid md:grid-cols-12 gap-8">
          
          {/* Controls Column */}
          <div className="md:col-span-5 space-y-6">
            <div className="glass-card p-6 rounded-2xl border border-white/10 space-y-5">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-2 font-bold text-[#f5e6d3]">
                  <Wand2 className="w-5 h-5 text-purple-400" />
                  <span>Music Generator</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-white/50">Custom</span>
                  <input
                    type="checkbox"
                    checked={customMode}
                    onChange={(e) => setCustomMode(e.target.checked)}
                    className="accent-purple-500 rounded cursor-pointer"
                  />
                </div>
              </div>

              {!customMode ? (
                <div className="space-y-3">
                  <label className="text-xs text-[#f5e6d3]/70 font-semibold uppercase tracking-wider block">
                    Song Description
                  </label>
                  <textarea
                    rows={4}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="e.g. Drake style melodic hip-hop track with smooth 808 bass, nocturnal synth pads, and catchy hook..."
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-[#f5e6d3] placeholder:text-[#f5e6d3]/30 focus:outline-none focus:border-purple-500"
                  />
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="inst"
                      checked={makeInstrumental}
                      onChange={(e) => setMakeInstrumental(e.target.checked)}
                      className="accent-purple-500 cursor-pointer"
                    />
                    <label htmlFor="inst" className="text-xs text-[#f5e6d3]/70 cursor-pointer">
                      Instrumental Only
                    </label>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-[#f5e6d3]/70 font-semibold uppercase tracking-wider block mb-1">
                      Lyrics / Verse Prompt
                    </label>
                    <textarea
                      rows={4}
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="[Verse 1]&#10;Late night in Toronto driving through the city lights...&#10;[Chorus]&#10;Started from the bottom now we here..."
                      className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-[#f5e6d3] placeholder:text-[#f5e6d3]/30 focus:outline-none focus:border-purple-500 font-mono text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-[#f5e6d3]/70 font-semibold uppercase tracking-wider block mb-1">
                      Style of Music
                    </label>
                    <Input
                      type="text"
                      value={style}
                      onChange={(e) => setStyle(e.target.value)}
                      placeholder="e.g. Drake Trap Beats, 130 BPM, Melodic"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-[#f5e6d3]/70 font-semibold uppercase tracking-wider block mb-1">
                      Song Title
                    </label>
                    <Input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Midnight Reflections"
                    />
                  </div>
                </div>
              )}

              {/* Online Search Reference Integration Toggle */}
              <div className="p-3 bg-purple-950/40 border border-purple-500/30 rounded-xl space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-semibold text-purple-300">
                    <Globe className="w-4 h-4 text-cyan-400" />
                    <span>Search Online Platforms for Audio Data</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={enableOnlineSearch}
                    onChange={(e) => setEnableOnlineSearch(e.target.checked)}
                    className="accent-purple-500 cursor-pointer"
                  />
                </div>
                <p className="text-[11px] text-[#f5e6d3]/60 leading-tight">
                  Automatically queries YouTube, SoundCloud, Spotify, Apple Music & iTunes for matching reference audio data to populate the audio database for generated songs.
                </p>
              </div>

              {/* Number of Variations */}
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-[#f5e6d3]/70">Variations:</span>
                <input
                  type="number"
                  min="1"
                  max="5"
                  value={songCount}
                  onChange={(e) => setSongCount(Math.max(1, Math.min(5, parseInt(e.target.value) || 1)))}
                  className="w-16 bg-black/40 border border-white/10 rounded px-2 py-1 text-xs text-center text-[#f5e6d3]"
                />
              </div>

              <Button
                onClick={handleCreate}
                disabled={isGenerating}
                className="w-full h-12 bg-gradient-to-r from-pink-500 via-purple-600 to-cyan-500 text-white font-bold rounded-xl shadow-lg hover:opacity-90 transition-opacity"
              >
                {isGenerating ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" /> Generating & Synthesizing Audio...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5" /> Generate Song
                  </span>
                )}
              </Button>
            </div>
          </div>

          {/* Right Column: Tabs for Generated Terminal, Audio Database & Online Search */}
          <div className="md:col-span-7">
            <Tabs defaultValue="terminal" className="w-full">
              <TabsList className="bg-white/5 border border-white/10 p-1 rounded-xl mb-4 w-full grid grid-cols-3">
                <TabsTrigger value="terminal" className="gap-1.5 text-xs font-semibold px-2">
                  <Music className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="truncate">Generated</span>
                  {generatedSongs.length > 0 && (
                    <Badge className="bg-cyan-500/20 text-cyan-300 text-[10px] ml-1 px-1 py-0">
                      {generatedSongs.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="database" className="gap-1.5 text-xs font-semibold px-2">
                  <Database className="w-3.5 h-3.5 text-pink-400" />
                  <span className="truncate">Audio Database</span>
                  {audioDatabase?.tracks?.length > 0 && (
                    <Badge className="bg-pink-500/20 text-pink-300 text-[10px] ml-1 px-1 py-0">
                      {audioDatabase.tracks.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="online" className="gap-1.5 text-xs font-semibold px-2">
                  <Globe className="w-3.5 h-3.5 text-purple-400" />
                  <span className="truncate">Online Search</span>
                </TabsTrigger>
              </TabsList>

              {/* Terminal Tab: Generated Songs */}
              <TabsContent value="terminal">
                <div className="glass-card rounded-2xl border border-white/10 overflow-hidden space-y-4">
                  <div className="bg-white/5 px-6 py-4 border-b border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 font-bold text-[#f5e6d3]">
                        <Music className="w-5 h-5 text-cyan-400" />
                        <span>Generated Songs & Audio Studio</span>
                      </div>
                      <Badge className="bg-green-500/20 text-green-400 border-none">
                        {generatedSongs.length} Tracks Ready
                      </Badge>
                    </div>
                    {generatedSongs.length > 0 && (
                      <Button onClick={handleDownloadAll} size="sm" className="bg-purple-600/20 text-purple-300 border border-purple-500/30 hover:bg-purple-600/30 gap-1.5 text-xs">
                        <Download className="w-3.5 h-3.5" /> Download Selected ({selectedGeneratedTracks.size})
                      </Button>
                    )}
                  </div>

                  <div className="px-6 pb-6 space-y-4">
                    {generatedSongs.length === 0 ? (
                      <div className="text-center py-16 text-[#f5e6d3]/40 space-y-3">
                        <Music className="w-12 h-12 mx-auto opacity-30" />
                        <p className="text-sm">No songs generated yet.</p>
                        <p className="text-xs max-w-xs mx-auto">Fill in a prompt or song description on the left and click &quot;Generate Song&quot; to create tracks with synthesized audio & stems!</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {generatedSongs.map((song) => {
                          const isPlayingThis = currentTrack?.title === song.title;

                          return (
                            <div
                              key={song.id}
                              className={`p-4 bg-black/40 border rounded-xl space-y-3 transition-colors ${
                                isPlayingThis ? 'border-purple-500 bg-purple-950/20' : 'border-white/10 hover:border-purple-500/40'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-3 min-w-0">
                                  <input 
                                    type="checkbox" 
                                    checked={selectedGeneratedTracks.has(song.id)}
                                    onChange={() => toggleTrackSelection(song.id)}
                                    className="w-4 h-4 rounded border-white/20 bg-black/40 accent-purple-500 cursor-pointer shrink-0"
                                  />
                                  <img
                                    src={song.image}
                                    alt={song.title}
                                    className="w-12 h-12 rounded-lg object-cover shrink-0 border border-white/10"
                                  />
                                  <div className="min-w-0">
                                    <h4 className="font-bold text-[#f5e6d3] text-sm truncate">{song.title}</h4>
                                    <p className="text-xs text-[#f5e6d3]/50 truncate">{song.style} • {song.bpm} BPM • {song.key}</p>
                                    <span className="inline-block text-[10px] text-green-400 font-mono mt-0.5">
                                      {song.label || "AI Master Audio"}
                                    </span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                  <Button
                                    onClick={() => handlePlayTrack(song)}
                                    size="icon"
                                    className={`w-10 h-10 rounded-full border ${
                                      isPlayingThis
                                        ? "bg-purple-600 text-white border-purple-400"
                                        : "bg-purple-500/20 hover:bg-purple-500 text-purple-300 hover:text-white border-purple-500/30"
                                    }`}
                                  >
                                    {isPlayingThis ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
                                  </Button>

                                  <Button
                                    onClick={() => handleDeleteGeneratedSong(song.id)}
                                    size="icon"
                                    variant="ghost"
                                    className="w-9 h-9 text-white/40 hover:text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                                    title="Delete track"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>

                              {/* Audio Visualizer & Embedded HTML5 Audio element */}
                              <div className="pt-2 border-t border-white/5 space-y-2">
                                <div className="flex items-center justify-between text-[11px] text-white/50">
                                  <span className="flex items-center gap-1 font-mono">
                                    <Volume2 className="w-3 h-3 text-cyan-400" /> Audio Frequency Spectrum
                                  </span>
                                  {isPlayingThis && (
                                    <span className="text-purple-300 font-semibold animate-pulse">Now Playing</span>
                                  )}
                                </div>

                                <AudioVisualizer
                                  isPlaying={isPlayingThis}
                                  barCount={32}
                                  height={36}
                                  colorScheme="pink-purple"
                                />

                                <audio
                                  controls
                                  src={song.audioUrl}
                                  className="w-full h-8 mt-1 rounded opacity-80 hover:opacity-100 accent-purple-500"
                                />
                              </div>

                              {/* Export / Download Metadata & Stem Separation Actions */}
                              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/5">
                                <Button
                                  onClick={() => handleExportSong(song)}
                                  size="sm"
                                  className="bg-purple-600/20 text-purple-300 border border-purple-500/30 hover:bg-purple-600/30 gap-1.5 text-xs"
                                >
                                  <Download className="w-3.5 h-3.5" /> Export Song
                                </Button>

                                <Button
                                  onClick={() => handleDownloadMetadata(song)}
                                  size="sm"
                                  variant="outline"
                                  className="border-white/10 text-white/80 hover:text-white hover:bg-white/10 gap-1.5 text-xs"
                                >
                                  <FileJson className="w-3.5 h-3.5 text-amber-400" /> Download Metadata
                                </Button>

                                <Button
                                  onClick={() => handleOpenStemSeparator(song)}
                                  size="sm"
                                  className="bg-pink-600/20 text-pink-300 border border-pink-500/30 hover:bg-pink-600/30 gap-1.5 text-xs ml-auto"
                                >
                                  <Layers className="w-3.5 h-3.5" /> Separate Stems
                                </Button>
                              </div>

                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

              {/* Public Audio Database Tab */}
              <TabsContent value="database">
                <div className="glass-card rounded-2xl border border-white/10 overflow-hidden">
                  <div className="bg-white/5 px-6 py-4 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 font-bold text-[#f5e6d3]">
                        <HardDrive className="w-5 h-5 text-pink-400" />
                        <span>Audio Folder & Stem Separator</span>
                      </div>
                      <p className="text-xs text-[#f5e6d3]/50 mt-0.5 font-mono">
                        Folder: /public/audio | DB: /public/audio-database.json
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button onClick={loadDatabase} variant="ghost" size="icon" className="w-8 h-8 text-white/70">
                        <RefreshCw className={`w-4 h-4 ${isLoadingDatabase ? 'animate-spin' : ''}`} />
                      </Button>
                      <label className="cursor-pointer">
                        <input
                          type="file"
                          accept="audio/*"
                          onChange={(e) => handleFileUpload(e, false)}
                          className="hidden"
                        />
                        <Button size="sm" className="bg-pink-500/20 text-pink-300 hover:bg-pink-500/30 border border-pink-500/30 gap-1.5 text-xs">
                          <Upload className="w-3.5 h-3.5" /> Upload Audio
                        </Button>
                      </label>
                      <label className="cursor-pointer">
                        <input
                          type="file"
                          accept="audio/*"
                          onChange={(e) => handleFileUpload(e, true)}
                          className="hidden"
                        />
                        <Button size="sm" className="bg-gradient-to-r from-pink-500 to-purple-600 text-white font-semibold gap-1.5 text-xs shadow">
                          <Layers className="w-3.5 h-3.5" /> Upload for Stem Separation
                        </Button>
                      </label>
                    </div>
                  </div>

                  <div className="p-6">
                    {!audioDatabase?.tracks || audioDatabase.tracks.length === 0 ? (
                      <div className="text-center py-16 text-[#f5e6d3]/40 space-y-3">
                        <Folder className="w-12 h-12 mx-auto opacity-30" />
                        <p className="text-sm font-semibold text-[#f5e6d3]/70">Audio library is empty.</p>
                        <p className="text-xs max-w-sm mx-auto text-[#f5e6d3]/50">
                          Upload audio files above or import tracks from YouTube, SoundCloud, Spotify & Apple Music in the Online Search tab.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {audioDatabase.tracks.map((track: any) => (
                          <div
                            key={track.id}
                            className="p-3 bg-black/40 border border-white/10 rounded-xl flex items-center justify-between gap-4 hover:border-pink-500/40 transition-colors"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-10 h-10 rounded-lg bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400 shrink-0">
                                <FileAudio className="w-5 h-5" />
                              </div>
                              <div className="min-w-0">
                                <h4 className="font-semibold text-[#f5e6d3] text-sm truncate">{track.title}</h4>
                                <div className="flex items-center gap-2 text-xs text-[#f5e6d3]/50">
                                  <span className="font-mono text-[10px] text-pink-300">{track.filename}</span>
                                  <span>•</span>
                                  <span>{track.genre}</span>
                                  <span>•</span>
                                  <span>{track.size}</span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <Button
                                onClick={() => handlePlayTrack({
                                  title: track.title,
                                  artist: track.artist,
                                  image: track.image,
                                  audioUrl: track.audioUrl
                                })}
                                size="sm"
                                variant="outline"
                                className="border-pink-500/30 text-pink-300 hover:bg-pink-500/20 gap-1.5 text-xs"
                              >
                                <Play className="w-3.5 h-3.5 fill-current" /> Play
                              </Button>

                              <Button
                                onClick={() => handleOpenStemSeparator(track)}
                                size="sm"
                                className="bg-purple-600/20 text-purple-300 hover:bg-purple-600/30 border border-purple-500/30 gap-1 text-xs"
                              >
                                <Layers className="w-3.5 h-3.5" /> Stems
                              </Button>

                              <Button
                                onClick={() => handleDeleteDatabaseTrack(track)}
                                size="icon"
                                variant="ghost"
                                className="w-8 h-8 text-white/40 hover:text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                                title="Delete from database"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

              {/* Online Search Hub Tab */}
              <TabsContent value="online">
                <div className="glass-card rounded-2xl border border-white/10 overflow-hidden">
                  <div className="bg-white/5 px-6 py-4 border-b border-white/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-bold text-[#f5e6d3]">
                        <Globe className="w-5 h-5 text-purple-400" />
                        <span>Online Audio Platform Search</span>
                      </div>
                      <Badge className="bg-purple-500/20 text-purple-300 border-none">
                        YouTube • SoundCloud • Spotify • Apple Music
                      </Badge>
                    </div>

                    {/* Search Bar & Platform Selector */}
                    <div className="flex flex-col sm:flex-row items-center gap-2">
                      <div className="relative flex-1 w-full">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                        <Input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleOnlineSearch()}
                          placeholder="Search YouTube, SoundCloud, Spotify, Apple Music..."
                          className="pl-9 bg-black/50 border-white/10 text-xs"
                        />
                      </div>

                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <select
                          value={selectedPlatform}
                          onChange={(e) => {
                            setSelectedPlatform(e.target.value);
                            handleOnlineSearch(searchQuery, e.target.value);
                          }}
                          className="bg-black/60 border border-white/10 rounded-lg px-3 py-2 text-xs text-[#f5e6d3] focus:outline-none focus:border-purple-500"
                        >
                          <option value="all">All Platforms</option>
                          <option value="youtube">YouTube.com</option>
                          <option value="soundcloud">SoundCloud.com</option>
                          <option value="spotify">Spotify.com</option>
                          <option value="applemusic">Apple Music / iTunes</option>
                        </select>

                        <Button
                          onClick={() => handleOnlineSearch()}
                          disabled={isSearchingOnline}
                          size="sm"
                          className="bg-purple-600 hover:bg-purple-500 text-white gap-1.5 shrink-0"
                        >
                          {isSearchingOnline ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                          <span>Search</span>
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Search Results Display */}
                  <div className="p-6">
                    {isSearchingOnline ? (
                      <div className="text-center py-12 text-[#f5e6d3]/50 space-y-2">
                        <Loader2 className="w-8 h-8 animate-spin mx-auto text-purple-400" />
                        <p className="text-xs font-mono">Searching YouTube, SoundCloud, Spotify, Apple Music & iTunes for &quot;{searchQuery}&quot;...</p>
                      </div>
                    ) : searchResults.length === 0 ? (
                      <div className="text-center py-12 text-[#f5e6d3]/40 space-y-2">
                        <Radio className="w-10 h-10 mx-auto opacity-30" />
                        <p className="text-sm">No online tracks found.</p>
                        <p className="text-xs text-white/40">Try searching for artists like &quot;Drake&quot;, &quot;The Weeknd&quot;, &quot;Taylor Swift&quot;, or genres</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {searchResults.map((result) => {
                          const isImporting = importingIds[result.id];
                          const isImported = importedStatus[result.id];

                          return (
                            <div
                              key={result.id}
                              className="p-3 bg-black/40 border border-white/10 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-purple-500/40 transition-colors"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <img
                                  src={result.artwork}
                                  alt={result.title}
                                  className="w-12 h-12 rounded-lg object-cover shrink-0 border border-white/10"
                                />
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <h4 className="font-semibold text-[#f5e6d3] text-sm truncate">{result.title}</h4>
                                    <Badge className="text-[9px] px-1.5 py-0 border-none bg-purple-500/20 text-purple-300 shrink-0">
                                      {result.platform}
                                    </Badge>
                                  </div>
                                  <p className="text-xs text-[#f5e6d3]/60 truncate">
                                    {result.artist} • {result.genre} • {result.duration}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                                <Button
                                  onClick={() => handlePlayTrack({
                                    title: result.title,
                                    artist: result.artist,
                                    image: result.artwork,
                                    audioUrl: result.audioUrl
                                  })}
                                  size="sm"
                                  variant="ghost"
                                  className="text-cyan-300 hover:text-white hover:bg-cyan-500/20 gap-1 text-xs"
                                >
                                  <Play className="w-3.5 h-3.5 fill-current" /> Preview
                                </Button>

                                <a
                                  href={result.externalUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="p-2 text-white/40 hover:text-white transition-colors"
                                  title={`Open on ${result.platform}`}
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>

                                <Button
                                  onClick={() => handleImportTrack(result)}
                                  disabled={isImporting || isImported}
                                  size="sm"
                                  className={`text-xs gap-1.5 font-medium ${
                                    isImported 
                                      ? "bg-green-600/30 text-green-300 border border-green-500/40 cursor-default"
                                      : "bg-pink-600/20 text-pink-300 border border-pink-500/30 hover:bg-pink-600/30"
                                  }`}
                                >
                                  {isImporting ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : isImported ? (
                                    <Check className="w-3.5 h-3.5" />
                                  ) : (
                                    <Download className="w-3.5 h-3.5" />
                                  )}
                                  <span>{isImported ? "In DB" : "Import to DB"}</span>
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>

        </div>
      </main>

      {/* Stem Separator Studio Modal */}
      <StemSeparatorModal
        isOpen={isStemModalOpen}
        onClose={() => setIsStemModalOpen(false)}
        track={stemTrackTarget}
      />

      {/* Fixed Music Player Footer */}
      <MusicPlayer track={currentTrack} />
    </div>
  );
}
