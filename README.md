# Totem Drop 🎮

**1분 아케이드 모바일 게임** - 불량 블럭만 제거하라!

## 게임 소개

무한히 이어지는 토템 블럭 기둥이 1분 동안 천천히 아래로 내려옵니다. 플레이어는 불량 블럭만 망치로 제거하여 빈 칸을 즉시 메우며, 정확도와 반응속도로 점수를 겨룹니다.

### 핵심 특징

- **1분 타임어택**: 빠른 플레이 세션
- **4단계 정확도 시스템**: PERFECT/EXCELLENT/GOOD/NOT BAD
- **속도 조절**: 1x ~ 5x 배속 선택 가능
- **난이도 곡선**: 시간이 지날수록 속도와 난이도 증가
- **콤보 시스템**: 연속 정확 타격으로 보너스
- **PWA 지원**: 오프라인 플레이 가능

### 게임 방법

1. 화면을 **아무 곳이나 클릭**하면 타겟이 내려옵니다
2. **빨간 불량 블럭**만 제거하세요 (파란 양품 블럭은 그대로!)
3. 정확도에 따라 점수 획득:
   - **PERFECT** (중심 25%): 8점 ⭐
   - **EXCELLENT** (25-50%): 6점
   - **GOOD** (50-75%): 4점
   - **NOT BAD** (75-100%): 2점
4. 60초 안에 최고 점수를 만드세요!

---

## 🎨 에셋 교체 가이드

게임의 이미지와 사운드를 쉽게 교체할 수 있습니다!

### 1. 블럭 이미지 교체

#### 📁 위치
```
public/assets/images/
```

#### 필요한 파일
- `block_good.png` - 양품 블럭 (파란색 원통형)
- `block_bad.png` - 불량 블럭 (빨간색 원통형 + X표시)

#### 이미지 규격
- **크기**: 120x120 픽셀
- **형식**: PNG (투명 배경 권장)
- **디자인 팁**:
  - 원통형 3D 느낌
  - 밝은 색상 (가독성)
  - 외곽선 추가 (명확한 구분)
  - 그림자 효과 (입체감)

#### 교체 방법
1. 이미지 파일을 `public/assets/images/` 폴더에 복사
2. 파일명을 정확히 `block_good.png`, `block_bad.png`로 저장
3. 게임을 빌드하고 새로고침

```bash
npm run build
```

---

### 2. 사운드 교체

#### 📁 위치
```
public/assets/sounds/
```

#### 필요한 파일

**BGM (배경음악)**
- `bgm_menu.mp3` - 메뉴 화면 음악 (루프 가능)
- `bgm_game.mp3` - 게임 플레이 음악 (60초 이상)

**효과음**
- `sfx_hit_perfect.mp3` - PERFECT 타격음 (높은 톤)
- `sfx_hit_excellent.mp3` - EXCELLENT 타격음
- `sfx_hit_good.mp3` - GOOD 타격음
- `sfx_hit_notbad.mp3` - NOT BAD 타격음
- `sfx_miss.mp3` - 실수 (양품 제거)
- `sfx_pass_bad.mp3` - 불량 통과 (패널티)
- `sfx_countdown.mp3` - 카운트다운 (3, 2, 1)
- `sfx_start.mp3` - 게임 시작

#### 사운드 규격
- **샘플레이트**: 44100Hz
- **비트레이트**: 128-192kbps
- **채널**: 스테레오
- **형식**: MP3 또는 OGG
- **길이**: BGM 60초+, 효과음 0.2~0.5초

#### 볼륨 가이드
- **BGM**: -20dB ~ -15dB (배경으로 은은하게)
- **효과음**: -10dB ~ -5dB (명확하게 들림)

#### 교체 방법
1. 사운드 파일을 `public/assets/sounds/` 폴더에 복사
2. 파일명을 위의 목록과 동일하게 저장
3. 게임을 빌드하고 새로고침

```bash
npm run build
```

---

### 3. Fallback 시스템 ⚡

**파일이 없을 경우 자동으로 대체됩니다:**
- **이미지**: 코드로 생성된 기본 그래픽 사용
- **사운드**: Web Audio API로 생성된 프로시저럴 사운드 사용

따라서 일부만 교체해도 게임이 정상 작동합니다!

---

## 기술 스택

- **엔진**: PixiJS 7.x
- **언어**: TypeScript
- **빌드**: Vite
- **PWA**: Service Worker + Manifest
- **타겟**: 모바일 웹 (iOS/Android)

