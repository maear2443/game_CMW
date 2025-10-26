/**
 * 사운드 시스템
 * Web Audio API를 사용한 간단한 사운드 관리
 *
 * 추후 확장:
 * - 실제 오디오 파일 로드
 * - 볼륨 조절
 * - 사운드 풀링
 */

let audioContext: AudioContext | null = null;
let bgmSource: AudioBufferSourceNode | null = null;
let soundEnabled = true;
let bgmBuffer: AudioBuffer | null = null;

// 사운드 버퍼 맵 (추후 확장)
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
 * BGM 로드 (추후 확장: 실제 파일에서 로드)
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

  stopBgm(); // 기존 BGM 정지

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
 * SFX 로드 (추후 확장)
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
 * SFX 재생
 */
export function playSfx(name: string): void {
  if (!soundEnabled || !audioContext) return;

  const buffer = soundBuffers.get(name);
  if (!buffer) {
    // 버퍼가 없으면 간단한 비프음 생성 (플레이스홀더)
    playBeep(200, 0.1);
    return;
  }

  const source = audioContext.createBufferSource();
  source.buffer = buffer;
  source.connect(audioContext.destination);
  source.start(0);
}

/**
 * 간단한 비프음 생성 (SFX 플레이스홀더)
 */
function playBeep(frequency: number, duration: number): void {
  if (!audioContext) return;

  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  oscillator.frequency.value = frequency;
  oscillator.type = 'sine';

  gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
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
