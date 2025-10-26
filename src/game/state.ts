import * as PIXI from 'pixi.js';
import { GameState, Column, ScoreState, GameConfig, GameAssets } from './types';
import { GAME_DURATION, SAFE_LINE_Y, difficultyAt, BLOCK_WIDTH, BLOCK_HEIGHT } from './config';
import { initRng } from '@/engine/rng';
import { app, gameContainer, screenToWorld } from '@/engine/app';
import {
  createColumn,
  moveColumn,
  needSpawn,
  spawnBlock,
  collectPassedBlocks,
  cleanupRemovedBlocks,
  removeBlock,
  clearColumn,
  initBlockPool,
} from './column';
import { createScoreState, applyScore } from './scoring';
import { hitTestBlock } from './input';
import { HUD } from './ui/hud';
import { MenuUI } from './ui/menu';
import { ResultUI } from './ui/result';
import { initAudio, playSfx } from './sound';
import { submitScore } from '@/net/api';

/**
 * 게임 컨트롤러
 * 상태 머신: MENU -> COUNTDOWN -> PLAYING -> RESULT
 */
export class GameController {
  private state: GameState = 'MENU';
  private column: Column | null = null;
  private config: GameConfig;
  private scoreState: ScoreState;
  private timeLeft: number = GAME_DURATION;
  private lastMs: number = 0;
  private elapsedMs: number = 0;

  private hud: HUD | null = null;
  private menuUI: MenuUI | null = null;
  private resultUI: ResultUI | null = null;

  private gameLayer: PIXI.Container;
  private uiLayer: PIXI.Container;

  private assets: GameAssets;

  private updateBound: ((delta: number) => void) | null = null;

  constructor() {
    this.config = difficultyAt(0);
    this.scoreState = createScoreState();

    // 레이어 생성
    this.gameLayer = new PIXI.Container();
    this.uiLayer = new PIXI.Container();

    gameContainer.addChild(this.gameLayer);
    gameContainer.addChild(this.uiLayer);

    // 임시 에셋 (실제로는 로드 필요)
    this.assets = this.createPlaceholderAssets();

    // 블럭 풀 초기화
    initBlockPool(this.assets);

    // 첫 터치 시 오디오 초기화
    this.setupFirstTouch();
  }

  /**
   * 플레이스홀더 에셋 생성 (실제로는 이미지 로드)
   */
  private createPlaceholderAssets(): GameAssets {
    // 양품 블럭 (초록)
    const goodGraphics = new PIXI.Graphics();
    goodGraphics.beginFill(0x00ff00);
    goodGraphics.lineStyle(3, 0x00aa00);
    goodGraphics.drawRoundedRect(0, 0, BLOCK_WIDTH, BLOCK_HEIGHT, 10);
    goodGraphics.endFill();
    const blockGood = app.renderer.generateTexture(goodGraphics);

    // 불량 블럭 (빨강)
    const badGraphics = new PIXI.Graphics();
    badGraphics.beginFill(0xff0000);
    badGraphics.lineStyle(3, 0xaa0000);
    badGraphics.drawRoundedRect(0, 0, BLOCK_WIDTH, BLOCK_HEIGHT, 10);
    badGraphics.endFill();
    const blockBad = app.renderer.generateTexture(badGraphics);

    return { blockGood, blockBad };
  }

  /**
   * 첫 터치 시 오디오 초기화 (모바일 자동재생 정책 대응)
   */
  private setupFirstTouch(): void {
    const handleFirstTouch = () => {
      initAudio();
      document.removeEventListener('pointerdown', handleFirstTouch);
    };

    document.addEventListener('pointerdown', handleFirstTouch);
  }

  /**
   * 메뉴 시작
   */
  startMenu(): void {
    this.state = 'MENU';
    this.clearUI();

    this.menuUI = new MenuUI(() => this.startCountdown());
    this.uiLayer.addChild(this.menuUI.getContainer());
  }

  /**
   * 카운트다운 (간단히 바로 플레이로 전환)
   */
  private startCountdown(): void {
    this.state = 'COUNTDOWN';
    this.clearUI();

    // 간단히 즉시 플레이 시작 (추후 3...2...1 애니메이션 추가 가능)
    setTimeout(() => this.startPlay(), 500);
  }

  /**
   * 게임 플레이 시작
   */
  private startPlay(seed?: number): void {
    this.state = 'PLAYING';
    this.clearUI();
    this.gameLayer.removeChildren();

    // RNG 초기화
    initRng(seed ?? Date.now());

    // 상태 초기화
    this.config = difficultyAt(0);
    this.scoreState = createScoreState();
    this.timeLeft = GAME_DURATION;
    this.elapsedMs = 0;
    this.lastMs = performance.now();

    // 컬럼 생성
    this.column = createColumn(this.assets, this.gameLayer);

    // HUD 생성
    this.hud = new HUD();
    this.uiLayer.addChild(this.hud.getContainer());

    // 입력 설정
    this.setupInput();

    // 업데이트 루프 시작
    this.updateBound = (delta: number) => this.update(delta);
    app.ticker.add(this.updateBound);
  }

