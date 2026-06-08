import React from 'react';
import type { FontConfig, AnimationConfig } from '../types';
import {
  FONT_FAMILIES,
  ANIMATION_PRESETS,
  COLOR_THEMES,
} from '../data/presets';
import { Type, Palette, Zap, Sparkles, Move } from 'lucide-react';

interface StylePanelProps {
  font: FontConfig;
  setFont: React.Dispatch<React.SetStateAction<FontConfig>>;
  animation: AnimationConfig;
  setAnimation: React.Dispatch<React.SetStateAction<AnimationConfig>>;
}

export default function StylePanel({ font, setFont, animation, setAnimation }: StylePanelProps) {
  const [activeTab, setActiveTab] = React.useState<'font' | 'animation'>('font');

  return (
    <div className="flex flex-col h-full bg-gray-950/80 backdrop-blur-sm">
      {/* Tabs */}
      <div className="flex border-b border-white/10">
        <button
          onClick={() => setActiveTab('font')}
          className={`flex-1 px-4 py-2.5 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${
            activeTab === 'font'
              ? 'text-white border-b-2 border-purple-500 bg-white/5'
              : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          <Type className="w-3.5 h-3.5" />
          Font & Color
        </button>
        <button
          onClick={() => setActiveTab('animation')}
          className={`flex-1 px-4 py-2.5 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${
            activeTab === 'animation'
              ? 'text-white border-b-2 border-purple-500 bg-white/5'
              : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          Animation
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'font' && (
          <div className="p-4 space-y-5">
            {/* Font Family */}
            <div>
              <label className="block text-xs text-gray-400 mb-2 font-medium">Font Family</label>
              <select
                value={font.fontFamily}
                onChange={(e) => setFont((p) => ({ ...p, fontFamily: e.target.value }))}
                className="w-full bg-gray-900 border border-white/10 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
              >
                {FONT_FAMILIES.map((f) => (
                  <option key={f.name} value={f.value} style={{ fontFamily: f.value }}>
                    {f.name}
                  </option>
                ))}
              </select>
              <div className="mt-2 px-2 py-3 bg-gray-900/50 rounded-md text-center">
                <span className="text-xl text-white" style={{ fontFamily: font.fontFamily }}>
                  The quick brown fox
                </span>
              </div>
            </div>

            {/* Font Size */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs text-gray-400 font-medium">Font Size</label>
                <span className="text-xs text-gray-500 font-mono">{font.fontSize}px</span>
              </div>
              <input
                type="range"
                min="16"
                max="80"
                value={font.fontSize}
                onChange={(e) => setFont((p) => ({ ...p, fontSize: parseInt(e.target.value) }))}
                className="w-full accent-purple-500"
              />
            </div>

            {/* Font Weight */}
            <div>
              <label className="block text-xs text-gray-400 mb-2 font-medium">Font Weight</label>
              <div className="grid grid-cols-4 gap-1">
                {['300', '400', '500', '600', '700', '800', '900'].map((w) => (
                  <button
                    key={w}
                    onClick={() => setFont((p) => ({ ...p, fontWeight: w }))}
                    className={`py-1.5 rounded text-xs transition-colors ${
                      font.fontWeight === w
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-900 text-gray-400 hover:bg-gray-800'
                    }`}
                    style={{ fontWeight: w }}
                  >
                    {w}
                  </button>
                ))}
              </div>
            </div>

            {/* Text Color */}
            <div>
              <label className="block text-xs text-gray-400 mb-2 font-medium flex items-center gap-1">
                <Palette className="w-3 h-3" /> Text Color
              </label>
              <div className="grid grid-cols-4 gap-2 mb-2">
                {COLOR_THEMES.map((c) => (
                  <button
                    key={c.name}
                    onClick={() => setFont((p) => ({ ...p, textColor: c.value }))}
                    className={`h-8 rounded-md transition-all ${
                      font.textColor === c.value ? 'ring-2 ring-white ring-offset-2 ring-offset-gray-900 scale-110' : ''
                    }`}
                    style={{ backgroundColor: c.value }}
                    title={c.name}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={font.textColor}
                  onChange={(e) => setFont((p) => ({ ...p, textColor: e.target.value }))}
                  className="w-8 h-8 rounded cursor-pointer bg-transparent border-0"
                />
                <input
                  type="text"
                  value={font.textColor}
                  onChange={(e) => setFont((p) => ({ ...p, textColor: e.target.value }))}
                  className="flex-1 bg-gray-900 border border-white/10 rounded-md px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>
            </div>

            {/* Text Shadow */}
            <div className="flex items-center justify-between">
              <label className="text-xs text-gray-400 font-medium flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Text Shadow
              </label>
              <button
                onClick={() => setFont((p) => ({ ...p, textShadow: !p.textShadow }))}
                className={`w-10 h-5 rounded-full transition-colors relative ${
                  font.textShadow ? 'bg-purple-600' : 'bg-gray-700'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform ${
                    font.textShadow ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            {/* Letter Spacing */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs text-gray-400 font-medium">Letter Spacing</label>
                <span className="text-xs text-gray-500 font-mono">{font.letterSpacing}px</span>
              </div>
              <input
                type="range"
                min="-2"
                max="10"
                step="0.5"
                value={font.letterSpacing}
                onChange={(e) =>
                  setFont((p) => ({ ...p, letterSpacing: parseFloat(e.target.value) }))
                }
                className="w-full accent-purple-500"
              />
            </div>

            {/* Line Height */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs text-gray-400 font-medium">Line Height</label>
                <span className="text-xs text-gray-500 font-mono">{font.lineHeight}</span>
              </div>
              <input
                type="range"
                min="0.8"
                max="2.5"
                step="0.1"
                value={font.lineHeight}
                onChange={(e) =>
                  setFont((p) => ({ ...p, lineHeight: parseFloat(e.target.value) }))
                }
                className="w-full accent-purple-500"
              />
            </div>

            {/* Text Transform */}
            <div>
              <label className="block text-xs text-gray-400 mb-2 font-medium">Text Transform</label>
              <div className="grid grid-cols-4 gap-1">
                {(['none', 'uppercase', 'lowercase', 'capitalize'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setFont((p) => ({ ...p, textTransform: t }))}
                    className={`py-1.5 rounded text-xs transition-colors ${
                      font.textTransform === t
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-900 text-gray-400 hover:bg-gray-800'
                    }`}
                  >
                    {t === 'none' ? 'Aa' : t === 'uppercase' ? 'AA' : t === 'lowercase' ? 'aa' : 'Aa'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'animation' && (
          <div className="p-4 space-y-5">
            {/* Animation Style */}
            <div>
              <label className="block text-xs text-gray-400 mb-2 font-medium">Animation Style</label>
              <div className="grid grid-cols-2 gap-1.5">
                {ANIMATION_PRESETS.map((a) => (
                  <button
                    key={a.value}
                    onClick={() => setAnimation((p) => ({ ...p, style: a.value as AnimationConfig['style'] }))}
                    className={`px-3 py-2 rounded-md text-xs transition-all flex items-center gap-1.5 ${
                      animation.style === a.value
                        ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20'
                        : 'bg-gray-900 text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                    }`}
                  >
                    <span>{a.icon}</span>
                    {a.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Duration */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs text-gray-400 font-medium">Duration</label>
                <span className="text-xs text-gray-500 font-mono">{animation.duration}s</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="3"
                step="0.1"
                value={animation.duration}
                onChange={(e) =>
                  setAnimation((p) => ({ ...p, duration: parseFloat(e.target.value) }))
                }
                className="w-full accent-purple-500"
              />
            </div>

            {/* Stagger Delay */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs text-gray-400 font-medium">Stagger Delay</label>
                <span className="text-xs text-gray-500 font-mono">{animation.staggerDelay}s</span>
              </div>
              <input
                type="range"
                min="0"
                max="0.5"
                step="0.05"
                value={animation.staggerDelay}
                onChange={(e) =>
                  setAnimation((p) => ({ ...p, staggerDelay: parseFloat(e.target.value) }))
                }
                className="w-full accent-purple-500"
              />
            </div>

            {/* Direction */}
            <div>
              <label className="block text-xs text-gray-400 mb-2 font-medium flex items-center gap-1">
                <Move className="w-3 h-3" /> Direction
              </label>
              <div className="grid grid-cols-5 gap-1">
                {(['left', 'right', 'top', 'bottom', 'center'] as const).map((d) => (
                  <button
                    key={d}
                    onClick={() => setAnimation((p) => ({ ...p, direction: d }))}
                    className={`py-1.5 rounded text-xs transition-colors ${
                      animation.direction === d
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-900 text-gray-400 hover:bg-gray-800'
                    }`}
                  >
                    {d === 'left' ? '←' : d === 'right' ? '→' : d === 'top' ? '↑' : d === 'bottom' ? '↓' : '●'}
                  </button>
                ))}
              </div>
            </div>

            {/* Easing */}
            <div>
              <label className="block text-xs text-gray-400 mb-2 font-medium">Easing</label>
              <select
                value={animation.easing}
                onChange={(e) =>
                  setAnimation((p) => ({
                    ...p,
                    easing: e.target.value as AnimationConfig['easing'],
                  }))
                }
                className="w-full bg-gray-900 border border-white/10 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
              >
                <option value="ease">Ease</option>
                <option value="ease-in">Ease In</option>
                <option value="ease-out">Ease Out</option>
                <option value="ease-in-out">Ease In Out</option>
                <option value="linear">Linear</option>
              </select>
            </div>

            {/* Glow effect */}
            <div className="flex items-center justify-between">
              <label className="text-xs text-gray-400 font-medium">Active Line Glow</label>
              <button
                onClick={() =>
                  setAnimation((p) => ({ ...p, activeLineGlow: !p.activeLineGlow }))
                }
                className={`w-10 h-5 rounded-full transition-colors relative ${
                  animation.activeLineGlow ? 'bg-purple-600' : 'bg-gray-700'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform ${
                    animation.activeLineGlow ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            {/* Glow Color */}
            {animation.activeLineGlow && (
              <div>
                <label className="block text-xs text-gray-400 mb-2 font-medium">Glow Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={animation.glowColor}
                    onChange={(e) =>
                      setAnimation((p) => ({ ...p, glowColor: e.target.value }))
                    }
                    className="w-8 h-8 rounded cursor-pointer bg-transparent border-0"
                  />
                  <input
                    type="text"
                    value={animation.glowColor}
                    onChange={(e) =>
                      setAnimation((p) => ({ ...p, glowColor: e.target.value }))
                    }
                    className="flex-1 bg-gray-900 border border-white/10 rounded-md px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>
              </div>
            )}

            {/* Glow Intensity */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs text-gray-400 font-medium">Glow Intensity</label>
                <span className="text-xs text-gray-500 font-mono">{Math.round(animation.glowIntensity * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={animation.glowIntensity}
                onChange={(e) =>
                  setAnimation((p) => ({ ...p, glowIntensity: parseFloat(e.target.value) }))
                }
                className="w-full accent-purple-500"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
