# Shader Art 10: Ink Splat - 기술 분석

## 개요
이 프로젝트는 **유체 시뮬레이션(Fluid Simulation)** 기반의 잉크 튀김 효과를 렌더링하는 WebGL2 아트워크입니다. 마우스 움직임을 통해 실시간으로 유체의 속도장을 교란시키고, 그 결과를 시각화합니다.

---

## 핵심 아키텍처

### 1. 두 단계 렌더링 파이프라인

이 작품은 매 프레임마다 **2개의 렌더 패스(Pass)**를 실행합니다:

```
마우스 입력
    ↓
[Pass 1: 속도장 시뮬레이션]
    - 유체 시뮬레이션 (sim.glsl) 실행
    - 오프스크린 프레임버퍼에 렌더링
    - 속도장(Velocity Field) 계산 및 업데이트
    ↓
[Pass 2: 시각화]
    - 디스플레이 셰이더 (display.glsl) 실행
    - 계산된 속도장을 색상으로 변환
    - 스크린에 최종 이미지 렌더링
```

이 **두 단계 분리 구조**가 핵심적인 설계 원칙입니다:
- **Pass 1**: 물리 시뮬레이션 (데이터 계산)
- **Pass 2**: 렌더링 (데이터 시각화)

이를 통해 시뮬레이션 로직과 시각화 로직이 완전히 독립적이므로, 시뮬레이션은 그대로 두고 비주얼만 변경하거나, 그 반대도 쉽게 가능합니다.

---

## 유체 시뮬레이션의 원리

### 2.1 속도장(Velocity Field)이란?

속도장은 2D 그리드의 각 픽셀 위치에서 유체가 어느 방향으로 어느 속도로 움직이는지를 저장합니다:

```
위치 (x, y) → 속도 (vx, vy)

텍스처로 표현:
- R채널: x 방향 속도 (vx)
- G채널: y 방향 속도 (vy)
- B, A채널: 미사용
```

이 속도장은 **RGBA16F 텍스처**로 저장됩니다:
- `RGBA16F`: 각 채널이 16비트 부동소수점 (음수 값 표현 가능 → 양방향 속도 표현)
- `FLOAT`: GPU에서 계산할 때 부동소수점 정밀도 보장
- `LINEAR` 필터링: 인접 픽셀 간의 부드러운 보간

### 2.2 자기 이송(Self-Advection)

**아트워크의 핵심 메커니즘**입니다.

```c
// sim.glsl의 핵심 로직
vec2 currentVel = texture(u_velocityTexture, uv).rg;           // 현재 위치의 속도 읽기
vec2 backtraceUV = uv - currentVel * texel * u_advectScale;   // 역추적(backtracing)
vec2 vel = texture(u_velocityTexture, backtraceUV).rg;        // 역추적된 위치에서 속도 읽기
```

**동작 원리:**

1. **역추적(Backtracing)**: 현재 픽셀이 이전 프레임에서 어디에 있었는지 역으로 계산
   - `u_advectScale`은 얼마나 멀리 역추적할지 결정 (유체의 "흐름" 정도)
   - 값이 크면 → 흐름이 빨르고 흐트러짐 (turbulent)
   - 값이 작으면 → 흐름이 느리고 부드러움

2. **이전 속도 상속**: 역추적된 위치의 속도를 현재 위치로 가져옴
   - 유체가 움직이면서 "자기 자신을 끌어당기는" 효과
   - 실제 유체 시뮬레이션의 **자기 이송(advection) 방정식** 구현

**시각적 효과:**
- `advectScale = 0`: 속도가 고정됨 (이송 없음)
- `advectScale = 10`: 속도가 흐름을 따라 스트리밍 (기본값)
- `advectScale = 20`: 과도한 소용돌이 형성

### 2.3 감쇠(Dissipation)

```c
vel *= u_dissipation;  // 매 프레임 속도를 0.899배로 감소
```

**의미:**
- 에너지 손실을 시뮬레이션
- 유체의 점성(viscosity) 표현
- 물리적으로: 마찰, 열 발산 등

**기본값 0.899 의미:**
```
프레임 0: 속도 = 1.0
프레임 1: 속도 = 0.899
프레임 2: 속도 = 0.808
프레임 3: 속도 = 0.727
...
프레임 50: 속도 ≈ 0 (거의 정지)
```

약 50프레임(60fps 기준 1초 미만)에서 움직임이 완전히 감쇠됩니다.

**조정 효과:**
- 감쇠 ↑ (0.95) → 더 오래 흘러감, 화면이 지워지기까지 시간 소요
- 감쇠 ↓ (0.8) → 빠르게 감쇠, 순간적인 표현

---

## 마우스 상호작용: 스플래팅(Splatting)

### 3.1 속도장 주입 메커니즘

```c
// sim.glsl의 splat 로직
vec2 mouseUV = u_mousePos / u_resolution;           // 정규화된 마우스 좌표
float dist = distance(uv, mouseUV);                 // 현재 픽셀과 마우스의 거리
float falloff = exp(-dist * dist / u_splatRadius); // 가우시안 감쇠 함수
vel += u_mouseVel * falloff * u_splatStrength;     // 속도 추가
```

