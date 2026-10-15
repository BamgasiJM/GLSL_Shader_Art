# Shader Art 12: Water Surface - 기술 분석

## 개요
이 프로젝트는 **2D Simplex 노이즈**, **색상 분층(Color Stratification)**, **비네팅(Vignetting)** 효과를 결합해 움직이는 수면(Water Surface)의 느낌을 표현하는 작품입니다. 마우스 입력에 반응하며 시간에 따라 변하는 물의 질감과 빛을 시뮬레이션합니다.

---

## 핵심 메커니즘

### 1. Simplex 노이즈 (2D Noise)

```c
// Simplex 격자 공간으로 변환
vec2 i = floor(v + dot(v, C.yy));
vec2 x0 = v - i + dot(i, C.xx);

// 다음 격자점 결정
vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);

// 가중치 계산 (부드러운 보간)
vec3 m = max(0.5 - vec3(dot(x0, x0), ...), 0.0);
m = m * m * m * m;  // 4제곱으로 부드럽게

// 그래디언트 기여도 합산
float res = 130.0 * dot(m, g);
```

**Simplex 노이즈의 특징:**

1. **Perlin노이즈보다 효율적**
   - Perlin: 2D에서 4개 격자점 필요
   - Simplex: 2D에서 3개 격자점만 필요
   - GPU 계산 최적화

2. **부드러운 보간**
   ```
   m = (0.5 - distance²)⁴
   ```
   - 0에서 1로 부드럽게 변화
   - 4제곱으로 경계 근처를 더 급격하게 → 자연스러운 결과

3. **그래디언트 기반**
   - 각 격자점에서의 임의 그래디언트 계산
   - 여러 그래디언트의 가중합으로 최종 노이즈 값

**반환값:** -1.0 ~ 1.0 범위의 연속적 노이즈

---

### 2. 이중 노이즈 레이어

```c
// 1차 노이즈 (큰 파동)
float primaryNoise = snoise(noiseCoord + u_time * 0.2 + normalizedMousePos * 0.5);

// 2차 노이즈 (디테일 및 왜곡)
float detailNoise = snoise(noiseCoord * 2.0 - u_time * 0.05 + primaryNoise);
```

**메커니즘:**

1. **Primary Noise (저주파)**
   ```
   noiseCoord + u_time * 0.2 + u_mouse * 0.5
   ```
   - `u_time * 0.2`: 느리게 변하는 큰 물결
   - `u_mouse * 0.5`: 마우스 위치가 패턴에 영향
   - 수심이 깊은 곳의 큰 파동 표현

2. **Detail Noise (고주파)**
   ```
   noiseCoord * 2.0 - u_time * 0.05 + primaryNoise
   ```
   - `* 2.0`: 2배 주파수로 세밀한 세부 표현
   - `- u_time * 0.05`: 반대 방향으로 느리게 움직임 (주방향과 반대 흐름)
   - **`+ primaryNoise`**: 핵심! 1차 노이즈로 좌표를 왜곡
     → 2차 패턴이 1차 패턴을 따라 굽어짐 (유기적)

**결과:** 대규모 물결 위에 작은 파도가 실려 가는 효과

---

### 3. 색상 분층 (Color Stratification)

```c
vec3 deepColor = vec3(0.0, 0.03, 0.24);        // 심해 색상 (짙은 남색)
vec3 midColor = vec3(0.09, 0.29, 0.65);        // 중간 물빛 (푸른색)
vec3 highlightColor = vec3(0.75, 0.97, 0.95);  // 거품/하이라이트 (흰색 범위)

// 기본 색상 결정 (1차 노이즈 기반)
vec3 baseColor = mix(deepColor, midColor, primaryNoise * 0.5 + 0.5);
```

**색상의 물리적 의미:**

```
수심 깊음        deepColor (0.0, 0.03, 0.24)
    ↓           어두운 남색, 빛이 적게 투과
    │
    │           baseColor (mix 결과)
    │           깊이와 파동 상태 표현
    ↓
수심 얕음        midColor (0.09, 0.29, 0.65)
    ↓           밝은 푸른색, 빛이 많이 투과
    │
    │           highlightColor (0.75, 0.97, 0.95)
    │           물 표면 거품 또는 햇빛 반사
    ↓
가장 밝음
```

**노이즈 → 색상 매핑:**

```c
baseColor = mix(deepColor, midColor, primaryNoise * 0.5 + 0.5)
```

- `primaryNoise`: -1.0 ~ 1.0
- `* 0.5 + 0.5`: 0.0 ~ 1.0으로 정규화
- 파동이 높으면 (노이즈 양수) → 밝은 색 (midColor 쪽)
- 파동이 낮으면 (노이즈 음수) → 어두운 색 (deepColor 쪽)

### 4. 하이라이트 마스킹

```c
float highlightMask = pow(max(0.0, detailNoise), 3.0) * 0.9;
vec3 finalColor = mix(baseColor, highlightColor, highlightMask);
```

**메커니즘:**

1. **양수 값만 선택**
   ```
   max(0.0, detailNoise)
   ```
   - 2차 노이즈 중 양수 부분만 추출
   - 음수는 0으로 강제 → 어두운 부분 유지

2. **3제곱으로 강조**
   ```
   pow(value, 3.0)
   ```
   - 0에 가까운 값들은 더 작아짐
   - 큰 값들은 더 커짐
   - → 매우 밝은 부분만 강조

3. **0.9배로 제한**
   ```
   * 0.9
   ```
   - 완전한 흰색이 되는 것을 방지
   - 매우 밝지만 약간의 수심 느낌 유지

**결과:** 물 표면의 거품이나 햇빛 반사 지점이 뾰족하게 강조됨

---

### 5. 비네팅 (Vignetting)

