import * as PIXI from 'pixi.js';
import { GameAssets } from './types';
import { BLOCK_WIDTH, BLOCK_HEIGHT } from './config';
import { app } from '@/engine/app';

/**
 * 게임 에셋 로더
 * 이미지 파일이 있으면 로드하고, 없으면 코드로 생성
 */

/**
 * 이미지 로드 시도 (실패 시 null 반환)
 */
async function tryLoadImage(path: string): Promise<PIXI.Texture | null> {
  try {
    const texture = await PIXI.Assets.load(path);
    console.log(`✓ 이미지 로드 성공: ${path}`);
    return texture;
  } catch (error) {
    console.log(`✗ 이미지 로드 실패 (fallback 사용): ${path}`);
    return null;
  }
}

/**
 * 플레이스홀더 블럭 생성 (원통형)
 */
function createPlaceholderBlock(isGood: boolean): PIXI.Texture {
  const graphics = new PIXI.Graphics();
  const color1 = isGood ? 0x0088ff : 0xff3333;
  const color2 = isGood ? 0x0066cc : 0xcc0000;
  const color3 = isGood ? 0x004488 : 0x880000;
  const borderColor = isGood ? 0x0044aa : 0xaa0000;

  // 타원형 상단
  graphics.beginFill(color1);
  graphics.drawEllipse(BLOCK_WIDTH / 2, BLOCK_HEIGHT * 0.2, BLOCK_WIDTH / 2 - 5, BLOCK_HEIGHT * 0.15);
  graphics.endFill();

  // 원통 본체
  graphics.beginFill(color2);
  graphics.drawRect(5, BLOCK_HEIGHT * 0.2, BLOCK_WIDTH - 10, BLOCK_HEIGHT * 0.6);
  graphics.endFill();

  // 타원형 하단 (그림자)
  graphics.beginFill(color3);
  graphics.drawEllipse(BLOCK_WIDTH / 2, BLOCK_HEIGHT * 0.8, BLOCK_WIDTH / 2 - 5, BLOCK_HEIGHT * 0.15);
  graphics.endFill();

  // 테두리
  graphics.lineStyle(2, borderColor);
  graphics.drawEllipse(BLOCK_WIDTH / 2, BLOCK_HEIGHT * 0.2, BLOCK_WIDTH / 2 - 5, BLOCK_HEIGHT * 0.15);

  // 불량 블럭에 X 표시
  if (!isGood) {
    graphics.lineStyle(4, 0x000000);
    graphics.moveTo(BLOCK_WIDTH * 0.3, BLOCK_HEIGHT * 0.4);
    graphics.lineTo(BLOCK_WIDTH * 0.7, BLOCK_HEIGHT * 0.6);
    graphics.moveTo(BLOCK_WIDTH * 0.7, BLOCK_HEIGHT * 0.4);
    graphics.lineTo(BLOCK_WIDTH * 0.3, BLOCK_HEIGHT * 0.6);
  }

  return app.renderer.generateTexture(graphics);
}

/**
 * 게임 에셋 로드
 */
export async function loadGameAssets(): Promise<GameAssets> {
  console.log('🎨 게임 에셋 로딩 시작...');

  // 이미지 로드 시도
  const blockGoodImage = await tryLoadImage('/assets/images/block_good.png');
  const blockBadImage = await tryLoadImage('/assets/images/block_bad.png');

  // 로드 실패 시 코드로 생성
  const blockGood = blockGoodImage || createPlaceholderBlock(true);
  const blockBad = blockBadImage || createPlaceholderBlock(false);

  console.log('✓ 게임 에셋 로딩 완료');

  return {
    blockGood,
    blockBad,
  };
}

/**
 * 사운드 파일 목록
 */
export const SOUND_PATHS = {
  bgm: {
    menu: '/assets/sounds/bgm_menu.mp3',
    game: '/assets/sounds/bgm_game.mp3',
  },
  sfx: {
    hitPerfect: '/assets/sounds/sfx_hit_perfect.mp3',
    hitExcellent: '/assets/sounds/sfx_hit_excellent.mp3',
    hitGood: '/assets/sounds/sfx_hit_good.mp3',
    hitNotBad: '/assets/sounds/sfx_hit_notbad.mp3',
    miss: '/assets/sounds/sfx_miss.mp3',
    passBad: '/assets/sounds/sfx_pass_bad.mp3',
    countdown: '/assets/sounds/sfx_countdown.mp3',
    start: '/assets/sounds/sfx_start.mp3',
  },
};

/**
 * 사운드 파일 존재 여부 확인
 */
export async function checkSoundExists(path: string): Promise<boolean> {
  try {
    const response = await fetch(path, { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
}
