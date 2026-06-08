import React, { useState, useRef, useEffect } from 'react';
import type { LyricLine } from '../types';
import { SAMPLE_LYRICS } from '../data/presets';
import {
  Plus, Trash2, Clock, Music, FileText, Wand2,
  ChevronUp, ChevronDown, Copy, GripVertical,
  PlusCircle, AlignLeft, Zap
} from 'lucide-react';

interface LyricEditorProps {
  lyrics: LyricLine[];
  setLyrics: React.Dispatch<React.SetStateAction<LyricLine[]>>;
  currentTime: number;
  onSeek: (time: number) => void;
  isPlaying?: boolean;
  // Sync mode from parent
  syncActive: boolean;
  syncIndex: number;
}

function fmtTime(s: number): string {
  const mins = Math.floor(s / 60);
  const secs = Math.floor(s % 60);
  const ms = Math.round((s % 1) * 10);
  return `${mins}:${secs.toString().padStart(2, '0')}.${ms}`;
}

function parseFmtTime(str: string): number {
  const parts = str.split(':');
  if (parts.length === 2) {
    const mins = parseInt(parts[0]) || 0;
    const secParts = parts[1].split('.');
    const secs = parseInt(secParts[0]) || 0;
    const ms = parseInt(secParts[1] || '0') || 0;
    return mins * 60 + secs + ms / 10;
  }
  return parseFloat(str) || 0;
}

