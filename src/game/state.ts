import * as PIXI from 'pixi.js';
import { GameState, Column, ScoreState, GameConfig, GameAssets } from './types';
import { GAME_DURATION, SAFE_LINE_Y, difficultyAt, BLOCK_WIDTH, BLOCK_HEIGHT } from './config';
import { initRng } from '@/engine/rng';
import { app, gameContainer } from '@/engine/app';
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
import { hitTestHammer } from './input';
import { HAMMER_X, HAMMER_Y } from './config';
import { HUD } from './ui/hud';
import { MenuUI } from './ui/menu';
import { ResultUI } from './ui/result';
import { initAudio, playSfx, playHitSound } from './sound';

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

  private hammerMarker: PIXI.Graphics | null = null;

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
   * 플레이스홀더 에셋 생성 (원통형 블럭)
   */
  private createPlaceholderAssets(): GameAssets {
    // 양품 블럭 (파란색 원통)
    const goodGraphics = new PIXI.Graphics();

    // 타원형 상단
    goodGraphics.beginFill(0x0088ff);
    goodGraphics.drawEllipse(BLOCK_WIDTH / 2, BLOCK_HEIGHT * 0.2, BLOCK_WIDTH / 2 - 5, BLOCK_HEIGHT * 0.15);
    goodGraphics.endFill();

    // 원통 본체
    goodGraphics.beginFill(0x0066cc);
    goodGraphics.drawRect(5, BLOCK_HEIGHT * 0.2, BLOCK_WIDTH - 10, BLOCK_HEIGHT * 0.6);
    goodGraphics.endFill();

    // 타원형 하단 (그림자)
    goodGraphics.beginFill(0x004488);
    goodGraphics.drawEllipse(BLOCK_WIDTH / 2, BLOCK_HEIGHT * 0.8, BLOCK_WIDTH / 2 - 5, BLOCK_HEIGHT * 0.15);
    goodGraphics.endFill();

    // 테두리
    goodGraphics.lineStyle(2, 0x0044aa);
    goodGraphics.drawEllipse(BLOCK_WIDTH / 2, BLOCK_HEIGHT * 0.2, BLOCK_WIDTH / 2 - 5, BLOCK_HEIGHT * 0.15);

    const blockGood = app.renderer.generateTexture(goodGraphics);

    // 불량 블럭 (빨간색 원통)
    const badGraphics = new PIXI.Graphics();

    // 타원형 상단
    badGraphics.beginFill(0xff3333);
    badGraphics.drawEllipse(BLOCK_WIDTH / 2, BLOCK_HEIGHT * 0.2, BLOCK_WIDTH / 2 - 5, BLOCK_HEIGHT * 0.15);
    badGraphics.endFill();

    // 원통 본체
    badGraphics.beginFill(0xcc0000);
    badGraphics.drawRect(5, BLOCK_HEIGHT * 0.2, BLOCK_WIDTH - 10, BLOCK_HEIGHT * 0.6);
    badGraphics.endFill();

    // 타원형 하단 (그림자)
    badGraphics.beginFill(0x880000);
    badGraphics.drawEllipse(BLOCK_WIDTH / 2, BLOCK_HEIGHT * 0.8, BLOCK_WIDTH / 2 - 5, BLOCK_HEIGHT * 0.15);
    badGraphics.endFill();

    // 금 표시 (X 마크)
    badGraphics.lineStyle(4, 0x000000);
    badGraphics.moveTo(BLOCK_WIDTH * 0.3, BLOCK_HEIGHT * 0.4);
    badGraphics.lineTo(BLOCK_WIDTH * 0.7, BLOCK_HEIGHT * 0.6);
    badGraphics.moveTo(BLOCK_WIDTH * 0.7, BLOCK_HEIGHT * 0.4);
    badGraphics.lineTo(BLOCK_WIDTH * 0.3, BLOCK_HEIGHT * 0.6);

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

    // 망치 위치 마커 추가
    this.addHammerMarker();

    // 입력 설정
    this.setupInput();

    // 업데이트 루프 시작
    this.updateBound = (delta: number) => this.update(delta);
    app.ticker.add(this.updateBound);
  }

  /**
   * 망치 위치 마커 추가
   */
  private addHammerMarker(): void {
    this.hammerMarker = new PIXI.Graphics();

    // 반투명 원형 마커
    this.hammerMarker.beginFill(0xffffff, 0.3);
    this.hammerMarker.drawCircle(0, 0, 50);
    this.hammerMarker.endFill();

    // 십자선
    this.hammerMarker.lineStyle(3, 0xffffff, 0.8);
    this.hammerMarker.moveTo(-30, 0);
    this.hammerMarker.lineTo(30, 0);
    this.hammerMarker.moveTo(0, -30);
    this.hammerMarker.lineTo(0, 30);

    // 중심점
    this.hammerMarker.beginFill(0xff0000);
    this.hammerMarker.drawCircle(0, 0, 5);
    this.hammerMarker.endFill();

    this.hammerMarker.x = HAMMER_X;
    this.hammerMarker.y = HAMMER_Y;

    this.uiLayer.addChild(this.hammerMarker);
  }

  /**
   * 망치 타격 애니메이션
   */
  private animateHammer(): void {
    if (!this.hammerMarker) return;

    const originalY = HAMMER_Y;
    const downDistance = 30;
    const duration = 150; // ms
    const startTime = performance.now();

    const animate = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      if (progress < 0.5) {
        // 내려가기
        const t = progress * 2;
        this.hammerMarker!.y = originalY + downDistance * this.easeOutQuad(t);
      } else {
        // 올라오기
        const t = (progress - 0.5) * 2;
        this.hammerMarker!.y = originalY + downDistance * (1 - this.easeOutQuad(t));
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        this.hammerMarker!.y = originalY;
      }
    };

    requestAnimationFrame(animate);
  }

  private easeOutQuad(t: number): number {
    return t * (2 - t);
  }

  /**
   * 입력 설정 (화면 어디든 클릭 가능, 망치 위치에서 타격)
   */
  private setupInput(): void {
    const canvas = app.view as HTMLCanvasElement;

    const handlePointerDown = (_event: PointerEvent) => {
      if (this.state !== 'PLAYING' || !this.column) return;

      // 망치 애니메이션 실행
      this.animateHammer();

      // 망치 위치에 있는 블럭 확인
      const result = hitTestHammer(this.column);

      if (!result) return;

      const { block, isPerfect } = result;

      if (block.type === 'BAD') {
        // 불량 블럭 제거 성공
        removeBlock(block, this.column);

        // 정확도에 따라 점수 차등 지급
        const baseScore = this.config.s2BadHit;
        const scoreDelta = isPerfect ? baseScore : Math.floor(baseScore / 2);

        this.scoreState.score += scoreDelta;
        this.scoreState.badRemoved++;
        this.scoreState.combo++;
        this.scoreState.totalJudgements++;

        // 최대 콤보 갱신
        if (this.scoreState.combo > this.scoreState.maxCombo) {
          this.scoreState.maxCombo = this.scoreState.combo;
        }

        playHitSound(isPerfect);
        this.showHitPop(isPerfect, scoreDelta, 0x00ff00);

        // PERFECT 타격 시 파티클 이펙트
        if (isPerfect) {
          this.showParticles(HAMMER_X, HAMMER_Y);
        }
      } else {
        // 양품 오제거 (실수)
        removeBlock(block, this.column);
        const scoreDelta = applyScore(this.scoreState, 'GOOD_HIT', this.config);
        playSfx('hit_miss');
        this.showHitPop(false, scoreDelta, 0xff0000);
        this.screenFlashRed();
      }
    };

    canvas.addEventListener('pointerdown', handlePointerDown);

    // 정리 시 이벤트 제거 (추후 cleanup 메서드에서)
    // canvas.removeEventListener('pointerdown', handlePointerDown);
  }

  /**
   * 히트 팝업 표시 (PERFECT/GOOD + 점수)
   */
  private showHitPop(isPerfect: boolean, score: number, color: number): void {
    // 판정 텍스트
    const judgement = new PIXI.Text(isPerfect ? 'PERFECT!' : 'GOOD', {
      fontFamily: 'Arial, sans-serif',
      fontSize: isPerfect ? 48 : 36,
      fill: isPerfect ? 0xffd700 : 0xffffff,
      fontWeight: 'bold',
    });
    judgement.anchor.set(0.5);
    judgement.x = HAMMER_X;
    judgement.y = HAMMER_Y - 100;
    this.gameLayer.addChild(judgement);

    // 점수 텍스트
    const scoreText = new PIXI.Text(score > 0 ? `+${score}` : `${score}`, {
      fontFamily: 'Arial, sans-serif',
      fontSize: 32,
      fill: color,
      fontWeight: 'bold',
    });
    scoreText.anchor.set(0.5);
    scoreText.x = HAMMER_X;
    scoreText.y = HAMMER_Y - 50;
    this.gameLayer.addChild(scoreText);

    // 애니메이션
    const startTime = performance.now();
    const duration = 800;

    const animate = () => {
      const elapsed = performance.now() - startTime;
      const progress = elapsed / duration;

      if (progress < 1) {
        judgement.y = HAMMER_Y - 100 - progress * 60;
        judgement.alpha = 1 - progress;

        scoreText.y = HAMMER_Y - 50 - progress * 40;
        scoreText.alpha = 1 - progress;

        requestAnimationFrame(animate);
      } else {
        judgement.destroy();
        scoreText.destroy();
      }
    };

    requestAnimationFrame(animate);
  }

  /**
   * 파티클 이펙트 (PERFECT 타격 시)
   */
  private showParticles(x: number, y: number): void {
    const particleCount = 20;
    const colors = [0xffd700, 0xffff00, 0xffa500, 0xffffff];

    for (let i = 0; i < particleCount; i++) {
      const particle = new PIXI.Graphics();
      const color = colors[Math.floor(Math.random() * colors.length)];
      const size = 3 + Math.random() * 4;

      particle.beginFill(color);
      particle.drawCircle(0, 0, size);
      particle.endFill();

      particle.x = x;
      particle.y = y;

      this.gameLayer.addChild(particle);

      // 랜덤 방향과 속도
      const angle = (Math.PI * 2 * i) / particleCount + (Math.random() - 0.5) * 0.3;
      const speed = 2 + Math.random() * 4;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;

      const startTime = performance.now();
      const duration = 600 + Math.random() * 400;

      const animate = () => {
        const elapsed = performance.now() - startTime;
        const progress = elapsed / duration;

        if (progress < 1) {
          particle.x += vx;
          particle.y += vy;
          particle.alpha = 1 - progress;

          requestAnimationFrame(animate);
        } else {
          particle.destroy();
        }
      };

      requestAnimationFrame(animate);
    }
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
