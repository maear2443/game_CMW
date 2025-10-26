import * as PIXI from 'pixi.js';
import { LOGICAL_WIDTH, LOGICAL_HEIGHT } from '@/game/config';

export let app: PIXI.Application;
export let gameContainer: PIXI.Container;

/**
 * PixiJS 앱 초기화
 */
export async function initApp(): Promise<void> {
  console.log('Creating PIXI Application...');

  app = new PIXI.Application({
    width: LOGICAL_WIDTH,
    height: LOGICAL_HEIGHT,
    backgroundColor: 0x1a1a2e,
    resolution: window.devicePixelRatio || 1,
    autoDensity: true,
    antialias: true,
  });

  console.log('PIXI Application created', app);

  // 캔버스를 DOM에 추가
  const canvas = app.view as HTMLCanvasElement;
  console.log('Canvas element:', canvas);
  document.body.appendChild(canvas);
  console.log('Canvas added to DOM');

  // 게임 컨테이너 생성
  gameContainer = new PIXI.Container();
  app.stage.addChild(gameContainer);
  console.log('Game container added to stage');

  // 리사이즈 핸들러 설정
  window.addEventListener('resize', handleResize);
  handleResize();
  console.log('Resize handler set up');
}

/**
 * 화면 리사이즈 처리 (CSS 스케일링)
 */
function handleResize(): void {
  const canvas = app.view as HTMLCanvasElement;
  const windowWidth = window.innerWidth;
  const windowHeight = window.innerHeight;

  // 논리 해상도 비율
  const logicalRatio = LOGICAL_WIDTH / LOGICAL_HEIGHT;
  const windowRatio = windowWidth / windowHeight;

  let scale: number;
  let width: number;
  let height: number;

  if (windowRatio > logicalRatio) {
    // 세로가 제한 요소 (좌우 여백)
    scale = windowHeight / LOGICAL_HEIGHT;
    height = windowHeight;
    width = LOGICAL_WIDTH * scale;
  } else {
    // 가로가 제한 요소 (상하 여백)
    scale = windowWidth / LOGICAL_WIDTH;
    width = windowWidth;
    height = LOGICAL_HEIGHT * scale;
  }

  // 캔버스 크기 조정
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  // 중앙 정렬
  canvas.style.position = 'absolute';
  canvas.style.left = `${(windowWidth - width) / 2}px`;
  canvas.style.top = `${(windowHeight - height) / 2}px`;
}

/**
 * 화면 좌표를 게임 월드 좌표로 변환
 */
export function screenToWorld(screenX: number, screenY: number): { x: number; y: number } {
  const canvas = app.view as HTMLCanvasElement;
  const rect = canvas.getBoundingClientRect();

  // 캔버스 내 상대 좌표
  const canvasX = screenX - rect.left;
  const canvasY = screenY - rect.top;

  // 스케일 계산
  const scaleX = LOGICAL_WIDTH / rect.width;
  const scaleY = LOGICAL_HEIGHT / rect.height;

  return {
    x: canvasX * scaleX,
    y: canvasY * scaleY,
  };
}

/**
 * 앱 정리
 */
export function destroyApp(): void {
  window.removeEventListener('resize', handleResize);
  app.destroy(true, { children: true, texture: true });
}
