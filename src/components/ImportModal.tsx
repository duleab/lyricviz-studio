import React, { useState, useRef } from 'react';
import type { LyricLine, BackgroundConfig, FontConfig, AnimationConfig, ParticleConfig } from '../types';
import {
  X, FileText, Music, FolderOpen, Upload, FileType, Check, AlertCircle,
  Clock, Zap, FileCheck
} from 'lucide-react';

interface ImportModalProps {
  open: boolean;
  onClose: () => void;
  onImportLyrics: (lyrics: LyricLine[], format: string) => void;
  onImportProject: (project: {
    projectName?: string;
    lyrics?: LyricLine[];
    background?: BackgroundConfig;
    font?: FontConfig;
    animation?: AnimationConfig;
    particles?: ParticleConfig;
    canvasRatio?: '16:9' | '9:16' | '1:1' | '4:3';
  }) => void;
  onImportAudio: (file: File) => void;
}

type ImportTab = 'file' | 'paste' | 'audio';

function fmtDuration(s: number): string {
  const mins = Math.floor(s / 60);
  const secs = Math.floor(s % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function parseLRC(text: string): LyricLine[] {
  const lines = text.split('\n');
  const parsed: LyricLine[] = [];
  const timestampRegex = /\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]\s*(.*)/;

  for (const line of lines) {
    const match = line.match(timestampRegex);
    if (match) {
      const minutes = parseInt(match[1]);
      const seconds = parseInt(match[2]);
      const ms = match[3] ? parseInt(match[3].padEnd(3, '0')) : 0;
      const time = minutes * 60 + seconds + ms / 1000;
      const text = match[4].trim();
      if (text && !text.startsWith('[')) {
        parsed.push({
          id: crypto.randomUUID(), text,
          startTime: Math.round(time * 10) / 10,
          endTime: Math.round((time + 4) * 10) / 10,
          emphasis: false,
        });
      }
    }
  }
  for (let i = 0; i < parsed.length - 1; i++) parsed[i].endTime = parsed[i + 1].startTime;
  if (parsed.length > 0) parsed[parsed.length - 1].endTime = parsed[parsed.length - 1].startTime + 4;
  return parsed;
}

function parseSRT(text: string): LyricLine[] {
  const blocks = text.trim().split(/\n\s*\n/);
  const parsed: LyricLine[] = [];
  const timeRegex = /(\d{2}):(\d{2}):(\d{2})[,.](\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})[,.](\d{3})/;

  for (const block of blocks) {
    const lines = block.trim().split('\n');
    if (lines.length < 2) continue;
    let timeLine = '';
    let textLines: string[] = [];
    for (let i = 0; i < lines.length; i++) {
      if (timeRegex.test(lines[i])) {
        timeLine = lines[i];
        textLines = lines.slice(i + 1);
        break;
      }
    }
    const match = timeLine.match(timeRegex);
    if (match && textLines.length > 0) {
      const startTime = parseInt(match[1]) * 3600 + parseInt(match[2]) * 60 + parseInt(match[3]) + parseInt(match[4]) / 1000;
      const endTime = parseInt(match[5]) * 3600 + parseInt(match[6]) * 60 + parseInt(match[7]) + parseInt(match[8]) / 1000;
      const text = textLines.join(' ').replace(/<[^>]*>/g, '').trim();
      if (text) {
        parsed.push({
          id: crypto.randomUUID(), text,
          startTime: Math.round(startTime * 10) / 10,
          endTime: Math.round(endTime * 10) / 10,
          emphasis: false,
        });
      }
    }
  }
  return parsed;
}

function parsePlainText(text: string, intervalSec: number = 4): LyricLine[] {
  const lines = text.split('\n').filter(l => l.trim());
  const parsed: LyricLine[] = [];
  let time = 0;
  for (const line of lines) {
    parsed.push({
      id: crypto.randomUUID(), text: line.trim(),
      startTime: Math.round(time * 10) / 10,
      endTime: Math.round((time + intervalSec) * 10) / 10,
      emphasis: false,
    });
    time += intervalSec;
  }
  return parsed;
}

