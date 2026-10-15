#version 300 es
precision highp float;

uniform float u_time;
uniform vec2 u_resolution;

out vec4 fragColor;

#define PI 3.14159265359
#define TAU 6.28318530718

mat2 rot(float a) {
  float c = cos(a), s = sin(a);
  return mat2(c, -s, s, c);
}

// ─── SDF ───
float sdCircle(vec2 p, float r) {
  return length(p) - r;
}

float sdBox(vec2 p, vec2 b) {
  vec2 d = abs(p) - b;
  return length(max(d, 0.0f)) + min(max(d.x, d.y), 0.0f);
}

float sdHexagon(vec2 p, float r) {
  const vec3 k = vec3(-0.866025404f, 0.5f, 0.577350269f);
  p = abs(p);
  p -= 2.0f * min(dot(k.xy, p), 0.0f) * k.xy;
  p -= vec2(clamp(p.x, -k.z * r, k.z * r), r);
  return length(p) * sign(p.y);
}

float smin(float a, float b, float k) {
  float h = clamp(0.5f + 0.5f * (b - a) / k, 0.0f, 1.0f);
  return mix(b, a, h) - k * h * (1.0f - h);
}

void main() {
    // 정사각형 캔버스
  vec2 uv = (gl_FragCoord.xy - 0.5f * u_resolution.xy) / min(u_resolution.x, u_resolution.y);

  float t = u_time * 0.3f;

    // ─── sin 기반 동적 파라미터 ───
  float pulse1 = 0.5f + 0.5f * sin(t * 1.5f);        // 맥동 크기
  float pulse2 = 0.5f + 0.5f * sin(t * 2.3f + 1.0f);  // 보조 맥동
  float pulse3 = 0.5f + 0.5f * sin(t * 0.8f + 2.5f);  // 느린 맥동
  float wave = sin(t * 1.2f);                     // 파형

    // 전체 회전
  vec2 uvR = rot(t * 0.3f) * uv;

    // ─── 중앙 메인 도형 (SDF + smin) ───
  float dMain = 1e9f; // 여러 SDF 도형을 하나로 합칠 때 첫 번째 도형을 받아들이기 위한 초기값

    // 맥동하는 중앙 원
  float dCircle = sdCircle(uvR, 0.4f + 0.1f * pulse1);

    // 회전 사각형
  float dBox = sdBox(rot(t * 0.8f + wave * 0.5f) * uvR, vec2(0.12f + 0.2f * pulse2));

  dMain = smin(dCircle, dBox, 0.32f);

    // ─── fract 그리드 패턴 ───
  float gridScale = 16.0f + 4.0f * pulse1;
  vec2 gridUV = uvR * gridScale;
  vec2 cellID = floor(gridUV);
  vec2 f = fract(gridUV) - 0.5f;

    // 셀마다 크기가 다른 원들
  float radius = 0.08f + 0.06f * sin(t * 2.5f + length(cellID));
  float dGrid = sdCircle(f, radius);

  dMain = smin(dMain, dGrid, 0.06f);

    // ─── 육각형 레이어 ───
  vec2 grid2 = uvR * 20.0f;
  vec2 f2 = fract(grid2) - 0.5f;
  float dHex = sdHexagon(rot(t * 0.5f + pulse2 * PI) * f2, 0.05f + 0.05f * pulse1);

    // ─── step 기반 기하학적 마스크 ───
  float ringPattern = step(0.4f, fract(length(uv) * 12.0f - t * 3.5f));
  float angularPattern = step(0.5f, sin(atan(uv.y, uv.x) * 8.0f + t * 3.0f));

    // ─── smoothstep으로 흰색 도형/라인 추출 ───
  float shapeMain = smoothstep(0.03f, -0.03f, dMain);
  float shapeHex = smoothstep(0.02f, -0.02f, dHex);
  float glow = smoothstep(0.0f, 0.40f, -dMain);

    // ─── 추가 라인 레이어: sin 파형 링 ───
  float ringWave = abs(length(uv) - (0.5f + 0.15f * pulse1));
  float lineRing = smoothstep(0.1f, 0.0f, ringWave);

    // 추가 라인: 회전하는 직선들
  float lineAngle = abs(sin(atan(uv.y, uv.x) * 36.0f + t * 1.5f));
  float lineRadial = smoothstep(0.1f, 0.0f, lineAngle) * smoothstep(0.7f, 0.0f, length(uv));

    // ───  background ──
  vec3 color = vec3(0.31f, 0.08f, 0.62f);

    // 메인 도형
  color += vec3(0.03f, 0.5f, 0.47f) * shapeMain;

    // 육각형 레이어 (흰색, 살짝 투명)
  color += vec3(1.0f) * shapeHex * 0.2f;

    // Glow (흰색 외곽 발광)
  color += vec3(1.0f) * glow * 0.25f;

    // 링 웨이브 라인
  color += vec3(1.0f) * lineRing * 0.8f;

    // 방사형 라인
  color += vec3(1.0f) * lineRadial * 0.3f;

    // step 패턴 오버레이
  color += vec3(0.12f, 0.91f, 0.81f) * ringPattern * 0.02f;
  color += vec3(0.99f) * angularPattern * 0.05f;

    // ─── 비네팅 (smoothstep) ───
  float vig = smoothstep(1.4f, 0.5f, length(uv));
  color *= vig;

    // 밝기 클리핑
  color = clamp(color, 0.0f, 1.0f);

  fragColor = vec4(color, 1.0f);
}