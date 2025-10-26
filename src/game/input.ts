import { Block, Column } from './types';
import { TOUCH_BOX_SCALE } from './config';
import { pointInRect, createRect } from '@/utils/rect';

/**
 * 히트 테스트 - 터치/클릭 위치에 블럭이 있는지 확인
 */
export function hitTestBlock(column: Column, worldX: number, worldY: number): Block | null {
  // 뒤에서부터 검사 (화면 앞쪽 블럭 우선)
  for (let i = column.blocks.length - 1; i >= 0; i--) {
    const block = column.blocks[i];

    if (block.removed) continue;

    // 터치 박스 확대 적용
    const expandedWidth = block.width * TOUCH_BOX_SCALE;
    const expandedHeight = block.height * TOUCH_BOX_SCALE;

    const hitBox = createRect(
      block.sprite.x - expandedWidth / 2,
      block.y - expandedHeight / 2,
      expandedWidth,
      expandedHeight
    );

    if (pointInRect(worldX, worldY, hitBox)) {
      return block;
    }
  }

  return null;
}
