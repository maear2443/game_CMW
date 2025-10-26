/**
 * Mulberry32 - 시드 가능한 난수 생성기
 * 재현성 있는 랜덤 시퀀스 생성을 위해 사용
 */

let seed = 0;

/**
 * RNG 초기화
 */
export function initRng(initialSeed: number): void {
  seed = initialSeed >>> 0; // unsigned 32-bit
}

/**
 * 현재 시드 반환
 */
export function getSeed(): number {
  return seed;
}

/**
 * 0~1 사이의 랜덤 숫자 반환
 */
export function random(): number {
  let t = (seed += 0x6d2b79f5);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/**
 * min ~ max 사이의 정수 반환 (min 포함, max 미포함)
 */
export function randomInt(min: number, max: number): number {
  return Math.floor(random() * (max - min)) + min;
}

/**
 * 0 ~ max 사이의 정수 반환 (0 포함, max 미포함)
 */
export function randomIntMax(max: number): number {
  return Math.floor(random() * max);
}

/**
 * 배열에서 랜덤 요소 선택
 */
export function randomChoice<T>(arr: T[]): T {
  return arr[randomIntMax(arr.length)];
}

/**
 * 확률 체크 (0~1 사이의 값)
 */
export function chance(probability: number): boolean {
  return random() < probability;
}
