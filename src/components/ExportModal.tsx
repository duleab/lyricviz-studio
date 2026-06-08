import React, { useState, useRef } from 'react';
import type { LyricLine, BackgroundConfig, FontConfig } from '../types';
import { FFmpeg } from '@ffmpeg/ffmpeg';

import {
  X, Download, Film, FileText, FileJson, Video, Loader2,
  Monitor, Smartphone, Square, Check, AlertCircle, Copy,
  History, Database, HardDrive, Zap, Info,
} from 'lucide-react';

interface ExportModalProps {
  open: boolean;
  onClose: () => void;
  lyrics: LyricLine[];
  projectName: string;
  canvasRef: React.RefObject<HTMLDivElement | null>;
  projectData: Record<string, unknown>;
  currentTime: number;
  onSeek: (time: number) => void;
  onPlay: () => void;
  onPause: () => void;
  isPlaying: boolean;
  background: BackgroundConfig;
  font: FontConfig;
}

type ExportTab = 'video' | 'lyrics' | 'project';

function fmtTimeLRC(s: number): string {
  const mins = Math.floor(s / 60);
  const secs = Math.floor(s % 60);
  const ms = Math.floor((s % 1) * 100);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
}

function fmtTimeSRT(s: number): string {
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = Math.floor(s % 60);
  const ms = Math.floor((s % 1) * 1000);
  return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
}

