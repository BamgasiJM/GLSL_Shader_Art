#version 300 es
precision mediump float;

out vec4 FragColor;
uniform float u_time;
uniform vec2 u_resolution;

// ─────────────────────────────────────────────
// 2D Simplex Noise (Stefan Gustavson / Ian McEwan)
// ─────────────────────────────────────────────
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187,  // (3.0-sqrt(3.0))/6.0
                        0.366025403784439,  // 0.5*(sqrt(3.0)-1.0)
                       -0.577350269189626,  // -1.0 + 2.0 * C.x
                        0.024390243902439); // 1.0 / 41.0

    vec2 i  = floor(v + dot(v, C.yy));
    vec2 x0 = v -   i + dot(i, C.xx);

    vec2 i1;
    i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);

    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;

    i = mod289(i);
    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0))
                           + i.x + vec3(0.0, i1.x, 1.0));

    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy),
                            dot(x12.zw,x12.zw)), 0.0);
    m = m*m;
    m = m*m;

    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;

    m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);

    vec3 g;
    g.x  = a0.x  * x0.x  + h.x  * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;

    return 130.0 * dot(m, g);
}

// ─────────────────────────────────────────────
// Fractional Brownian Motion (fBm)
// ─────────────────────────────────────────────
float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0;
    for (int i = 0; i < 5; i++) {
        value += amplitude * snoise(p * frequency);
        amplitude *= 0.5;
        frequency *= 2.0;
    }
    return value;
}

// ─────────────────────────────────────────────
// Hash-based pseudo-random (셀별 고유 랜덤)
// ─────────────────────────────────────────────
float hash(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}

// ─────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────
void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution.xy;

    float N = 10.0;
    vec2 gridUV = uv * N;
    vec2 cell = floor(gridUV);
    vec2 localUV = fract(gridUV) * 2.0 - 1.0;

    float dist = length(localUV);

    // ── 노이즈 기반 유기적 애니메이션 ──
    // 셀 중심 좌표를 노이즈 입력으로 사용
    vec2 cellCenter = cell / N;

    // fBm: 시간에 따른 유기적 흐름
    float organic = fbm(cellCenter * 3.0 + u_time * 0.4);

    // hash: 각 셀의 고유한 랜덤 오프셋
    float cellRandom = hash(cell);

    // 두 노이즈를 결합해 펄스 생성
    float pulse = 0.5 + 0.5 * organic + 0.2 * cellRandom;
    pulse = clamp(pulse, 0.0, 1.0);

    // 반경: 노이즈에 따라 0.2 ~ 0.7 범위로 유동
    float maxRadius = 0.2 + 0.5 * pulse;

    // 안티앨리어싱
    float antialias = 0.03;
    float alpha = 1.0 - smoothstep(maxRadius - antialias, maxRadius + antialias, dist);

    // 색상: 노이즈 기반 그라데이션
    vec3 colorA = vec3(0.15, 0.35, 0.65);  // 짙은 파랑
    vec3 colorB = vec3(0.85, 0.45, 0.25);  // 주황
    float colorMix = fbm(cellCenter * 2.0 + u_time * 0.2) * 0.5 + 0.5;
    vec3 color = mix(colorA, colorB, colorMix);

    FragColor = vec4(color * alpha, 1.0);
}