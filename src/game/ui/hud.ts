import * as PIXI from 'pixi.js';
import { ScoreState } from '../types';
import { LOGICAL_WIDTH, SAFE_LINE_Y } from '../config';

export class HUD {
  private container: PIXI.Container;
  private scoreText: PIXI.Text;
  private timerText: PIXI.Text;
  private comboText: PIXI.Text;
  private safeLine: PIXI.Graphics;
  private warningFlash: boolean = false;

  constructor() {
    this.container = new PIXI.Container();

    // 점수 텍스트
    this.scoreText = new PIXI.Text('Score: 0', {
      fontFamily: 'Arial, sans-serif',
      fontSize: 32,
      fill: 0xffffff,
      fontWeight: 'bold',
    });
    this.scoreText.x = 20;
    this.scoreText.y = 20;
    this.container.addChild(this.scoreText);

    // 타이머 텍스트
    this.timerText = new PIXI.Text('60s', {
      fontFamily: 'Arial, sans-serif',
      fontSize: 32,
      fill: 0xffff00,
      fontWeight: 'bold',
    });
    this.timerText.anchor.set(1, 0);
    this.timerText.x = LOGICAL_WIDTH - 20;
    this.timerText.y = 20;
    this.container.addChild(this.timerText);

    // 콤보 텍스트
    this.comboText = new PIXI.Text('', {
      fontFamily: 'Arial, sans-serif',
      fontSize: 28,
      fill: 0xff6b6b,
      fontWeight: 'bold',
    });
    this.comboText.anchor.set(0.5, 0);
    this.comboText.x = LOGICAL_WIDTH / 2;
    this.comboText.y = 70;
    this.comboText.visible = false;
    this.container.addChild(this.comboText);

    // 안전선
    this.safeLine = new PIXI.Graphics();
    this.drawSafeLine(0xff0000, 1);
    this.container.addChild(this.safeLine);
  }

  private drawSafeLine(color: number, alpha: number): void {
    this.safeLine.clear();
    this.safeLine.lineStyle(3, color, alpha);
    this.safeLine.moveTo(0, SAFE_LINE_Y);
    this.safeLine.lineTo(LOGICAL_WIDTH, SAFE_LINE_Y);
  }

  update(scoreState: ScoreState, timeLeftMs: number): void {
    // 점수 업데이트
    this.scoreText.text = `Score: ${scoreState.score}`;

    // 타이머 업데이트
    const seconds = Math.ceil(timeLeftMs / 1000);
    this.timerText.text = `${seconds}s`;

    // 타이머 색상 (마지막 10초는 빨간색)
    if (seconds <= 10) {
      this.timerText.style.fill = 0xff0000;
    } else {
      this.timerText.style.fill = 0xffff00;
    }

    // 콤보 표시
    if (scoreState.combo >= 5) {
      this.comboText.text = `COMBO x${scoreState.combo}`;
      this.comboText.visible = true;

      // 콤보 색상
      if (scoreState.combo >= 20) {
        this.comboText.style.fill = 0xff00ff; // 보라
      } else if (scoreState.combo >= 10) {
        this.comboText.style.fill = 0xff6600; // 주황
      } else {
        this.comboText.style.fill = 0xff6b6b; // 빨강
      }
    } else {
      this.comboText.visible = false;
    }

    // 55초 이후 안전선 점멸
    if (timeLeftMs <= 5000) {
      this.warningFlash = !this.warningFlash;
      const alpha = this.warningFlash ? 1 : 0.3;
      this.drawSafeLine(0xff0000, alpha);
    } else {
      this.drawSafeLine(0xff0000, 0.6);
    }
  }

  getContainer(): PIXI.Container {
    return this.container;
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }
}
