import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import type { LyricLine, BackgroundConfig, FontConfig, AnimationConfig, ParticleConfig } from '../types';

interface PreviewCanvasProps {
  lyrics: LyricLine[];
  currentTime: number;
  background: BackgroundConfig;
  font: FontConfig;
  animation: AnimationConfig;
  particles: ParticleConfig;
  canvasRatio: '16:9' | '9:16' | '1:1' | '4:3';
  onSeek?: (time: number) => void;
}

const getAspectRatio = (ratio: string) => {
  switch (ratio) {
    case '16:9': return { w: 16, h: 9 };
    case '9:16': return { w: 9, h: 16 };
    case '1:1': return { w: 1, h: 1 };
    case '4:3': return { w: 4, h: 3 };
    default: return { w: 16, h: 9 };
  }
};

export default function PreviewCanvas({ lyrics, currentTime, background, font, animation, particles, canvasRatio, onSeek }: PreviewCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const particleCanvas = useRef<HTMLCanvasElement>(null);
  const [dimensions, setDimensions] = useState({ w: 800, h: 450 });

  useEffect(() => {
    const updateSize = () => {
      if (canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        setDimensions({ w: rect.width, h: rect.height });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // ─── Active line ───
  const activeIndex = lyrics.findIndex(
    (line, i) => currentTime >= line.startTime && currentTime < (lyrics[i + 1]?.startTime ?? line.endTime)
  );
  const activeLine = activeIndex >= 0 ? lyrics[activeIndex] : null;

  // Progress through the active line (0→1), used ONLY for karaoke/typewriter — NOT for positioning
  const lineProgress = useMemo(() => {
    if (!activeLine) return 0;
    const elapsed = currentTime - activeLine.startTime;
    const dur = activeLine.endTime - activeLine.startTime;
    return dur > 0 ? Math.max(0, Math.min(1, elapsed / dur)) : 0;
  }, [activeLine, currentTime]);

  // ─── Line gap: scale to 8% of canvas height so all ratios look good ───
  // Falls back to font-size based spacing when canvas height is unknown
  const gap = dimensions.h > 0
    ? Math.max(font.fontSize * 1.6, dimensions.h * 0.08)
    : Math.max(50, font.fontSize * 2.2);

  // ─── Star positions: frozen once so they don't jump every render ───
  const starPositions = useMemo(() =>
    Array.from({ length: 50 }, () => ({
      w:     Math.random() * 3 + 1,
      h:     Math.random() * 3 + 1,
      left:  `${Math.random() * 100}%`,
      top:   `${Math.random() * 100}%`,
      delay: `${Math.random() * 3}s`,
      dur:   `${Math.random() * 2 + 1}s`,
    }))
  , []);



  // ─── CSS animation class for active line ───
  const getActiveAnimClass = useCallback((): string => {
    switch (animation.style) {
      case 'bounceIn': return 'animate-bounceIn';
      case 'zoomIn':   return 'animate-zoomIn';
      case 'rain':     return 'animate-rain';
      case 'slideIn':  return 'animate-slideIn';
      case 'fadeIn':   return 'animate-fadeIn';
      default:         return '';
    }
  }, [animation.style]);

  // ─── Render active line content (karaoke, typewriter etc.) ───
  const renderContent = (line: LyricLine, isActive: boolean): React.ReactNode => {
    if (!isActive) return line.text;

    switch (animation.style) {
      case 'typewriter': {
        const chars = Math.floor(line.text.length * lineProgress);
        return <>{line.text.substring(0, chars)}<span className="animate-pulse">▋</span></>;
      }
      case 'karaoke':
        return (
          <span style={{
            background: `linear-gradient(90deg, ${font.textColor} ${lineProgress * 100}%, ${font.textColor}30 ${lineProgress * 100}%)`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
            {line.text}
          </span>
        );
      case 'wave':
        return (
          <>
            {line.text.split('').map((char, i) => (
              <span key={i} style={{
                display: 'inline-block',
                transform: `translateY(${Math.sin(currentTime * 4 + i * 0.4) * 5}px)`,
              }}>
                {char === ' ' ? '\u00A0' : char}
              </span>
            ))}
          </>
        );
      case 'glitch': {
        if (lineProgress < 0.15) {
          const g = (Math.random() - 0.5) * 5;
          return (
            <span style={{
              display: 'inline-block',
              transform: `translateX(${g}px)`,
              textShadow: `${-g}px 0 #ff0000, ${g}px 0 #00ffff`,
            }}>
              {line.text}
            </span>
          );
        }
        return line.text;
      }
      default:
        return line.text;
    }
  };

  // ─── Particle system ───
  useEffect(() => {
    if (!particles.enabled || !particleCanvas.current) return;
    const canvas = particleCanvas.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = dimensions.w;
    canvas.height = dimensions.h;

    const symbols: Record<string, string[]> = {
      sparkles: ['✦', '✧', '⋆', '·'], notes: ['♪', '♫', '♬', '🎵', '🎶'],
      stars: ['★', '☆', '✦', '·'], hearts: ['♥', '♡', '❤', '💕'],
      bubbles: ['○', '◌', '●', '◎'],
    };
    const syms = symbols[particles.type] || symbols.sparkles;
    const pArr: { x: number; y: number; vx: number; vy: number; size: number; alpha: number; rot: number; sym: string }[] = [];
    for (let i = 0; i < particles.count; i++) {
      pArr.push({
        x: Math.random() * canvas.width, y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * particles.speed,
        vy: (Math.random() - 0.5) * particles.speed - particles.speed * 0.5,
        size: particles.size * (Math.random() * 0.5 + 0.5),
        alpha: Math.random(), rot: Math.random() * 360,
        sym: syms[Math.floor(Math.random() * syms.length)],
      });
    }
    let animId: number;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      pArr.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        p.alpha = Math.max(0.1, Math.min(0.8, p.alpha + (Math.random() - 0.5) * 0.02));
        p.rot += 1;
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
        ctx.save(); ctx.globalAlpha = p.alpha; ctx.fillStyle = particles.color;
        ctx.font = `${p.size}px serif`; ctx.translate(p.x, p.y);
        ctx.rotate((p.rot * Math.PI) / 180); ctx.fillText(p.sym, 0, 0); ctx.restore();
      });
      animId = requestAnimationFrame(animate);
    };
    animate();
    return () => cancelAnimationFrame(animId);
  }, [particles, dimensions]);

  // ─── Background ───
  const getBackgroundStyle = (): React.CSSProperties => {
    switch (background.type) {
      case 'gradient':
        return { background: `linear-gradient(${background.gradientDirection}, ${background.gradientStart}, ${background.gradientEnd})` };
      case 'image':
        return { backgroundImage: `url(${background.imageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' };
      case 'animated':
        switch (background.animatedStyle) {
          case 'waveform': return { background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)' };
          case 'aurora': return { background: 'linear-gradient(135deg, #0f172a, #1a0533, #0a1628, #0f172a)' };
          case 'stars': return { background: 'radial-gradient(ellipse at center, #1a1a2e 0%, #0a0a0a 100%)' };
          case 'fire': return { background: 'linear-gradient(180deg, #1a0000 0%, #330000 50%, #1a0000 100%)' };
          default: return { backgroundColor: '#0f172a' };
        }
      default:
        return { backgroundColor: background.solidColor };
    }
  };

  const aspectRatio = getAspectRatio(canvasRatio);

  // ─── ALL lyrics rendered, positioned by CSS translateY keyed to activeIndex ───
  // Key insight: each line's translateY depends only on `activeIndex`, NOT on `lineProgress`.
  // This means CSS transition only triggers on line change (smooth slide), not every 50ms.
  return (
    <div
      ref={canvasRef}
      className="relative overflow-hidden rounded-lg shadow-2xl border border-white/10"
      style={{
        aspectRatio: `${aspectRatio.w} / ${aspectRatio.h}`,
        maxHeight: 'calc(100vh - 200px)',
        ...getBackgroundStyle(),
      }}
      onClick={(e) => {
        if (onSeek) {
          const rect = e.currentTarget.getBoundingClientRect();
          const x = e.clientX - rect.left;
          onSeek((x / rect.width) * (lyrics[lyrics.length - 1]?.endTime ?? 60));
        }
      }}
    >
      {/* Animated BGs */}
      {background.type === 'animated' && background.animatedStyle === 'waveform' && (
        <div className="absolute inset-0 opacity-30">
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className="absolute bottom-0 bg-cyan-500/20 rounded-t-full"
              style={{ left: `${(i/20)*100}%`, width: '4%', height: `${Math.sin(currentTime*2+i*0.5)*30+40}%`, transition: 'height 0.15s ease' }} />
          ))}
        </div>
      )}
      {background.type === 'animated' && background.animatedStyle === 'aurora' && (
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute w-[200%] h-[50%] rounded-full blur-3xl opacity-20"
            style={{ background: 'radial-gradient(ellipse, rgba(74,222,128,0.4), transparent 70%)', top:'20%', left:'-50%', animation:'aurora 8s ease-in-out infinite alternate' }} />
          <div className="absolute w-[200%] h-[50%] rounded-full blur-3xl opacity-20"
            style={{ background: 'radial-gradient(ellipse, rgba(168,85,247,0.4), transparent 70%)', top:'10%', left:'-30%', animation:'aurora 12s ease-in-out infinite alternate-reverse' }} />
        </div>
      )}
      {background.type === 'animated' && background.animatedStyle === 'stars' && (
        <div className="absolute inset-0">
          {starPositions.map((star, i) => (
            <div key={i} className="absolute rounded-full bg-white animate-pulse"
              style={{
                width: star.w,
                height: star.h,
                left: star.left,
                top: star.top,
                animationDelay: star.delay,
                animationDuration: star.dur,
              }} />
          ))}
        </div>
      )}

      {/* Particles */}
      {particles.enabled && (
        <canvas ref={particleCanvas} className="absolute inset-0 pointer-events-none z-10" style={{ width:'100%', height:'100%' }} />
      )}

      {/* Dark overlay */}
      <div className="absolute inset-0 z-0" style={{ background: 'rgba(0,0,0,0.3)' }} />

      {/* ════════ LYRICS ════════ */}
      <div className="absolute inset-0 z-20 overflow-hidden">
        {/*
          The entire lyrics container moves up/down as one unit.
          transform depends ONLY on activeIndex → smooth CSS transition on line change.
          No per-frame jitter.
        */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: '50%',
            // Shift the whole stack so the active line is centered
            transform: `translateY(${-(activeIndex >= 0 ? activeIndex : 0) * gap}px)`,
            transition: `transform ${animation.duration}s ${animation.easing}`,
            willChange: 'transform',
          }}
        >
          {lyrics.map((line, i) => {
            const isActive = i === activeIndex;
            const dist = activeIndex >= 0 ? Math.abs(i - activeIndex) : lyrics.length;
            const isVisible = dist <= 4;

            // Opacity: purely based on distance (not lineProgress)
            const opacity = isActive ? 1
              : dist === 1 ? 0.35
              : dist === 2 ? 0.15
              : dist === 3 ? 0.08
              : 0;

            // Scale
            const scale = isActive ? 1 : Math.max(0.65, 0.82 - dist * 0.06);

            // Font size
            const fontSize = isActive ? font.fontSize
              : font.fontSize * Math.max(0.5, 0.7 - dist * 0.05);

            // Blur
            const blur = isActive ? 0 : Math.min(2.5, dist * 1);

            // Neon
            const neonShadow = isActive && animation.style === 'neon'
              ? `0 0 10px ${animation.glowColor}, 0 0 20px ${animation.glowColor}, 0 0 40px ${animation.glowColor}`
              : undefined;

            const textShadow = neonShadow
              || (isActive && font.textShadow
                ? `0 0 20px ${font.textShadowColor}, 0 2px 8px rgba(0,0,0,0.8)`
                : isActive ? '0 2px 8px rgba(0,0,0,0.6)' : 'none');

            // ─── Build CSS transition string using user's animation settings ───
            const dur = `${animation.duration}s`;
            const ease = animation.easing;

            // For the active line, add an entry animation class so slideIn/bounceIn etc. trigger
            const entryClass = isActive ? getActiveAnimClass() : '';

            // Custom CSS animation duration injected via inline style on the keyframe
            const animStyle: React.CSSProperties = isActive && entryClass
              ? { animationDuration: dur, animationTimingFunction: ease }
              : {};

            return (
              <div
                // Re-keying on activeIndex+id forces the CSS animation to replay each time the active line changes
                key={`${line.id}-${isActive ? activeIndex : i}`}
                className={entryClass}
                style={{
                  position: 'relative',
                  height: gap,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  // Smooth transitions — only triggered on activeIndex change
                  opacity: isVisible ? opacity : 0,
                  transform: `scale(${scale})`,
                  transition: `opacity ${dur} ${ease}, transform ${dur} ${ease}, filter ${dur} ${ease}`,
                  filter: blur > 0 ? `blur(${blur}px)` : 'none',
                  pointerEvents: 'none',
                  willChange: 'opacity, transform',
                  ...animStyle,
                }}
              >
                <span
                  style={{
                    fontFamily: font.fontFamily,
                    fontSize,
                    fontWeight: isActive ? font.fontWeight : '400',
                    color: font.textColor,
                    letterSpacing: font.letterSpacing,
                    lineHeight: font.lineHeight,
                    textTransform: font.textTransform,
                    textShadow,
                    textAlign: 'center',
                    maxWidth: '85%',
                    display: 'inline-block',
                    // NO transition on font-size for the span itself to avoid size-jitter
                    WebkitTextStroke: font.textStroke ? `${font.textStrokeWidth}px ${font.textStrokeColor}` : undefined,
                  }}
                >
                  {renderContent(line, isActive)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Glow */}
      {activeLine && animation.activeLineGlow && (
        <div className="absolute inset-0 z-10 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse at center, ${animation.glowColor}${Math.round(animation.glowIntensity * 25).toString(16).padStart(2,'0')} 0%, transparent 70%)`,
            transition: 'opacity 0.6s ease',
          }} />
      )}

      {/* Edge fade masks */}
      <div className="absolute inset-x-0 top-0 h-[30%] z-30 pointer-events-none"
        style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.7), transparent)' }} />
      <div className="absolute inset-x-0 bottom-0 h-[30%] z-30 pointer-events-none"
        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)' }} />
    </div>
  );
}
