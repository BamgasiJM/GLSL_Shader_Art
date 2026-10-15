#version 300 es
precision mediump float;

out vec4 FragColor;
uniform float u_time;
uniform vec2 u_resolution;

// ─────────────────────────────────────────────
// Hash-based 2D gradient noise (simpler alternative)
// ─────────────────────────────────────────────
vec2 hash22(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.xx + p3.yz) * p3.zy) * 2.0 - 1.0;
}

float hash12(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}

float gradNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);

    vec2 g00 = hash22(i + vec2(0.0, 0.0));
    vec2 g10 = hash22(i + vec2(1.0, 0.0));
    vec2 g01 = hash22(i + vec2(0.0, 1.0));
    vec2 g11 = hash22(i + vec2(1.0, 1.0));

    float v00 = dot(g00, f - vec2(0.0, 0.0));
    float v10 = dot(g10, f - vec2(1.0, 0.0));
    float v01 = dot(g01, f - vec2(0.0, 1.0));
    float v11 = dot(g11, f - vec2(1.0, 1.0));

    vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);

    return mix(mix(v00, v10, u.x), mix(v01, v11, u.x), u.y);
}

float fbm(vec2 p) {
    float value = 0.0;
    float amp = 0.5;
    float freq = 1.0;
    for (int i = 0; i < 4; i++) {
        value += amp * gradNoise(p * freq);
        amp *= 0.5;
        freq *= 2.0;
    }
    return value;
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

    // 유기적 노이즈 기반 펄스
    vec2 cellCenter = cell / N;
    float organic = fbm(cellCenter * 4.0 + u_time * 0.3);
    float cellRandom = hash12(cell);

    float pulse = 0.5 + 0.5 * organic + 0.15 * cellRandom;
    pulse = clamp(pulse, 0.0, 1.0);

    float maxRadius = 0.2 + 0.5 * pulse;

    float antialias = 0.03;
    float alpha = 1.0 - smoothstep(maxRadius - antialias, maxRadius + antialias, dist);

    // 색상
    vec3 colorA = vec3(0.15, 0.35, 0.65);
    vec3 colorB = vec3(0.85, 0.45, 0.25);
    float colorMix = fbm(cellCenter * 2.0 + u_time * 0.15) * 0.5 + 0.5;
    vec3 color = mix(colorA, colorB, colorMix);

    FragColor = vec4(color * alpha, 1.0);
}