```c
float vignetteAmount = 1.0 - length(screenUV - 0.5) * 1.2;
finalColor *= clamp(vignetteAmount, 0.2, 1.0);
```

**원리:**

1. **거리 계산**
   ```
   length(screenUV - 0.5)
   ```
   - 화면 중심(0.5, 0.5)으로부터의 거리
   - 거리 범위: 0 (중심) ~ √2/2 (코너) ≈ 0.707

2. **감쇠 함수**
   ```
   1.0 - distance * 1.2
   ```
   - 중심: 1.0 - 0 = 1.0 (100% 밝음)
   - 코너: 1.0 - 0.707 × 1.2 ≈ -0.25 → 클램프로 0.2

3. **클램프**
   ```
   clamp(vignetteAmount, 0.2, 1.0)
   ```
   - 최소 밝기 0.2 보장 → 완전 검정 방지
   - 최대 밝기 1.0 → 중심이 너무 밝지 않게

**시각적 효과:**
```
중심부 (밝음)
    ↓ (부드러운 어두워짐)
가장자리 (어두움, 최소 20%)
```

---

## 렌더링 파이프라인

```
[Fragment Shader 실행]
  각 픽셀에 대해:
  
  1. 기본 좌표 설정
     screenUV = v_texCoord  (0.0~1.0)
     normalizedMousePos = u_mouse / u_resolution
  
  2. 노이즈 좌표 생성
     noiseCoord = screenUV * 4.0  (패턴 크기 조정)
  
  3. 1차 노이즈 계산
     primaryNoise = snoise(좌표 + 시간 + 마우스 영향)
     → 큰 파동 표현
  
  4. 2차 노이즈 계산
     detailNoise = snoise(2배 좌표 - 시간 + 1차 왜곡)
     → 1차 패턴 위의 세부 파도
  
  5. 색상 결정
     baseColor = mix(deepColor, midColor, primaryNoise)
     → 깊이감 있는 기본 색상
  
  6. 하이라이트 추가
     highlightMask = pow(max(0, detailNoise), 3.0)
     finalColor = mix(baseColor, highlightColor, highlightMask)
     → 물 표면의 밝은 반사점
  
  7. 비네팅 적용
     vignetteAmount = 1.0 - distance * 1.2
     finalColor *= clamp(vignetteAmount, 0.2, 1.0)
     → 화면 가장자리 어두움
  
  8. 최종 출력
     fragColor = vec4(finalColor, 1.0)
```

---

## 마우스 상호작용

```c
vec2 normalizedMousePos = u_mouse / u_resolution;
float primaryNoise = snoise(...+ normalizedMousePos * 0.5);
```

**작동:**
- 마우스 좌표를 정규화 (0.0 ~ 1.0)
- 1차 노이즈 계산에 0.5배로 영향
- 마우스를 움직이면 물결 패턴이 변함
- 강도가 약하므로 전체 흐름은 시간에 주도되고 마우스는 미세 조정

---

## 핵심 기술 정리

| 기술 | 목적 | 구현 |
|------|------|------|
| **Simplex Noise** | 자연스러운 패턴 생성 | 격자 기반 그래디언트 보간 |
| **Dual-layer Noise** | 다중 스케일 표현 | 1차(저주파) + 2차(고주파) |
| **Noise Distortion** | 유기적 왜곡 | 1차 노이즈로 2차 좌표 변형 |
| **Color Stratification** | 수심 표현 | 노이즈→색상 매핑 |
| **Highlight Masking** | 표면 반사 | 양수 노이즈의 3제곱 |
| **Vignetting** | 초점 유도 | 거리 기반 감쇠 |

---

## 시각적 특징

```
┌──────────────────────────────────┐
│  화면 전체 (어두운 가장자리)      │
├──────────────────────────────────┤
│  1차 파동: 큰 흐름               │
│    ↓                             │
│  2차 파동: 작은 파도             │
│    ↓                             │
│  색상 매핑: 깊이감               │
│    ↓                             │
│  하이라이트: 밝은 거품           │
├──────────────────────────────────┤
│  중심부 (밝음, 상세)              │
└──────────────────────────────────┘
```

---

## 데이터 흐름

```
시간 (u_time)
마우스 (u_mouse)
화면 좌표 (v_texCoord)
        ↓
   [Simplex Noise 계산]
  /      |      \
1차 노이즈  2차 노이즈(1차 영향)
  |        |
  ↓        ↓
색상 분층   하이라이트
  ↓        ↓
baseColor + highlightColor
        ↓
   비네팅 적용
        ↓
최종 색상 출력
```

---

## 물의 특성 표현

| 특성 | 구현 방식 |
|------|----------|
| **깊이** | 색상 분층 (깊이 ↔ 밝기) |
| **표면 텍스처** | 2차 노이즈 |
| **파동** | 1차 노이즈 (시간 기반) |
| **반사** | 하이라이트 마스킹 |
| **투시감** | 비네팅 |

---

## 결론

이 아트워크는 **2D Simplex 노이즈의 이중 구조**, **색상을 통한 수심 표현**, **하이라이트 강조**를 조합해 만들어집니다:

1. **Simplex Noise**: 자연스럽고 효율적인 질감
2. **Dual-layer Approach**: 저주파(큰 흐름) + 고주파(세부)의 조화
3. **Coordinate Distortion**: 상위 계층 노이즈로 하위 계층 왜곡 → 유기적 흐름
4. **Color Mapping**: 노이즈 값 → 수심 깊이 → 색상
5. **Surface Details**: 양수 노이즈만 강조해 거품/반사 표현
6. **Vignetting**: 화면 경계 어두움으로 초점 유도

결과적으로 움직이는 수면의 깊이감과 반사, 질감을 한 장의 평면 이미지로 표현할 수 있습니다.
