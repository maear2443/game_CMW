import * as PIXI from 'pixi.js';
import { LOGICAL_WIDTH, LOGICAL_HEIGHT } from '../config';

export class MenuUI {
  private container: PIXI.Container;
  private startButton: PIXI.Graphics;
  private onStart: () => void;

  constructor(onStart: () => void) {
    this.onStart = onStart;
    this.container = new PIXI.Container();

    // 배경
    const bg = new PIXI.Graphics();
    bg.beginFill(0x1a1a2e);
    bg.drawRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
    bg.endFill();
    this.container.addChild(bg);

    // 타이틀
    const title = new PIXI.Text('TOTEM DROP', {
      fontFamily: 'Arial, sans-serif',
      fontSize: 64,
      fill: 0xffd700,
      fontWeight: 'bold',
      align: 'center',
    });
    title.anchor.set(0.5);
    title.x = LOGICAL_WIDTH / 2;
    title.y = 200;
    this.container.addChild(title);

    // 설명
    const description = new PIXI.Text('1분 동안 불량 블럭만 제거하라!\n정확하고 빠를수록 높은 점수!', {
      fontFamily: 'Arial, sans-serif',
      fontSize: 24,
      fill: 0xcccccc,
      align: 'center',
      wordWrap: true,
      wordWrapWidth: 400,
    });
    description.anchor.set(0.5);
    description.x = LOGICAL_WIDTH / 2;
    description.y = 320;
    this.container.addChild(description);

    // 블럭 예시 (좋은 블럭 / 나쁜 블럭)
    const goodLabel = new PIXI.Text('양품 (통과)', {
      fontFamily: 'Arial, sans-serif',
      fontSize: 20,
      fill: 0x00ff00,
    });
    goodLabel.anchor.set(0.5);
    goodLabel.x = LOGICAL_WIDTH / 2 - 100;
    goodLabel.y = 450;
    this.container.addChild(goodLabel);

    const badLabel = new PIXI.Text('불량 (제거)', {
      fontFamily: 'Arial, sans-serif',
      fontSize: 20,
      fill: 0xff0000,
    });
    badLabel.anchor.set(0.5);
    badLabel.x = LOGICAL_WIDTH / 2 + 100;
    badLabel.y = 450;
    this.container.addChild(badLabel);

    // 시작 버튼
    this.startButton = new PIXI.Graphics();
    this.drawButton(0x4ecdc4, false);
    this.startButton.x = LOGICAL_WIDTH / 2;
    this.startButton.y = 600;
    this.startButton.interactive = true;
    this.startButton.cursor = 'pointer';
    this.container.addChild(this.startButton);

    const buttonText = new PIXI.Text('START', {
      fontFamily: 'Arial, sans-serif',
      fontSize: 36,
      fill: 0xffffff,
      fontWeight: 'bold',
    });
    buttonText.anchor.set(0.5);
    this.startButton.addChild(buttonText);

    // 버튼 이벤트
    this.startButton.on('pointerdown', () => {
      this.drawButton(0x3ba89d, true);
    });

    this.startButton.on('pointerup', () => {
      this.drawButton(0x4ecdc4, false);
      this.onStart();
    });

    this.startButton.on('pointerover', () => {
      this.drawButton(0x5eddd4, false);
    });

    this.startButton.on('pointerout', () => {
      this.drawButton(0x4ecdc4, false);
    });
  }

  private drawButton(color: number, pressed: boolean): void {
    this.startButton.clear();
    const offsetY = pressed ? 4 : 0;
    this.startButton.beginFill(color);
    this.startButton.drawRoundedRect(-100, -30 + offsetY, 200, 60, 10);
    this.startButton.endFill();
  }

  getContainer(): PIXI.Container {
    return this.container;
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }
}
