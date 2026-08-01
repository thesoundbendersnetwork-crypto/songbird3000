"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Music,
  Check,
  Sparkles,
  Database,
  Zap,
  Crown,
  ArrowRight,
  Play,
  Wand2,
  Cloud,
  Download,
  Lock,
  X,
  Home as HomeIcon,
  Terminal,
  Code2,
} from "lucide-react";

export default function Home() {
  const [email, setEmail] = useState("");
  const [showLogin, setShowLogin] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    const auth = localStorage.getItem("songbird_auth");
    if (auth === "Pp9najecsr" || auth === "PP9NJECSR") {
      window.location.href = "/create?plan=premium";
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if ((username === "Pp9najecsr" && password === "Pp9najecsr") || 
        (username === "PP9NJECSR" && password === "PP9NJECSR")) {
      localStorage.setItem("songbird_auth", "Pp9najecsr");
      window.location.href = "/create?plan=premium";
    } else {
      alert("Invalid credentials. Use Pp9najecsr for both fields.");
    }
  };

  const handleFreeTrial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      alert("Please enter your email address");
      return;
    }
    window.location.href = `/create?email=${encodeURIComponent(email)}&plan=free`;
  };

  const handleSubscribe = (plan: string) => {
    window.location.href = `/create?plan=${plan}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A0420] via-[#1A0E2E] to-[#0A0420] relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 opacity-40">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-br from-pink-500/30 to-purple-600/30 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '4s' }} />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-gradient-to-br from-cyan-500/30 to-purple-500/30 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '6s', animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-cyan-500/10 rounded-full blur-3xl" />
      </div>

      <div className="grain-overlay" />

      {/* Header */}
      <header className="relative z-10 border-b border-[#f5e6d3]/10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-pink-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm shadow-lg">
              S
            </div>
            <span className="text-xl font-semibold text-[#f5e6d3] tracking-tight">
              Songbird AI
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/create">
              <Button variant="outline" size="sm" className="gap-2 border-purple-500/30 text-purple-300 hover:bg-purple-500/20">
                <Wand2 className="w-4 h-4 text-purple-400" />
                <span>Studio</span>
              </Button>
            </Link>
            <Dialog open={showLogin} onOpenChange={setShowLogin}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-gradient-to-r from-pink-500 to-purple-600 text-white">
                  <Lock className="w-3.5 h-3.5 mr-1.5" />
                  Sign In
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-[#1A0E2E] border-white/10">
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold text-center text-[#f5e6d3]">Sign In to Songbird</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleLogin} className="space-y-4 mt-4">
                  <div>
                    <label className="text-xs text-[#f5e6d3]/60 mb-1 block">Username / Passcode</label>
                    <Input
                      type="text"
                      placeholder="Username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="bg-black/30 border-white/10 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[#f5e6d3]/60 mb-1 block">Password</label>
                    <Input
                      type="password"
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="bg-black/30 border-white/10 text-white"
                    />
                  </div>
                  <Button type="submit" className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white">
                    Unlock Studio
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 max-w-5xl mx-auto px-6 pt-20 pb-16 text-center">
        <Badge className="mb-6 py-1.5 px-4 bg-purple-500/10 border-purple-500/30 text-purple-300 text-xs tracking-wider uppercase">
          <Sparkles className="w-3.5 h-3.5 mr-1.5 text-pink-400 inline" />
          AI Music Studio & Suno API Hub
        </Badge>

        <h1 className="text-4xl md:text-6xl font-extrabold text-[#f5e6d3] tracking-tight mb-6 leading-tight">
          Create AI Music & Integrate <br className="hidden md:inline" />
          <span className="bg-gradient-to-r from-pink-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
            Suno API Endpoints
          </span>
        </h1>

        <p className="text-lg md:text-xl text-[#f5e6d3]/70 max-w-2xl mx-auto mb-10 leading-relaxed">
          Generate complete songs, vocals, and lyrics from simple prompts. Keep sessions alive with integrated Suno API token management.
        </p>

        <form onSubmit={handleFreeTrial} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto mb-16">
          <Input
            type="email"
            placeholder="Enter your email for free trial..."
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="bg-black/40 border-white/20 text-[#f5e6d3] placeholder:text-[#f5e6d3]/40 h-12 rounded-xl"
          />
          <Button type="submit" className="h-12 px-6 bg-gradient-to-r from-pink-500 to-purple-600 text-white font-semibold rounded-xl shrink-0">
            Start Free <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </form>

        {/* Feature Cards Grid */}
        <div className="grid md:grid-cols-3 gap-6 text-left mb-16">
          <div className="glass-card p-6 rounded-2xl border border-white/10 hover:border-pink-500/30 transition-all">
            <div className="w-10 h-10 rounded-xl bg-pink-500/20 flex items-center justify-center text-pink-400 mb-4">
              <Music className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-[#f5e6d3] mb-2">Music Generation</h3>
            <p className="text-sm text-[#f5e6d3]/60">Custom mode & description mode. Generate full audio tracks with lyrics, genre, and BPM metadata.</p>
          </div>

          <div className="glass-card p-6 rounded-2xl border border-white/10 hover:border-purple-500/30 transition-all">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-400 mb-4">
              <Code2 className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-[#f5e6d3] mb-2">Unofficial Suno API</h3>
            <p className="text-sm text-[#f5e6d3]/60">Built-in Python FastAPI back-end & Next.js proxy endpoints for generate, feed, lyrics, and credits.</p>
          </div>

          <div className="glass-card p-6 rounded-2xl border border-white/10 hover:border-cyan-500/30 transition-all">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center text-cyan-400 mb-4">
              <Database className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-[#f5e6d3] mb-2">Audio Library & Storage</h3>
            <p className="text-sm text-[#f5e6d3]/60">Save generated audio locally or in the cloud. Export metadata and analyze audio waveforms.</p>
          </div>
        </div>

        {/* API Docs Callout */}
        <div className="glass-card p-8 rounded-3xl border border-purple-500/20 text-left flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 uppercase tracking-widest mb-2">
              <Terminal className="w-4 h-4" /> API Endpoint Reference
            </div>
            <h3 className="text-xl font-bold text-[#f5e6d3] mb-1">Endpoints Ready</h3>
            <p className="text-sm text-[#f5e6d3]/60">POST /generate, POST /generate/description-mode, GET /feed/[aid], POST /generate/lyrics, GET /get_credits</p>
          </div>
          <Link href="/create">
            <Button size="lg" className="bg-gradient-to-r from-purple-500 to-pink-600 text-white shrink-0">
              Launch Studio Interface <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-[#f5e6d3]/10 py-8 px-6 text-center text-xs text-[#f5e6d3]/40">
        <p>© 2026 Songbird AI & Suno API. All rights reserved.</p>
      </footer>
    </div>
  );
}
