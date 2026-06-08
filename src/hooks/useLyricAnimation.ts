import { useState, useEffect, useRef, useMemo } from 'react';
import type { LyricLine, AnimationConfig } from '../types';

interface AnimationState {
  activeLyric: LyricLine | null;
  activeIndex: number;
  charIndex: number;
  karaokeProgress: number;
  wordAnimations: { word: string; delay: number; opacity: number; transform: string }[];
}

export function useLyricAnimation(
  lyrics: LyricLine[],
  currentTime: number,
  animation: AnimationConfig,
) {
  const [state, setState] = useState<AnimationState>({
    activeLyric: null,
    activeIndex: -1,
    charIndex: 0,
    karaokeProgress: 0,
    wordAnimations: [],
  });

  const frameRef = useRef<number>(0);

  useEffect(() => {
    const activeIndex = lyrics.findIndex(
      (line, i) =>
        currentTime >= line.startTime &&
        currentTime < (lyrics[i + 1]?.startTime ?? line.endTime)
    );

    if (activeIndex === -1) {
      setState({
        activeLyric: null,
        activeIndex: -1,
        charIndex: 0,
        karaokeProgress: 0,
        wordAnimations: [],
      });
      return;
    }

    const line = lyrics[activeIndex];
    const lineElapsed = currentTime - line.startTime;
    const lineDuration = line.endTime - line.startTime;

    // Typewriter
    const charIndex =
      animation.style === 'typewriter'
        ? Math.min(
            line.text.length,
            Math.floor((lineElapsed / animation.duration) * line.text.length),
          )
        : line.text.length;

    // Karaoke progress
    const karaokeProgress =
      animation.style === 'karaoke'
        ? Math.min(1, lineElapsed / lineDuration)
        : 1;

    // Word animations
    const words = line.text.split(' ');
    const wordAnimations = words.map((word, i) => {
      const wordDuration = lineDuration / words.length;
      const wordStart = i * wordDuration;
      const wordElapsed = lineElapsed - wordStart;
      const wordProgress = Math.max(0, Math.min(1, wordElapsed / animation.duration));

      let opacity = 1;
      let transform = '';

      switch (animation.style) {
        case 'fadeIn':
        case 'karaoke':
          opacity = wordProgress;
          break;
        case 'slideIn':
          opacity = wordProgress;
          transform = `translateX(${(1 - wordProgress) * 30 * (animation.direction === 'left' ? 1 : -1)}px)`;
          break;
        case 'bounceIn':
          opacity = wordProgress;
          transform = `translateY(${(1 - wordProgress) * -20}px) scale(${0.8 + wordProgress * 0.2})`;
          break;
        case 'zoomIn':
          opacity = wordProgress;
          transform = `scale(${0.5 + wordProgress * 0.5})`;
          break;
        case 'wave':
          const waveOffset = Math.sin(wordElapsed * 3 + i) * 5 * wordProgress;
          transform = `translateY(${waveOffset}px)`;
          break;
        default:
          opacity = 1;
          transform = '';
      }

      return { word, delay: i * animation.staggerDelay, opacity, transform };
    });

    setState({
      activeLyric: line,
      activeIndex,
      charIndex,
      karaokeProgress,
      wordAnimations,
    });

    frameRef.current = requestAnimationFrame(() => {});
    return () => cancelAnimationFrame(frameRef.current);
  }, [currentTime, lyrics, animation]);

  const getAdjacentLines = useMemo(() => {
    if (state.activeIndex <= 0) return { prev: null, next: null };
    return {
      prev: state.activeIndex > 0 ? lyrics[state.activeIndex - 1] : null,
      next: state.activeIndex < lyrics.length - 1 ? lyrics[state.activeIndex + 1] : null,
    };
  }, [state.activeIndex, lyrics]);

  return { ...state, ...getAdjacentLines };
}
