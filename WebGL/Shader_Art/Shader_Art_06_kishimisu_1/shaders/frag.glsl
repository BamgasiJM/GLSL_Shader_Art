#version 300 es
precision highp float;

// app.js에서 전달하는 유니폼 변수
uniform vec2 u_resolution;
uniform float u_time;

// 출력 색상
out vec4 fragColor;

// --- SDF 및 수학 상수 ---
float sdPentagram(in vec2 p, in float r) {
    const float k1x = 0.809016994;
    const float k2x = 0.309016994;
    const float k1y = 0.587785252;
    const float k2y = 0.951056516;
    const float k1z = 0.726542528;
    vec2 v1 = vec2(k1x, -k1y);
    vec2 v2 = vec2(-k1x, -k1y);
    vec2 v3 = vec2(k2x, -k2y);

    p.x = abs(p.x);
    p -= 2.0 * max(dot(v1, p), 0.0) * v1;
    p -= 2.0 * max(dot(v2, p), 0.0) * v2;
    p.x = abs(p.x);
    p.y -= r;
    return length(p - v3 * clamp(dot(p, v3), 0.0, k1z * r)) * sign(p.y * v3.x - p.x * v3.y);
}

// --- 색상 팔레트 (Cosine Gradient) ---
vec3 palette1(float t) {
    vec3 a = vec3(0.614, 0.608, 0.340);
    vec3 b = vec3(0.905, 0.258, 0.284);
    vec3 c = vec3(1.479, 0.644, 0.859);
    vec3 d = vec3(0.552, 1.583, 4.770);
    return a + b * cos(6.28318 * (c * t + d));
}

void main() {
    // gl_FragCoord를 사용하여 0~1 범위의 uv 좌표 계산
    vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / u_resolution.y;
    vec2 uv0 = uv;
    vec3 finalColor = vec3(0.0);

    // 반복 루프 (프랙탈 스타일)
    for(float i = 0.0; i < 3.0; i++) {
        // 좌표 변형 및 타일링
        uv = fract(uv * 1.5) - 0.5;

        // 별의 SDF 계산
        float d = sdPentagram(uv, 0.1);

        // 중심부로 갈수록 빛이 강해지도록 감쇄 (Exponential Decay)
        d *= exp(-length(uv0));

        // 색상 적용
        vec3 col = palette1(length(uv0) + i * 0.4 + u_time * 0.5);

        // 시간(u_time)에 따른 일렁임 효과
        d = sin(d * 8.0 + u_time) / 8.0;
        d = abs(d);

        // Glow 효과의 핵심: 경계선 근처에서 값이 급격히 커지도록 설정
        d = pow(0.01 / d, 1.3);

        finalColor += col * d;
    }

    fragColor = vec4(finalColor, 1.0);
}