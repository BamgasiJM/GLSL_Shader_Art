#version 300 es
precision highp float;

in vec2 v_uv;
uniform float u_time;
uniform vec2 u_mouse;
uniform vec2 u_resolution;
out vec4 fragColor;

// Simplex-like noise function
float hash(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);

    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));

    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

void main() {
    vec2 uv = v_uv;
    vec2 mouseUv = u_mouse / u_resolution;

    // 마우스까지의 거리
    float dist = length(uv - mouseUv);

    // 물감 중심부: 마우스 주변에서 강함
    float paintCore = exp(-dist * dist * 20.0);

    // 퍼지는 효과: 거리에 따른 부드러운 감소
    float paintSpread = exp(-dist * dist * 8.0);

    // 시간 기반 흐름 애니메이션
    float flowTime = u_time * 0.5;

    // 마우스 주변에서 회전하는 흐름
    vec2 flowDir = normalize(uv - mouseUv + vec2(0.0001));
    float angle = atan(flowDir.y, flowDir.x);
    float flow = sin(angle * 3.0 + flowTime) * 0.5 + 0.5;

    // 레이어드 노이즈로 강한 turbulence 생성
    float n1 = noise(uv * 3.0 + flowTime);
    float n2 = noise(uv * 5.0 + flowTime * 1.5 + vec2(10.0));
    float n3 = noise(uv * 8.0 + flowTime * 2.0 + vec2(20.0));
    float n4 = noise(uv * 12.0 + flowTime * 0.8 + vec2(30.0));

    // 멀티레이어 turbulence로 복잡한 흐름 생성
    float turbulence = n1 * 0.4 + n2 * 0.35 + n3 * 0.15 + n4 * 0.1;
    turbulence = pow(turbulence, 1.2);

    // 소용돌이 효과: 마우스 중심에서 회전하는 vorticty
    float vortex = sin(angle * 5.0 + flowTime * 2.0) * cos(angle * 2.0 - flowTime * 1.5);
    vortex = vortex * 0.5 + 0.5;

    // 흐름 속도를 거리에 따라 가변적으로
    float flowSpeed = exp(-dist * 3.0) * (1.0 + turbulence * 0.8);
    float flow2 = sin(angle * 4.0 + flowTime * flowSpeed * 3.0) * 0.5 + 0.5;

    // 컬러 설정
    vec3 colorBlue = vec3(0.0, 0.3, 1.0);
    vec3 colorPink = vec3(0.2f, 1.0f, 0.99f);

    // 마우스 주변에서 색상 혼합 (turbulence 기반)
    float colorMix = sin(flowTime + angle * 2.0 + turbulence * 3.0) * 0.5 + 0.5;
    vec3 paintColor = mix(colorBlue, colorPink, colorMix);

    // 강화된 페인트 강도
    float paintIntensity = paintCore + paintSpread * turbulence * flow * flow2 * vortex;
    paintIntensity = smoothstep(0.0, 1.0, paintIntensity);

    // 강한 흐름 효과
    float secondary = paintSpread * sin(flowTime * 2.0 + dist * 15.0 + turbulence * 5.0) * 0.6 + 0.4;
    secondary *= turbulence;
    secondary *= vortex;

    // 최종 색상 합성 (더 강한 강도)
    vec3 finalColor = paintColor * paintIntensity * 1.3;
    finalColor += paintColor * 0.5 * secondary;

    // 배경 (검은색) + 물감
    fragColor = vec4(finalColor, 1.0);
}
