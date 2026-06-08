import React, { useRef, useCallback, useState, useEffect } from 'react';
import type { LyricLine } from '../types';
import {
  Play, Pause, SkipBack, SkipForward,
  Volume2, VolumeX,
  RotateCcw, ChevronLeft, ChevronRight,
  ChevronsLeft, ChevronsRight, Zap
} from 'lucide-react';

interface TimelineProps {
  lyrics: LyricLine[];
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  onPlay: () => void;
  onPause: () => void;
  onSeek: (time: number) => void;
  onReset: () => void;
  volume: number;
  onVolumeChange: (v: number) => void;
  hasAudio: boolean;
  playbackRate: number;
  onPlaybackRateChange: (r: number) => void;
  // NOW sync
  syncActive: boolean;
  syncIndex: number;
  onSyncToggle: () => void;
  onSyncNow: () => void;
}

function fmtTime(s: number): string {
  const mins = Math.floor(s / 60);
  const secs = Math.floor(s % 60);
  const ms = Math.round((s % 1) * 10);
  return `${mins}:${secs.toString().padStart(2, '0')}.${ms}`;
}

export default function Timeline({
  lyrics,
  currentTime,
  duration,
  isPlaying,
  onPlay,
  onPause,
  onSeek,
  onReset,
  volume,
  onVolumeChange,
  hasAudio,
  playbackRate,
  onPlaybackRateChange,
  syncActive,
  syncIndex,
  onSyncToggle,
  onSyncNow,
}: TimelineProps) {
  const timelineRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverX, setHoverX] = useState(0);

  const maxTime = duration || (lyrics.length > 0 ? lyrics[lyrics.length - 1].endTime + 2 : 60);
  const progress = maxTime > 0 ? (currentTime / maxTime) * 100 : 0;

  // Active line
  const activeIndex = lyrics.findIndex(
    (line, i) => currentTime >= line.startTime && currentTime < (lyrics[i + 1]?.startTime ?? line.endTime)
  );
  const activeLine = activeIndex >= 0 ? lyrics[activeIndex] : null;

  // Mouse handlers for scrubbing
  const getTimeFromMouse = useCallback((e: MouseEvent | React.MouseEvent) => {
    if (!timelineRef.current) return currentTime;
    const rect = timelineRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    return (x / rect.width) * maxTime;
  }, [maxTime, currentTime]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    setIsDragging(true);
    const time = getTimeFromMouse(e);
    onSeek(time);
  }, [getTimeFromMouse, onSeek]);

  useEffect(() => {
    if (!isDragging) return;
    const handleMove = (e: MouseEvent) => { onSeek(getTimeFromMouse(e)); };
    const handleUp = () => setIsDragging(false);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [isDragging, getTimeFromMouse, onSeek]);

  const handleHover = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    setHoverTime((x / rect.width) * maxTime);
    setHoverX(x);
  }, [maxTime]);

  // Jump helpers
  const jumpToPrevLine = () => {
    if (lyrics.length === 0) return;
    let target = activeIndex > 0 ? activeIndex - 1 : lyrics.length - 1;
    if (activeLine && currentTime - activeLine.startTime > 0.5) target = activeIndex;
    onSeek(lyrics[target].startTime);
  };

  const jumpToNextLine = () => {
    if (lyrics.length === 0) return;
    const target = activeIndex < lyrics.length - 1 ? activeIndex + 1 : 0;
    onSeek(lyrics[target].startTime);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;

      switch (e.key) {
        case ' ':
          e.preventDefault();
          isPlaying ? onPause() : onPlay();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          if (e.shiftKey) onSeek(Math.max(0, currentTime - 5));
          else onSeek(Math.max(0, currentTime - 1));
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (e.shiftKey) onSeek(Math.min(maxTime, currentTime + 5));
          else onSeek(Math.min(maxTime, currentTime + 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          jumpToPrevLine();
          break;
        case 'ArrowDown':
          e.preventDefault();
          jumpToNextLine();
          break;
        case 'Home':
          e.preventDefault();
          onSeek(0);
          break;
        case 'End':
          e.preventDefault();
          onSeek(maxTime);
          break;
        // N key = NOW stamp
        case 'n':
        case 'N':
          if (syncActive) {
            e.preventDefault();
            onSyncNow();
          }
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, currentTime, maxTime, onPlay, onPause, onSeek, activeIndex, activeLine, lyrics, syncActive, onSyncNow]);

  const syncDone = syncIndex >= lyrics.length;
  const syncLine = syncActive && !syncDone ? lyrics[syncIndex] : null;

  return (
    <div className="bg-gray-950 border-t border-white/10 flex-shrink-0">

      {/* ── NOW Sync Bar — shown when sync is active ── */}
      {syncActive && (
        <div className={`px-4 py-2 border-b border-white/5 flex items-center gap-3 ${syncDone ? 'bg-green-500/5' : 'bg-amber-500/5'}`}>
          {!syncDone ? (
            <>
              {/* Big NOW button */}
              <button
                onClick={onSyncNow}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 active:scale-95 text-black font-bold text-sm rounded-lg transition-all shadow-lg shadow-amber-500/30 flex items-center gap-2 flex-shrink-0"
              >
                <Zap className="w-4 h-4" />
                NOW
              </button>

              {/* Progress */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-amber-400 font-medium truncate">
                    Line {syncIndex + 1}: "{syncLine?.text?.slice(0, 40)}{(syncLine?.text?.length || 0) > 40 ? '...' : ''}"
                  </span>
                  <span className="text-[10px] text-gray-500 font-mono flex-shrink-0 ml-2">
                    {syncIndex}/{lyrics.length}
                  </span>
                </div>
                {/* Progress bar */}
                <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full transition-all duration-200"
                    style={{ width: `${(syncIndex / lyrics.length) * 100}%` }}
                  />
                </div>
              </div>

              {/* Cancel */}
              <button
                onClick={onSyncToggle}
                className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-gray-400 text-xs rounded-md transition-colors flex-shrink-0"
              >
                Cancel
              </button>

              {/* Hint */}
              <span className="text-[9px] text-gray-600 flex-shrink-0">
                Press <kbd className="px-1 py-0.5 rounded bg-gray-800 text-amber-400 font-mono text-[9px]">N</kbd> or click NOW
              </span>
            </>
          ) : (
            <>
              <span className="text-sm text-green-400 font-medium flex items-center gap-2">
                ✓ All {lyrics.length} lines synced!
              </span>
              <button
                onClick={onSyncToggle}
                className="px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white text-xs rounded-md transition-colors font-medium ml-auto"
              >
                Done
              </button>
            </>
          )}
        </div>
      )}

      {/* ── Active Line Preview ── */}
      {!syncActive && activeLine && (
        <div className="px-4 py-1 border-b border-white/5 bg-purple-500/5 flex items-center justify-between">
          <span className="text-[10px] text-purple-400 font-medium truncate flex-1 mr-4">
            ♪ Line {activeIndex + 1}: {activeLine.text}
          </span>
          <span className="text-[10px] font-mono text-gray-500 flex-shrink-0">
            {fmtTime(activeLine.startTime)} → {fmtTime(activeLine.endTime)}
          </span>
        </div>
      )}

      {/* ── Timeline Bar ── */}
      <div className="px-4 pt-2">
        <div
          ref={timelineRef}
          className="relative h-12 bg-gray-900 rounded-lg cursor-pointer overflow-hidden select-none"
          onMouseDown={handleMouseDown}
          onMouseMove={handleHover}
          onMouseLeave={() => setHoverTime(null)}
        >
          {/* Lyric blocks */}
          {lyrics.map((line, i) => {
            const left = (line.startTime / maxTime) * 100;
            const width = Math.max(0.3, ((line.endTime - line.startTime) / maxTime) * 100);
            const isActive = i === activeIndex;
            const isPast = line.endTime <= currentTime;
            const isSyncTarget = syncActive && i === syncIndex;
            const isSynced = syncActive && i < syncIndex;
            return (
              <div key={line.id} className="absolute top-1 bottom-1" style={{ left: `${left}%`, width: `${width}%` }}>
                <div
                  className={`w-full h-full rounded-sm transition-colors border-r border-gray-800 ${
                    isSyncTarget ? 'bg-amber-500/50 ring-1 ring-amber-400/60' :
                    isSynced ? 'bg-green-500/30' :
                    isActive ? 'bg-purple-500/50 ring-1 ring-purple-400/50' :
                    isPast ? 'bg-purple-500/15' :
                    'bg-gray-700/30 hover:bg-gray-700/50'
                  }`}
                />
                {width > 3 && (
                  <span className={`absolute left-0.5 top-0.5 text-[8px] truncate max-w-full px-0.5 ${
                    isSyncTarget ? 'text-amber-200' :
                    isActive ? 'text-purple-200' : 'text-gray-500'
                  }`}>
                    {line.text.slice(0, 20)}
                  </span>
                )}
              </div>
            );
          })}

          {/* Progress fill */}
          <div className="absolute inset-y-0 left-0 bg-purple-500/10 pointer-events-none" style={{ width: `${progress}%` }} />

          {/* Hover indicator */}
          {hoverTime !== null && !isDragging && (
            <>
              <div className="absolute top-0 bottom-0 w-px bg-white/20 pointer-events-none" style={{ left: `${(hoverTime / maxTime) * 100}%` }} />
              <div
                className="absolute -top-5 px-1.5 py-0.5 bg-gray-800 text-[10px] font-mono text-white rounded shadow pointer-events-none -translate-x-1/2"
                style={{ left: hoverX }}
              >
                {fmtTime(hoverTime)}
              </div>
            </>
          )}

          {/* Playhead */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-purple-400 z-10 pointer-events-none"
            style={{ left: `${progress}%`, transition: isDragging ? 'none' : 'left 0.05s linear' }}
          >
            <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-purple-400 shadow-lg shadow-purple-500/50" />
            <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-purple-400/60" />
          </div>
        </div>
      </div>

      {/* ── Controls Row ── */}
      <div className="px-4 py-2 flex items-center justify-between">
        {/* Left: Playback */}
        <div className="flex items-center gap-1">
          <button onClick={onReset} className="p-1.5 rounded-md hover:bg-white/10 text-gray-500 hover:text-white transition-colors" title="Restart (Home)">
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => onSeek(Math.max(0, currentTime - 5))} className="p-1.5 rounded-md hover:bg-white/10 text-gray-500 hover:text-white transition-colors" title="Back 5s (Shift+←)">
            <ChevronsLeft className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => onSeek(Math.max(0, currentTime - 1))} className="p-1.5 rounded-md hover:bg-white/10 text-gray-500 hover:text-white transition-colors" title="Back 1s (←)">
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button onClick={jumpToPrevLine} className="p-1.5 rounded-md hover:bg-white/10 text-gray-400 hover:text-white transition-colors" title="Previous line (↑)">
            <SkipBack className="w-3.5 h-3.5" />
          </button>

          {/* Play / Pause */}
          <button
            onClick={() => isPlaying ? onPause() : onPlay()}
            className="p-2.5 rounded-full bg-purple-600 hover:bg-purple-500 text-white transition-colors shadow-lg shadow-purple-500/30 mx-1"
            title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
          >
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
          </button>

          <button onClick={jumpToNextLine} className="p-1.5 rounded-md hover:bg-white/10 text-gray-400 hover:text-white transition-colors" title="Next line (↓)">
            <SkipForward className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => onSeek(Math.min(maxTime, currentTime + 1))} className="p-1.5 rounded-md hover:bg-white/10 text-gray-500 hover:text-white transition-colors" title="Forward 1s (→)">
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => onSeek(Math.min(maxTime, currentTime + 5))} className="p-1.5 rounded-md hover:bg-white/10 text-gray-500 hover:text-white transition-colors" title="Forward 5s (Shift+→)">
            <ChevronsRight className="w-3.5 h-3.5" />
          </button>

          {/* Divider */}
          <div className="w-px h-5 bg-white/10 mx-1" />

          {/* NOW Sync Toggle */}
          <button
            onClick={onSyncToggle}
            disabled={lyrics.length === 0}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all disabled:opacity-30 ${
              syncActive
                ? 'bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/40'
                : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
            }`}
            title="Start NOW sync mode — stamps playhead time to each lyric line step by step"
          >
            <Zap className="w-3.5 h-3.5" />
            {syncActive ? `Syncing ${syncIndex}/${lyrics.length}` : '⚡ Sync'}
          </button>
        </div>

        {/* Center: Time + Speed */}
        <div className="flex items-center gap-3">
          <span className="text-sm font-mono text-white font-semibold tabular-nums">{fmtTime(currentTime)}</span>
          <span className="text-xs text-gray-600">/</span>
          <span className="text-xs font-mono text-gray-500 tabular-nums">{fmtTime(maxTime)}</span>
          <div className="w-px h-4 bg-white/10 mx-1" />
          <div className="flex items-center gap-1">
            {[0.5, 0.75, 1, 1.25, 1.5, 2].map(r => (
              <button
                key={r}
                onClick={() => onPlaybackRateChange(r)}
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors ${
                  playbackRate === r
                    ? 'bg-purple-600/30 text-purple-400 font-semibold'
                    : 'text-gray-600 hover:text-gray-400 hover:bg-white/5'
                }`}
                title={`${r}x speed`}
              >
                {r}x
              </button>
            ))}
          </div>
        </div>

        {/* Right: Volume + Line info */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onVolumeChange(volume > 0 ? 0 : 0.8)}
            className="p-1.5 rounded-md hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
          >
            {volume === 0 ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>
          {hasAudio && (
            <input type="range" min="0" max="1" step="0.05" value={volume}
              onChange={e => onVolumeChange(parseFloat(e.target.value))}
              className="w-16 accent-purple-500" />
          )}
          <div className="w-px h-4 bg-white/10" />
          <span className="text-[10px] text-gray-500">
            {activeIndex >= 0 ? `${activeIndex + 1}/${lyrics.length}` : `${lyrics.length} lines`}
          </span>
        </div>
      </div>

      {/* Keyboard hints */}
      <div className="px-4 pb-1.5 flex items-center gap-4 text-[9px] text-gray-700">
        <span><kbd className="px-1 py-0.5 rounded bg-gray-800 text-gray-500 font-mono">Space</kbd> Play/Pause</span>
        <span><kbd className="px-1 py-0.5 rounded bg-gray-800 text-gray-500 font-mono">← →</kbd> ±1s</span>
        <span><kbd className="px-1 py-0.5 rounded bg-gray-800 text-gray-500 font-mono">Shift+← →</kbd> ±5s</span>
        <span><kbd className="px-1 py-0.5 rounded bg-gray-800 text-gray-500 font-mono">↑ ↓</kbd> Prev/Next</span>
        {syncActive && (
          <span className="text-amber-500"><kbd className="px-1 py-0.5 rounded bg-amber-900/30 text-amber-400 font-mono">N</kbd> Stamp NOW</span>
        )}
      </div>
    </div>
  );
}
