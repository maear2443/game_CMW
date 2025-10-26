import { LeaderboardEntry, ScoreState } from '@/game/types';
import { calculateAccuracy } from '@/game/scoring';
import { getSeed } from '@/engine/rng';

// API 엔드포인트 (추후 환경변수로 분리 가능)
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

/**
 * UID 생성 또는 로컬스토리지에서 가져오기
 */
function getOrCreateUID(): string {
  let uid = localStorage.getItem('totem_drop_uid');
  if (!uid) {
    uid = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('totem_drop_uid', uid);
  }
  return uid;
}

/**
 * 닉네임 가져오기 (없으면 Anonymous)
 */
function getNickname(): string {
  return localStorage.getItem('totem_drop_nickname') || 'Anonymous';
}

/**
 * 닉네임 설정
 */
export function setNickname(nickname: string): void {
  localStorage.setItem('totem_drop_nickname', nickname);
}

/**
 * 간단한 서명 생성 (라이트 안티치트)
 * 실제 프로덕션에서는 서버 측 검증 강화 필요
 */
function generateSignature(score: number, seed: number, timestamp: number): string {
  const data = `${score}_${seed}_${timestamp}_secret_key`;
  // 간단한 해시 (실제로는 crypto.subtle.digest 등 사용)
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * 점수 제출
 */
export async function submitScore(scoreState: ScoreState): Promise<boolean> {
  try {
    const uid = getOrCreateUID();
    const name = getNickname();
    const accuracy = calculateAccuracy(scoreState);
    const seed = getSeed();
    const timestamp = Date.now();
    const signature = generateSignature(scoreState.score, seed, timestamp);

    const entry: LeaderboardEntry = {
      uid,
      name,
      score: scoreState.score,
      accuracy,
      maxCombo: scoreState.maxCombo,
      seed,
      timestamp,
      signature,
    };

    const response = await fetch(`${API_BASE_URL}/score`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(entry),
    });

    if (!response.ok) {
      console.error('점수 제출 실패:', response.statusText);
      return false;
    }

    return true;
  } catch (error) {
    console.error('점수 제출 오류:', error);
    return false;
  }
}

/**
 * 리더보드 가져오기
 */
export async function getLeaderboard(period: 'all' | 'weekly' = 'all'): Promise<LeaderboardEntry[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/leaderboard?period=${period}`);

    if (!response.ok) {
      console.error('리더보드 가져오기 실패:', response.statusText);
      return [];
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('리더보드 가져오기 오류:', error);
    return [];
  }
}
