#version 300 es
precision mediump float;

uniform vec2 u_resolution;
uniform float u_time;
uniform vec2 u_mouse;

out vec4 fragColor;

// ─────────────────────────────────────────────
// 1. Hash & Gradient Noise (Perlin 스타일 2D noise)
// ─────────────────────────────────────────────
vec2 hash22(vec2 p) {
  p = vec2(dot(p, vec2(127.1, 311.7)),
           dot(p, vec2(269.5, 183.3)));
  return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
}

// Gradient noise: 격자점의 gradient 벡터를 보간 → 부드러운 유기적 패턴
float gnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f); // smoothstep 보간 (Hermite curve)

  return mix(
    mix(dot(hash22(i + vec2(0.0, 0.0)), f - vec2(0.0, 0.0)),
        dot(hash22(i + vec2(1.0, 0.0)), f - vec2(1.0, 0.0)), u.x),
    mix(dot(hash22(i + vec2(0.0, 1.0)), f - vec2(0.0, 1.0)),
        dot(hash22(i + vec2(1.0, 1.0)), f - vec2(1.0, 1.0)), u.x),
    u.y);
}

// ─────────────────────────────────────────────
// 2. fBm: 여러 octave의 noise를 누적 → 복잡한 디테일
// ─────────────────────────────────────────────
float fbm(vec2 p) {
  float value = 0.0;
  float amp   = 0.5;
  // rotation matrix로 octave마다 회전 → 격자 방향성 제거
  mat2 rot = mat2(0.8, -0.6, 0.6, 0.8);
  for (int i = 0; i < 5; i++) {
    value += amp * gnoise(p);
    p = rot * p * 2.0;   // frequency 2배 (lacunarity)
    amp *= 0.5;          // amplitude 절반 (gain)
  }
  return value;
}

void main() {
  vec2 st    = (gl_FragCoord.xy * 2.0 - u_resolution) / min(u_resolution.x, u_resolution.y);
  vec2 mouse = (u_mouse * 2.0 - u_resolution) / min(u_resolution.x, u_resolution.y);

  // ─────────────────────────────────────────
  // 3. Domain Warping: 노이즈로 좌표 자체를 왜곡한 뒤 파동 계산
  //    → 단순 sin 물결이 유체처럼 뒤틀림
  // ─────────────────────────────────────────
  vec2 flow = vec2(
    fbm(st * 2.0 + vec2(0.0, u_time * 0.3)),
    fbm(st * 2.0 + vec2(5.2, u_time * 0.25))
  );
  vec2 warped = st + flow * 0.6;

  float wave = sin(warped.x * 10.0 + warped.y * 4.0 + u_time * 2.0) * 0.5 + 0.5;
  // 파동 위에 미세한 fBm 디테일 한 겹 더
  wave += fbm(warped * 6.0 + u_time * 0.4) * 0.25;

  vec3 color = vec3(wave * 0.08, wave * 0.28, wave * 0.55);

  // ─────────────────────────────────────────
  // 4. 마우스 광원 (기존 로직 유지)
  // ─────────────────────────────────────────
  float dist = length(st - mouse);
  float glow = 0.05 / max(dist, 0.001);
  color += vec3(0.13f, 0.77f, 1.0f) * glow * 0.3;

  // ─────────────────────────────────────────
  // 5. Trail 효과: glow를 노이즈 flow field 방향으로
  //    여러 샘플 smear → 유체가 흘러나가는 잔상
  // ─────────────────────────────────────────
  const int TRAIL_STEPS = 7;
  float trail = 0.0;
  vec2 pos = mouse;

  for (int i = 0; i < TRAIL_STEPS; i++) {
    float t = float(i) / float(TRAIL_STEPS); // 0 → 1 (뒤로 갈수록 과거)

    // flow field 샘플링: 시간을 거슬러 올라가며 noise 방향으로 이동
    float pastTime = u_time - t * 1.5;
    vec2 dir = vec2(
      fbm(pos * 3.0 + vec2(0.0, pastTime * 0.5)),
      fbm(pos * 3.0 + vec2(7.7, pastTime * 0.5))
    );
    pos -= normalize(dir + vec2(0.001)) * 0.06; // 한 스텝 뒤로 이동

    float d = length(st - pos);
    float falloff = 1.0 - t;              // 과거일수록 약하게 (감쇠)
    trail += (0.015 / max(d, 0.001)) * falloff * falloff;
  }

  // trail 자체에도 fBm를 곱해 유체 질감 부여
  float turbulence = fbm(st * 5.0 - u_time * 0.6) * 0.5 + 0.7;
  trail *= turbulence;

  // trail 색: 광원보다 차가운 톤으로 그라데이션 (주황 → 붉은 보라)
  color += mix(vec3(0.6941, 0.8353, 1.0), vec3(0.6, 0.15, 0.4), 0.5) * trail * 0.25;

  fragColor = vec4(color, 1.0);
}
