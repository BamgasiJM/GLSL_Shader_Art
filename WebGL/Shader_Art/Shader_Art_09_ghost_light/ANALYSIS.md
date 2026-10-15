# Shader Art 09: Ghost Light - 기술 분석

## 개요
이 프로젝트는 **레이어드 노이즈(Layered Noise)**, **와류(Vorticity)**, **극좌표 변환(Polar Coordinates)**을 조합해 유령불 같은 신비로운 빛의 흐름을 표현하는 작품입니다. 마우스를 중심으로 소용돌이치는 에너지 필드가 형성되어, 매우 동적이고 유기적인 시각 효과를 만듭니다.

---

## 핵심 메커니즘

### 1. 노이즈 기반 Turbulence

```c
// 레이어드 노이즈
float n1 = noise(uv * 3.0 + flowTime);
float n2 = noise(uv * 5.0 + flowTime * 1.5 + vec2(10.0));
float n3 = noise(uv * 8.0 + flowTime * 2.0 + vec2(20.0));
float n4 = noise(uv * 12.0 + flowTime * 0.8 + vec2(30.0));

// 멀티레이어 turbulence
float turbulence = n1 * 0.4 + n2 * 0.35 + n3 * 0.15 + n4 * 0.1;
turbulence = pow(turbulence, 1.2);
```

**레이어드 노이즈의 원리:**

각 노이즈 레이어는 서로 다른 **주파수(frequency)** 와 **시간 속도(time scale)**를 가집니다:

| 레이어 | 주파수 | 시간 배수 | 가중치 | 역할 |
|--------|--------|----------|--------|------|
| n1 | 3.0 | 1.0x | 0.4 | 큰 흐름 (Low Frequency) |
| n2 | 5.0 | 1.5x | 0.35 | 중간 흐름 |
| n3 | 8.0 | 2.0x | 0.15 | 세밀한 세부사항 |
| n4 | 12.0 | 0.8x | 0.1 | 극세 디테일 |

**시각적 의미:**
```
n1 (저주파)  → 전체적인 흐름 형태 결정
  ↓
n2, n3 (중주파) → 소용돌이와 꼬임 추가
  ↓
n4 (고주파) → 미세한 난류 표현
  ↓
pow(..., 1.2) → 높은 노이즈 값을 더 강조 (명암 대비 증가)
```

### 2. 극좌표 변환 (Polar Coordinates)

```c
vec2 flowDir = normalize(uv - mouseUv + vec2(0.0001));  // 마우스에서의 방향
float angle = atan(flowDir.y, flowDir.x);  // 각도 계산 (라디안)
float flow = sin(angle * 3.0 + flowTime) * 0.5 + 0.5;  // 각도 기반 흐름
```

**원리:**

1. **방향 벡터 계산**
   ```
   flowDir = (현재 픽셀 - 마우스 위치) / 거리
   ```
   - 마우스를 중심으로 한 단위 벡터
   - 모든 픽셀에서 마우스를 향하는 "방사상" 흐름 정의

2. **각도 계산**
   ```
   angle = atan(y, x)  // -π ~ π 범위
   ```
   - 2D 벡터를 각도(스칼라)로 변환
   - 마우스 주변에서 "회전 대칭" 구조 생성

3. **각도 기반 파동**
   ```
   sin(angle * 3.0 + flowTime)
   ```
   - 각도가 3배 증폭 → 원 주변에 3개 "날개" 형태 패턴
   - `flowTime`으로 시간에 따라 회전하는 듯한 효과

### 3. 와류(Vortex) 생성

```c
float vortex = sin(angle * 5.0 + flowTime * 2.0) * cos(angle * 2.0 - flowTime * 1.5);
vortex = vortex * 0.5 + 0.5;  // -1~1 범위를 0~1로 정규화
```

**메커니즘:**

1. **2개 극좌표 함수의 곱**
   ```
   sin(angle * 5.0 + flowTime * 2.0) × cos(angle * 2.0 - flowTime * 1.5)
   ```
   - sin: 5개 주기의 파동
   - cos: 2개 주기의 파동
   - 곱셈으로 간섭 패턴 생성 → 복잡한 와류

2. **위상(Phase) 차이**
   - sin의 위상: `+flowTime * 2.0` (빠르게 회전)
   - cos의 위상: `-flowTime * 1.5` (반대 방향 회전)
   - 두 방향 회전의 간섭 → 3D 입체감 있는 회오리

**결과:** 마우스 중심에서 소용돌이치는 에너지 필드

### 4. 거리 기반 감쇠 (Distance-based Falloff)

```c
float paintCore = exp(-dist * dist * 20.0);      // 핵심: 마우스 매우 가까움
float paintSpread = exp(-dist * dist * 8.0);    // 퍼짐: 더 멀리 미치는 효과

float flowSpeed = exp(-dist * 3.0) * (1.0 + turbulence * 0.8);
```

**가우시안 감쇠:**

```
exp(-dist² × strength)
```

| strength | 거리 범위 | 효과 |
|----------|----------|------|
| 20.0 | 매우 가까움 | 마우스 정중앙의 강한 효과 |
| 8.0 | 중간 | 부드럽게 퍼지는 효과 |
| 3.0 | 먼거리 | 전체 화면에 미치는 효과 |

