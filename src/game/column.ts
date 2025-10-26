import * as PIXI from 'pixi.js';
import { Block, Column, BlockType, GameConfig, GameAssets } from './types';
import { BLOCK_WIDTH, BLOCK_HEIGHT, SPAWN_MARGIN } from './config';
import { chance } from '@/engine/rng';
import { ObjectPool } from '@/engine/pool';

let blockIdCounter = 0;
let blockPool: ObjectPool<Block> | null = null;
let lastBlockTypes: BlockType[] = []; // 최근 생성된 블럭 타입 (연속 3회 방지용)

/**
 * 블럭 풀 초기화
 */
export function initBlockPool(assets: GameAssets): void {
  blockPool = new ObjectPool<Block>(
    () => createBlockObject(assets),
    (block) => resetBlock(block),
    20
  );
}

/**
 * 블럭 객체 생성
 */
function createBlockObject(_assets: GameAssets): Block {
  const sprite = new PIXI.Sprite();
  sprite.anchor.set(0.5);

  return {
    id: blockIdCounter++,
    type: 'GOOD',
    sprite,
    y: 0,
    height: BLOCK_HEIGHT,
    width: BLOCK_WIDTH,
    removed: false,
  };
}

/**
 * 블럭 리셋 (풀 반환 시)
 */
function resetBlock(block: Block): void {
  block.removed = false;
  block.sprite.visible = false;
  block.sprite.alpha = 1;
  block.y = 0;
}

/**
 * 새 컬럼 생성
 */
export function createColumn(assets: GameAssets, _container: PIXI.Container): Column {
  if (!blockPool) {
    initBlockPool(assets);
  }

  lastBlockTypes = [];

  return {
    blocks: [],
    spawnCursorY: -SPAWN_MARGIN,
  };
}

/**
 * 컬럼 이동 (스크롤)
 */
export function moveColumn(column: Column, dy: number): void {
  for (const block of column.blocks) {
    block.y += dy;
    block.sprite.y = block.y;
  }
  column.spawnCursorY += dy;
}

/**
 * 새 블럭 스폰 필요 여부
 */
export function needSpawn(column: Column): boolean {
  return column.spawnCursorY > -SPAWN_MARGIN;
}

/**
 * 블럭 스폰
 */
export function spawnBlock(
  column: Column,
  config: GameConfig,
  assets: GameAssets,
  container: PIXI.Container,
  _elapsedSec: number
): void {
  if (!blockPool) return;

  const block = blockPool.acquire();

  // 블럭 타입 결정 (불량 확률)
  let type: BlockType = chance(config.badRate) ? 'BAD' : 'GOOD';

  // 연속 3회 동일 타입 방지
  if (lastBlockTypes.length >= 2 && lastBlockTypes[0] === type && lastBlockTypes[1] === type) {
    type = type === 'GOOD' ? 'BAD' : 'GOOD';
  }

  lastBlockTypes.unshift(type);
  if (lastBlockTypes.length > 2) {
    lastBlockTypes.pop();
  }

  // 35초 이후 5% 확률로 미끼 패턴 (양-불-양) - 간단히 불량 확률 조정
  // (본격적인 패턴은 추후 확장 가능)

  block.id = blockIdCounter++;
  block.type = type;
  block.y = column.spawnCursorY - BLOCK_HEIGHT / 2;
  block.sprite.texture = type === 'GOOD' ? assets.blockGood : assets.blockBad;
  block.sprite.x = BLOCK_WIDTH / 2 + 210; // 중앙 정렬 (540/2 - 120/2 + 120/2)
  block.sprite.y = block.y;
  block.sprite.visible = true;
  block.removed = false;

  container.addChild(block.sprite);
  column.blocks.push(block);

  // 다음 스폰 위치
  column.spawnCursorY -= BLOCK_HEIGHT + config.spawnGapPx;
}

/**
 * 블럭 제거 및 위 블럭들 낙하
 */
export function removeBlock(block: Block, column: Column): void {
  block.removed = true;
  block.sprite.visible = false;

  // 제거된 블럭보다 위에 있는 블럭들을 즉시 아래로 이동
  const removedIndex = column.blocks.indexOf(block);
  if (removedIndex === -1) return;

  const fallDistance = block.height;

  for (let i = 0; i < removedIndex; i++) {
    const upperBlock = column.blocks[i];
    if (!upperBlock.removed) {
      upperBlock.y += fallDistance;
      // 간단한 트윈 애니메이션 (80~120ms)
      tweenBlockY(upperBlock, upperBlock.y, 100);
    }
  }
}

/**
 * 간단한 Y 위치 트윈 (낙하 애니메이션)
 */
function tweenBlockY(block: Block, targetY: number, duration: number): void {
  const startY = block.sprite.y;
  const startTime = performance.now();

  const animate = () => {
    const elapsed = performance.now() - startTime;
    const progress = Math.min(elapsed / duration, 1);

    block.sprite.y = startY + (targetY - startY) * easeOutQuad(progress);

    if (progress < 1) {
      requestAnimationFrame(animate);
    }
  };

  requestAnimationFrame(animate);
}

function easeOutQuad(t: number): number {
  return t * (2 - t);
}

/**
 * 하단 통과한 블럭 제거 및 반환
 */
export function collectPassedBlocks(column: Column, safeLineY: number): Block[] {
  const passed: Block[] = [];

  for (let i = column.blocks.length - 1; i >= 0; i--) {
    const block = column.blocks[i];
    if (block.y > safeLineY && !block.removed) {
      passed.push(block);
      column.blocks.splice(i, 1);
    }
  }

  return passed;
}

/**
 * 제거된 블럭들 정리 (풀에 반환)
 */
export function cleanupRemovedBlocks(column: Column): void {
  if (!blockPool) return;

  for (let i = column.blocks.length - 1; i >= 0; i--) {
    const block = column.blocks[i];
    if (block.removed) {
      block.sprite.parent?.removeChild(block.sprite);
      blockPool.release(block);
      column.blocks.splice(i, 1);
    }
  }
}

/**
 * 모든 블럭 정리
 */
export function clearColumn(column: Column): void {
  if (!blockPool) return;

  for (const block of column.blocks) {
    block.sprite.parent?.removeChild(block.sprite);
    blockPool.release(block);
  }

  column.blocks = [];
  lastBlockTypes = [];
}
