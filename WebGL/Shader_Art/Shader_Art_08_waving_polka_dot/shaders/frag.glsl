#version 300 es
precision highp float;

in vec2 v_uv;
uniform float u_time;
out vec4 fragColor;

void main() {
    // 1. 점의 배치 설정 (Grid 정의)
    // 화면 전체를 15x15 격자로 나눕니다. (u_time에 따라 점 개수 조절 가능)
    float density = 15.0;
    vec2 gridUV = v_uv * density;

    // 2. Local Cell 좌표계 생성
    // 각 격자 내부 좌표를 0.0 ~ 1.0 범위로 가져옵니다.
    vec2 localUV = fract(gridUV);

    // 3. 거리 계산 (원 모양 만들기)
    // 각 격자 칸의 중심점(0.5, 0.5)에서 현재 픽셀까지의 거리를 계산합니다.
    vec2 center = vec2(0.5);
    float dist = distance(localUV, center);

    // 4. 점의 크기 설정 (시간에 따른 애니메이션)
    // sin 함수를 이용하여 반지름이 0.1 ~ 0.4 사이로 맥동(Pulse)하게 합니다.
    float baseRadius = 0.25;
    float pulseSpeed = 2.0;
    float radius = baseRadius + 0.15 * sin(u_time * pulseSpeed);

    // 5. 흑백 변환 및 안티앨리어싱
    // smoothstep을 사용하여 원의 경계선을 부드럽게(AA) 처리합니다.
    // dist가 radius보다 작으면 1.0(백색), 크면 0.0(흑색)에 가까운 값을 가집니다.
    // 두 값을 반대로 배치하면(radius, radius - AA) 흰색 원이 나옵니다.
    float antialias = 0.02; // 부드러운 경계선 두께
    float brightness = 1.0 - smoothstep(radius - antialias, radius + antialias, dist);

    // 6. 최종 출력
    // 점은 흰색, 배경은 검은색인 흑백 Polka Dot 패턴
    fragColor = vec4(vec3(brightness), 1.0);
}
