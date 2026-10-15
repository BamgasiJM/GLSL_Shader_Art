# Shader Art 08: Waving Polka Dot

## 개요
이 프로젝트는 **그리드 기반 지오메트리**와 **정점 셰이더 변형**을 이용해 3D 물결 파동 효과를 만드는 작품입니다.

---

## 핵심 아키텍처

### 1. 그리드 메시 생성 (JavaScript)

```javascript
const gridX = 30;  // 가로 분할 수
const gridY = 30;  // 세로 분할 수

// 정점(Vertex) 생성: (31×31) = 961개 정점
for (let y = 0; y <= gridY; y++) {
  const v = y / gridY;
  const posY = -0.8 + v * 1.6;

  for (let x = 0; x <= gridX; x++) {
    const u = x / gridX;
    const posX = -0.8 + u * 1.6;
    positions.push(posX, posY);
  }
}

// 인덱스(Index) 생성: 각 사각형 = 삼각형 2개
for (let y = 0; y < gridY; y++) {
  for (let x = 0; x < gridX; x++) {
    const row1 = y * (gridX + 1);
    const row2 = (y + 1) * (gridX + 1);

    // 첫 번째 삼각형
    indices.push(row1 + x, row2 + x, row1 + x + 1);
    // 두 번째 삼각형
    indices.push(row1 + x + 1, row2 + x, row2 + x + 1);
  }
}
```

**메시 구조:**
```
(-0.8, 0.8) ─────────────────────────────── (0.8, 0.8)
   ●───●───●───●       (정점)
   │ ╱ │ ╱ │ ╱ │
   ●───●───●───●       (삼각형 2개/칸)
   │ ╱ │ ╱ │ ╱ │
   ●───●───●───●
   │
(-0.8, -0.8)
```

- **30×30 사각형 : 900 x 2 = 1800개 삼각형**
- 정점당 평균 4개 인덱스 (공유 정점)
- EBO(Element Buffer Object) 사용으로 효율적 메모리 관리

### 2. 정점 셰이더의 3D 변형

```c
void main() {
    // 1. UV 좌표 생성
    v_uv = (a_position.xy / 1.6) + 0.5;  // [-0.8, 0.8] → [0, 1]

    vec4 pos = a_position;

    // 2. 2D 파동 계산
    float dist = length(pos.xy);
    float waveX = sin(pos.x * 6.0 + u_time * 2.0);
    float waveY = cos(pos.y * 6.0 + u_time * 2.0);
    float radialWave = sin(dist * 8.0 - u_time * 3.0);

    // 3. Y축 수직 출렁임
    pos.y += (waveX + waveY) * 0.05;

    // 4. 깊이 기반 입체감 생성
    float depth = radialWave * 0.15;
    pos.y += depth * 0.5;
    pos.z = depth;

    gl_Position = pos;
}
```

**파동 메커니즘:**

1. **X축 파동**
   ```
   waveX = sin(pos.x * 6.0 + u_time * 2.0)
   ```
   - `pos.x * 6.0`: 화면 좌우로 6개의 파동 주기
   - `u_time * 2.0`: 초당 2배 빠르게 변화
   - 수평 위치에만 의존 → 수직 줄 형태 파동

2. **Y축 파동**
   ```
   waveY = cos(pos.y * 6.0 + u_time * 2.0)
   ```
   - X축과 동일하지만 코사인 함수 사용
   - X와 Y가 90도 위상차 → 교차 무늬

3. **원형 파동 (Radial Wave)**
   ```
   dist = length(pos.xy);  // 중심부터의 거리
   radialWave = sin(dist * 8.0 - u_time * 3.0);
   ```
   - 중심을 기준으로 동심원 파동
   - `u_time` 음수 처리로 파동이 중심에서 바깥쪽으로 확산

### 3. 3D 입체감 생성

```c
float depth = radialWave * 0.15;
pos.y += depth * 0.5;      // Y축 변위
pos.z = depth;              // Z축 깊이 정보
```

**원리:**
- `depth`는 -0.15에서 +0.15 범위
- **Y축 변위**: 카메라가 위에서 아래를 내려다보는 관점
  - 깊이가 양수면 메시가 올라옴
  - 깊이가 음수면 메시가 내려감
- **Z축 정보**: 깊이 테스트에는 사용하지 않지만, 향후 조명 효과 가능

**시각적 효과:**
```
radialWave = +1.0  →  깊이 = +0.15  →  메시 위로 올라옴
radialWave = 0.0   →  깊이 = 0      →  평평한 상태
radialWave = -1.0  →  깊이 = -0.15  →  메시 아래로 내려감
```

---

## Fragment 셰이더: Polka Dot 패턴