function detectFormat(text: string): 'lrc' | 'srt' | 'plain' {
  if (/\d{2}:\d{2}:\d{2}[,.]?\d{0,3}\s*-->/.test(text)) return 'srt';
  if (/\[\d{1,2}:\d{2}/.test(text)) return 'lrc';
  return 'plain';
}

interface ParseResult {
  lyrics: LyricLine[];
  format: string;
  hasTiming: boolean;
  totalDuration: number;
}

function parseAny(text: string, forceFormat?: 'lrc' | 'srt' | 'plain', interval?: number): ParseResult {
  const fmt = forceFormat || detectFormat(text);
  let lyrics: LyricLine[];
  let hasTiming = false;

  switch (fmt) {
    case 'srt':
      lyrics = parseSRT(text);
      hasTiming = true; // SRT always has start+end timing
      break;
    case 'lrc':
      lyrics = parseLRC(text);
      hasTiming = true; // LRC has start timing (end is derived)
      break;
    default:
      lyrics = parsePlainText(text, interval || 4);
      hasTiming = false;
      break;
  }

  const totalDuration = lyrics.length > 0 ? lyrics[lyrics.length - 1].endTime : 0;
  return { lyrics, format: fmt, hasTiming, totalDuration };
}

export default function ImportModal({ open, onClose, onImportLyrics, onImportProject, onImportAudio }: ImportModalProps) {
  const [tab, setTab] = useState<ImportTab>('file');
  const [pasteText, setPasteText] = useState('');
  const [pasteFormat, setPasteFormat] = useState<'auto' | 'lrc' | 'srt' | 'plain'>('auto');
  const [plainInterval, setPlainInterval] = useState(4);
  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error' | 'info'; msg: string; detail?: string } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [previewResult, setPreviewResult] = useState<ParseResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  const clearAndClose = (delay = 800) => {
    setTimeout(() => { onClose(); setImportStatus(null); setPreviewResult(null); setPasteText(''); }, delay);
  };

  // ─── Handle file loading ───
  const handleFileLoad = (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    const reader = new FileReader();

    reader.onload = (e) => {
      const content = e.target?.result as string;
      try {
        if (ext === 'json') {
          const data = JSON.parse(content);
          // Check if it's a project file (has lyrics + any project config)
          if (data.projectName || (data.lyrics && typeof data.lyrics === 'object')) {
            // Treat as project — import everything that exists
            if (data.lyrics || data.font || data.background || data.animation || data.particles) {
              onImportProject(data);
              const lineCount = Array.isArray(data.lyrics) ? data.lyrics.length : 0;
              const hasStyles = !!(data.font || data.background || data.animation);
              setImportStatus({
                type: 'success',
                msg: `✅ Project loaded: "${data.projectName || 'Untitled'}"`,
                detail: `${lineCount} lines${hasStyles ? ' • Styles restored' : ''}`,
              });
            } else {
              setImportStatus({ type: 'error', msg: 'JSON file is empty or has no usable data.' });
              return;
            }
          } else if (Array.isArray(data)) {
            // Raw array of lyric objects
            const validLyrics = data.filter((item: unknown) =>
              typeof item === 'object' && item !== null && 'text' in item
            );
            if (validLyrics.length > 0) {
              onImportLyrics(validLyrics.map((item: Record<string, unknown>) => ({
                id: (item.id as string) || crypto.randomUUID(),
                text: String(item.text || ''),
                startTime: Number(item.startTime) || 0,
                endTime: Number(item.endTime) || (Number(item.startTime) || 0) + 4,
                emphasis: Boolean(item.emphasis),
              })), 'json');
              setImportStatus({ type: 'success', msg: `✅ Imported ${validLyrics.length} lines from JSON` });
            } else {
              setImportStatus({ type: 'error', msg: 'JSON array does not contain valid lyric objects.' });
              return;
            }
          } else {
            setImportStatus({ type: 'error', msg: 'JSON file format not recognized. Expected a project or lyrics array.' });
            return;
          }
          clearAndClose(1200);
        } else if (ext === 'srt') {
          const result = parseAny(content, 'srt');
          if (result.lyrics.length === 0) {
            setImportStatus({ type: 'error', msg: 'No subtitles found in SRT file.' });
            return;
          }
          onImportLyrics(result.lyrics, 'srt');
          setImportStatus({
            type: 'success',
            msg: `✅ SRT loaded — ${result.lyrics.length} lines, fully synced!`,
            detail: `Duration: ${fmtDuration(result.totalDuration)} • Start+End timing for every line • Ready to play`,
          });
          clearAndClose(1500);
        } else if (ext === 'lrc') {
          const result = parseAny(content, 'lrc');
          if (result.lyrics.length === 0) {
            setImportStatus({ type: 'error', msg: 'No lyrics found in LRC file.' });
            return;
          }
          onImportLyrics(result.lyrics, 'lrc');
          setImportStatus({
            type: 'success',
            msg: `✅ LRC loaded — ${result.lyrics.length} lines with timing`,
            detail: `Duration: ${fmtDuration(result.totalDuration)} • Start timestamps synced`,
          });
          clearAndClose(1200);
        } else if (ext === 'txt') {
          const result = parseAny(content);
          onImportLyrics(result.lyrics, result.format);
          setImportStatus({
            type: 'success',
            msg: `✅ Imported ${result.lyrics.length} lines (detected ${result.format.toUpperCase()})`,
            detail: result.hasTiming ? 'Timestamps found — auto-synced!' : 'No timestamps — use ⚡ Sync to time lines',
          });
          clearAndClose(1200);
        } else {
          setImportStatus({ type: 'error', msg: 'Unsupported file type. Use .srt, .lrc, .json, or .txt' });
        }
      } catch {
        setImportStatus({ type: 'error', msg: 'Failed to parse file. Check the format and try again.' });
      }
    };
    reader.readAsText(file);
  };

  const handleAudioLoad = (file: File) => {
    onImportAudio(file);
    setImportStatus({ type: 'success', msg: `✅ Audio loaded: ${file.name}` });
    clearAndClose();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (!file) return;
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (['mp3', 'wav', 'ogg', 'aac', 'm4a', 'flac', 'webm'].includes(ext || '')) {
      handleAudioLoad(file);
    } else {
      handleFileLoad(file);
    }
  };

  // ─── Paste handlers ───
  const handlePastePreview = () => {
    if (!pasteText.trim()) { setPreviewResult(null); return; }
    const fmt = pasteFormat === 'auto' ? undefined : pasteFormat;
    const result = parseAny(pasteText, fmt as 'lrc' | 'srt' | 'plain' | undefined, plainInterval);
    setPreviewResult(result);
  };

  const handlePasteImport = () => {
    if (!pasteText.trim()) {
      setImportStatus({ type: 'error', msg: 'Please paste some text first.' });
      return;
    }
    const fmt = pasteFormat === 'auto' ? undefined : pasteFormat;
    const result = parseAny(pasteText, fmt as 'lrc' | 'srt' | 'plain' | undefined, plainInterval);
    if (result.lyrics.length === 0) {
      setImportStatus({ type: 'error', msg: 'No lyrics could be parsed from the text.' });
      return;
    }
    onImportLyrics(result.lyrics, result.format);
    setImportStatus({
      type: 'success',
      msg: `✅ Imported ${result.lyrics.length} lines (${result.format.toUpperCase()})`,
      detail: result.hasTiming ? `Auto-synced! Duration: ${fmtDuration(result.totalDuration)}` : 'Use ⚡ Sync to assign timing',
    });
    clearAndClose(1000);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-gray-900 border border-white/10 rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-purple-400" />
            <h2 className="text-lg font-semibold text-white">Import</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Recommendation banner */}
        <div className="px-5 py-2.5 bg-cyan-500/5 border-b border-white/5 flex items-start gap-2">
          <FileCheck className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-[11px] text-cyan-400 font-medium">💡 SRT is recommended for auto-sync</p>
            <p className="text-[10px] text-gray-500 mt-0.5">
              SRT files have exact start AND end time for every line — no manual syncing needed.
              JSON project files restore all your visual styles too.
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/10 flex-shrink-0">
          {([
            { key: 'file' as ImportTab, label: 'Drop File', icon: Upload },
            { key: 'paste' as ImportTab, label: 'Paste Text', icon: FileType },
            { key: 'audio' as ImportTab, label: 'Audio', icon: Music },
          ]).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => { setTab(key); setImportStatus(null); setPreviewResult(null); }}
              className={`flex-1 px-4 py-2.5 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${
                tab === key ? 'text-white border-b-2 border-purple-500 bg-white/5' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <Icon className="w-3.5 h-3.5" /> {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* ─── File Drop Tab ─── */}
          {tab === 'file' && (
            <>
              <div
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${
                  dragOver ? 'border-purple-500 bg-purple-500/10' : 'border-white/10 hover:border-white/20'
                }`}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
              >
                <Upload className="w-8 h-8 text-gray-500 mx-auto mb-3" />
                <p className="text-sm text-gray-300 font-medium mb-2">
                  Drop a file here or click to browse
                </p>
                <div className="flex items-center justify-center gap-3 text-[11px]">
                  <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 font-medium">.srt ⭐</span>
                  <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-400">.lrc</span>
                  <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400">.json</span>
                  <span className="px-2 py-0.5 rounded bg-green-500/10 text-green-400">.txt</span>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".lrc,.srt,.json,.txt"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleFileLoad(f); }}
                  className="hidden"
                />
              </div>

              {/* Format comparison */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-lg p-3">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <span className="text-cyan-400 font-semibold text-xs">SRT</span>
                    <span className="text-[9px] bg-cyan-500/20 text-cyan-300 px-1.5 py-0.5 rounded-full">BEST</span>
                  </div>
                  <div className="space-y-1 text-[10px] text-gray-400">
                    <div className="flex items-center gap-1"><Check className="w-3 h-3 text-green-400" /> Start + End time</div>
                    <div className="flex items-center gap-1"><Check className="w-3 h-3 text-green-400" /> Auto-synced</div>
                    <div className="flex items-center gap-1"><Check className="w-3 h-3 text-green-400" /> No manual work</div>
                    <div className="flex items-center gap-1"><Clock className="w-3 h-3 text-cyan-400" /> Millisecond accuracy</div>
                  </div>
                </div>
                <div className="bg-amber-500/5 border border-amber-500/10 rounded-lg p-3">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <span className="text-amber-400 font-semibold text-xs">JSON Project</span>
                  </div>
                  <div className="space-y-1 text-[10px] text-gray-400">
                    <div className="flex items-center gap-1"><Check className="w-3 h-3 text-green-400" /> Full project restore</div>
                    <div className="flex items-center gap-1"><Check className="w-3 h-3 text-green-400" /> Fonts, colors, BG</div>
                    <div className="flex items-center gap-1"><Check className="w-3 h-3 text-green-400" /> Animations, particles</div>
                    <div className="flex items-center gap-1"><Check className="w-3 h-3 text-green-400" /> Resume exactly</div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="bg-white/[0.02] border border-white/5 rounded-lg p-2.5">
                  <span className="text-purple-400 font-semibold text-[10px]">LRC</span>
                  <p className="text-[9px] text-gray-500 mt-0.5">Start times only. End times auto-filled from next line.</p>
                </div>
                <div className="bg-white/[0.02] border border-white/5 rounded-lg p-2.5">
                  <span className="text-green-400 font-semibold text-[10px]">TXT</span>
                  <p className="text-[9px] text-gray-500 mt-0.5">Plain text, no timing. Use ⚡ Sync after import.</p>
                </div>
              </div>
            </>
          )}

          {/* ─── Paste Text Tab ─── */}
          {tab === 'paste' && (
            <>
              <div className="flex items-center gap-2 mb-1">
                <label className="text-xs text-gray-400">Format:</label>
                {(['auto', 'srt', 'lrc', 'plain'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => { setPasteFormat(f); setPreviewResult(null); }}
                    className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                      pasteFormat === f ? 'bg-purple-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'
                    }`}
                  >
                    {f === 'auto' ? '🔍 Auto' : f === 'srt' ? '⭐ SRT' : f.toUpperCase()}
                  </button>
                ))}
                {pasteFormat === 'plain' && (
                  <div className="flex items-center gap-1 ml-2">
                    <label className="text-[10px] text-gray-500">Per line:</label>
                    <input type="number" min="1" max="30" value={plainInterval}
                      onChange={e => setPlainInterval(parseInt(e.target.value) || 4)}
                      className="w-10 bg-gray-800 border border-white/10 rounded px-1.5 py-0.5 text-[11px] text-white text-center focus:outline-none" />
                    <span className="text-[10px] text-gray-500">s</span>
                  </div>
                )}
              </div>

              <textarea
                value={pasteText}
                onChange={e => { setPasteText(e.target.value); setPreviewResult(null); }}
                placeholder={"Paste SRT (recommended):\n1\n00:00:02,500 --> 00:00:06,000\nIn the silence of the night\n\n2\n00:00:06,000 --> 00:00:10,500\nStars are dancing in the light\n\nOr LRC:\n[00:02.50] In the silence of the night\n\nOr plain text (one lyric per line)"}
                className="w-full h-40 bg-gray-800 border border-white/10 rounded-lg p-3 text-xs text-white placeholder-gray-600 resize-none focus:outline-none focus:ring-1 focus:ring-purple-500 font-mono"
              />

              {/* Preview button */}
              <div className="flex gap-2">
                <button onClick={handlePastePreview}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 text-sm rounded-lg transition-colors flex items-center gap-2">
                  <FileText className="w-4 h-4" /> Preview
                </button>
                <button onClick={handlePasteImport}
                  className="flex-1 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2">
                  <Zap className="w-4 h-4" /> Import Lyrics
                </button>
              </div>

              {/* Preview result */}
              {previewResult && (
                <div className={`rounded-lg p-3 border ${previewResult.hasTiming ? 'bg-green-500/5 border-green-500/20' : 'bg-amber-500/5 border-amber-500/20'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    {previewResult.hasTiming ? (
                      <Check className="w-4 h-4 text-green-400" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-amber-400" />
                    )}
                    <span className={`text-xs font-medium ${previewResult.hasTiming ? 'text-green-400' : 'text-amber-400'}`}>
                      {previewResult.format.toUpperCase()} detected • {previewResult.lyrics.length} lines
                      {previewResult.hasTiming ? ' • Auto-synced!' : ' • Needs ⚡ Sync'}
                    </span>
                  </div>
                  <div className="space-y-0.5 max-h-24 overflow-y-auto">
                    {previewResult.lyrics.slice(0, 6).map((l, i) => (
                      <div key={i} className="flex items-center gap-2 text-[10px]">
                        <span className="text-gray-600 font-mono w-16 flex-shrink-0">
                          {fmtDuration(l.startTime)}→{fmtDuration(l.endTime)}
                        </span>
                        <span className="text-gray-300 truncate">{l.text}</span>
                      </div>
                    ))}
                    {previewResult.lyrics.length > 6 && (
                      <span className="text-[10px] text-gray-600">... and {previewResult.lyrics.length - 6} more lines</span>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {/* ─── Audio Tab ─── */}
          {tab === 'audio' && (
            <>
              <div
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${
                  dragOver ? 'border-purple-500 bg-purple-500/10' : 'border-white/10 hover:border-white/20'
                }`}
                onClick={() => audioInputRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
              >
                <Music className="w-8 h-8 text-gray-500 mx-auto mb-3" />
                <p className="text-sm text-gray-300 font-medium mb-1">Drop audio file or click to browse</p>
                <p className="text-[11px] text-gray-600">MP3, WAV, OGG, AAC, M4A, FLAC, WebM</p>
                <input ref={audioInputRef} type="file" accept="audio/*"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleAudioLoad(f); }}
                  className="hidden" />
              </div>
              <div className="bg-gray-800/50 rounded-lg p-3 text-[10px] text-gray-500 space-y-1">
                <p>💡 <strong className="text-gray-400">Workflow tip:</strong></p>
                <p>1. Import an SRT file first (auto-synced timing)</p>
                <p>2. Upload your audio here</p>
                <p>3. Press Play — lyrics follow the music automatically!</p>
              </div>
            </>
          )}

          {/* ─── Status ─── */}
          {importStatus && (
            <div className={`rounded-lg p-3 border ${
              importStatus.type === 'success' ? 'bg-green-500/5 border-green-500/20' :
              importStatus.type === 'info' ? 'bg-blue-500/5 border-blue-500/20' :
              'bg-red-500/5 border-red-500/20'
            }`}>
              <div className="flex items-center gap-2">
                {importStatus.type === 'success' ? <Check className="w-4 h-4 text-green-400 flex-shrink-0" /> :
                 importStatus.type === 'info' ? <AlertCircle className="w-4 h-4 text-blue-400 flex-shrink-0" /> :
                 <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />}
                <span className={`text-sm font-medium ${
                  importStatus.type === 'success' ? 'text-green-400' :
                  importStatus.type === 'info' ? 'text-blue-400' : 'text-red-400'
                }`}>{importStatus.msg}</span>
              </div>
              {importStatus.detail && (
                <p className="text-[10px] text-gray-500 mt-1 ml-6">{importStatus.detail}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