**핵심 요소:**

1. **가우시안 감쇠 함수(Gaussian Falloff)**
   ```
   falloff = exp(-dist²/radius)

   거리 0 (마우스 정중앙): falloff = 1.0 → 최대 속도 주입
   거리 증가:             falloff 지수적 감소
   거리 ∞:               falloff → 0 → 속도 주입 없음
   ```

   이것이 **동그란 "물감 튀김" 형태**를 만드는 핵심입니다.

2. **`splatRadius` 파라미터**
   - 스플래팅의 "퍼짐 범위" 결정
   - 기본값: 0.001 (1000×1000 캔버스에서 약 1픽셀)
   - 작을수록 → 뾰족한 튀김 (점처럼 예리)
   - 클수록 → 부드러운 튀김 (넓게 퍼짐)

3. **`splatStrength` 파라미터**
   - 마우스 속도(mouseVel)의 배율
   - 기본값: 1.2
   - 크면 → 더 강한 에너지 주입 → 더 큰 소용돌이

### 3.2 마우스 속도 추적

```javascript
// app.js
mouseVelX = mouseX - lastMouseX;
mouseVelY = mouseY - lastMouseY;
// ...매 프레임 후 0으로 리셋
mouseVelX = 0;
mouseVelY = 0;
```

**중요한 설계:**
- 마우스 속도는 **한 프레임만 주입** → 일관된 에너지 전달
- 매 프레임 후 즉시 리셋 → "펄스(pulse)" 형태의 교란 생성
- 만약 계속 주입하면 → 마우스를 따라오는 연속적인 드래그 효과

---

## 핑-퐁 버퍼링(Ping-Pong Buffering)

### 4.1 이유: 동시 읽기-쓰기 문제

GPU 렌더링에서는 **같은 텍스처를 읽으면서 동시에 쓸 수 없습니다**:

```c
// ❌ 잘못된 방식 (같은 텍스처를 읽고 쓰는 경우)
vec2 vel = texture(u_velocityTexture, uv).rg;       // 읽기
fragColor = vec4(vel * 0.9, 0.0, 1.0);             // 같은 텍스처에 쓰기 → 정의되지 않은 동작!
```

### 4.2 해결: 핑-퐁 전략

```javascript
// app.js
let currentReadIndex = 0;
const velocityTexture0 = createVelocityTexture();   // 텍스처 0
const velocityTexture1 = createVelocityTexture();   // 텍스처 1
const fb0 = createFramebuffer(velocityTexture0);
const fb1 = createFramebuffer(velocityTexture1);

const swapBuffers = () => {
  currentReadIndex = 1 - currentReadIndex;  // 0 ↔ 1 토글
};

// 렌더 루프
function render() {
  const readTexture = getReadTexture();      // 이전 프레임 결과 읽기
  const writeFramebuffer = getWriteFramebuffer();  // 새로운 텍스처에 쓰기

  // 시뮬레이션
  gl.bindFramebuffer(gl.FRAMEBUFFER, writeFramebuffer);
  // ... 렌더링

  swapBuffers();  // 다음 프레임을 위해 역할 교대
}
```

**동작:**

```
프레임 n:
  읽기: Texture0 (이전 결과)
  쓰기: Texture1 (새로운 결과)
  ↓ swapBuffers()

프레임 n+1:
  읽기: Texture1 (이전 결과)
  쓰기: Texture0 (새로운 결과)
  ↓ swapBuffers()

프레임 n+2:
  읽기: Texture0 (이전 결과)
  ...
```

이것은 **피드백 루프**를 만듭니다:
- 이전 프레임의 속도장이 현재 프레임에 영향 → 연쇄적 시뮬레이션
- 마우스 입력의 에너지가 점차 퍼져나감 → 자연스러운 유체 흐름

---

## 시각화: 속도를 색상으로

### 5.1 Display 셰이더의 매핑

```c
// display.glsl
vec3 color = vec3(0.9f);                    // 배경색: 밝은 회색

float speed = length(vel);                  // 속도의 크기: √(vx² + vy²)
float speedNorm = clamp(speed / 2.0, 0.0, 1.0);  // 속도를 0~1로 정규화
vec3 inkColor = vec3(0.09f);                // 잉크색: 어두운 회색

color = mix(color, inkColor, speedNorm);    // 속도 기반 선형 보간
```

**물리적 해석:**

1. **속도의 크기(Speed)**
   ```
   유체가 빠르게 움직이는 곳 (고속도 영역)
   → 많은 "잉크"가 있다고 표현
   → 어두운 색 (inkColor)

   유체가 정지한 곳 (저속도 영역)
   → 잉크가 없다고 표현
   → 밝은 색 (배경색)
   ```

2. **왜 속도 벡터가 아닌 속도의 크기를 사용하는가?**
   - 방향(direction)은 시각적으로 의미 없음
   - 크기(magnitude)만이 "잉크의 농도"를 나타냄

3. **정규화와 클램프**
   ```
   speed / 2.0: 최대 속도 2.0을 1.0으로 정규화
   clamp(...): 속도가 2.0 이상이면 1.0 (순수 검은색)
   ```