**물리적 해석:**
- 마우스가 "에너지 소스" 역할
- 거리가 멀어질수록 에너지가 지수적으로 감소
- 근처는 강한 왜곡, 멀리는 미세한 영향

### 5. 색상 혼합

```c
vec3 colorBlue = vec3(0.0, 0.3, 1.0);      // 파란색
vec3 colorPink = vec3(0.2, 1.0, 0.99);     // 핑크색

// 시간과 노이즈 기반 색상 변화
float colorMix = sin(flowTime + angle * 2.0 + turbulence * 3.0) * 0.5 + 0.5;
vec3 paintColor = mix(colorBlue, colorPink, colorMix);
```

**색상 선택 이유:**
- **파란색**: 신비로운 분위기 (밤하늘, 유령)
- **핑크색**: 온기 있는 에너지 (생명력)
- **시간과 위치 기반 변화**: 정적이지 않은 동적 색감

---

## 최종 강도 계산

```c
float paintIntensity = paintCore + paintSpread * turbulence * flow * flow2 * vortex;
paintIntensity = smoothstep(0.0, 1.0, paintIntensity);

float secondary = paintSpread * sin(flowTime * 2.0 + dist * 15.0 + turbulence * 5.0) * 0.6 + 0.4;
secondary *= turbulence;
secondary *= vortex;

vec3 finalColor = paintColor * paintIntensity * 1.3;
finalColor += paintColor * 0.5 * secondary;
```

**강도 구성:**

1. **Primary Intensity**
   ```
   paintCore (중심부) 
   + paintSpread (퍼짐) × turbulence × flow × flow2 × vortex (흐름 강화)
   ```
   - 여러 효과들의 곱셈으로 복합 상호작용
   - `smoothstep()`으로 0~1 범위 클램핑 및 부드러운 전환

2. **Secondary Layer**
   ```
   또 다른 sin 파동 × turbulence × vortex
   ```
   - 주요 효과 위에 추가 색상층 오버레이
   - 더 복잡한 세부사항 추가

3. **최종 합성**
   ```
   finalColor = paintColor × 1.3 (밝기 증대)
   finalColor += 추가 레이어 × 0.5
   ```
   - 1.3배 증대로 화면에서 강조
   - 0.5배 추가 레이어로 깊이감

---

## 데이터 흐름

```
마우스 입력 (u_mouse)
  ↓
거리 계산: dist = length(uv - mouseUv)
  ↓
극좌표 변환: angle = atan(flowDir)
  ↓
[병렬 계산]
├─ 노이즈 레이어 (n1~n4) → turbulence
├─ 각도 기반 흐름 (flow, flow2)
├─ 와류 (vortex)
└─ 거리 기반 감쇠 (paintCore, paintSpread, flowSpeed)
  ↓
강도 계산: paintIntensity, secondary
  ↓
색상 혼합: colorMix → paintColor
  ↓
최종 합성: finalColor
```

---

## 핵심 기술 정리

| 기술 | 목적 | 구현 |
|------|------|------|
| **Layered Noise** | 유기적 복잡성 | 4개 노이즈 레이어 가중합 |
| **Polar Coordinates** | 회전 대칭 구조 | `atan(y, x)` + 각도 함수 |
| **Vortex** | 소용돌이 효과 | sin × cos 함수의 곱 |
| **Distance-based Falloff** | 마우스 중심 집중 | 가우시안 exp 함수 |
| **Color Mixing** | 동적 색감 | 시간+위치 기반 `mix()` |

---

## 시각적 특징

```
마우스 위치 (강한 에너지)
  ↓
┌─────────────────┐
│ 파란색 + 핑크색 │  핵심 와류
│  (paintCore)   │
│ 매우 강함      │
└─────────────────┘
      ↓ (퍼짐)
┌─────────────────────────┐
│  중간 강도의 turbulence │  주변 흐름
│   주변 흐름 에너지   │
└─────────────────────────┘
      ↓ (감쇠)
┌──────────────────────────────┐
│  미세한 영향력                 │  먼 영역
│  화면 끝까지 약한 흐름     │
└──────────────────────────────┘
```

---

## 마우스 상호작용

```javascript
canvas.addEventListener("mousemove", (e) => {
  mouseX = (e.clientX - rect.left) * scaleX;
  mouseY = canvas.height - (e.clientY - rect.top) * scaleY;
});
```

**작동:**
- 마우스 위치가 실시간으로 업데이트
- 셰이더에서 `u_mouse` 유니폼으로 수신
- 거리/각도 계산의 기준점 역할

---

## 결론

이 아트워크는 **다층적 노이즈**, **극좌표 기반 회전 대칭**, **거리 기반 감쇠**를 조합해 만들어집니다:

1. **Turbulence**: 4개 주파수의 노이즈로 복잡한 흐름 표현
2. **Vortex**: 극좌표 함수의 간섭으로 회오리 생성
3. **Falloff**: 마우스 중심에 에너지 집중
4. **Color Dynamics**: 시간과 위치에 따른 부드러운 색상 변화
5. **Layered Composition**: 강도층 위에 추가 세부사항 오버레이

결과적으로 마우스를 따라다니는 신비한 유령불 같은 시각 효과가 탄생합니다.
