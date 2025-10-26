/**
 * 사각형 충돌 판정 유틸리티
 */

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * 점이 사각형 안에 있는지 확인
 */
export function pointInRect(px: number, py: number, rect: Rect): boolean {
  return px >= rect.x && px <= rect.x + rect.width && py >= rect.y && py <= rect.y + rect.height;
}

/**
 * 두 사각형이 겹치는지 확인
 */
export function rectIntersects(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

/**
 * 사각형 생성 헬퍼
 */
export function createRect(x: number, y: number, width: number, height: number): Rect {
  return { x, y, width, height };
}
