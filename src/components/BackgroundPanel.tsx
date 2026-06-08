import React from 'react';
import type { BackgroundConfig, ParticleConfig } from '../types';
import { GRADIENT_PRESETS } from '../data/presets';
import { Image, Sparkles, Eye } from 'lucide-react';

interface BackgroundPanelProps {
  background: BackgroundConfig;
  setBackground: React.Dispatch<React.SetStateAction<BackgroundConfig>>;
  particles: ParticleConfig;
  setParticles: React.Dispatch<React.SetStateAction<ParticleConfig>>;
}

export default function BackgroundPanel({ background, setBackground, particles, setParticles }: BackgroundPanelProps) {
  const [activeTab, setActiveTab] = React.useState<'bg' | 'particles'>('bg');

  return (
    <div className="flex flex-col h-full bg-gray-950/80 backdrop-blur-sm">
      {/* Tabs */}
      <div className="flex border-b border-white/10">
        <button
          onClick={() => setActiveTab('bg')}
          className={`flex-1 px-4 py-2.5 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${
            activeTab === 'bg'
              ? 'text-white border-b-2 border-purple-500 bg-white/5'
              : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          <Image className="w-3.5 h-3.5" />
          Background
        </button>
        <button
          onClick={() => setActiveTab('particles')}
          className={`flex-1 px-4 py-2.5 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${
            activeTab === 'particles'
              ? 'text-white border-b-2 border-purple-500 bg-white/5'
              : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          Particles
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'bg' && (
          <div className="p-4 space-y-5">
            {/* Background Type */}
            <div>
              <label className="block text-xs text-gray-400 mb-2 font-medium">Background Type</label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { value: 'solid', icon: '🎨', label: 'Solid' },
                  { value: 'gradient', icon: '🌈', label: 'Gradient' },
                  { value: 'animated', icon: '🌌', label: 'Animated' },
                ].map((t) => (
                  <button
                    key={t.value}
                    onClick={() =>
                      setBackground((p) => ({ ...p, type: t.value as BackgroundConfig['type'] }))
                    }
                    className={`px-3 py-2 rounded-md text-xs transition-all ${
                      background.type === t.value
                        ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20'
                        : 'bg-gray-900 text-gray-400 hover:bg-gray-800'
                    }`}
                  >
                    <div className="text-lg mb-0.5">{t.icon}</div>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Solid Color */}
            {background.type === 'solid' && (
              <div>
                <label className="block text-xs text-gray-400 mb-2 font-medium">Background Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={background.solidColor}
                    onChange={(e) => setBackground((p) => ({ ...p, solidColor: e.target.value }))}
                    className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border-0"
                  />
                  <input
                    type="text"
                    value={background.solidColor}
                    onChange={(e) =>
                      setBackground((p) => ({ ...p, solidColor: e.target.value }))
                    }
                    className="flex-1 bg-gray-900 border border-white/10 rounded-md px-3 py-2 text-sm text-white font-mono focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>
              </div>
            )}

            {/* Gradient */}
            {background.type === 'gradient' && (
              <>
                <div>
                  <label className="block text-xs text-gray-400 mb-2 font-medium">Gradient Presets</label>
                  <div className="grid grid-cols-5 gap-1.5">
                    {GRADIENT_PRESETS.map((g) => (
                      <button
                        key={g.name}
                        onClick={() =>
                          setBackground((p) => ({
                            ...p,
                            gradientStart: g.start,
                            gradientEnd: g.end,
                          }))
                        }
                        className={`h-10 rounded-md transition-all hover:scale-105 ${
                          background.gradientStart === g.start && background.gradientEnd === g.end
                            ? 'ring-2 ring-white ring-offset-2 ring-offset-gray-900'
                            : ''
                        }`}
                        style={{
                          background: `linear-gradient(135deg, ${g.start}, ${g.end})`,
                        }}
                        title={g.name}
                      />
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1.5">Start Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={background.gradientStart}
                        onChange={(e) =>
                          setBackground((p) => ({ ...p, gradientStart: e.target.value }))
                        }
                        className="w-8 h-8 rounded cursor-pointer bg-transparent border-0"
                      />
                      <input
                        type="text"
                        value={background.gradientStart}
                        onChange={(e) =>
                          setBackground((p) => ({ ...p, gradientStart: e.target.value }))
                        }
                        className="flex-1 bg-gray-900 border border-white/10 rounded px-2 py-1.5 text-xs text-white font-mono focus:outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1.5">End Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={background.gradientEnd}
                        onChange={(e) =>
                          setBackground((p) => ({ ...p, gradientEnd: e.target.value }))
                        }
                        className="w-8 h-8 rounded cursor-pointer bg-transparent border-0"
                      />
                      <input
                        type="text"
                        value={background.gradientEnd}
                        onChange={(e) =>
                          setBackground((p) => ({ ...p, gradientEnd: e.target.value }))
                        }
                        className="flex-1 bg-gray-900 border border-white/10 rounded px-2 py-1.5 text-xs text-white font-mono focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">Direction</label>
                  <select
                    value={background.gradientDirection}
                    onChange={(e) =>
                      setBackground((p) => ({ ...p, gradientDirection: e.target.value }))
                    }
                    className="w-full bg-gray-900 border border-white/10 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                  >
                    <option value="135deg">Diagonal ↘</option>
                    <option value="90deg">Left → Right</option>
                    <option value="180deg">Top → Bottom</option>
                    <option value="45deg">Diagonal ↗</option>
                    <option value="0deg">Bottom → Top</option>
                    <option value="270deg">Right → Left</option>
                    <option value="radial">Radial</option>
                  </select>
                </div>
              </>
            )}

            {/* Animated */}
            {background.type === 'animated' && (
              <div>
                <label className="block text-xs text-gray-400 mb-2 font-medium">Animated Style</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { value: 'waveform', icon: '📊', label: 'Waveform' },
                    { value: 'aurora', icon: '🌌', label: 'Aurora' },
                    { value: 'stars', icon: '⭐', label: 'Stars' },
                    { value: 'fire', icon: '🔥', label: 'Fire' },
                    { value: 'particles', icon: '✨', label: 'Particles' },
                  ].map((s) => (
                    <button
                      key={s.value}
                      onClick={() =>
                        setBackground((p) => ({
                          ...p,
                          animatedStyle: s.value as BackgroundConfig['animatedStyle'],
                        }))
                      }
                      className={`px-3 py-2 rounded-md text-xs transition-all ${
                        background.animatedStyle === s.value
                          ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20'
                          : 'bg-gray-900 text-gray-400 hover:bg-gray-800'
                      }`}
                    >
                      <div className="text-lg mb-0.5">{s.icon}</div>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Overlay Opacity */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs text-gray-400 font-medium flex items-center gap-1">
                  <Eye className="w-3 h-3" /> Overlay Opacity
                </label>
                <span className="text-xs text-gray-500 font-mono">{Math.round(background.opacity * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={background.opacity}
                onChange={(e) => setBackground((p) => ({ ...p, opacity: parseFloat(e.target.value) }))}
                className="w-full accent-purple-500"
              />
            </div>
          </div>
        )}

        {activeTab === 'particles' && (
          <div className="p-4 space-y-5">
            {/* Toggle */}
            <div className="flex items-center justify-between">
              <label className="text-xs text-gray-400 font-medium">Enable Particles</label>
              <button
                onClick={() => setParticles((p) => ({ ...p, enabled: !p.enabled }))}
                className={`w-10 h-5 rounded-full transition-colors relative ${
                  particles.enabled ? 'bg-purple-600' : 'bg-gray-700'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform ${
                    particles.enabled ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            {particles.enabled && (
              <>
                {/* Particle Type */}
                <div>
                  <label className="block text-xs text-gray-400 mb-2 font-medium">Particle Type</label>
                  <div className="grid grid-cols-5 gap-1">
                    {[
                      { value: 'sparkles', icon: '✦' },
                      { value: 'notes', icon: '♪' },
                      { value: 'stars', icon: '★' },
                      { value: 'hearts', icon: '♥' },
                      { value: 'bubbles', icon: '○' },
                    ].map((p) => (
                      <button
                        key={p.value}
                        onClick={() =>
                          setParticles((prev) => ({ ...prev, type: p.value as ParticleConfig['type'] }))
                        }
                        className={`py-2 rounded text-lg transition-all ${
                          particles.type === p.value
                            ? 'bg-purple-600 shadow-lg shadow-purple-500/20'
                            : 'bg-gray-900 hover:bg-gray-800'
                        }`}
                      >
                        {p.icon}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Count */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-xs text-gray-400 font-medium">Count</label>
                    <span className="text-xs text-gray-500 font-mono">{particles.count}</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="50"
                    value={particles.count}
                    onChange={(e) =>
                      setParticles((p) => ({ ...p, count: parseInt(e.target.value) }))
                    }
                    className="w-full accent-purple-500"
                  />
                </div>

                {/* Speed */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-xs text-gray-400 font-medium">Speed</label>
                    <span className="text-xs text-gray-500 font-mono">{particles.speed}px</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="5"
                    step="0.5"
                    value={particles.speed}
                    onChange={(e) =>
                      setParticles((p) => ({ ...p, speed: parseFloat(e.target.value) }))
                    }
                    className="w-full accent-purple-500"
                  />
                </div>

                {/* Size */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-xs text-gray-400 font-medium">Size</label>
                    <span className="text-xs text-gray-500 font-mono">{particles.size}px</span>
                  </div>
                  <input
                    type="range"
                    min="8"
                    max="40"
                    value={particles.size}
                    onChange={(e) =>
                      setParticles((p) => ({ ...p, size: parseInt(e.target.value) }))
                    }
                    className="w-full accent-purple-500"
                  />
                </div>

                {/* Color */}
                <div>
                  <label className="block text-xs text-gray-400 mb-2 font-medium">Particle Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={particles.color}
                      onChange={(e) =>
                        setParticles((p) => ({ ...p, color: e.target.value }))
                      }
                      className="w-8 h-8 rounded cursor-pointer bg-transparent border-0"
                    />
                    <input
                      type="text"
                      value={particles.color}
                      onChange={(e) =>
                        setParticles((p) => ({ ...p, color: e.target.value }))
                      }
                      className="flex-1 bg-gray-900 border border-white/10 rounded-md px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