function fmtDur(s: number): string {
  const m = Math.floor(s / 60); const sc = Math.floor(s % 60);
  return `${m}:${sc.toString().padStart(2, '0')}`;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const c = hex.replace('#', '');
  const num = parseInt(c.length === 3 ? c.split('').map(x => x + x).join('') : c, 16);
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

// ─── Draw a single frame to a canvas context ───────────────────────────────
function drawFrame(
  ctx: CanvasRenderingContext2D,
  frameTime: number,
  lyrics: LyricLine[],
  bgRgb: { r: number; g: number; b: number },
  bgRgb2: { r: number; g: number; b: number },
  textColor: string,
  fontFamily: string,
  baseFontSize: number,
  lineGap: number,
  res: { w: number; h: number },
) {
  // Background
  const grad = ctx.createLinearGradient(0, 0, res.w, res.h);
  grad.addColorStop(0, `rgb(${bgRgb.r},${bgRgb.g},${bgRgb.b})`);
  grad.addColorStop(1, `rgb(${bgRgb2.r},${bgRgb2.g},${bgRgb2.b})`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, res.w, res.h);

  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(0, 0, res.w, res.h);

  // Active line
  const activeIdx = lyrics.findIndex(
    (line, i) => frameTime >= line.startTime && frameTime < (lyrics[i + 1]?.startTime ?? line.endTime)
  );

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const centerY = res.h / 2;
  const range = 4;
  const startIdx = Math.max(0, (activeIdx >= 0 ? activeIdx : 0) - range);
  const endIdx = Math.min(lyrics.length - 1, (activeIdx >= 0 ? activeIdx : 0) + range);

  for (let i = startIdx; i <= endIdx; i++) {
    const line = lyrics[i];
    const isActive = i === activeIdx;
    const dist = activeIdx >= 0 ? Math.abs(i - activeIdx) : 999;
    const offset = activeIdx >= 0 ? i - activeIdx : 0;

    const y = centerY + offset * lineGap;
    const opacity = isActive ? 1 : dist === 1 ? 0.35 : dist === 2 ? 0.15 : 0.06;
    const fontSize = isActive ? baseFontSize : Math.round(baseFontSize * Math.max(0.5, 0.7 - dist * 0.06));

    ctx.font = `${isActive ? 'bold' : 'normal'} ${fontSize}px ${fontFamily}`;
    ctx.globalAlpha = opacity;

    if (isActive) {
      ctx.shadowColor = 'rgba(0,0,0,0.6)';
      ctx.shadowBlur = 12;
      ctx.shadowOffsetY = 3;
    } else {
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;
    }

    if (isActive) {
      const elapsed = frameTime - line.startTime;
      const dur = line.endTime - line.startTime;
      const progress = dur > 0 ? Math.max(0, Math.min(1, elapsed / dur)) : 1;
      const textWidth = ctx.measureText(line.text).width;
      const textX = res.w / 2 - textWidth / 2;

      ctx.fillStyle = textColor + '40';
      ctx.fillText(line.text, res.w / 2, y);

      ctx.save();
      ctx.beginPath();
      ctx.rect(textX, y - fontSize, textWidth * progress, fontSize * 2);
      ctx.clip();
      ctx.fillStyle = textColor;
      ctx.fillText(line.text, res.w / 2, y);
      ctx.restore();
    } else {
      ctx.fillStyle = textColor;
      ctx.fillText(line.text, res.w / 2, y);
    }
  }

  ctx.globalAlpha = 1;
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  // Vignette
  const vigH = res.h * 0.25;
  const topVig = ctx.createLinearGradient(0, 0, 0, vigH);
  topVig.addColorStop(0, 'rgba(0,0,0,0.7)');
  topVig.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = topVig;
  ctx.fillRect(0, 0, res.w, vigH);

  const botVig = ctx.createLinearGradient(0, res.h - vigH, 0, res.h);
  botVig.addColorStop(0, 'rgba(0,0,0,0)');
  botVig.addColorStop(1, 'rgba(0,0,0,0.7)');
  ctx.fillStyle = botVig;
  ctx.fillRect(0, res.h - vigH, res.w, vigH);
}

// ─── Cached FFmpeg instance (survives across exports in the same session) ────
let ffmpegInstance: FFmpeg | null = null;
let ffmpegLoadPromise: Promise<FFmpeg> | null = null;

async function getFFmpeg(onLog: (msg: string) => void): Promise<FFmpeg> {
  if (ffmpegInstance) return ffmpegInstance;
  if (ffmpegLoadPromise) return ffmpegLoadPromise;

  ffmpegLoadPromise = (async () => {
    const ff = new FFmpeg();
    ff.on('log', ({ message }) => onLog(message));

    // Load from local /public/ffmpeg/ — no CDN, no CORS, works offline
    // Files copied from node_modules/@ffmpeg/core/dist/esm/ at install time
    const base = `${window.location.origin}/ffmpeg`;
    await ff.load({
      coreURL: `${base}/ffmpeg-core.js`,
      wasmURL: `${base}/ffmpeg-core.wasm`,
    });

    ffmpegInstance = ff;
    ffmpegLoadPromise = null;
    return ff;
  })();

  return ffmpegLoadPromise;
}

export default function ExportModal({
  open, onClose, lyrics, projectName, projectData, onSeek, onPause, background, font,
}: ExportModalProps) {
  const [tab, setTab] = useState<ExportTab>('video');
  const [exportStatus, setExportStatus] = useState<{ type: 'success' | 'error' | 'recording'; msg: string } | null>(null);

  // Video settings
  const [videoRatio, setVideoRatio] = useState<'16:9' | '9:16' | '1:1' | '4:3'>('16:9');
  const [videoQuality, setVideoQuality] = useState<'high' | 'medium' | 'low'>('high');
  const [videoFps, setVideoFps] = useState(30);

  // Export state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingProgress, setRecordingProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState('');
  const [ffmpegReady, setFfmpegReady] = useState(!!ffmpegInstance);
  const [ffmpegLoading, setFfmpegLoading] = useState(false);
  const isRecordingRef = useRef(false);

  // Lyrics
  const [lyricFormat, setLyricFormat] = useState<'lrc' | 'srt' | 'txt' | 'ass'>('lrc');
  const [copied, setCopied] = useState(false);
  const [projectCopied, setProjectCopied] = useState(false);

  // Project versions
  const [savedVersions, setSavedVersions] = useState<{ name: string; date: string; size: string }[]>(() => {
    try {
      const keys = Object.keys(localStorage).filter(k => k.startsWith('lyricviz_'));
      return keys.map(k => {
        const data = localStorage.getItem(k) || '';
        return { name: k.replace('lyricviz_', ''), date: new Date(JSON.parse(data)._savedAt || 0).toLocaleString(), size: `${(data.length / 1024).toFixed(1)} KB` };
      }).sort((a, b) => b.date.localeCompare(a.date));
    } catch { return []; }
  });

  if (!open) return null;

  // Resolution
  const getRes = () => {
    const q = { high: 1, medium: 0.75, low: 0.5 }[videoQuality];
    const r: Record<string, { w: number; h: number }> = {
      '16:9': { w: 1920, h: 1080 }, '9:16': { w: 1080, h: 1920 },
      '1:1': { w: 1080, h: 1080 }, '4:3': { w: 1440, h: 1080 },
    };
    const base = r[videoRatio];
    return { w: Math.round(base.w * q), h: Math.round(base.h * q) };
  };
  const res = getRes();

  const maxTime = lyrics.length > 0 ? lyrics[lyrics.length - 1].endTime : 0;
  const totalFrames = Math.ceil((maxTime + 0.5) / (1 / videoFps));

  // Memory estimate for current settings
  const jpegKBPerFrame = Math.round((res.w * res.h * 3) / (1024 * 10)); // rough estimate ~10:1 JPEG compression
  const estimatedMB = Math.round((totalFrames * jpegKBPerFrame) / 1024);

  // ════════════════════════════════════════════════════════════════
  // FAST EXPORT — ffmpeg.wasm (renders all frames then H.264 encode)
  // ════════════════════════════════════════════════════════════════
  const startFastExport = async () => {
    if (lyrics.length === 0) {
      setExportStatus({ type: 'error', msg: 'No lyrics to export.' });
      return;
    }

    try {
      setIsRecording(true);
      isRecordingRef.current = true;
      setRecordingProgress(0);
      setProgressLabel('Loading FFmpeg engine...');
      setExportStatus({ type: 'recording', msg: 'Initializing FFmpeg engine (~25 MB one-time download)...' });
      onPause();
      onSeek(0);

      // ── Load ffmpeg (cached after first use) ──
      setFfmpegLoading(!ffmpegInstance);
      const ff = await getFFmpeg((msg) => {
        if (msg.includes('frame=')) setProgressLabel(msg);
      });
      setFfmpegLoading(false);
      setFfmpegReady(true);

      if (!isRecordingRef.current) { setIsRecording(false); setExportStatus(null); return; }

      // ── Setup canvas ──
      const canvas = document.createElement('canvas');
      canvas.width  = res.w;
      canvas.height = res.h;
      const ctx = canvas.getContext('2d')!;

      const duration      = maxTime + 0.5;
      const frameIntervalSec = 1 / videoFps;
      const totalFr       = Math.ceil(duration / frameIntervalSec);

      const bgRgb      = hexToRgb(background.gradientStart || background.solidColor || '#0f172a');
      const bgRgb2     = hexToRgb(background.gradientEnd   || background.solidColor || '#1e1b4b');
      const textColor  = font.textColor  || '#ffffff';
      const fontFamily = (font.fontFamily?.replace(/'/g, '') || 'Inter, sans-serif');
      const baseFontSize = Math.round(res.h / 14);
      const lineGap      = Math.round(baseFontSize * 2.2);

      // ── PHASE 1: Render frames (0 → 70%) ──
      setProgressLabel(`Rendering ${totalFr} frames at ${res.w}×${res.h}…`);
      setExportStatus({ type: 'recording', msg: `Phase 1/2 — Rendering frames…` });

      for (let i = 0; i < totalFr; i++) {
        if (!isRecordingRef.current) {
          setIsRecording(false);
          setExportStatus(null);
          return;
        }

        const t = i * frameIntervalSec;
        drawFrame(ctx, t, lyrics, bgRgb, bgRgb2, textColor, fontFamily, baseFontSize, lineGap, res);

        // toBlob is async — much more efficient than toDataURL
        const blob = await new Promise<Blob>(resolve =>
          canvas.toBlob(b => resolve(b!), 'image/jpeg', videoQuality === 'high' ? 0.92 : videoQuality === 'medium' ? 0.85 : 0.75)
        );
        const buf = new Uint8Array(await blob.arrayBuffer());
        await ff.writeFile(`f${String(i).padStart(6, '0')}.jpg`, buf);

        // Update progress (phase 1 = 0-70%), yield every 20 frames to keep UI alive
        setRecordingProgress(Math.round((i / totalFr) * 70));
        onSeek(t);
        if (i % 20 === 0) await new Promise(r => setTimeout(r, 0));
      }

      if (!isRecordingRef.current) { setIsRecording(false); setExportStatus(null); return; }

      // ── PHASE 2: Encode with libx264 (70 → 100%) ──
      setProgressLabel('Encoding H.264 MP4…');
      setExportStatus({ type: 'recording', msg: 'Phase 2/2 — Encoding with H.264 (libx264)…' });
      setRecordingProgress(70);

      ff.on('progress', ({ progress }) => {
        setRecordingProgress(70 + Math.round(Math.min(progress, 1) * 28));
      });

      const crf = videoQuality === 'high' ? '18' : videoQuality === 'medium' ? '23' : '28';
      await ff.exec([
        '-framerate', String(videoFps),
        '-i', 'f%06d.jpg',
        '-c:v', 'libx264',
        '-pix_fmt', 'yuv420p',
        '-crf', crf,
        '-preset', 'fast',
        '-movflags', '+faststart',
        'output.mp4',
      ]);

      // ── PHASE 3: Download ──
      setRecordingProgress(99);
      setProgressLabel('Packaging MP4…');

      const data = await ff.readFile('output.mp4') as Uint8Array;
      // Copy into a fresh Uint8Array to ensure we have a plain ArrayBuffer (not SharedArrayBuffer)
      const plainBuf = new Uint8Array(data).buffer as ArrayBuffer;
      const outputBlob = new Blob([plainBuf], { type: 'video/mp4' });

      // Cleanup ffmpeg virtual FS
      for (let i = 0; i < totalFr; i++) {
        try { await ff.deleteFile(`f${String(i).padStart(6, '0')}.jpg`); } catch { /* ignore */ }
      }
      try { await ff.deleteFile('output.mp4'); } catch { /* ignore */ }

      const url = URL.createObjectURL(outputBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${projectName.replace(/\s+/g, '_')}_${videoRatio.replace(':', 'x')}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 2000);

      setIsRecording(false);
      setRecordingProgress(100);
      setProgressLabel('');
      const sizeMB = (outputBlob.size / (1024 * 1024)).toFixed(1);
      setExportStatus({
        type: 'success',
        msg: `✅ MP4 exported! ${sizeMB} MB • ${res.w}×${res.h} • ${videoFps}fps • ${fmtDur(duration)} • H.264`,
      });

    } catch (err) {
      setIsRecording(false);
      setFfmpegLoading(false);
      setProgressLabel('');
      setExportStatus({
        type: 'error',
        msg: `Export failed: ${err instanceof Error ? err.message : String(err)}. Check console for details.`,
      });
    }
  };

  const cancelExport = () => {
    isRecordingRef.current = false;
    setIsRecording(false);
    setRecordingProgress(0);
    setProgressLabel('');
    setExportStatus(null);
  };

  // ─── Lyrics ───
  const generateLyricText = (): string => {
    const sorted = [...lyrics].sort((a, b) => a.startTime - b.startTime);
    switch (lyricFormat) {
      case 'lrc': return sorted.map(l => `[${fmtTimeLRC(l.startTime)}]${l.text}`).join('\n');
      case 'srt': return sorted.map((l, i) => `${i+1}\n${fmtTimeSRT(l.startTime)} --> ${fmtTimeSRT(l.endTime)}\n${l.text}`).join('\n\n');
      case 'txt': return sorted.map(l => l.text).join('\n');
      case 'ass': {
        const header = `[Script Info]\nTitle: ${projectName}\nScriptType: v4.00+\nPlayResX: 1920\nPlayResY: 1080\n\n[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\nStyle: Default,Arial,72,&H00FFFFFF,&H000000FF,&H00000000,&H64000000,-1,0,0,0,100,100,0,0,1,3,1,2,40,40,60,1\n\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text`;
        const fmtASS = (s: number) => { const h=Math.floor(s/3600); const m=Math.floor((s%3600)/60); const sc=Math.floor(s%60); const cs=Math.floor((s%1)*100); return `${h}:${m.toString().padStart(2,'0')}:${sc.toString().padStart(2,'0')}.${cs.toString().padStart(2,'0')}`; };
        return `${header}\n${sorted.map(l => `Dialogue: 0,${fmtASS(l.startTime)},${fmtASS(l.endTime)},Default,,0,0,0,,${l.text}`).join('\n')}`;
      }
      default: return sorted.map(l => l.text).join('\n');
    }
  };

  const downloadLyrics = () => {
    const content = generateLyricText();
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `${projectName.replace(/\s+/g, '_')}.${lyricFormat}`;
    a.click(); URL.revokeObjectURL(url);
    setExportStatus({ type: 'success', msg: `✅ Exported as .${lyricFormat.toUpperCase()}` });
  };

  const copyLyricsClipboard = () => {
    navigator.clipboard.writeText(generateLyricText()).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  // ─── Project ───
  const downloadProject = () => {
    const data = { ...projectData, _version: Date.now(), _exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `${projectName.replace(/\s+/g, '_')}_v${Date.now()}.json`;
    a.click(); URL.revokeObjectURL(url);
    setExportStatus({ type: 'success', msg: '✅ Project file downloaded!' });
  };

  const copyProjectClipboard = () => {
    const data = { ...projectData, _version: Date.now() };
    navigator.clipboard.writeText(JSON.stringify(data, null, 2)).then(() => {
      setProjectCopied(true); setTimeout(() => setProjectCopied(false), 2000);
    });
  };

  const saveToLocalStorage = () => {
    try {
      const key = `lyricviz_${projectName.replace(/\s+/g, '_')}`;
      const data = { ...projectData, _savedAt: Date.now() };
      localStorage.setItem(key, JSON.stringify(data));
      const keys = Object.keys(localStorage).filter(k => k.startsWith('lyricviz_'));
      setSavedVersions(keys.map(k => {
        const d = localStorage.getItem(k) || '{}';
        return { name: k.replace('lyricviz_', ''), date: new Date(JSON.parse(d)._savedAt || 0).toLocaleString(), size: `${(d.length / 1024).toFixed(1)} KB` };
      }).sort((a, b) => b.date.localeCompare(a.date)));
      setExportStatus({ type: 'success', msg: `✅ Saved to browser! "${projectName}"` });
    } catch {
      setExportStatus({ type: 'error', msg: 'Failed to save — browser storage might be full.' });
    }
  };

  const deleteFromLocalStorage = (name: string) => {
    localStorage.removeItem(`lyricviz_${name}`);
    setSavedVersions(prev => prev.filter(v => v.name !== name));
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-gray-900 border border-white/10 rounded-xl shadow-2xl w-full max-w-xl mx-4 overflow-hidden max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="px-5 py-3 border-b border-white/10 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <Download className="w-5 h-5 text-purple-400" />
            <h2 className="text-lg font-semibold text-white">Export & Save</h2>
            {ffmpegReady && (
              <span className="text-[10px] bg-green-500/10 text-green-400 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Zap className="w-2.5 h-2.5" /> FFmpeg Ready
              </span>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-white/10 text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/10 flex-shrink-0">
          {([
            { key: 'video' as ExportTab, label: 'Video', icon: Video },
            { key: 'lyrics' as ExportTab, label: 'Lyrics', icon: FileText },
            { key: 'project' as ExportTab, label: 'Project', icon: FileJson },
          ]).map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => { setTab(key); setExportStatus(null); }}
              className={`flex-1 px-4 py-2.5 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${
                tab === key ? 'text-white border-b-2 border-purple-500 bg-white/5' : 'text-gray-500 hover:text-gray-300'
              }`}>
              <Icon className="w-3.5 h-3.5" /> {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1 scrollbar-thin">

          {/* ════ VIDEO ════ */}
          {tab === 'video' && (
            <>
              {/* Engine badge */}
              <div className="flex items-start gap-2 bg-purple-500/10 border border-purple-500/20 rounded-lg px-3 py-2.5">
                <Zap className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
                <div className="text-[11px] text-purple-200 space-y-0.5">
                  <p className="font-semibold text-purple-300">Fast Export — ffmpeg.wasm (H.264 MP4)</p>
                  <p className="text-purple-400">Renders all frames at full CPU speed, then encodes with libx264. ~5–10× faster than the old real-time method. First export downloads the FFmpeg engine (~25 MB, cached after that).</p>
                </div>
              </div>

              {/* Ratio */}
              <div>
                <label className="block text-xs text-gray-400 mb-2 font-medium">Aspect Ratio</label>
                <div className="grid grid-cols-4 gap-2">
                  {([
                    { r: '16:9' as const, l: '16:9', s: 'YouTube', i: Monitor },
                    { r: '9:16' as const, l: '9:16', s: 'Reels/TikTok', i: Smartphone },
                    { r: '1:1' as const, l: '1:1', s: 'Instagram', i: Square },
                    { r: '4:3' as const, l: '4:3', s: 'Standard', i: Film },
                  ]).map(({ r, l, s, i: Icon }) => (
                    <button key={r} onClick={() => setVideoRatio(r)}
                      className={`p-2.5 rounded-lg border text-center transition-all ${videoRatio === r ? 'border-purple-500 bg-purple-500/10 text-white' : 'border-white/10 text-gray-400 hover:border-white/20'}`}>
                      <Icon className="w-4 h-4 mx-auto mb-1" />
                      <div className="text-xs font-medium">{l}</div>
                      <div className="text-[8px] text-gray-500">{s}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Quality + FPS */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5 font-medium">Quality</label>
                  <div className="space-y-1">
                    {(['high', 'medium', 'low'] as const).map(q => (
                      <button key={q} onClick={() => setVideoQuality(q)}
                        className={`w-full px-3 py-1.5 rounded text-xs text-left transition-colors ${videoQuality === q ? 'bg-purple-600/30 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}>
                        {q === 'high' ? 'High (CRF 18)' : q === 'medium' ? 'Medium (CRF 23)' : 'Low (CRF 28)'}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5 font-medium">Frame Rate</label>
                  <div className="space-y-1">
                    {[24, 30, 60].map(fps => (
                      <button key={fps} onClick={() => setVideoFps(fps)}
                        className={`w-full px-3 py-1.5 rounded text-xs text-left transition-colors ${videoFps === fps ? 'bg-purple-600/30 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}>
                        {fps} FPS
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Info + memory estimate */}
              <div className="bg-gray-800/50 rounded-lg p-3 text-[10px] text-gray-500 space-y-1">
                <p>🎬 <span className="text-white">{res.w}×{res.h}</span> MP4 (H.264) • {videoFps}fps • {fmtDur(maxTime)} • {totalFrames} frames</p>
                <p className={`flex items-center gap-1 ${estimatedMB > 400 ? 'text-yellow-400' : 'text-gray-500'}`}>
                  <Info className="w-2.5 h-2.5 flex-shrink-0" />
                  Est. ~{estimatedMB} MB RAM during export (JPEG frame buffer).
                  {estimatedMB > 400 && ' Consider using Medium quality for long videos.'}
                </p>
                <p>💡 Output is MP4 — plays everywhere including iPhone, Android, YouTube, TikTok.</p>
              </div>

              {/* Progress */}
              {isRecording && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-purple-400 flex items-center gap-1.5">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      {ffmpegLoading ? 'Downloading FFmpeg engine…' : progressLabel || 'Working…'}
                    </span>
                    <span className="text-gray-400 font-mono">{recordingProgress}%</span>
                  </div>
                  <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${recordingProgress}%`,
                        background: recordingProgress < 70
                          ? 'linear-gradient(90deg, #7c3aed, #a855f7)'
                          : 'linear-gradient(90deg, #a855f7, #ec4899)',
                      }} />
                  </div>
                  <div className="flex justify-between text-[9px] text-gray-600">
                    <span className={recordingProgress >= 1 ? 'text-purple-400' : ''}>① Rendering frames</span>
                    <span className={recordingProgress >= 70 ? 'text-pink-400' : ''}>② H.264 Encoding</span>
                    <span className={recordingProgress >= 99 ? 'text-green-400' : ''}>③ Download</span>
                  </div>
                </div>
              )}

              {!isRecording ? (
                <div className="space-y-2 mt-4">
                  <button onClick={startFastExport} disabled={lyrics.length === 0}
                    className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:from-gray-700 disabled:to-gray-700 disabled:text-gray-500 text-white text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-500/20">
                    <Zap className="w-4 h-4" />
                    {ffmpegReady ? `Export MP4 — ${res.w}×${res.h}` : 'Export MP4 (loads FFmpeg engine first)'}
                  </button>
                  <div className="pt-2 border-t border-white/10 mt-4">
                    <p className="text-[10px] text-gray-400 mb-2 flex items-center gap-1.5"><Monitor className="w-3.5 h-3.5 text-blue-400" /> Prefer cloud rendering?</p>
                    <button onClick={() => {
                      const a = document.createElement('a');
                      a.href = '/LyricViz_Colab_Renderer.ipynb';
                      a.download = 'LyricViz_Colab_Renderer.ipynb';
                      a.click();
                      downloadProject(); // Also download the project JSON to use in Colab
                      setExportStatus({ type: 'success', msg: '✅ Colab Notebook and Project JSON downloaded!' });
                    }}
                      className="w-full py-2.5 bg-[#1d9ceb]/20 hover:bg-[#1d9ceb]/30 text-[#1d9ceb] text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-2 border border-[#1d9ceb]/30">
                      <Database className="w-4 h-4" />
                      Export for Colab (GPU Render)
                    </button>
                    <p className="text-[9px] text-gray-500 mt-1.5 text-center">Downloads the notebook + your project JSON</p>
                  </div>
                </div>
              ) : (
                <button onClick={cancelExport}
                  className="w-full py-3 bg-red-600/80 hover:bg-red-600 text-white text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 mt-4">
                  <X className="w-4 h-4" /> Cancel Export
                </button>
              )}
            </>
          )}

          {/* ════ LYRICS ════ */}
          {tab === 'lyrics' && (
            <>
              <div>
                <label className="block text-xs text-gray-400 mb-2 font-medium">Format</label>
                <div className="grid grid-cols-4 gap-2">
                  {([
                    { f: 'srt' as const, l: 'SRT', d: 'Subtitles' },
                    { f: 'lrc' as const, l: 'LRC', d: 'Lyrics' },
                    { f: 'ass' as const, l: 'ASS', d: 'Advanced' },
                    { f: 'txt' as const, l: 'TXT', d: 'Plain' },
                  ]).map(({ f, l, d }) => (
                    <button key={f} onClick={() => setLyricFormat(f)}
                      className={`p-2 rounded-lg border text-center transition-all ${lyricFormat === f ? 'border-purple-500 bg-purple-500/10 text-white' : 'border-white/10 text-gray-400 hover:border-white/20'}`}>
                      <div className="text-xs font-semibold">.{l}</div>
                      <div className="text-[8px] text-gray-500">{d}</div>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-gray-400 font-medium">Preview</label>
                  <button onClick={copyLyricsClipboard} className="text-[10px] text-gray-500 hover:text-white flex items-center gap-1">
                    {copied ? <><Check className="w-3 h-3 text-green-400" /> Copied!</> : <><Copy className="w-3 h-3" /> Copy</>}
                  </button>
                </div>
                <pre className="bg-gray-800 border border-white/10 rounded-lg p-3 text-[10px] text-gray-300 font-mono overflow-y-auto max-h-40 whitespace-pre-wrap">
                  {generateLyricText().slice(0, 2000)}{generateLyricText().length > 2000 ? '\n...' : ''}
                </pre>
              </div>
              <button onClick={downloadLyrics} disabled={lyrics.length === 0}
                className="w-full py-3 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2">
                <Download className="w-4 h-4" /> Download .{lyricFormat.toUpperCase()}
              </button>
            </>
          )}

          {/* ════ PROJECT ════ */}
          {tab === 'project' && (
            <>
              <div className="bg-gray-800/50 rounded-lg p-3 space-y-2">
                <h3 className="text-sm font-medium text-white flex items-center gap-1.5"><Database className="w-4 h-4 text-purple-400" /> Project Summary</h3>
                <div className="grid grid-cols-3 gap-2 text-[10px]">
                  <div className="bg-gray-900/50 rounded p-2"><span className="text-gray-500">Lines</span><p className="text-white font-medium">{lyrics.length}</p></div>
                  <div className="bg-gray-900/50 rounded p-2"><span className="text-gray-500">Duration</span><p className="text-white font-medium">{fmtDur(maxTime)}</p></div>
                  <div className="bg-gray-900/50 rounded p-2"><span className="text-gray-500">Ratio</span><p className="text-white font-medium">{(projectData as Record<string, string>).canvasRatio || '16:9'}</p></div>
                </div>
              </div>
              <div className="space-y-2">
                <button onClick={downloadProject}
                  className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2">
                  <Download className="w-4 h-4" /> Download Project .json
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={saveToLocalStorage}
                    className="py-2.5 bg-green-600/20 hover:bg-green-600/30 text-green-400 text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-1.5">
                    <HardDrive className="w-3.5 h-3.5" /> Save to Browser
                  </button>
                  <button onClick={copyProjectClipboard}
                    className="py-2.5 bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-1.5">
                    {projectCopied ? <><Check className="w-3.5 h-3.5 text-green-400" /> Copied!</> : <><Copy className="w-3.5 h-3.5" /> Copy JSON</>}
                  </button>
                </div>
              </div>
              {savedVersions.length > 0 && (
                <div>
                  <h4 className="text-xs text-gray-400 font-medium mb-2 flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5" /> Saved Versions ({savedVersions.length})
                  </h4>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {savedVersions.map(v => (
                      <div key={v.name} className="flex items-center justify-between bg-gray-800/50 rounded px-3 py-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] text-white font-medium truncate">{v.name}</p>
                          <p className="text-[9px] text-gray-500">{v.date} • {v.size}</p>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                          <button onClick={() => { navigator.clipboard.writeText(localStorage.getItem(`lyricviz_${v.name}`) || ''); setExportStatus({ type: 'success', msg: `Copied "${v.name}" to clipboard` }); }}
                            className="p-1 hover:bg-white/10 rounded text-gray-500 hover:text-white"><Copy className="w-3 h-3" /></button>
                          <button onClick={() => deleteFromLocalStorage(v.name)}
                            className="p-1 hover:bg-red-500/20 rounded text-gray-500 hover:text-red-400"><X className="w-3 h-3" /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="bg-gray-800/30 rounded-lg p-3 text-[10px] text-gray-500 space-y-1">
                <p className="text-gray-400 font-medium">💡 Backup Best Practices:</p>
                <p>• <strong>Download .json</strong> — safest, works offline, version-controlled by filename</p>
                <p>• <strong>Save to Browser</strong> — quick access, but cleared if cache is wiped</p>
                <p>• <strong>Copy JSON</strong> — paste into notes, email, or version control (Git)</p>
                <p>• To reload: use Import → drop the .json file</p>
              </div>
            </>
          )}

          {/* Status */}
          {exportStatus && exportStatus.type !== 'recording' && (
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
              exportStatus.type === 'success' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
            }`}>
              {exportStatus.type === 'success' ? <Check className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
              <span className="text-xs">{exportStatus.msg}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
