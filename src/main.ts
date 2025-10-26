import { initApp } from './engine/app';
import { GameController } from './game/state';

/**
 * 메인 진입점
 */
async function main() {
  try {
    console.log('게임 초기화 시작...');

    // PixiJS 앱 초기화
    await initApp();
    console.log('PixiJS 앱 초기화 완료!');

    // 게임 컨트롤러 생성 및 시작
    const game = new GameController();
    game.startMenu();

    console.log('Totem Drop 게임 시작!');

    // 로딩 화면 제거
    if ((window as any).hideLoading) {
      (window as any).hideLoading();
    }
  } catch (error) {
    console.error('게임 초기화 실패:', error);

    // 로딩 화면 제거
    if ((window as any).hideLoading) {
      (window as any).hideLoading();
    }

    // 에러를 화면에 표시
    document.body.innerHTML = `
      <div style="color: white; padding: 20px; font-family: Arial;">
        <h1>게임 로드 실패</h1>
        <pre>${error instanceof Error ? error.message : String(error)}</pre>
        <pre>${error instanceof Error ? error.stack : ''}</pre>
        <p>콘솔을 확인해주세요.</p>
      </div>
    `;
  }
}

// 앱 시작
main();