  /**
   * 입력 설정
   */
  private setupInput(): void {
    const canvas = app.view as HTMLCanvasElement;

    const handlePointerDown = (event: PointerEvent) => {
      if (this.state !== 'PLAYING' || !this.column) return;

      const world = screenToWorld(event.clientX, event.clientY);
      const hit = hitTestBlock(this.column, world.x, world.y);

      if (!hit) return;

      if (hit.type === 'BAD') {
        // 불량 블럭 제거 성공
        removeBlock(hit, this.column);
        const scoreDelta = applyScore(this.scoreState, 'BAD_HIT', this.config);
        playSfx('hit_bad');
        this.showScorePop(world.x, world.y, scoreDelta, 0x00ff00);
      } else {
        // 양품 오제거 (실수)
        removeBlock(hit, this.column);
        const scoreDelta = applyScore(this.scoreState, 'GOOD_HIT', this.config);
        playSfx('hit_miss');
        this.showScorePop(world.x, world.y, scoreDelta, 0xff0000);
        this.screenFlashRed();
      }
    };

    canvas.addEventListener('pointerdown', handlePointerDown);

    // 정리 시 이벤트 제거 (추후 cleanup 메서드에서)
    // canvas.removeEventListener('pointerdown', handlePointerDown);
  }

  /**
   * 점수 팝업 표시
   */
  private showScorePop(x: number, y: number, score: number, color: number): void {
    const text = new PIXI.Text(score > 0 ? `+${score}` : `${score}`, {
      fontFamily: 'Arial, sans-serif',
      fontSize: 24,
      fill: color,
      fontWeight: 'bold',
    });
    text.anchor.set(0.5);
    text.x = x;
    text.y = y;
    this.gameLayer.addChild(text);

    // 애니메이션
    const startTime = performance.now();
    const duration = 600;

    const animate = () => {
      const elapsed = performance.now() - startTime;
      const progress = elapsed / duration;

      if (progress < 1) {
        text.y = y - progress * 50;
        text.alpha = 1 - progress;
        requestAnimationFrame(animate);
      } else {
        text.destroy();
      }
    };

    requestAnimationFrame(animate);
  }

  /**
   * 화면 빨간색 플래시 (오타격 시)
   */
  private screenFlashRed(): void {
    const flash = new PIXI.Graphics();
    flash.beginFill(0xff0000, 0.3);
    flash.drawRect(0, 0, app.screen.width, app.screen.height);
    flash.endFill();
    this.uiLayer.addChild(flash);

    setTimeout(() => {
      flash.destroy();
    }, 100);
  }

  /**
   * 업데이트 루프
   */
  private update(_delta: number): void {
    if (this.state !== 'PLAYING' || !this.column) return;

    const now = performance.now();
    const dt = now - this.lastMs;
    this.lastMs = now;

    this.timeLeft -= dt;
    this.elapsedMs += dt;

    // 게임 종료
    if (this.timeLeft <= 0) {
      this.finish();
      return;
    }

    // 난이도 갱신
    this.config = difficultyAt(this.elapsedMs);

    // 스크롤
    const dy = (this.config.speedPxPerSec * dt) / 1000;
    moveColumn(this.column, dy);

    // 스폰
    while (needSpawn(this.column)) {
      spawnBlock(this.column, this.config, this.assets, this.gameLayer, this.elapsedMs / 1000);
    }

    // 하단 통과 판정
    const passed = collectPassedBlocks(this.column, SAFE_LINE_Y);
    for (const block of passed) {
      if (block.type === 'GOOD') {
        applyScore(this.scoreState, 'GOOD_PASS', this.config);
        playSfx('pass_good');
      } else {
        applyScore(this.scoreState, 'BAD_PASS', this.config);
        playSfx('pass_bad');
      }

      // 스프라이트 제거
      block.sprite.parent?.removeChild(block.sprite);
    }

    // 제거된 블럭 정리
    cleanupRemovedBlocks(this.column);

    // HUD 업데이트
    if (this.hud) {
      this.hud.update(this.scoreState, this.timeLeft);
    }
  }

  /**
   * 게임 종료
   */
  private finish(): void {
    this.state = 'RESULT';

    // 업데이트 루프 정지
    if (this.updateBound) {
      app.ticker.remove(this.updateBound);
      this.updateBound = null;
    }

    // 컬럼 정리
    if (this.column) {
      clearColumn(this.column);
      this.column = null;
    }

    // 결과 화면 표시
    this.showResult();

    // 점수 제출
    submitScore(this.scoreState).then((success) => {
      if (success) {
        console.log('점수 제출 성공');
      } else {
        console.warn('점수 제출 실패');
      }
    });
  }

  /**
   * 결과 화면 표시
   */
  private showResult(): void {
    this.clearUI();
    this.gameLayer.removeChildren();

    this.resultUI = new ResultUI(this.scoreState, () => this.startMenu());
    this.uiLayer.addChild(this.resultUI.getContainer());
  }

  /**
   * UI 클리어
   */
  private clearUI(): void {
    if (this.hud) {
      this.hud.destroy();
      this.hud = null;
    }
    if (this.menuUI) {
      this.menuUI.destroy();
      this.menuUI = null;
    }
    if (this.resultUI) {
      this.resultUI.destroy();
      this.resultUI = null;
    }
    this.uiLayer.removeChildren();
  }

  /**
   * 정리
   */
  destroy(): void {
    if (this.updateBound) {
      app.ticker.remove(this.updateBound);
    }
    this.clearUI();
    this.gameLayer.destroy({ children: true });
    this.uiLayer.destroy({ children: true });
  }
}
