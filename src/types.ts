export interface LyricLine {
  id: string;
  text: string;
  startTime: number; // seconds
  endTime: number; // seconds
  emphasis?: boolean;
  fontSize?: number; // override default
  color?: string; // override default
}

export interface BackgroundConfig {
  type: 'solid' | 'gradient' | 'image' | 'video' | 'animated';
  solidColor: string;
  gradientStart: string;
  gradientEnd: string;
  gradientDirection: string;
  imageUrl: string;
  animatedStyle: 'particles' | 'waveform' | 'aurora' | 'stars' | 'fire';
  opacity: number;
}

export interface FontConfig {
  fontFamily: string;
  fontSize: number;
  fontWeight: string;
  textColor: string;
  textShadow: boolean;
  textShadowColor: string;
  textStroke: boolean;
  textStrokeColor: string;
  textStrokeWidth: number;
  letterSpacing: number;
  lineHeight: number;
  textTransform: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
}

export interface AnimationConfig {
  style: 'fadeIn' | 'slideIn' | 'typewriter' | 'karaoke' | 'bounceIn' | 'zoomIn' | 'glitch' | 'neon' | 'wave' | 'rain';
  duration: number;
  easing: 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'linear';
  activeLineGlow: boolean;
  glowColor: string;
  glowIntensity: number;
  staggerDelay: number;
  direction: 'left' | 'right' | 'top' | 'bottom' | 'center';
}

export interface ParticleConfig {
  enabled: boolean;
  type: 'sparkles' | 'notes' | 'stars' | 'hearts' | 'bubbles';
  count: number;
  color: string;
  speed: number;
  size: number;
}

export interface ProjectState {
  lyrics: LyricLine[];
  background: BackgroundConfig;
  font: FontConfig;
  animation: AnimationConfig;
  particles: ParticleConfig;
  audioFile: string | null;
  audioDuration: number;
  isPlaying: boolean;
  currentTime: number;
  projectName: string;
  canvasRatio: '16:9' | '9:16' | '1:1' | '4:3';
}

export interface AudioTrack {
  file: File | null;
  url: string | null;
  duration: number;
  waveformData: number[];
}
