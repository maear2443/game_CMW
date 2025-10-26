import { ScoreState, GameConfig, ScoreEventType } from './types';
import { getComboBonus } from './config';

/**
 * 새로운 점수 상태 생성
 */
export function createScoreState(): ScoreState {
  return {
    score: 0,
    goodPassed: 0,
    badRemoved: 0,
    badMissed: 0,
    goodMistake: 0,
    combo: 0,
    maxCombo: 0,
    totalJudgements: 0,
  };
}

/**
 * 점수 이벤트 처리
 */
export function applyScore(state: ScoreState, eventType: ScoreEventType, config: GameConfig): number {
  let scoreDelta = 0;

  switch (eventType) {
    case 'GOOD_PASS':
      // 양품 안전 통과
      scoreDelta = config.s1GoodPass;
      state.goodPassed++;
      state.combo++;
      state.totalJudgements++;
      break;

    case 'BAD_HIT':
      // 불량 제거 성공
      scoreDelta = config.s2BadHit;
      state.badRemoved++;
      state.combo++;
      state.totalJudgements++;
      break;

    case 'BAD_PASS':
      // 불량 미처리 통과 (실패)
      scoreDelta = config.p1BadPass;
      state.badMissed++;
      state.combo = 0; // 콤보 끊김
      state.totalJudgements++;
      break;

    case 'GOOD_HIT':
      // 양품 오제거 (실수)
      scoreDelta = config.p2GoodHit;
      state.goodMistake++;
      state.combo = 0; // 콤보 끊김
      state.totalJudgements++;
      break;
  }

  // 콤보 보너스 적용 (양품 통과 또는 불량 제거 시)
  if (eventType === 'GOOD_PASS' || eventType === 'BAD_HIT') {
    const comboBonus = getComboBonus(state.combo);
    scoreDelta += comboBonus;

    // 최대 콤보 갱신
    if (state.combo > state.maxCombo) {
      state.maxCombo = state.combo;
    }
  }

  state.score += scoreDelta;

  // 점수는 0 이하로 떨어지지 않음
  if (state.score < 0) {
    state.score = 0;
  }

  return scoreDelta;
}

/**
 * 정확도 계산 (백분율)
 */
export function calculateAccuracy(state: ScoreState): number {
  const correct = state.goodPassed + state.badRemoved;
  const total = state.totalJudgements;

  if (total === 0) return 100;
  return Math.round((correct / total) * 100);
}
