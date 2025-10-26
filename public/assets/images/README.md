# 이미지 에셋

이 폴더에 게임에서 사용할 이미지 파일을 넣어주세요.

## 필요한 이미지 파일

### 블럭 이미지 (최대 5개씩)

**양품 블럭** (파란색 원통형)
- `block_good_1.png` - 양품 디자인 1
- `block_good_2.png` - 양품 디자인 2
- `block_good_3.png` - 양품 디자인 3
- `block_good_4.png` - 양품 디자인 4
- `block_good_5.png` - 양품 디자인 5

**불량 블럭** (빨간색 원통형 + X 표시)
- `block_bad_1.png` - 불량 디자인 1
- `block_bad_2.png` - 불량 디자인 2
- `block_bad_3.png` - 불량 디자인 3
- `block_bad_4.png` - 불량 디자인 4
- `block_bad_5.png` - 불량 디자인 5

### 이미지 규격
- **크기**: 120x120 픽셀
- **형식**: PNG (투명 배경 권장)

## 사용 방법

### 전체 5개 추가
1개부터 5개까지 순서대로 이름을 지정하여 모두 추가하면, 게임에서 **랜덤하게 선택**되어 표시됩니다.

```
public/assets/images/
├── block_good_1.png
├── block_good_2.png
├── block_good_3.png
├── block_good_4.png
├── block_good_5.png
├── block_bad_1.png
├── block_bad_2.png
├── block_bad_3.png
├── block_bad_4.png
└── block_bad_5.png
```

### 일부만 추가
1개만 추가해도 되고, 2~4개만 추가해도 됩니다. 있는 디자인들 중에서 랜덤으로 선택됩니다.

예시:
```
public/assets/images/
├── block_good_1.png  ← 양품은 1개만
├── block_bad_1.png   ← 불량은 3개
├── block_bad_2.png
└── block_bad_3.png
```

## 이미지 제작 가이드

### 블럭 디자인 팁
- 원통형 모양 (3D 느낌)
- 밝은 색상 사용 (가독성)
- 외곽선 추가 (명확한 구분)
- 그림자 효과 (입체감)
- 각 디자인마다 다른 패턴/색상으로 다양성 부여

### Fallback
파일이 없으면 코드로 생성된 기본 그래픽 1개가 사용됩니다.