export default function LyricEditor({ lyrics, setLyrics, currentTime, onSeek, syncActive, syncIndex }: LyricEditorProps) {
  const [bulkText, setBulkText] = useState('');
  const [showBulk, setShowBulk] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to active line OR sync target
  const activeIndex = lyrics.findIndex(
    (line, i) =>
      currentTime >= line.startTime &&
      currentTime < (lyrics[i + 1]?.startTime ?? line.endTime)
  );

  // Auto-scroll: prioritize sync target when syncing, else active
  const scrollTarget = syncActive ? syncIndex : activeIndex;

  useEffect(() => {
    if (scrollTarget >= 0 && listRef.current) {
      const el = listRef.current.children[scrollTarget] as HTMLElement;
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [scrollTarget, syncIndex]);

  // ─── CRUD Operations ───
  const addLineAtEnd = () => {
    const lastLine = lyrics[lyrics.length - 1];
    const startTime = lastLine ? lastLine.endTime : 0;
    const newLine: LyricLine = {
      id: crypto.randomUUID(), text: '', startTime, endTime: startTime + 4, emphasis: false,
    };
    setLyrics(prev => [...prev, newLine]);
    setTimeout(() => setSelectedId(newLine.id), 50);
  };

  const addLineAtCurrentTime = () => {
    const newLine: LyricLine = {
      id: crypto.randomUUID(), text: '', startTime: currentTime, endTime: currentTime + 4, emphasis: false,
    };
    const insertIdx = lyrics.findIndex(l => l.startTime > currentTime);
    if (insertIdx === -1) {
      setLyrics(prev => [...prev, newLine]);
    } else {
      setLyrics(prev => [...prev.slice(0, insertIdx), newLine, ...prev.slice(insertIdx)]);
    }
    setTimeout(() => { setSelectedId(newLine.id); recalcEndTimes(); }, 50);
  };

  const insertLineAfter = (index: number) => {
    const current = lyrics[index];
    const next = lyrics[index + 1];
    const startTime = current ? current.endTime : 0;
    const endTime = next ? next.startTime : startTime + 4;
    const newLine: LyricLine = {
      id: crypto.randomUUID(), text: '', startTime, endTime, emphasis: false,
    };
    setLyrics(prev => [...prev.slice(0, index + 1), newLine, ...prev.slice(index + 1)]);
    setTimeout(() => setSelectedId(newLine.id), 50);
  };

  const duplicateLine = (index: number) => {
    const line = lyrics[index];
    const newLine: LyricLine = {
      ...line, id: crypto.randomUUID(),
      startTime: line.endTime, endTime: line.endTime + (line.endTime - line.startTime),
    };
    setLyrics(prev => [...prev.slice(0, index + 1), newLine, ...prev.slice(index + 1)]);
  };

  const removeLine = (id: string) => {
    setLyrics(prev => prev.filter(l => l.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const updateLine = (id: string, updates: Partial<LyricLine>) => {
    setLyrics(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));
  };

  const moveLine = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= lyrics.length) return;
    const newLyrics = [...lyrics];
    [newLyrics[index], newLyrics[newIndex]] = [newLyrics[newIndex], newLyrics[index]];
    setLyrics(newLyrics);
  };

  // Time adjustments
  const nudgeTime = (id: string, field: 'startTime' | 'endTime', delta: number) => {
    setLyrics(prev => prev.map(l => {
      if (l.id !== id) return l;
      const newVal = Math.max(0, (l[field] ?? 0) + delta);
      return { ...l, [field]: Math.round(newVal * 10) / 10 };
    }));
  };

  const setTimeFromPlayhead = (id: string, field: 'startTime' | 'endTime') => {
    updateLine(id, { [field]: Math.round(currentTime * 10) / 10 });
  };

  const recalcEndTimes = () => {
    setLyrics(prev => {
      const sorted = [...prev].sort((a, b) => a.startTime - b.startTime);
      for (let i = 0; i < sorted.length - 1; i++) sorted[i].endTime = sorted[i + 1].startTime;
      if (sorted.length > 0) sorted[sorted.length - 1].endTime = sorted[sorted.length - 1].startTime + 4;
      return sorted;
    });
  };

  const shiftAllTimes = (delta: number) => {
    setLyrics(prev => prev.map(l => ({
      ...l,
      startTime: Math.max(0, l.startTime + delta),
      endTime: Math.max(0.1, l.endTime + delta),
    })));
  };

  const spreadEvenly = () => {
    if (lyrics.length < 2) return;
    const totalDuration = lyrics[lyrics.length - 1].endTime - lyrics[0].startTime;
    const perLine = totalDuration / lyrics.length;
    const startOffset = lyrics[0].startTime;
    setLyrics(prev => prev.map((l, i) => ({
      ...l,
      startTime: Math.round((startOffset + i * perLine) * 10) / 10,
      endTime: Math.round((startOffset + (i + 1) * perLine) * 10) / 10,
    })));
  };

  // Bulk paste
  const parseBulkLyrics = () => {
    const lines = bulkText.split('\n');
    const parsed: LyricLine[] = [];
    const timestampRegex = /\[(\d{2}):(\d{2})\.(\d{2})\]\s*(.*)/;
    let timeOffset = 0;

    for (const line of lines) {
      const match = line.match(timestampRegex);
      if (match) {
        const time = parseInt(match[1]) * 60 + parseInt(match[2]) + parseInt(match[3]) / 100;
        timeOffset = time;
        const text = match[4].trim();
        if (text) {
          parsed.push({
            id: crypto.randomUUID(), text, startTime: time, endTime: time + 4,
            emphasis: text.includes('🎵') || text.includes('🌅') || text.includes('🔥'),
          });
        }
      } else if (line.trim()) {
        parsed.push({ id: crypto.randomUUID(), text: line.trim(), startTime: timeOffset, endTime: timeOffset + 4 });
        timeOffset += 4;
      }
    }

    if (parsed.length > 0) {
      for (let i = 0; i < parsed.length - 1; i++) parsed[i].endTime = parsed[i + 1].startTime;
      parsed[parsed.length - 1].endTime = parsed[parsed.length - 1].startTime + 4;
      setLyrics(parsed);
      setShowBulk(false);
      setBulkText('');
    }
  };

  const loadSampleLyrics = () => { setBulkText(SAMPLE_LYRICS); setShowBulk(true); };

  const selected = lyrics.find(l => l.id === selectedId) || null;
  const selectedIndex = selected ? lyrics.indexOf(selected) : -1;

  return (
    <div className="flex flex-col h-full bg-gray-950/80 backdrop-blur-sm">
      {/* Header */}
      <div className="px-3 py-2.5 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Music className="w-4 h-4 text-purple-400" />
          <h2 className="font-semibold text-sm text-white">Lyrics</h2>
          <span className="text-[10px] bg-white/5 text-gray-500 px-1.5 py-0.5 rounded-full">{lyrics.length}</span>
        </div>
        <div className="flex items-center gap-0.5">
          <button onClick={loadSampleLyrics} className="p-1.5 rounded-md hover:bg-white/10 text-gray-400 hover:text-purple-400 transition-colors" title="Load sample lyrics">
            <Wand2 className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setShowBulk(!showBulk)} className={`p-1.5 rounded-md hover:bg-white/10 transition-colors ${showBulk ? 'bg-white/10 text-white' : 'text-gray-400'}`} title="Bulk paste LRC">
            <FileText className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="px-3 py-2 border-b border-white/5 flex items-center gap-1 flex-wrap">
        <button onClick={addLineAtCurrentTime}
          className="px-2 py-1 rounded bg-purple-600/20 text-purple-400 hover:bg-purple-600/30 text-[10px] font-medium flex items-center gap-1 transition-colors">
          <PlusCircle className="w-3 h-3" /> Add @ {fmtTime(currentTime)}
        </button>
        <button onClick={addLineAtEnd}
          className="px-2 py-1 rounded bg-white/5 text-gray-400 hover:bg-white/10 text-[10px] font-medium flex items-center gap-1 transition-colors">
          <Plus className="w-3 h-3" /> Add End
        </button>
        {syncActive && (
          <span className="px-2 py-1 rounded bg-amber-500/10 text-amber-400 text-[10px] font-medium flex items-center gap-1">
            <Zap className="w-3 h-3" /> Sync mode — use NOW in timeline
          </span>
        )}
      </div>

      {/* Bulk Paste */}
      {showBulk && (
        <div className="px-3 py-2 border-b border-white/10 bg-gray-900/50">
          <textarea
            value={bulkText}
            onChange={e => setBulkText(e.target.value)}
            placeholder={"[00:02.00] In the silence of the night\n[00:06.00] Stars are dancing in the light\n\nOr just paste plain text (auto-timed 4s each)"}
            className="w-full h-28 bg-gray-900 border border-white/10 rounded-md p-2 text-xs text-white placeholder-gray-600 resize-none focus:outline-none focus:ring-1 focus:ring-purple-500 font-mono"
          />
          <div className="flex gap-2 mt-1.5">
            <button onClick={parseBulkLyrics} className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-[11px] rounded-md transition-colors font-medium">
              Parse & Load
            </button>
            <button onClick={() => setShowBulk(false)} className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-[11px] rounded-md transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Line List */}
      <div ref={listRef} className="flex-1 overflow-y-auto scrollbar-thin">
        {lyrics.length === 0 && (
          <div className="p-6 text-center">
            <AlignLeft className="w-8 h-8 text-gray-700 mx-auto mb-2" />
            <p className="text-xs text-gray-600">No lyrics yet.</p>
            <p className="text-[10px] text-gray-700 mt-1">Click "Add" or load demo to begin.</p>
          </div>
        )}
        {lyrics.map((line, index) => {
          const isActive = index === activeIndex;
          const isSelected = line.id === selectedId;
          const isSyncTarget = syncActive && index === syncIndex;
          const isSynced = syncActive && index < syncIndex;
          const duration = line.endTime - line.startTime;

          return (
            <div
              key={line.id}
              onClick={() => { if (!syncActive) setSelectedId(line.id === selectedId ? null : line.id); }}
              className={`px-3 py-1.5 border-b border-white/5 cursor-pointer transition-all group ${
                isSyncTarget
                  ? 'bg-amber-500/10 border-l-[3px] border-l-amber-500'
                  : isSynced
                    ? 'bg-green-500/5 border-l-[3px] border-l-green-500/40'
                    : isActive
                      ? 'bg-purple-500/15 border-l-[3px] border-l-purple-500'
                      : isSelected
                        ? 'bg-white/5 border-l-[3px] border-l-cyan-500'
                        : 'hover:bg-white/[0.03] border-l-[3px] border-l-transparent'
              }`}
            >
              {/* Main row */}
              <div className="flex items-center gap-1.5">
                {!syncActive && (
                  <GripVertical className="w-3 h-3 text-gray-700 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                )}

                {/* Line number + go-to */}
                <button
                  onClick={e => { e.stopPropagation(); onSeek(line.startTime); }}
                  className={`text-[10px] w-5 h-5 rounded flex items-center justify-center flex-shrink-0 font-mono transition-colors ${
                    isSyncTarget ? 'bg-amber-500/30 text-amber-300 font-bold' :
                    isSynced ? 'bg-green-500/20 text-green-400' :
                    isActive ? 'bg-purple-500/30 text-purple-300' : 'text-gray-600 hover:bg-white/10 hover:text-white'
                  }`}
                  title={`Jump to ${fmtTime(line.startTime)}`}
                >
                  {isSyncTarget ? '▸' : isSynced ? '✓' : index + 1}
                </button>

                {/* Time badge */}
                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded flex-shrink-0 ${
                  isSyncTarget ? 'bg-amber-500/20 text-amber-300' :
                  isSynced ? 'bg-green-500/10 text-green-400' :
                  isActive ? 'bg-purple-500/20 text-purple-300' : 'bg-white/5 text-gray-500'
                }`}>
                  {fmtTime(line.startTime)}
                </span>

                {/* Duration */}
                <span className="text-[9px] font-mono text-gray-600 flex-shrink-0" title={`Duration: ${duration.toFixed(1)}s`}>
                  {duration.toFixed(1)}s
                </span>

                {/* Text */}
                <input
                  type="text"
                  value={line.text}
                  onClick={e => e.stopPropagation()}
                  onChange={e => updateLine(line.id, { text: e.target.value })}
                  className={`flex-1 bg-transparent text-xs focus:outline-none placeholder-gray-700 min-w-0 ${
                    isSyncTarget ? 'text-amber-200 font-semibold' :
                    isActive ? 'text-white font-medium' : 'text-gray-300'
                  }`}
                  placeholder="Enter lyrics..."
                />

                {/* Emphasis */}
                <button
                  onClick={e => { e.stopPropagation(); updateLine(line.id, { emphasis: !line.emphasis }); }}
                  className={`text-xs flex-shrink-0 transition-colors ${line.emphasis ? 'text-yellow-400' : 'text-gray-700 hover:text-gray-500'}`}
                >
                  ★
                </button>

                {/* Delete */}
                {!syncActive && (
                  <button
                    onClick={e => { e.stopPropagation(); removeLine(line.id); }}
                    className="p-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 hover:bg-red-500/20 rounded text-gray-600 hover:text-red-400 transition-all"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Expanded timing controls (when selected, NOT in sync mode) */}
              {isSelected && !syncActive && (
                <div className="mt-2 ml-6 space-y-2 pb-1" onClick={e => e.stopPropagation()}>
                  {/* Start Time */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-500 w-8">Start</span>
                    <button onClick={() => nudgeTime(line.id, 'startTime', -1)} className="w-5 h-5 rounded bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white flex items-center justify-center text-[10px] font-bold">-1</button>
                    <button onClick={() => nudgeTime(line.id, 'startTime', -0.1)} className="w-5 h-5 rounded bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white flex items-center justify-center text-[9px]">-.1</button>
                    <input type="text" value={fmtTime(line.startTime)}
                      onChange={e => updateLine(line.id, { startTime: parseFmtTime(e.target.value) })}
                      className="w-14 bg-gray-900 border border-white/10 rounded px-1.5 py-0.5 text-[11px] text-white font-mono text-center focus:outline-none focus:ring-1 focus:ring-purple-500" />
                    <button onClick={() => nudgeTime(line.id, 'startTime', 0.1)} className="w-5 h-5 rounded bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white flex items-center justify-center text-[9px]">+.1</button>
                    <button onClick={() => nudgeTime(line.id, 'startTime', 1)} className="w-5 h-5 rounded bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white flex items-center justify-center text-[10px] font-bold">+1</button>
                    <button onClick={() => setTimeFromPlayhead(line.id, 'startTime')}
                      className="px-1.5 py-0.5 rounded bg-purple-600/20 text-purple-400 hover:bg-purple-600/30 text-[9px] font-medium">◆ Set</button>
                  </div>

                  {/* End Time */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-500 w-8">End</span>
                    <button onClick={() => nudgeTime(line.id, 'endTime', -1)} className="w-5 h-5 rounded bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white flex items-center justify-center text-[10px] font-bold">-1</button>
                    <button onClick={() => nudgeTime(line.id, 'endTime', -0.1)} className="w-5 h-5 rounded bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white flex items-center justify-center text-[9px]">-.1</button>
                    <input type="text" value={fmtTime(line.endTime)}
                      onChange={e => updateLine(line.id, { endTime: parseFmtTime(e.target.value) })}
                      className="w-14 bg-gray-900 border border-white/10 rounded px-1.5 py-0.5 text-[11px] text-white font-mono text-center focus:outline-none focus:ring-1 focus:ring-purple-500" />
                    <button onClick={() => nudgeTime(line.id, 'endTime', 0.1)} className="w-5 h-5 rounded bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white flex items-center justify-center text-[9px]">+.1</button>
                    <button onClick={() => nudgeTime(line.id, 'endTime', 1)} className="w-5 h-5 rounded bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white flex items-center justify-center text-[10px] font-bold">+1</button>
                    <button onClick={() => setTimeFromPlayhead(line.id, 'endTime')}
                      className="px-1.5 py-0.5 rounded bg-purple-600/20 text-purple-400 hover:bg-purple-600/30 text-[9px] font-medium">◆ Set</button>
                  </div>

                  {/* Duration slider */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-500 w-8">Dur</span>
                    <input type="range" min="0.5" max="15" step="0.1" value={duration}
                      onChange={e => updateLine(line.id, { endTime: line.startTime + parseFloat(e.target.value) })}
                      className="flex-1 accent-purple-500" />
                    <span className="text-[10px] font-mono text-gray-400 w-10 text-right">{duration.toFixed(1)}s</span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 pt-1">
                    <button onClick={() => onSeek(line.startTime)} className="px-2 py-1 rounded bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white text-[10px] flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Jump
                    </button>
                    <button onClick={() => insertLineAfter(index)} className="px-2 py-1 rounded bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white text-[10px] flex items-center gap-1">
                      <Plus className="w-3 h-3" /> Insert After
                    </button>
                    <button onClick={() => duplicateLine(index)} className="px-2 py-1 rounded bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white text-[10px] flex items-center gap-1">
                      <Copy className="w-3 h-3" /> Dup
                    </button>
                    <button onClick={() => moveLine(index, 'up')} disabled={index === 0} className="px-1.5 py-1 rounded bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white text-[10px] disabled:opacity-30">
                      <ChevronUp className="w-3 h-3" />
                    </button>
                    <button onClick={() => moveLine(index, 'down')} disabled={index === lyrics.length - 1} className="px-1.5 py-1 rounded bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white text-[10px] disabled:opacity-30">
                      <ChevronDown className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer — Global Time Tools */}
      <div className="border-t border-white/10 px-3 py-2 space-y-1.5 bg-gray-900/40">
        <div className="flex items-center gap-1 flex-wrap">
          <span className="text-[10px] text-gray-500 mr-1">Shift All:</span>
          <button onClick={() => shiftAllTimes(-1)} className="px-2 py-0.5 rounded bg-white/5 text-gray-400 hover:bg-white/10 text-[10px]">-1s</button>
          <button onClick={() => shiftAllTimes(-0.5)} className="px-2 py-0.5 rounded bg-white/5 text-gray-400 hover:bg-white/10 text-[10px]">-0.5s</button>
          <button onClick={() => shiftAllTimes(0.5)} className="px-2 py-0.5 rounded bg-white/5 text-gray-400 hover:bg-white/10 text-[10px]">+0.5s</button>
          <button onClick={() => shiftAllTimes(1)} className="px-2 py-0.5 rounded bg-white/5 text-gray-400 hover:bg-white/10 text-[10px]">+1s</button>
          <div className="w-px h-3 bg-white/10 mx-0.5" />
          <button onClick={spreadEvenly} className="px-2 py-0.5 rounded bg-white/5 text-gray-400 hover:bg-white/10 text-[10px]" title="Distribute equal timing">Even</button>
          <button onClick={recalcEndTimes} className="px-2 py-0.5 rounded bg-white/5 text-gray-400 hover:bg-white/10 text-[10px]" title="Auto-fix end times">Fix Gaps</button>
        </div>
        <div className="flex items-center justify-between text-[10px] text-gray-600">
          <span>▸ {fmtTime(currentTime)}</span>
          <span>{syncActive ? `⚡ Syncing line ${syncIndex + 1}` : selectedId ? `Editing line ${selectedIndex + 1}` : 'Click line to edit'}</span>
        </div>
      </div>
    </div>
  );
}
