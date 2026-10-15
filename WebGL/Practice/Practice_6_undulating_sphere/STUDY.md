# STUDY.md — WebGL2 절차적 애니메이션 구체(Sphere)

이 예제는 **WebGL2**로 파란색 광택 球를 그리고, Sine 함수로 표면을 출렁이게
애니메이션하며, **Phong 조명 모델**로 음영을 입히는 코드입니다.

---

## 1. 파일 구조

```
Practice_6/
├── index.html           # 캔버스 + main.js 로드
├── style.css            # 캔버스 스타일
├── main.js              # 셰이더 fetch, WebGL 초기화, 버퍼 생성, 렌더 루프, 행렬 수학
└── shaders/
    ├── vertex.glsl      # Vertex Shader (순수 GLSL 코드)
    └── fragment.glsl    # Fragment Shader (순수 GLSL 코드)
```

### 셰이더 파일 분리

셰이더 GLSL 코드는 `main.js` 안에 자바스크립트 템플릿 문자열(`` ` ``)로 삽입 가능합니다.
하지만 이 방식은 코드가 길어지면 로직과 셰이더가 섞여 읽기 어렵고,
에디터의 GLSL 문법 하이라이트/포맷팅도 받을 수 없습니다. 그래서 순수 **`.glsl` 파일**로
분리했습니다.

### 로딩 방식: `fetch()`로 비동기 로드

`.glsl` 파일은 그냥 텍스트 파일입니다. 브라우저의 `fetch()`로 읽어와서
셰이더 소스 문자열로 사용합니다. `main.js`의 흐름은 다음과 같습니다.

```js
async function main() {
  const [vsSource, fsSource] = await Promise.all([
    loadShaderSource("shaders/vertex.glsl"),
    loadShaderSource("shaders/fragment.glsl"),
  ]);
  initWebGL(vsSource, fsSource); // 로드 완료 후 초기화
}

async function loadShaderSource(url) {
  const response = await fetch(url);
  if (!response.ok)
    throw new Error(`${url} 로드 실패 (HTTP ${response.status})`);
  return response.text();
}
```

학생이 알아둘 점:

- **비동기(async)가 핵심**: 파일을 받아오는 데 시간이 걸리므로 `await`로 기다린 뒤
  `initWebGL()`을 호출합니다. 그래서 `initWebGL`은 셰이더 문자열을 **매개변수**로 받습니다.
- **`Promise.all`**: 두 셰이더를 동시에(병렬) 요청해 더 빨리 받습니다.
- **에러 처리**: `response.ok`를 확인하고, 실패 시 `try/catch`로 콘솔에 출력합니다.

### ⚠️ 중요: 로컬 서버가 필요합니다

`fetch()`는 보안 정책(CORS) 때문에 `file://`로 HTML을 **더블클릭해서 열면 동작하지
않습니다.** 반드시 로컬 서버로 실행하세요. 예:

```bash
# 프로젝트 폴더에서 (Python 3)
python3 -m http.server 8000
# 브라우저에서 http://localhost:8000 접속
```

또는 VS Code의 **Live Server** 확장을 사용해도 됩니다.

---

## 2. 렌더링 파이프라인 한눈에 보기

```
정점 데이터(JS)  →  VBO/VAO  →  Vertex Shader  →  래스터화  →  Fragment Shader  →  화면
   generateSphere()             (정점마다)                      (픽셀마다)
```

1. `generateSphere()` 가 CPU에서 구의 정점/법선/UV/인덱스를 만든다.
2. 데이터를 **VBO**(GPU 버퍼)에 올리고 **VAO**로 묶어 둔다.
3. **Vertex Shader**: 정점마다 위치를 변형하고 좌표 변환을 한다.
4. GPU가 삼각형을 픽셀로 쪼갠다(래스터화)하며 `v_*` 값들을 보간한다.
5. **Fragment Shader**: 픽셀마다 색(조명)을 계산한다.

---

## 3. 정점 데이터 생성 — `generateSphere(radius, lat, lon)`

위도(lat) / 경도(lon)를 따라 구면 좌표를 직교 좌표로 변환합니다.

```js
x = cosPhi * sinTheta;
y = cosTheta;
z = sinPhi * sinTheta;
```

학생이 알아둘 점:

- **법선(normal)**: 구의 중심이 (0,0,0)이라 *정점 위치 = 법선 방향*입니다.
  그래서 `normals.push(x, y, z)`로 위치를 그대로 법선으로 씁니다.
- **UV 좌표**: `(j/lon, i/lat)` → 0~1 범위. 텍스처 매핑/절차적 패턴에 사용.
- **인덱스(EBO)**: 정점을 재사용하려고 삼각형 두 개로 사각형 하나를 구성합니다.
  `indices`는 `Uint16Array`(16비트)이므로 최대 정점 수는 **65,536개**입니다.
  지금은 `128 x 128` 이라 약 16,641개 정점으로 안전합니다. 격자를 더 키우면
  16비트 인덱스 한계를 넘어 깨질 수 있으니 주의하세요.

---

## 4. 버퍼 설정 — VBO / VAO / EBO

- **VBO (Vertex Buffer Object)**: 정점 속성(위치/법선/UV)을 담는 GPU 버퍼.
- **VAO (Vertex Array Object)**: "어떤 VBO를, 어떤 attribute 위치로, 어떤 형식으로
  읽을지"에 대한 설정을 **하나로 묶어 저장**. 렌더 때 `bindVertexArray` 한 번이면 됨.
- **EBO (Element/Index Buffer Object)**: 정점 인덱스를 담아 정점 재사용 → 메모리 절약.

`vertexAttribPointer(index, size, type, normalized, stride, offset)`의
`index`(0,1,2)는 셰이더의 `layout(location = N)`과 일치해야 합니다.

| location | attribute  | size |
| -------- | ---------- | ---- |
| 0        | a_position | 3    |
| 1        | a_normal   | 3    |
| 2        | a_uv       | 2    |

---

## 5. Vertex Shader (`shaders/vertex.glsl`)

### 핵심 1) 절차적 변형 (Sine Wave Displacement)

```glsl
float displacement = sin(a_position.x * 5.0 + u_time) *
                     sin(a_position.y * 5.0 + u_time) *
                     sin(a_position.z * 5.0 + u_time) * 0.3;
vec3 displacedPosition = a_position + normalize(a_position) * displacement;
```

- `u_time`이 매 프레임 증가 → sine 값이 변함 → 표면이 출렁이는 애니메이션.
- `normalize(a_position)`는 바깥(법선) 방향. 그 방향으로 밀어내 구가 부풀었다 줄었다 함.

### 핵심 2) 좌표 변환 (MVP)

```glsl
gl_Position = u_projection * u_view * u_model * vec4(displacedPosition, 1.0);
```

- **Model → View → Projection** 순서로 곱해 화면 좌표로 변환.
- GLSL 행렬 곱은 **오른쪽에서 왼쪽**으로 적용됩니다(model이 먼저).

### 주의할 점 (학습 포인트)

- `v_normal = mat3(u_model) * a_normal;`
  여기서는 모델 행렬이 단위행렬(Identity)이라 문제가 없습니다. 하지만 만약
  **비균등 스케일(non-uniform scale)**을 적용하면 법선이 틀어집니다. 정석은
  _normal matrix = transpose(inverse(model))_ 를 쓰는 것입니다.
- 위치는 변형(displacement)했지만 **법선은 변형 전 값**을 그대로 씁니다.
  그래서 조명이 100% 정확하진 않습니다(학습용 단순화). 정확히 하려면 변형된
  표면의 새 법선을 다시 계산해야 합니다.

---

## 6. Fragment Shader (`shaders/fragment.glsl`) — Phong 조명

Phong 모델은 세 가지 빛의 합입니다.

```
최종색 = Ambient(환경광) + Diffuse(난반사) + Specular(정반사)
```

| 항목     | 의미                      | 코드 핵심                                  |
| -------- | ------------------------- | ------------------------------------------ |
| Ambient  | 어디서나 받는 최소한의 빛 | `0.2 * baseColor`                          |
| Diffuse  | 표면이 빛을 향한 정도     | `max(dot(normal, lightDir), 0.3)`          |
| Specular | 반짝이는 하이라이트(광택) | `pow(max(dot(viewDir, reflectDir),0), 16)` |

학생이 알아둘 점:

- **`normalize`는 필수**: 보간된 `v_normal`은 길이가 1이 아닐 수 있어 다시 정규화.
- **`dot(normal, lightDir)`**: 두 벡터가 같은 방향일수록 1에 가깝고 밝아짐.
- Diffuse에서 `0.3`으로 하한을 둬서 그림자 부분이 완전히 검게 되지 않게 함(스타일 선택).
- **shininess(16.0)**: 값이 클수록 하이라이트가 작고 날카로워짐(더 매끈한 표면).
- `reflect(-lightDir, normal)`: 빛이 표면에서 반사되는 방향 계산.

---

## 7. 행렬 / 카메라 (`main.js` 하단)

- `perspective(fovy, aspect, near, far)`: 원근 투영. 멀리 있는 것이 작게 보이게 함.
  `aspect = canvas.width / canvas.height` (현재 1000x1000이라 1.0).
- `lookAt(eye, target, up)`: 카메라를 `eye`에 두고 `target`을 바라보는 뷰 행렬.
  여기선 `eye = [0,0,5]`로 z축 +5에서 원점을 바라봅니다.
- 실제 프로젝트에서는 직접 구현 대신 **gl-matrix** 라이브러리를 권장합니다.

---

## 8. 렌더 루프 — `requestAnimationFrame`

```js
function render(time) {
  time *= 0.001;        // 밀리초 → 초
  gl.clear(...);
  gl.uniform1f(locs.time, time);   // 셰이더에 시간 전달 → 애니메이션
  gl.drawElements(...);
  requestAnimationFrame(render);   // 다음 프레임 예약
}
```

- 브라우저 새로고침 주기(보통 60fps)에 맞춰 매 프레임 호출됩니다.
- `time`은 셰이더의 `u_time`으로 전달되어 표면 출렁임을 만듭니다.
- `gl.enable(gl.DEPTH_TEST)`로 깊이 테스트를 켜서 뒤쪽 면이 앞을 덮지 않게 함.

---

## 9. 직접 실험해 볼 것 (연습 과제)

1. `fragment.glsl`에서 `shininess`를 `4.0`, `64.0`으로 바꿔 광택 변화 관찰.
2. `vertex.glsl`의 `* 0.3` (변형 세기)을 `0.0`으로 하면 완전한 구가 됨.
3. `main.js`의 `gl.uniform3f(locs.baseColor, ...)`로 구의 색을 바꿔 보기.
4. `generateSphere(1.3, 16, 16)`처럼 분할 수를 줄여 폴리곤이 보이게 해보기.
5. `u_lightDirection` 값을 바꿔 조명 방향에 따른 음영 변화 관찰.

---

## 10. 이 코드의 단순화 / 개선 여지 (실무 관점)

학습용이라 의도적으로 단순화한 부분들입니다. 더 공부하고 싶다면:

- **셰이더 컴파일 에러 체크 없음**: `createShader`/`createProgram`에서
  `getShaderParameter(..., COMPILE_STATUS)`와 `getProgramParameter(..., LINK_STATUS)`로
  성공 여부를 확인하고 `getShaderInfoLog`로 에러를 출력하는 것이 정석입니다.
- **법선 재계산 없음**: 6장 참고(변형된 표면의 법선을 다시 구하지 않음).
- **normal matrix 미적용**: 5장 참고(비균등 스케일 시 문제).
- **리소스 정리 없음**: 학습 예제라 버퍼/프로그램 해제는 생략.