```c
void main() {
    // 1. 격자 생성
    float density = 15.0;  // 15×15 격자
    vec2 gridUV = v_uv * density;

    // 2. 로컬 셀 좌표 (각 칸 내부: 0.0~1.0)
    vec2 localUV = fract(gridUV);

    // 3. 원형 거리 계산
    vec2 center = vec2(0.5);
    float dist = distance(localUV, center);

    // 4. 시간에 따른 반지름 변화 (맥동)
    float baseRadius = 0.25;
    float pulseSpeed = 2.0;
    float radius = baseRadius + 0.15 * sin(u_time * pulseSpeed);

    // 5. 안티앨리어싱으로 부드러운 원 그리기
    float antialias = 0.02;
    float brightness = 1.0 - smoothstep(radius - antialias, radius + antialias, dist);

    fragColor = vec4(vec3(brightness), 1.0);
}
```

**동작 원리:**

1. **격자 생성**: `v_uv * density`로 화면을 15×15로 분할
2. **로컬 좌표**: `fract()`로 각 칸 내부 좌표 추출 (0.0~1.0)
3. **원 그리기**: 각 칸의 중심(0.5, 0.5)에서의 거리로 원 표현
4. **맥동**: `sin(u_time * pulseSpeed)`로 반지름이 변함
5. **Anti-aliasing**: `smoothstep()`으로 경계선을 부드럽게 처리

**결과:**
```
반지름 커짐 (sin 양수)  →  점이 커짐
반지름 작아짐 (sin 음수) →  점이 작아짐
→ 점들이 "맥동"하는 듯한 효과
```

---

## 상호작용: 마우스 입력

현재는 마우스 데이터를 수집하지만 사용하지 않습니다:
```javascript
canvas.addEventListener("mousemove", (e) => {
  mouseX = (e.clientX - rect.left) * scaleX;
  mouseY = canvas.height - (e.clientY - rect.top) * scaleY;
});
```

**확장 가능성:**
- `u_mouse` 유니폼으로 특정 지점에 집중된 파동 생성
- 마우스 근처 정점들의 변형 강도 증가

---

## 렌더링 파이프라인

```
JavaScript (app.js)
  ↓
격자 메시 생성 (VBO + EBO)
  ↓
Vertex Shader (vert.glsl)
  ├─ 각 정점 위치 변형
  ├─ 3개 파동 함수 적용
  ├─ UV 좌표 계산
  └─ 변형된 정점 출력
  ↓
Rasterization (GPU 자동)
  ↓
Fragment Shader (frag.glsl)
  ├─ 각 픽셀에 대해 실행
  ├─ Polka Dot 패턴 생성
  └─ 최종 색상 출력
  ↓
Canvas에 렌더링
```

---

## 핵심 기술 정리

| 기술 | 목적 | 구현 |
|------|------|------|
| **Grid Mesh** | 정점 변형을 위한 기하 구조 | 정규 2D 격자 생성 |
| **Vertex Deformation** | 3D 파동 효과 | 정점 셰이더에서 위치 변형 |
| **3D 입체감** | 높이 맵 시뮬레이션 | Y, Z축 동시 변형 |
| **Polka Dot** | 반복 패턴 생성 | Fragment 셰이더 격자 + 거리 |
| **Pulse Animation** | 점의 맥동 | 시간 기반 반지름 변화 |

---

## 데이터 흐름

```
마우스 입력 (수집하지만 미사용)
  ↓
u_time 업데이트 (매 프레임)
  ↓
[정점 셰이더]
  30×30 메시의 961개 정점 각각:
    ├─ 3개 파동 계산 (waveX, waveY, radialWave)
    ├─ Y, Z축 변형
    └─ 변형된 위치 출력
  ↓
[래스터화]
  1800개 삼각형 → 픽셀 샘플링
  ↓
[프래그먼트 셰이더]
  각 픽셀에 대해:
    ├─ 15×15 격자 정의
    ├─ 로컬 좌표에서 점까지의 거리
    ├─ 시간 기반 반지름 계산
    └─ Polka Dot 그리기
  ↓
최종 화면 렌더링
```

---

## 시각적 특징

1. **3D 메시**: 정점 셰이더 변형으로 진정한 3D 지형 생성
2. **교차 파동**: X, Y축 파동 + 원형 파동의 복합 효과
3. **Polka Dot**: 프래그먼트 셰이더의 독립적 패턴 생성
4. **이중 애니메이션**:
   - 정점 셰이더: 3D 메시 변형 (느림)
   - 프래그먼트 셰이더: 점 맥동 (빠름)

---

## 결론

이 아트워크는 **정점 셰이더 기반 기하 변형**과 **프래그먼트 셰이더 기반 패턴 생성**을 분리해서 구현합니다:

1. **정점 셰이더**: 복잡한 3D 파동 (고비용 연산)
2. **프래그먼트 셰이더**: 간단한 Polka Dot 패턴 (낮은 비용)

이를 통해 효율적이면서도 시각적으로 풍부한 애니메이션을 만들 수 있습니다.
