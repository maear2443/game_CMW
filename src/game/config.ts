import { GameConfig, DifficultyPhase } from './types';

// 게임 상수
export const GAME_DURATION = 60_000; // 60초
export const LOGICAL_WIDTH = 540;
export const LOGICAL_HEIGHT = 960;
export const BLOCK_WIDTH = 120;
export const BLOCK_HEIGHT = 120;
export const SAFE_LINE_Y = LOGICAL_HEIGHT - 150; // 하단 안전선
export const SPAWN_MARGIN = 200; // 화면 위 여유 공간

// 터치 박스 확대 (실제 블럭보다 1.2배 크게)
export const TOUCH_BOX_SCALE = 1.2;

// 콤보 보너스
export const COMBO_TIERS = [
  { threshold: 5, bonus: 5 },
  { threshold: 10, bonus: 15 },
  { threshold: 20, bonus: 40 },
];

// 난이도 단계별 설정
export const DIFFICULTY_PHASES: DifficultyPhase[] = [
  {
    startTime: 0,
    config: {
      speedPxPerSec: 100,
      spawnGapPx: 0,
      badRate: 0.3,
      s1GoodPass: 5,
      s2BadHit: 8,
      p1BadPass: -10,
      p2GoodHit: -12,
    },
  },
  {
    startTime: 15,
    config: {
      speedPxPerSec: 110,
      spawnGapPx: 0,
      badRate: 0.4,
      s1GoodPass: 5,
      s2BadHit: 8,
      p1BadPass: -10,
      p2GoodHit: -12,
    },
  },
  {
    startTime: 35,
    config: {
      speedPxPerSec: 120,
      spawnGapPx: 0,
      badRate: 0.5,
      s1GoodPass: 5,
      s2BadHit: 9,
      p1BadPass: -12,
      p2GoodHit: -12,
    },
  },
  {
    startTime: 55,
    config: {
      speedPxPerSec: 130,
      spawnGapPx: 0,
      badRate: 0.6,
      s1GoodPass: 6,
      s2BadHit: 10,
      p1BadPass: -12,
      p2GoodHit: -14,
    },
  },
];

/**
 * 경과 시간에 따른 난이도 설정 반환
 */
export function difficultyAt(elapsedMs: number): GameConfig {
  const elapsedSec = elapsedMs / 1000;

  // 뒤에서부터 검색하여 현재 시간보다 작거나 같은 가장 최근 단계 찾기
  for (let i = DIFFICULTY_PHASES.length - 1; i >= 0; i--) {
    if (elapsedSec >= DIFFICULTY_PHASES[i].startTime) {
      return DIFFICULTY_PHASES[i].config;
    }
  }

  // 기본값 (첫 단계)
  return DIFFICULTY_PHASES[0].config;
}

/**
 * 정확도 계산
 */
export function calculateAccuracy(goodPassed: number, badRemoved: number, badMissed: number, goodMistake: number): number {
  const correct = goodPassed + badRemoved;
  const total = correct + badMissed + goodMistake;

  if (total === 0) return 100;
  return Math.round((correct / total) * 100);
}

/**
 * 콤보 보너스 계산
 */
export function getComboBonus(combo: number): number {
  let bonus = 0;
  for (const tier of COMBO_TIERS) {
    if (combo >= tier.threshold) {
      bonus = tier.bonus;
    }
  }
  return bonus;
}
