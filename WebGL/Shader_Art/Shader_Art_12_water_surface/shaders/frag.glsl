#version 300 es
precision highp float;

// --- Uniform 변수 (외부에서 전달되는 전역 변수) ---
uniform float u_time;            // 시간 변수 (초 단위, 애니메이션 진행에 사용)
uniform vec2 u_resolution;       // 화면의 해상도 (픽셀 단위)
uniform vec2 u_mouse;            // 마우스 커서의 화면 좌표 (픽셀 단위)

// --- In/Out 변수 (입출력 변수) ---
in vec2 v_texCoord;              // 현재 픽셀의 정규화된 텍스처 좌표 (0.0 ~ 1.0)
out vec4 fragColor;              // 최종적으로 화면에 출력될 색상 (RGBA)

// ==========================================
// 2D Simplex 노이즈 함수 (Ashima Arts 표준 구현)
// ==========================================
// 289로 나누어 떨어지지 않도록 나머지 연산을 수행 (Permutation 테이블 범위 제한)
vec3 mod289(vec3 x) {
  return x - floor(x * (1.0f / 289.0f)) * 289.0f;
}
vec2 mod289(vec2 x) {
  return x - floor(x * (1.0f / 289.0f)) * 289.0f;
}

// 값을 뒤섞기 위한 순열 함수 (Permutation function)
vec3 permute(vec3 x) {
  return mod289(((x * 34.0f) + 1.0f) * x);
}

// 2D Simplex 노이즈 계산 함수 (반환값 범위: 약 -1.0 ~ 1.0)
float snoise(vec2 v) {
  // 단순 노이즈 계산을 위한 상수 배열
  const vec4 C = vec4(0.211324865405187f,  // (3.0 - sqrt(3.0)) / 6.0
  0.366025403784439f,  // 0.5 * (sqrt(3.0) - 1.0)
  -0.577350269189626f,  // -1.0 + 2.0 * C.x
  0.024390243902439f); // 1.0 / 41.0

  // 입력 좌표를 Simplex 격자 공간으로 변환하여 가장 가까운 격자 점(i) 찾기
  vec2 i = floor(v + dot(v, C.yy));
  // 현재 점과 가장 가까운 격자 점(i) 간의 거리 계산 (x0)
  vec2 x0 = v - i + dot(i, C.xx);

  // 다음으로 가까운 격자 점(i1) 결정
  vec2 i1;
  i1 = (x0.x > x0.y) ? vec2(1.0f, 0.0f) : vec2(0.0f, 1.0f);

  // 세 개의 꼭짓점에 대한 오프셋 계산 (x12)
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;

  // 격자 좌표를 mod289 연산을 통해 범위 제한
  i = mod289(i);

  // 그래디언트 인덱스 계산을 위한 순열 (Permutation) 적용
  vec3 p = permute(permute(i.y + vec3(0.0f, i1.y, 1.0f)) + i.x + vec3(0.0f, i1.x, 1.0f));

  // 반경 계산 및 가중치(m) 도출 (0.5 - dot(x, x))
  vec3 m = max(0.5f - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0f);
  m = m * m;
  m = m * m; // 4제곱을 적용하여 부드러운 가장자리(falloff) 생성

  // 그래디언트 방향 계산
  vec3 x = 2.0f * fract(p * C.www) - 1.0f;
  vec3 h = abs(x) - 0.5f;
  vec3 a0 = x - floor(x + 0.5f);

  // 최종 그래디언트 값(g) 도출
  vec3 g = a0 * vec3(x0.x, x12.xz) + h * vec3(x0.y, x12.yw);

  // 스케일링 계수(l) 계산 및 그래디언트에 적용
  vec3 l = 1.79284291400159f - 0.85373472095314f * (a0 * a0 + h * h);
  g *= l;

  // 각 꼭짓점의 기여도를 합산하여 최종 노이즈 값(res) 도출
  float res = 130.0f * dot(m, g);
  return res;
}

void main() {
  // --- 1. 기본 좌표 및 마우스 위치 정규화 ---
  vec2 screenUV = v_texCoord; // 화면의 정규화된 좌표 (0.0 ~ 1.0)
  vec2 normalizedMousePos = u_mouse / u_resolution; // 마우스 좌표를 0.0 ~ 1.0 범위로 정규화

  // --- 2. 노이즈 좌표 설정 ---
  float noiseScale = 4.0f; // 노이즈 패턴의 크기 및 밀도 조절 (값이 클수록 패턴이 작아짐)
  vec2 noiseCoord = screenUV * noiseScale;

  // --- 3. 1차 노이즈 계산 (큰 파동 패턴) ---
  // 시간에 따라 천천히 움직이며 마우스 위치에 의해 미세하게 변형됨
  float primaryNoise = snoise(noiseCoord + u_time * 0.2f + normalizedMousePos * 0.5f);

  // --- 4. 2차 노이즈 계산 (디테일한 질감 및 하이라이트) ---
  // 1차 노이즈 값을 이용해 좌표를 왜곡(distortion)하여 유기적인 디테일 생성
  float detailNoise = snoise(noiseCoord * 2.0f - u_time * 0.05f + primaryNoise);

  // --- 5. 색상 팔레트 설정 ---
  vec3 deepColor = vec3(0.0f, 0.03f, 0.24f);    // 어두운 심해 색상
  vec3 midColor = vec3(0.09f, 0.29f, 0.65f);      // 중간 밝기의 푸른 물빛 색상
  vec3 highlightColor = vec3(0.75f, 0.97f, 0.95f); // 물결의 하얀 하이라이트 및 거품 색상

  // --- 6. 색상 혼합 ---
  // 1차 노이즈(-1.0 ~ 1.0)를 0.0 ~ 1.0 범위로 변환하여 기본 색상과 중간 색상을 혼합
  vec3 baseColor = mix(deepColor, midColor, primaryNoise * 0.5f + 0.5f);

  // 2차 노이즈의 양수 값만 사용하여 지수 함수(pow) 적용 (하이라이트만 뾰족하게 표현)
  float highlightMask = pow(max(0.0f, detailNoise), 3.0f) * 0.9f;
  vec3 finalColor = mix(baseColor, highlightColor, highlightMask);

  // --- 7. 비네팅(Vignette) 효과 적용 ---
  // 화면 중심부는 밝게, 가장자리는 어둡게 만들어 초점을 중앙으로 유도
  float vignetteAmount = 1.0f - length(screenUV - 0.5f) * 1.2f;
  finalColor *= clamp(vignetteAmount, 0.2f, 1.0f); // 어두운 정도를 제한하여 완전한 검정으로 가지 않게 함

  // --- 8. 최종 색상 출력 ---
  fragColor = vec4(finalColor, 1.0f);
}