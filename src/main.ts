import { initApp } from './engine/app';
import { GameController } from './game/state';

/**
 * 메인 진입점
 */
async function main() {
  try {
    // PixiJS 앱 초기화
    await initApp();

    // 게임 컨트롤러 생성 및 시작
    const game = new GameController();
    game.startMenu();

    console.log('Totem Drop 게임 시작!');
  } catch (error) {
    console.error('게임 초기화 실패:', error);
  }
}

// 앱 시작
main();
