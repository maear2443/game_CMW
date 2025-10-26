import * as PIXI from 'pixi.js';
import { ScoreState } from '../types';
import { LOGICAL_WIDTH, LOGICAL_HEIGHT } from '../config';
import { calculateAccuracy } from '../scoring';

export class ResultUI {
  private container: PIXI.Container;
  private retryButton: PIXI.Graphics;
  private onRetry: () => void;

  constructor(scoreState: ScoreState, onRetry: () => void) {
    this.onRetry = onRetry;
    this.container = new PIXI.Container();

    const accuracy = calculateAccuracy(scoreState);

    // 반투명 배경
    const bg = new PIXI.Graphics();
    bg.beginFill(0x000000, 0.8);
    bg.drawRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
    bg.endFill();
    this.container.addChild(bg);

    // 결과 패널
    const panel = new PIXI.Graphics();
    panel.beginFill(0x2d2d44);
    panel.lineStyle(3, 0x4ecdc4);
    panel.drawRoundedRect(LOGICAL_WIDTH / 2 - 200, 150, 400, 600, 20);
    panel.endFill();
    this.container.addChild(panel);

    // 타이틀
    const title = new PIXI.Text('GAME OVER', {
      fontFamily: 'Arial, sans-serif',
      fontSize: 48,
      fill: 0xffd700,
      fontWeight: 'bold',
    });
    title.anchor.set(0.5);
    title.x = LOGICAL_WIDTH / 2;
    title.y = 220;
    this.container.addChild(title);

    // 점수
    const scoreText = new PIXI.Text(`Score: ${scoreState.score}`, {
      fontFamily: 'Arial, sans-serif',
      fontSize: 36,
      fill: 0xffffff,
      fontWeight: 'bold',
    });
    scoreText.anchor.set(0.5);
    scoreText.x = LOGICAL_WIDTH / 2;
    scoreText.y = 300;
    this.container.addChild(scoreText);

    // 정확도
    const accuracyText = new PIXI.Text(`Accuracy: ${accuracy}%`, {
      fontFamily: 'Arial, sans-serif',
      fontSize: 28,
      fill: accuracy >= 80 ? 0x00ff00 : accuracy >= 50 ? 0xffff00 : 0xff0000,
    });
    accuracyText.anchor.set(0.5);
    accuracyText.x = LOGICAL_WIDTH / 2;
    accuracyText.y = 360;
    this.container.addChild(accuracyText);

    // 최대 콤보
    const comboText = new PIXI.Text(`Max Combo: x${scoreState.maxCombo}`, {
      fontFamily: 'Arial, sans-serif',
      fontSize: 24,
      fill: 0xff6b6b,
    });
    comboText.anchor.set(0.5);
    comboText.x = LOGICAL_WIDTH / 2;
    comboText.y = 410;
    this.container.addChild(comboText);

    // 통계
    const stats = `Good Passed: ${scoreState.goodPassed}\nBad Removed: ${scoreState.badRemoved}\nBad Missed: ${scoreState.badMissed}\nGood Mistake: ${scoreState.goodMistake}`;
    const statsText = new PIXI.Text(stats, {
      fontFamily: 'Arial, sans-serif',
      fontSize: 18,
      fill: 0xcccccc,
      align: 'left',
    });
    statsText.anchor.set(0.5);
    statsText.x = LOGICAL_WIDTH / 2;
    statsText.y = 510;
    this.container.addChild(statsText);

    // 재시작 버튼
    this.retryButton = new PIXI.Graphics();
    this.drawButton(0x4ecdc4, false);
    this.retryButton.x = LOGICAL_WIDTH / 2;
    this.retryButton.y = 650;
    this.retryButton.interactive = true;
    this.retryButton.cursor = 'pointer';
    this.container.addChild(this.retryButton);

    const buttonText = new PIXI.Text('RETRY', {
      fontFamily: 'Arial, sans-serif',
      fontSize: 32,
      fill: 0xffffff,
      fontWeight: 'bold',
    });
    buttonText.anchor.set(0.5);
    this.retryButton.addChild(buttonText);

    // 버튼 이벤트
    this.retryButton.on('pointerdown', () => {
      this.drawButton(0x3ba89d, true);
    });

    this.retryButton.on('pointerup', () => {
      this.drawButton(0x4ecdc4, false);
      this.onRetry();
    });

    this.retryButton.on('pointerover', () => {
      this.drawButton(0x5eddd4, false);
    });

    this.retryButton.on('pointerout', () => {
      this.drawButton(0x4ecdc4, false);
    });
  }

  private drawButton(color: number, pressed: boolean): void {
    this.retryButton.clear();
    const offsetY = pressed ? 4 : 0;
    this.retryButton.beginFill(color);
    this.retryButton.drawRoundedRect(-100, -30 + offsetY, 200, 60, 10);
    this.retryButton.endFill();
  }

  getContainer(): PIXI.Container {
    return this.container;
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }
}
