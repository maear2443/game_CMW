import { Block, Column, HitAccuracy } from './types';
import { HAMMER_X, HAMMER_Y } from './config';
import { pointInRect, createRect } from '@/utils/rect';

/**
 * 히트 테스트 - 고정 망치 위치에서 블럭 타격
 * @returns { block: Block, accuracy: HitAccuracy } 또는 null
 */
export function hitTestHammer(column: Column): { block: Block; accuracy: HitAccuracy } | null {
  // 망치 위치에 있는 블럭 찾기
  for (let i = column.blocks.length - 1; i >= 0; i--) {
    const block = column.blocks[i];

    if (block.removed) continue;

    // 블럭의 히트박스
    const hitBox = createRect(
      block.sprite.x - block.width / 2,
      block.y - block.height / 2,
      block.width,
      block.height
    );

    // 망치 위치가 블럭 안에 있는지 확인
    if (pointInRect(HAMMER_X, HAMMER_Y, hitBox)) {
      // 정확도 계산 (블럭 중심에서의 거리)
      const centerX = block.sprite.x;
      const centerY = block.y;

      const distX = Math.abs(HAMMER_X - centerX);
      const distY = Math.abs(HAMMER_Y - centerY);
      const distance = Math.sqrt(distX * distX + distY * distY);

      // 블럭의 반경 (가로/세로 중 작은 값의 절반)
      const radius = Math.min(block.width, block.height) / 2;

      // 4단계 정확도 판정 (25%씩 나눔)
      const ratio = distance / radius;
      let accuracy: HitAccuracy;

      if (ratio < 0.25) {
        accuracy = 'PERFECT';    // 8점
      } else if (ratio < 0.5) {
        accuracy = 'EXCELLENT';  // 6점
      } else if (ratio < 0.75) {
        accuracy = 'GOOD';       // 4점
      } else {
        accuracy = 'NOT_BAD';    // 2점
      }

      return { block, accuracy };
    }
  }

  return null;
}
