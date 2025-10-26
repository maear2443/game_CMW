import * as PIXI from 'pixi.js';
import { GameState, Column, ScoreState, GameConfig, GameAssets } from './types';
import { GAME_DURATION, SAFE_LINE_Y, difficultyAt, getSpeedMultiplier } from './config';
import { initRng } from '@/engine/rng';
import { app, gameContainer } from '@/engine/app';
import {
  createColumn,
  fillInitialBlocks,
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
import { loadGameAssets } from './assets';

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

    // 에셋 로드 (비동기) - 로드 완료 후 블럭 풀 초기화
    this.assets = { blockGood: PIXI.Texture.EMPTY, blockBad: PIXI.Texture.EMPTY };
    this.loadAssets();

    // 첫 터치 시 오디오 초기화
    this.setupFirstTouch();
  }

  /**
   * 게임 에셋 로드
   */
  private async loadAssets(): Promise<void> {
    this.assets = await loadGameAssets();
    initBlockPool(this.assets);
    console.log('✓ 게임 준비 완료');
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

    // 초기 블럭으로 화면 채우기
    fillInitialBlocks(this.column, this.config, this.assets, this.gameLayer);

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
   * 타겟 및 망치 타격 애니메이션
   * 1. 타겟이 위에서 망치 위치로 내려옴
   * 2. 망치가 옆에서 들어와서 블럭을 타격
   */
  private animateHammer(): void {
    if (!this.hammerMarker) return;

    // 1단계: 타겟이 위→아래로 이동
    const startY = 150;  // 화면 상단에서 시작
    const targetY = HAMMER_Y;
    const dropDuration = 200; // ms
    const dropStartTime = performance.now();

    const dropAnimate = () => {
      const elapsed = performance.now() - dropStartTime;
      const progress = Math.min(elapsed / dropDuration, 1);

      // easeInQuad로 가속하며 떨어짐
      const t = progress * progress;
      this.hammerMarker!.y = startY + (targetY - startY) * t;

      if (progress < 1) {
        requestAnimationFrame(dropAnimate);
      } else {
        // 2단계: 망치가 옆에서 들어와 타격
        this.animateHammerStrike();
      }
    };

    // 타겟을 시작 위치로 이동
    this.hammerMarker.y = startY;
    requestAnimationFrame(dropAnimate);
  }

  /**
   * 망치가 옆에서 들어와서 타격하는 애니메이션
   */
  private animateHammerStrike(): void {
    if (!this.hammerMarker) return;

    // 망치 스프라이트 생성 (간단한 사각형)
    const hammer = new PIXI.Graphics();
    hammer.beginFill(0x8b4513); // 갈색
    hammer.drawRect(0, 0, 80, 30);
    hammer.endFill();
    hammer.beginFill(0x696969); // 회색 (망치 헤드)
    hammer.drawRect(60, -10, 40, 50);
    hammer.endFill();

    hammer.x = -120; // 화면 왼쪽 밖에서 시작
    hammer.y = HAMMER_Y - 15;
    this.gameLayer.addChild(hammer);

    const startX = -120;
    const targetX = HAMMER_X - 40;
    const duration = 150; // ms
    const startTime = performance.now();

    const animate = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      if (progress < 0.5) {
        // 들어가기 (빠르게)
        const t = progress * 2;
        hammer.x = startX + (targetX - startX) * this.easeOutQuad(t);
      } else {
        // 나가기 (빠르게)
        const t = (progress - 0.5) * 2;
        hammer.x = targetX - (targetX - startX) * this.easeOutQuad(t);
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        // 애니메이션 완료 후 망치 제거
        this.gameLayer.removeChild(hammer);
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

      const { block, accuracy } = result;

      if (block.type === 'BAD') {
        // 불량 블럭 제거 성공
        removeBlock(block, this.column);

        // 정확도에 따라 점수 차등 지급 (8/6/4/2)
        let scoreDelta: number;
        switch (accuracy) {
          case 'PERFECT':
            scoreDelta = 8;
            break;
          case 'EXCELLENT':
            scoreDelta = 6;
            break;
          case 'GOOD':
            scoreDelta = 4;
            break;
          case 'NOT_BAD':
            scoreDelta = 2;
            break;
        }

        this.scoreState.score += scoreDelta;
        this.scoreState.badRemoved++;
        this.scoreState.combo++;
        this.scoreState.totalJudgements++;

        // 최대 콤보 갱신
        if (this.scoreState.combo > this.scoreState.maxCombo) {
          this.scoreState.maxCombo = this.scoreState.combo;
        }

        playHitSound(accuracy === 'PERFECT');
        this.showHitPop(accuracy, scoreDelta, 0x00ff00);

        // PERFECT 타격 시 파티클 이펙트
        if (accuracy === 'PERFECT') {
          this.showParticles(HAMMER_X, HAMMER_Y);
        }
      } else {
        // 양품 오제거 (실수)
        removeBlock(block, this.column);
        const scoreDelta = applyScore(this.scoreState, 'GOOD_HIT', this.config);
        playSfx('hit_miss');
        this.showHitPop('NOT_BAD', scoreDelta, 0xff0000);
        this.screenFlashRed();
      }
    };

    canvas.addEventListener('pointerdown', handlePointerDown);

    // 정리 시 이벤트 제거 (추후 cleanup 메서드에서)
    // canvas.removeEventListener('pointerdown', handlePointerDown);
  }

  /**
   * 히트 팝업 표시 (PERFECT/EXCELLENT/GOOD/NOT_BAD + 점수)
   */
  private showHitPop(accuracy: import('./types').HitAccuracy, score: number, color: number): void {
    // 판정 텍스트 및 색상 설정
    let text: string;
    let fontSize: number;
    let textColor: number;

    switch (accuracy) {
      case 'PERFECT':
        text = 'PERFECT!';
        fontSize = 48;
        textColor = 0xffd700; // 금색
        break;
      case 'EXCELLENT':
        text = 'EXCELLENT!';
        fontSize = 42;
        textColor = 0x00ffff; // 시안
        break;
      case 'GOOD':
        text = 'GOOD';
        fontSize = 36;
        textColor = 0x00ff00; // 초록
        break;
      case 'NOT_BAD':
        text = 'NOT BAD';
        fontSize = 32;
        textColor = 0xffffff; // 하양
        break;
    }

    // 판정 텍스트
    const judgement = new PIXI.Text(text, {
      fontFamily: 'Arial, sans-serif',
      fontSize,
      fill: textColor,
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

    // 스크롤 (속도 배수 적용)
    const dy = (this.config.speedPxPerSec * dt * getSpeedMultiplier()) / 1000;
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
