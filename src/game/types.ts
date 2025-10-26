import * as PIXI from 'pixi.js';

export type BlockType = 'GOOD' | 'BAD';

export type GameState = 'BOOT' | 'MENU' | 'COUNTDOWN' | 'PLAYING' | 'RESULT';

export type ScoreEventType = 'GOOD_PASS' | 'BAD_HIT' | 'BAD_PASS' | 'GOOD_HIT';

export type HitAccuracy = 'PERFECT' | 'EXCELLENT' | 'GOOD' | 'NOT_BAD';

export interface Block {
  id: number;
  type: BlockType;
  sprite: PIXI.Sprite;
  y: number;                // world-space y
  height: number;           // visual height
  width: number;            // visual width
  removed: boolean;         // 제거 상태
}

export interface Column {
  blocks: Block[];          // 화면 위/아래까지 이어지는 블럭 리스트
  spawnCursorY: number;     // 화면 위쪽 스폰 시작 y
}

export interface ScoreState {
  score: number;
  goodPassed: number;
  badRemoved: number;
  badMissed: number;        // 나쁜 블럭 하단 통과
  goodMistake: number;      // 좋은 블럭 제거 실수
  combo: number;
  maxCombo: number;
  totalJudgements: number;  // 전체 판정 수
}

export interface GameConfig {
  speedPxPerSec: number;
  spawnGapPx: number;       // 블럭 간 간격(0 가능)
  badRate: number;          // 0~1 사이(불량 확률)
  s1GoodPass: number;       // +S1
  s2BadHit: number;         // +S2
  p1BadPass: number;        // -P1
  p2GoodHit: number;        // -P2
}

export interface DifficultyPhase {
  startTime: number;        // 시작 시간 (초)
  config: GameConfig;
}

export interface LeaderboardEntry {
  uid: string;
  name: string;
  score: number;
  accuracy: number;
  maxCombo: number;
  seed: number;
  timestamp: number;
  signature?: string;
}

export interface GameAssets {
  blockGood: PIXI.Texture[];  // 양품 블럭 디자인 배열 (최대 5개)
  blockBad: PIXI.Texture[];   // 불량 블럭 디자인 배열 (최대 5개)
  hammer?: PIXI.Texture;
  // 추후 확장: 파티클, 이펙트 등
}
