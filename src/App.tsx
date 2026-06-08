import React, { useState, useRef, useCallback, useEffect } from 'react';
import type {
  LyricLine,
  BackgroundConfig,
  FontConfig,
  AnimationConfig,
  ParticleConfig,
} from './types';
import { useAudioPlayer } from './hooks/useAudioPlayer';
import PreviewCanvas from './components/PreviewCanvas';
import LyricEditor from './components/LyricEditor';
import StylePanel from './components/StylePanel';
import BackgroundPanel from './components/BackgroundPanel';
import Timeline from './components/Timeline';
import ImportModal from './components/ImportModal';
import ExportModal from './components/ExportModal';
import {
  Upload,
  Download,
  Music,
  Settings,
  Maximize2,
  Minimize2,
  LayoutTemplate,
  ChevronLeft,
  ChevronRight,
  Monitor,
  Smartphone,
  Square,
  Film,
  FolderOpen,
  Info,
  Wand2,
} from 'lucide-react';
import { SAMPLE_LYRICS } from './data/presets';

function formatTime(s: number) {
  const mins = Math.floor(s / 60);
  const secs = Math.floor(s % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default function App() {
  // Panel management
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [activeRightTab, setActiveRightTab] = useState<'style' | 'background'>('style');
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Modals
  const [importOpen, setImportOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  // Preview canvas ref for video export
  const previewRef = useRef<HTMLDivElement>(null);

  // Lyrics
  const [lyrics, setLyrics] = useState<LyricLine[]>([]);

  // Background
  const [background, setBackground] = useState<BackgroundConfig>({
    type: 'gradient',
    solidColor: '#0f172a',
    gradientStart: '#0f172a',
    gradientEnd: '#1e1b4b',
    gradientDirection: '135deg',
    imageUrl: '',
    animatedStyle: 'aurora',
    opacity: 0.3,
  });

  // Font
  const [font, setFont] = useState<FontConfig>({
    fontFamily: "'Inter', sans-serif",
    fontSize: 36,
    fontWeight: '700',
    textColor: '#ffffff',
    textShadow: true,
    textShadowColor: '#7c3aed',
    textStroke: false,
    textStrokeColor: '#000000',
    textStrokeWidth: 1,
    letterSpacing: 1,
    lineHeight: 1.4,
    textTransform: 'none',
  });

  // Animation
  const [animation, setAnimation] = useState<AnimationConfig>({
    style: 'fadeIn',
    duration: 0.8,
    easing: 'ease-out',
    activeLineGlow: true,
    glowColor: '#a855f7',
    glowIntensity: 0.5,
    staggerDelay: 0.1,
    direction: 'bottom',
  });

  // Particles
  const [particles, setParticles] = useState<ParticleConfig>({
    enabled: true,
    type: 'notes',
    count: 20,
    color: '#a855f7',
    speed: 1.5,
    size: 16,
  });

  // Canvas ratio
  const [canvasRatio, setCanvasRatio] = useState<'16:9' | '9:16' | '1:1' | '4:3'>('16:9');

  // Playback
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const maxTimeRef = useRef(120);

  useEffect(() => {
    maxTimeRef.current = lyrics.length > 0 ? lyrics[lyrics.length - 1].endTime : 120;
  }, [lyrics]);

  const maxTime = lyrics.length > 0 ? lyrics[lyrics.length - 1].endTime : 120;

  // Audio player
  const audioPlayer = useAudioPlayer();
  const [hasAudio, setHasAudio] = useState(false);
  const [audioFileName, setAudioFileName] = useState('');

  // NOW Sync state — lives here so both Timeline & LyricEditor share it
  const [syncActive, setSyncActive] = useState(false);
  const [syncIndex, setSyncIndex] = useState(0);

  const handleSyncToggle = useCallback(() => {
    if (syncActive) {
      // Turn off
      setSyncActive(false);
      setSyncIndex(0);
    } else {
      // Turn on from the beginning
      setSyncActive(true);
      setSyncIndex(0);
    }
  }, [syncActive]);

  const handleSyncNow = useCallback(() => {
    if (!syncActive || lyrics.length === 0) return;
    if (syncIndex >= lyrics.length) return;

    const now = Math.round(currentTime * 10) / 10;

    setLyrics(prev => {
      const updated = [...prev];
      // Set this line's start time
      updated[syncIndex] = { ...updated[syncIndex], startTime: now };

      // Close the previous line's end time to NOW
      if (syncIndex > 0) {
        updated[syncIndex - 1] = { ...updated[syncIndex - 1], endTime: now };
      }

      // If this is the last line, set its end time
      if (syncIndex === lyrics.length - 1) {
        updated[syncIndex] = { ...updated[syncIndex], startTime: now, endTime: now + 4 };
      }

      return updated;
    });

    const next = syncIndex + 1;
    setSyncIndex(next);

    // Auto-done
    if (next >= lyrics.length) {
      // We keep syncActive true so the "Done" message shows
    }
  }, [syncActive, syncIndex, lyrics.length, currentTime, setLyrics]);

  // Project name
  const [projectName, setProjectName] = useState('Untitled Project');

  // ─── Playback Control ───
  const startPlayback = useCallback(() => {
    if (lyrics.length === 0) return;
    if (timerRef.current) clearInterval(timerRef.current);
    setIsPlaying(true);
    timerRef.current = setInterval(() => {
      setCurrentTime(prev => {
        const mt = maxTimeRef.current;
        if (prev >= mt) {
          setIsPlaying(false);
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev + 0.05 * playbackRate;
      });
    }, 50);
  }, [lyrics.length, playbackRate]);

  const stopPlayback = useCallback(() => {
    setIsPlaying(false);
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  useEffect(() => {
    if (isPlaying && !hasAudio) {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setCurrentTime(prev => {
          const mt = maxTimeRef.current;
          if (prev >= mt) {
            setIsPlaying(false);
            if (timerRef.current) clearInterval(timerRef.current);
            return 0;
          }
          return prev + 0.05 * playbackRate;
        });
      }, 50);
    }
  }, [playbackRate, isPlaying, hasAudio]);

  const seek = useCallback((time: number) => {
    const clamped = Math.max(0, time);
    setCurrentTime(clamped);
    if (audioPlayer.audioRef.current) {
      audioPlayer.seek(clamped);
    }
  }, [audioPlayer]);

  const handlePlaybackRateChange = useCallback((rate: number) => {
    setPlaybackRate(rate);
    if (audioPlayer.audioRef.current) {
      audioPlayer.audioRef.current.playbackRate = rate;
    }
  }, [audioPlayer]);

  // ─── Import Handlers ───
  const handleImportLyrics = (importedLyrics: LyricLine[], _format: string) => {
    setLyrics(importedLyrics);
    setCurrentTime(0);
    // Turn off sync mode on fresh import
    setSyncActive(false);
    setSyncIndex(0);
  };

  const handleImportProject = (project: {
    projectName?: string;
    lyrics?: LyricLine[];
    background?: BackgroundConfig;
    font?: FontConfig;
    animation?: AnimationConfig;
    particles?: ParticleConfig;
    canvasRatio?: '16:9' | '9:16' | '1:1' | '4:3';
  }) => {
    if (project.lyrics) setLyrics(project.lyrics);
    if (project.background) setBackground(project.background);
    if (project.font) setFont(project.font);
    if (project.animation) setAnimation(project.animation);
    if (project.particles) setParticles(project.particles);
    if (project.projectName) setProjectName(project.projectName);
    if (project.canvasRatio) setCanvasRatio(project.canvasRatio);
    setCurrentTime(0);
  };

  const handleImportAudio = (file: File) => {
    audioPlayer.loadAudio(file);
    setHasAudio(true);
    setAudioFileName(file.name);
  };

  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImportAudio(file);
      if (lyrics.length === 0) loadSampleLyrics();
    }
  };

  const loadSampleLyrics = () => {
    const lines = SAMPLE_LYRICS.split('\n');
    const parsed: LyricLine[] = [];
    const timestampRegex = /\[(\d{2}):(\d{2})\.(\d{2})\]\s*(.*)/;
    let lastTime = 0;

    for (const line of lines) {
      const match = line.match(timestampRegex);
      if (match) {
        const minutes = parseInt(match[1]);
        const seconds = parseInt(match[2]);
        const cs = parseInt(match[3]);
        const time = minutes * 60 + seconds + cs / 100;
        lastTime = time;
        const text = match[4].trim();
        if (text) {
          parsed.push({ id: crypto.randomUUID(), text, startTime: time, endTime: time + 4, emphasis: false });
        }
      } else if (line.trim()) {
        parsed.push({ id: crypto.randomUUID(), text: line.trim(), startTime: lastTime, endTime: lastTime + 4 });
        lastTime += 4;
      }
    }

    for (let i = 0; i < parsed.length - 1; i++) parsed[i].endTime = parsed[i + 1].startTime;
    parsed[parsed.length - 1].endTime = parsed[parsed.length - 1].startTime + 4;
    setLyrics(parsed);
  };

  // Project data blob for export
  const projectData = { projectName, lyrics, background, font, animation, particles, canvasRatio };

  // ─── Global drag-and-drop ───
  const [globalDragOver, setGlobalDragOver] = useState(false);

  const handleGlobalDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setGlobalDragOver(false);
    const file = e.dataTransfer.files[0];
    if (!file) return;

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (['mp3', 'wav', 'ogg', 'aac', 'm4a', 'flac', 'webm'].includes(ext || '')) {
      handleImportAudio(file);
    } else if (['srt', 'lrc', 'json', 'txt'].includes(ext || '')) {
      // Auto-import: read and parse
      const reader = new FileReader();
      reader.onload = (ev) => {
        const content = ev.target?.result as string;
        try {
          if (ext === 'json') {
            const data = JSON.parse(content);
            if (data.projectName || (data.lyrics && typeof data.lyrics === 'object' && !Array.isArray(data.lyrics)) || (data.lyrics && (data.font || data.background || data.animation || data.particles))) {
              handleImportProject(data);
            } else if (Array.isArray(data)) {
              const validLyrics = data.filter((item: unknown) => typeof item === 'object' && item !== null && 'text' in item);
              if (validLyrics.length > 0) handleImportLyrics(validLyrics.map((item: Record<string, unknown>) => ({
                id: (item.id as string) || crypto.randomUUID(), text: String(item.text || ''),
                startTime: Number(item.startTime) || 0, endTime: Number(item.endTime) || (Number(item.startTime) || 0) + 4,
              })), 'json');
            } else if (data.lyrics && Array.isArray(data.lyrics)) {
              handleImportProject(data);
            }
          } else {
            // Parse SRT/LRC/TXT using simple inline detection
            let parsed: LyricLine[] = [];
            if (ext === 'srt' || /\d{2}:\d{2}:\d{2}[,.]\d{3}\s*-->/.test(content)) {
              const blocks = content.trim().split(/\n\s*\n/);
              const timeRegex = /(\d{2}):(\d{2}):(\d{2})[,.](\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})[,.](\d{3})/;
              for (const block of blocks) {
                const lines = block.trim().split('\n');
                let timeLine = '';
                let textLines: string[] = [];
                for (let i = 0; i < lines.length; i++) {
                  if (timeRegex.test(lines[i])) { timeLine = lines[i]; textLines = lines.slice(i + 1); break; }
                }
                const m = timeLine.match(timeRegex);
                if (m && textLines.length > 0) {
                  const st = parseInt(m[1])*3600+parseInt(m[2])*60+parseInt(m[3])+parseInt(m[4])/1000;
                  const et = parseInt(m[5])*3600+parseInt(m[6])*60+parseInt(m[7])+parseInt(m[8])/1000;
                  const txt = textLines.join(' ').replace(/<[^>]*>/g,'').trim();
                  if (txt) parsed.push({ id: crypto.randomUUID(), text: txt, startTime: Math.round(st*10)/10, endTime: Math.round(et*10)/10 });
                }
              }
            } else if (ext === 'lrc' || /\[\d{1,2}:\d{2}/.test(content)) {
              const lrcRegex = /\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]\s*(.*)/;
              for (const line of content.split('\n')) {
                const m = line.match(lrcRegex);
                if (m) {
                  const t = parseInt(m[1])*60+parseInt(m[2])+(m[3]?parseInt(m[3].padEnd(3,'0'))/1000:0);
                  const txt = m[4].trim();
                  if (txt) parsed.push({ id: crypto.randomUUID(), text: txt, startTime: Math.round(t*10)/10, endTime: Math.round((t+4)*10)/10 });
                }
              }
              for (let i=0;i<parsed.length-1;i++) parsed[i].endTime=parsed[i+1].startTime;
              if (parsed.length>0) parsed[parsed.length-1].endTime=parsed[parsed.length-1].startTime+4;
            } else {
              let t = 0;
              for (const line of content.split('\n').filter(l=>l.trim())) {
                parsed.push({ id: crypto.randomUUID(), text: line.trim(), startTime: t, endTime: t+4 });
                t += 4;
              }
            }
            if (parsed.length > 0) handleImportLyrics(parsed, ext || 'txt');
          }
        } catch { /* silently fail on parse error */ }
      };
      reader.readAsText(file);
    }
  };

  return (
    <div
      className={`h-screen flex flex-col bg-gray-950 text-white overflow-hidden ${globalDragOver ? 'ring-2 ring-inset ring-purple-500' : ''}`}
      onDragOver={e => { e.preventDefault(); setGlobalDragOver(true); }}
      onDragLeave={e => { if (e.currentTarget === e.target) setGlobalDragOver(false); }}
      onDrop={handleGlobalDrop}
    >
      {/* Global drop overlay */}
      {globalDragOver && (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center pointer-events-none">
          <div className="bg-gray-900 border-2 border-dashed border-purple-500 rounded-2xl p-12 text-center">
            <Upload className="w-12 h-12 text-purple-400 mx-auto mb-4" />
            <p className="text-xl font-semibold text-white mb-1">Drop file to import</p>
            <p className="text-sm text-gray-400">SRT, LRC, JSON, TXT, or Audio files</p>
          </div>
        </div>
      )}

      {/* Custom CSS */}
      <style>{`
        :root { --anim-dur: ${animation.duration}s; --anim-ease: ${animation.easing}; }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideInLeft {
          from { opacity: 0; transform: translateX(-40px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(40px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideInTop {
          from { opacity: 0; transform: translateY(-40px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideInBottom {
          from { opacity: 0; transform: translateY(40px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes bounceIn {
          0%   { opacity: 0; transform: translateY(-20px) scale(0.9); }
          55%  { transform: translateY(6px) scale(1.04); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes zoomIn {
          from { opacity: 0; transform: scale(0.5); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes rainDrop {
          from { opacity: 0; transform: translateY(-30px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes aurora {
          0%   { transform: translateX(-50%) rotate(0deg); }
          100% { transform: translateX(-30%) rotate(5deg); }
        }
        .animate-fadeIn   { animation: fadeIn   var(--anim-dur, 0.6s) var(--anim-ease, ease-out) forwards; }
        .animate-slideIn  {
          animation:
            ${ animation.direction === 'left'   ? 'slideInLeft' :
               animation.direction === 'right'  ? 'slideInRight' :
               animation.direction === 'top'    ? 'slideInTop' :
               animation.direction === 'bottom' ? 'slideInBottom' :
               'fadeIn' }
            var(--anim-dur, 0.6s) var(--anim-ease, ease-out) forwards;
        }
        .animate-bounceIn { animation: bounceIn var(--anim-dur, 0.6s) var(--anim-ease, ease-out) forwards; }
        .animate-zoomIn   { animation: zoomIn   var(--anim-dur, 0.6s) var(--anim-ease, ease-out) forwards; }
        .animate-rain     { animation: rainDrop var(--anim-dur, 0.6s) var(--anim-ease, ease-out) forwards; }
        .scrollbar-thin::-webkit-scrollbar { width: 4px; }
        .scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
        .scrollbar-thin::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
        input[type="range"] { height: 4px; }
        input[type="range"]::-webkit-slider-thumb {
          width: 14px; height: 14px; border-radius: 50%;
          background: #a855f7; cursor: pointer;
          border: 2px solid #fff;
          box-shadow: 0 0 8px rgba(168, 85, 247, 0.5);
        }
      `}</style>

      {/* ── Top Toolbar ── */}
      <header className="bg-gray-900/90 backdrop-blur-sm border-b border-white/10 px-4 py-2 flex items-center justify-between z-50 flex-shrink-0">
        {/* Left — Logo + Project */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center">
              <Music className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight">LyricViz Studio</h1>
              <p className="text-[10px] text-gray-500 -mt-0.5">Dynamic Lyric Visualizer</p>
            </div>
          </div>
          <div className="w-px h-6 bg-white/10" />
          <input
            value={projectName}
            onChange={e => setProjectName(e.target.value)}
            className="bg-transparent text-sm text-gray-300 focus:text-white focus:outline-none border-none px-2 py-1 rounded hover:bg-white/5 w-40"
          />
          {hasAudio && (
            <span className="text-[10px] bg-green-500/10 text-green-400 px-2 py-0.5 rounded-full flex items-center gap-1">
              <Music className="w-2.5 h-2.5" />
              {audioFileName.length > 20 ? audioFileName.slice(0, 18) + '...' : audioFileName}
            </span>
          )}
        </div>

        {/* Center — Aspect Ratio */}
        <div className="flex items-center gap-1.5">
          {([
            { ratio: '16:9' as const, icon: Monitor, label: '16:9 HD' },
            { ratio: '9:16' as const, icon: Smartphone, label: '9:16 Reels' },
            { ratio: '1:1' as const, icon: Square, label: '1:1 Square' },
            { ratio: '4:3' as const, icon: Film, label: '4:3 Standard' },
          ]).map(({ ratio, icon: Icon, label }) => (
            <button
              key={ratio}
              onClick={() => setCanvasRatio(ratio)}
              className={`p-1.5 rounded-md transition-colors ${canvasRatio === ratio ? 'bg-purple-600/30 text-purple-400' : 'text-gray-500 hover:text-gray-300'}`}
              title={label}
            >
              <Icon className="w-4 h-4" />
            </button>
          ))}
        </div>

        {/* Right — Actions */}
        <div className="flex items-center gap-1.5">
          <button onClick={loadSampleLyrics}
            className="px-3 py-1.5 rounded-md bg-purple-600/20 text-purple-400 hover:bg-purple-600/30 text-xs flex items-center gap-1.5 transition-colors" title="Load sample lyrics">
            <Wand2 className="w-3.5 h-3.5" /> Demo
          </button>

          {/* Import button */}
          <button onClick={() => setImportOpen(true)}
            className="px-3 py-1.5 rounded-md bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white text-xs flex items-center gap-1.5 transition-colors" title="Import lyrics, project, or audio">
            <FolderOpen className="w-3.5 h-3.5" /> Import
          </button>

          {/* Quick audio upload */}
          <label className="px-3 py-1.5 rounded-md bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white text-xs flex items-center gap-1.5 transition-colors cursor-pointer" title="Quick audio upload">
            <Upload className="w-3.5 h-3.5" /> Audio
            <input type="file" accept="audio/*" onChange={handleAudioUpload} className="hidden" />
          </label>

          {/* Export button */}
          <button onClick={() => setExportOpen(true)}
            className="px-3 py-1.5 rounded-md bg-purple-600 hover:bg-purple-500 text-white text-xs flex items-center gap-1.5 transition-colors font-medium shadow-lg shadow-purple-500/20" title="Export video, lyrics, or project">
            <Download className="w-3.5 h-3.5" /> Export
          </button>

          <div className="w-px h-6 bg-white/10 mx-1" />

          <button onClick={() => setLeftPanelOpen(!leftPanelOpen)}
            className={`p-1.5 rounded-md transition-colors ${leftPanelOpen ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'}`} title="Toggle Lyric Editor">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={() => setRightPanelOpen(!rightPanelOpen)}
            className={`p-1.5 rounded-md transition-colors ${rightPanelOpen ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'}`} title="Toggle Style Panel">
            <ChevronRight className="w-4 h-4" />
          </button>
          <button onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 rounded-md hover:bg-white/10 text-gray-400 hover:text-white transition-colors" title="Fullscreen">
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* ── Main Content ── */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel — Lyric Editor */}
        {leftPanelOpen && (
          <div className="w-80 lg:w-96 flex-shrink-0 border-r border-white/10 overflow-hidden">
            <LyricEditor
              lyrics={lyrics}
              setLyrics={setLyrics}
              currentTime={currentTime}
              onSeek={seek}
              isPlaying={isPlaying}
              syncActive={syncActive}
              syncIndex={syncIndex}
            />
          </div>
        )}

        {/* Center — Preview Canvas */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 flex items-center justify-center p-4 bg-gray-950 overflow-hidden">
            {lyrics.length > 0 ? (
              <div ref={previewRef} className={`w-full max-w-4xl ${isFullscreen ? 'max-w-none' : ''}`}>
                <PreviewCanvas
                  lyrics={lyrics}
                  currentTime={currentTime}
                  background={background}
                  font={font}
                  animation={animation}
                  particles={particles}
                  canvasRatio={canvasRatio}
                  onSeek={seek}
                />
                <div className="mt-2 flex items-center justify-center gap-4 text-xs text-gray-500">
                  <span>{lyrics.length} lines</span>
                  <span>•</span>
                  <span>{formatTime(currentTime)} / {formatTime(maxTime)}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <span className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-green-500 animate-pulse' : 'bg-gray-600'}`} />
                    {isPlaying ? `Playing${playbackRate !== 1 ? ` (${playbackRate}x)` : ''}` : 'Stopped'}
                  </span>
                  {hasAudio && (
                    <>
                      <span>•</span>
                      <span className="text-green-400 flex items-center gap-1">
                        <Music className="w-3 h-3" /> Synced
                      </span>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center">
                <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-purple-600/20 to-pink-600/20 flex items-center justify-center mx-auto mb-5 border border-purple-500/20">
                  <Music className="w-10 h-10 text-purple-500/60" />
                </div>
                <h2 className="text-2xl font-bold text-gray-300 mb-2">Welcome to LyricViz Studio</h2>
                <p className="text-sm text-gray-600 mb-6 max-w-sm mx-auto">
                  Create stunning lyric videos. Load lyrics, sync with audio, customize visuals, and export.
                </p>
                <div className="flex gap-3 justify-center flex-wrap">
                  <button onClick={loadSampleLyrics}
                    className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-sm rounded-lg flex items-center gap-2 transition-colors font-medium shadow-lg shadow-purple-500/20">
                    <Wand2 className="w-4 h-4" /> Try Demo Lyrics
                  </button>
                  <button onClick={() => setImportOpen(true)}
                    className="px-5 py-2.5 bg-white/10 hover:bg-white/15 text-gray-300 text-sm rounded-lg flex items-center gap-2 transition-colors">
                    <FolderOpen className="w-4 h-4" /> Import File
                  </button>
                  <label className="px-5 py-2.5 bg-white/10 hover:bg-white/15 text-gray-300 text-sm rounded-lg flex items-center gap-2 transition-colors cursor-pointer">
                    <Upload className="w-4 h-4" /> Upload Audio
                    <input type="file" accept="audio/*" onChange={handleAudioUpload} className="hidden" />
                  </label>
                </div>
                <div className="mt-8 grid grid-cols-3 gap-4 max-w-md mx-auto">
                  {[
                    { icon: '📄', label: 'Import LRC / SRT / JSON', desc: 'Load timestamped lyrics' },
                    { icon: '🎵', label: 'Sync with Audio', desc: 'Tap sync or manual timing' },
                    { icon: '🎬', label: 'Export Video', desc: 'WebM in any aspect ratio' },
                  ].map(item => (
                    <div key={item.label} className="text-center p-3 rounded-lg bg-white/[0.02] border border-white/5">
                      <div className="text-2xl mb-1.5">{item.icon}</div>
                      <div className="text-[11px] font-medium text-gray-400">{item.label}</div>
                      <div className="text-[9px] text-gray-600 mt-0.5">{item.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Timeline ── */}
          <Timeline
            lyrics={lyrics}
            currentTime={currentTime}
            duration={hasAudio ? audioPlayer.duration : maxTime}
            isPlaying={isPlaying}
            playbackRate={playbackRate}
            onPlaybackRateChange={handlePlaybackRateChange}
            onPlay={() => {
              if (hasAudio) {
                audioPlayer.play();
                setIsPlaying(true);
                timerRef.current = setInterval(() => {
                  if (audioPlayer.audioRef.current) {
                    setCurrentTime(audioPlayer.audioRef.current.currentTime);
                  }
                }, 50);
              } else {
                startPlayback();
              }
            }}
            onPause={() => {
              if (hasAudio) audioPlayer.pause();
              stopPlayback();
            }}
            onSeek={seek}
            onReset={() => {
              seek(0);
              stopPlayback();
              if (hasAudio) audioPlayer.seek(0);
            }}
            volume={hasAudio ? audioPlayer.volume : 0.8}
            onVolumeChange={v => { if (hasAudio) audioPlayer.setVolume(v); }}
            hasAudio={hasAudio}
            syncActive={syncActive}
            syncIndex={syncIndex}
            onSyncToggle={handleSyncToggle}
            onSyncNow={handleSyncNow}
          />
        </div>

        {/* Right Panel — Style & Background */}
        {rightPanelOpen && (
          <div className="w-72 lg:w-80 flex-shrink-0 border-l border-white/10 overflow-hidden">
            <div className="flex border-b border-white/10">
              <button onClick={() => setActiveRightTab('style')}
                className={`flex-1 px-4 py-2.5 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${
                  activeRightTab === 'style' ? 'text-white border-b-2 border-purple-500 bg-white/5' : 'text-gray-500 hover:text-gray-300'
                }`}>
                <Settings className="w-3.5 h-3.5" /> Style
              </button>
              <button onClick={() => setActiveRightTab('background')}
                className={`flex-1 px-4 py-2.5 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${
                  activeRightTab === 'background' ? 'text-white border-b-2 border-purple-500 bg-white/5' : 'text-gray-500 hover:text-gray-300'
                }`}>
                <LayoutTemplate className="w-3.5 h-3.5" /> Visuals
              </button>
            </div>
            {activeRightTab === 'style' && (
              <StylePanel font={font} setFont={setFont} animation={animation} setAnimation={setAnimation} />
            )}
            {activeRightTab === 'background' && (
              <BackgroundPanel background={background} setBackground={setBackground} particles={particles} setParticles={setParticles} />
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="bg-gray-900/50 border-t border-white/5 px-4 py-1.5 flex items-center justify-between text-[10px] text-gray-600 flex-shrink-0">
        <span>LyricViz Studio — Real-time lyric video creation</span>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <Info className="w-3 h-3" />
            Import: LRC, SRT, JSON, TXT • Export: WebM Video, LRC, SRT, ASS, JSON
          </span>
        </div>
      </footer>

      {/* ── Modals ── */}
      <ImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImportLyrics={handleImportLyrics}
        onImportProject={handleImportProject}
        onImportAudio={handleImportAudio}
      />

      <ExportModal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        lyrics={lyrics}
        projectName={projectName}
        canvasRef={previewRef}
        projectData={projectData}
        currentTime={currentTime}
        onSeek={seek}
        onPlay={() => {
          if (hasAudio) { audioPlayer.play(); setIsPlaying(true); }
          else startPlayback();
        }}
        onPause={() => {
          if (hasAudio) audioPlayer.pause();
          stopPlayback();
        }}
        isPlaying={isPlaying}
        background={background}
        font={font}
      />
    </div>
  );
}
