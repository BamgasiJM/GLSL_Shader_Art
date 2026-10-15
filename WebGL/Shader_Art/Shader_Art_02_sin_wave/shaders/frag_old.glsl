#version 300 es
precision highp float;

// 버텍스 셰이더에서 넘어온 데이터를 받음
in vec2 v_uv;

// gl_FragColor 대신 직접 out 변수를 만들어야 함
out vec4 fragColor;

// JS에서 매 프레임마다 변하는 값을 넘겨줄 때 씁니다. (시간, 해상도, 마우스 위치 등)
// JS에서 u_time, u_resolution을 넘겨줘야지 사용 가능
uniform float u_time;
uniform vec2 u_resolution;

void main() {
    // 좌표 보정 (종횡비 Aspect Ratio 맞추기)
    vec2 uv = v_uv;
    uv.x *= u_resolution.x / u_resolution.y;

    // 중심점 계산
    vec2 center = vec2(u_resolution.x / u_resolution.y * 0.5, 0.5);

    // distance(A, B): 두 점 사이의 거리
    float dist = distance(uv, center);

    // dist에 따라 파동 만들기 (시간에 따라 움직임)
    // sin()은 -1.0 ~ 1.0을 반환하므로, * 0.5 + 0.5 를 곱해 0.0 ~ 1.0로 정규화
    float wave = sin(dist * 35.0 - u_time * 2.0) * 0.5 + 0.5;

    vec3 color1 = vec3(0.0, 0.0, 0.0);
    vec3 color2 = vec3(1.0, 0.7, 0.8);

    // mix(A, B, C): C = 0.0 이면 A, C = 1.0 이면 B, 그 사이면 섞인 색을 반환 (Lerp)
    vec3 finalColor = mix(color1, color2, wave);

    // 최종 출력 (RGBA)
    fragColor = vec4(finalColor, 1.0);
}