## 시작하기

### 1. 의존성 설치

```bash
npm install
```

### 2. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 http://localhost:3000 열기

### 3. 프로덕션 빌드

```bash
npm run build
```

빌드 결과는 `dist/` 폴더에 생성됩니다.

### 4. 빌드 미리보기

```bash
npm run preview
```

### 5. 타입 체크

```bash
npm run type-check
```

## 프로젝트 구조

```
game_CMW/
├── public/              # 정적 파일
│   ├── assets/
│   │   ├── images/      # 🎨 이미지 파일 (교체 가능)
│   │   │   ├── README.md
│   │   │   ├── block_good.png (선택)
│   │   │   └── block_bad.png (선택)
│   │   └── sounds/      # 🔊 사운드 파일 (교체 가능)
│   │       ├── README.md
│   │       ├── bgm_*.mp3 (선택)
│   │       └── sfx_*.mp3 (선택)
│   ├── manifest.json    # PWA 매니페스트
│   └── sw.js            # Service Worker
├── src/
│   ├── engine/          # 게임 엔진
│   │   ├── app.ts       # PixiJS 초기화
│   │   ├── rng.ts       # 난수 생성기
│   │   └── pool.ts      # 오브젝트 풀링
│   ├── game/            # 게임 로직
│   │   ├── assets.ts    # 🎨 에셋 로더
│   │   ├── config.ts    # 게임 설정
│   │   ├── state.ts     # 게임 상태 관리
│   │   ├── column.ts    # 블럭 컬럼
│   │   ├── input.ts     # 입력 처리
│   │   ├── scoring.ts   # 점수 계산
│   │   ├── sound.ts     # 🔊 사운드 시스템
│   │   └── ui/          # UI 컴포넌트
│   ├── utils/           # 유틸리티
│   └── main.ts          # 진입점
└── docs/                # GitHub Pages 배포
```

## 게임 규칙

### 점수 시스템 (정확도 기반)

**불량 블럭 제거**
- PERFECT (중심 25%): 8점
- EXCELLENT (25-50%): 6점
- GOOD (50-75%): 4점
- NOT BAD (75-100%): 2점

**기타**
- 양품 안전 통과: +5점
- 불량 미처리 통과: -10점
- 양품 오제거: -12점

### 콤보 보너스

- 5콤보: +5점
- 10콤보: +15점
- 20콤보: +40점

### 난이도 단계

| 시간 | 속도 | 불량 확률 | PERFECT 점수 |
|------|------|-----------|--------------|
| 0~15초 | 80 px/s | 40% | 8점 |
| 15~35초 | 100 px/s | 45% | 8점 |
| 35~50초 | 120 px/s | 50% | 10점 |
| 50~60초 | 150 px/s | 55% | 12점 |

## 성능 최적화

- **오브젝트 풀링**: 블럭 생성/파괴 최소화
- **에셋 캐싱**: Service Worker로 빠른 로딩
- **60FPS 타겟**: 저사양에서는 30FPS 어댑티브
- **모바일 최적화**: 터치 입력, 뷰포트 스케일링

## 배포

### GitHub Pages

1. 빌드 및 docs 폴더 생성:

```bash
npm run build
rm -rf docs && cp -r dist docs
```

2. 커밋 & 푸시:

```bash
git add docs
git commit -m "deploy: Update game build"
git push
```

3. GitHub Settings > Pages에서 설정:
   - Source: Deploy from a branch
   - Branch: 선택 / docs 폴더
   - Save

4. 접속: https://maear2443.github.io/game_CMW/

### 기타 플랫폼

빌드 후 `dist/` 폴더를 정적 호스팅 서비스에 배포:

- Vercel
- Netlify
- Cloudflare Pages

## 라이선스

MIT License

## 🎯 향후 계획

- [ ] 리더보드 시스템
- [ ] 더 많은 블럭 타입
- [ ] 파워업 아이템
- [ ] 멀티플레이어 모드
- [ ] 사운드트랙 추가
- [ ] 배경 이미지 커스터마이징

## 개발 일정

- **Day 1**: 렌더 루프 + 스크롤 + 스폰 + 기본 UI ✅
- **Day 2**: 망치 히트/낙하/콤보/사운드/결과 화면 ✅
- **Day 3**: 4단계 정확도 + 속도 조절 + 애니메이션 강화 ✅
- **Day 4**: 에셋 시스템 + 리더보드 연동/QA/PWA 최적화

---

**Made with ❤️ using PixiJS & TypeScript**
