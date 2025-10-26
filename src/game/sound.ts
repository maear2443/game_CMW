/**
 * 사운드 시스템
 * Web Audio API를 사용한 풍부한 효과음 생성
 */

let audioContext: AudioContext | null = null;
let bgmSource: AudioBufferSourceNode | null = null;
let soundEnabled = true;
let bgmBuffer: AudioBuffer | null = null;

// 사운드 버퍼 맵
const soundBuffers: Map<string, AudioBuffer> = new Map();

/**
 * 오디오 컨텍스트 초기화
 * 모바일 자동재생 정책 대응: 첫 터치 시 호출
 */
export function initAudio(): void {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }

  // suspended 상태면 resume (모바일 자동재생 정책)
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }
}

/**
 * 사운드 활성화/비활성화
 */
export function setSoundEnabled(enabled: boolean): void {
  soundEnabled = enabled;
  if (!enabled) {
    stopBgm();
  }
}

/**
 * BGM 로드
 */
export async function loadBgm(url: string): Promise<void> {
  if (!audioContext) initAudio();

  try {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    bgmBuffer = await audioContext!.decodeAudioData(arrayBuffer);
  } catch (error) {
    console.warn('BGM 로드 실패:', error);
  }
}

/**
 * BGM 재생
 */
export function playBgm(): void {
  if (!soundEnabled || !audioContext || !bgmBuffer) return;

  stopBgm();

  bgmSource = audioContext.createBufferSource();
  bgmSource.buffer = bgmBuffer;
  bgmSource.loop = true;
  bgmSource.connect(audioContext.destination);
  bgmSource.start(0);
}

/**
 * BGM 정지
 */
export function stopBgm(): void {
  if (bgmSource) {
    bgmSource.stop();
    bgmSource.disconnect();
    bgmSource = null;
  }
}

/**
 * SFX 로드
 */
export async function loadSfx(name: string, url: string): Promise<void> {
  if (!audioContext) initAudio();

  try {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = await audioContext!.decodeAudioData(arrayBuffer);
    soundBuffers.set(name, buffer);
  } catch (error) {
    console.warn(`SFX 로드 실패 (${name}):`, error);
  }
}

/**
 * SFX 재생 (개선된 효과음)
 */
export function playSfx(name: string): void {
  if (!soundEnabled || !audioContext) return;

  const buffer = soundBuffers.get(name);
  if (!buffer) {
    // 버퍼가 없으면 생성된 효과음 사용
    switch (name) {
      case 'hit_bad':
        playHitSound(false);
        break;
      case 'hit_miss':
        playMissSound();
        break;
      case 'pass_good':
        playPassSound(true);
        break;
      case 'pass_bad':
        playPassSound(false);
        break;
      default:
        playBeep(200, 0.1);
    }
    return;
  }

  const source = audioContext.createBufferSource();
  source.buffer = buffer;
  source.connect(audioContext.destination);
  source.start(0);
}

/**
 * 타격음 (PERFECT/GOOD)
 */
export function playHitSound(isPerfect: boolean): void {
  if (!audioContext) return;

  const frequency = isPerfect ? 880 : 660;
  const duration = isPerfect ? 0.18 : 0.12;

  // 메인 톤
  const osc1 = audioContext.createOscillator();
  const gain1 = audioContext.createGain();

  osc1.connect(gain1);
  gain1.connect(audioContext.destination);

  osc1.frequency.value = frequency;
  osc1.type = 'square';

  gain1.gain.setValueAtTime(0.25, audioContext.currentTime);
  gain1.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);

  osc1.start(audioContext.currentTime);
  osc1.stop(audioContext.currentTime + duration);

  // 노이즈 (타격감)
  const bufferSize = audioContext.sampleRate * duration;
  const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
  const data = buffer.getChannelData(0);

  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  const noise = audioContext.createBufferSource();
  const noiseGain = audioContext.createGain();
  const noiseFilter = audioContext.createBiquadFilter();

  noise.buffer = buffer;
  noise.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(audioContext.destination);

  noiseFilter.type = 'lowpass';
  noiseFilter.frequency.value = 1200;

  noiseGain.gain.setValueAtTime(0.15, audioContext.currentTime);
  noiseGain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration * 0.4);

  noise.start(audioContext.currentTime);
  noise.stop(audioContext.currentTime + duration);

  // PERFECT 시 반짝임 효과
  if (isPerfect) {
    setTimeout(() => {
      const sparkle = audioContext!.createOscillator();
      const sparkleGain = audioContext!.createGain();

      sparkle.connect(sparkleGain);
      sparkleGain.connect(audioContext!.destination);

      sparkle.frequency.value = 1320;
      sparkle.type = 'sine';

      sparkleGain.gain.setValueAtTime(0.12, audioContext!.currentTime);
      sparkleGain.gain.exponentialRampToValueAtTime(0.01, audioContext!.currentTime + 0.25);

      sparkle.start(audioContext!.currentTime);
      sparkle.stop(audioContext!.currentTime + 0.25);
    }, 40);
  }
}

/**
 * 오타격 음
 */
function playMissSound(): void {
  if (!audioContext) return;

  const osc = audioContext.createOscillator();
  const gain = audioContext.createGain();

  osc.connect(gain);
  gain.connect(audioContext.destination);

  osc.frequency.setValueAtTime(400, audioContext.currentTime);
  osc.frequency.exponentialRampToValueAtTime(100, audioContext.currentTime + 0.2);
  osc.type = 'sawtooth';

  gain.gain.setValueAtTime(0.2, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);

  osc.start(audioContext.currentTime);
  osc.stop(audioContext.currentTime + 0.2);
}

/**
 * 통과음
 */
function playPassSound(isGood: boolean): void {
  if (!audioContext) return;

  const frequency = isGood ? 523 : 311; // C5 vs Eb4
  const duration = 0.08;

  const osc = audioContext.createOscillator();
  const gain = audioContext.createGain();

  osc.connect(gain);
  gain.connect(audioContext.destination);

  osc.frequency.value = frequency;
  osc.type = 'triangle';

  gain.gain.setValueAtTime(0.12, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);

  osc.start(audioContext.currentTime);
  osc.stop(audioContext.currentTime + duration);
}

/**
 * 간단한 비프음 (폴백)
 */
function playBeep(frequency: number, duration: number): void {
  if (!audioContext) return;

  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  oscillator.frequency.value = frequency;
  oscillator.type = 'sine';

  gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);

  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + duration);
}

/**
 * 모든 사운드 정리
 */
export function destroyAudio(): void {
  stopBgm();
  soundBuffers.clear();
  if (audioContext) {
    audioContext.close();
    audioContext = null;
  }
}