**시각적 효과:**

```
마우스 빠르게 움직임
↓
높은 속도 주입 (u_mouseVel * falloff * u_splatStrength)
↓
speedNorm이 1.0에 가까움
↓
color ≈ inkColor (검은색) → 짙은 잉크
↓
자기 이송에 의해 속도가 주변으로 퍼짐
↓
주변 픽셀의 speed도 증가
↓
주변도 어두워짐 → 확산된 잉크 표현
↓
감쇠에 의해 속도가 점차 감소
↓
색이 밝아짐 → 사라지는 효과
```

---

## 아트워크가 만들어지는 메커니즘 요약

### Step-by-Step 프로세스

```
마우스 클릭 + 드래그
    ↓ 마우스 속도 계산 (mouseVelX, mouseVelY)

[Sim Pass] 속도장 업데이트
    1. 자기 이송(advection)으로 속도장을 유체처럼 흐르게 함
       → u_advectScale이 크면 흐트러짐 (turbulence)
    2. 가우시안 감쇠 기반 스플래팅으로 마우스 속도 주입
       → 동그란 영역에 에너지 전달
    3. 감쇠로 에너지 손실 (dissipation)
       → 점차 정지 방향으로
    ↓ 결과: 업데이트된 속도장

[Display Pass] 속도를 색으로 변환
    1. 각 픽셀의 속도 크기(speed) 계산
    2. 속도 크기를 0~1로 정규화
    3. 배경색(밝음)과 잉크색(어두움) 사이 선형 보간
    ↓ 결과: 최종 화면 렌더링

다음 프레임으로
    - 핍-퐁 버퍼 교대
    - 자기 이송이 계속되므로 움직임 지속
    - 감쇠로 점차 사라짐
```

---

## 파라미터가 만드는 미학

### 기본값 분석

| 파라미터 | 값 | 역할 | 시각적 의미 |
|---------|-----|------|----------|
| `dissipation` | 0.899 | 감쇠율 | 약 1초 내에 사라지는 궤적 |
| `advectScale` | 10.0 | 이송 강도 | 자연스러운 유체 흐름 |
| `splatRadius` | 0.001 | 스플래팅 반경 | 예리한 튀김 효과 |
| `splatStrength` | 1.2 | 스플래팅 강도 | 중간 강도의 반응성 |

### 극단적 설정의 결과

**`advectScale = 0` (이송 없음):**
- 각 픽셀이 독립적
- 마우스 아래에서만 색 변화
- 흐름 없는 "점" 같은 효과

**`advectScale = 20` (과도한 이송):**
- 속도장이 급격하게 변함
- 긴 스트리크(streaks) 형성
- 혼란스러운 소용돌이
- Turbulent하고 예술적인 표현

**`dissipation = 0.95` (약한 감쇠):**
- 마우스 궤적이 오래 유지
- 화면이 점차 검어짐
- "잉크 자국" 축적 효과

**`dissipation = 0.8` (강한 감쇠):**
- 순간적인 섬광 같은 효과
- 빠르게 사라짐
- 매우 "살아있는" 느낌

---

## 핵심 기술 정리

| 기술 | 목적 | 구현 |
|------|------|------|
| **Advection** | 유체의 흐름 표현 | 역추적 텍스처 샘플링 |
| **Splat** | 마우스 입력 →  속도장 변환 | 가우시안 감쇠 함수 |
| **Dissipation** | 에너지 손실 시뮬레이션 | 스칼라 곱셈 |
| **Ping-Pong Buffering** | 피드백 루프 생성 | 두 개 텍스처 교대 |
| **Velocity → Color** | 속도장 시각화 | 속도 크기 기반 선형 보간 |

---

## 수학적 기초

### 유체 시뮬레이션의 나비에-스토크스 방정식에서

이 프로젝트는 **Semi-Lagrangian Advection** 기법을 사용합니다:

```
d(u)/dt = -(u·∇)u + ν∇²u + f
           ↑           ↑      ↑
        Advection  Diffusion Force

구현:
1. Advection: texture(u_velocityTexture, uv - u*dt)
2. Diffusion: vel *= dissipation (간단한 근사)
3. Force: 마우스 스플렛 (외부 입력)
```

Semi-Lagrangian 방식의 장점:
- 조건부 안정성 (CFL 조건 무시 가능)
- GPU 구현에 최적화
- 이미지 기반 시뮬레이션에 자연스러움

---

## 결론

이 아트워크는 **실시간 유체 시뮬레이션**을 GPU에서 효율적으로 구현한 것입니다:

1. **두 단계 파이프라인**: 시뮬레이션과 렌더링 분리
2. **자기 이송**: 속도장이 자신을 따라 움직이는 유동 표현
3. **스플래팅**: 마우스 입력을 유체 에너지로 변환
4. **핑-퐁 버퍼링**: 프레임 간 피드백 루프 생성
5. **속도 → 색**: 물리적 데이터의 직관적 시각화

이 5가지 요소가 조합되어 마우스 움직임이 **살아있는 잉크 튀김 같은 유체 예술**로 변환됩니다.
