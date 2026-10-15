#version 300 es
precision highp float;

uniform vec2 u_resolution;
uniform float u_time;

out vec4 fragColor;

// ============================================
// 1. 기본 그리드 (흑백 테두리)
// ============================================
vec3 pattern_grid(vec2 st) {
    float gridCount = 10.0;
    vec2 grid = fract(st * gridCount);
    // 테두리 두께 조절 (0.05 = 얇음, 0.2 = 두꺼움)
    float border = step(0.95, grid.x) + step(0.95, grid.y);
    return vec3(border);
}

// ============================================
// 2. 체커보드 (격자 교차 색상)
// ============================================
vec3 pattern_checkerboard(vec2 st) {
    float gridCount = 8.0;
    vec2 cell = floor(st * gridCount);
    // x+y가 짝수면 0(검정), 홀수면 1(흰색)
    float checker = mod(cell.x + cell.y, 2.0);
    return vec3(checker);
}

// ============================================
// 3. 부드러운 테두리 격자 (안티앨리어싱)
// ============================================
vec3 pattern_smooth_grid(vec2 st) {
    float gridCount = 6.0;
    vec2 grid = fract(st * gridCount);
    // smoothstep으로 부드러운 경계선
    float borderX = smoothstep(0.0, 0.05, grid.x) * (1.0 - smoothstep(0.95, 1.0, grid.x));
    float borderY = smoothstep(0.0, 0.05, grid.y) * (1.0 - smoothstep(0.95, 1.0, grid.y));
    float border = 1.0 - borderX * borderY;
    return vec3(border);
}

// ============================================
// 4. 다이아몬드 체커보드 (회전된 격자)
// ============================================
vec3 pattern_diamond(vec2 st) {
    float gridCount = 8.0;
    // 45도 회전 (좌표 변환)
    vec2 rotated = vec2(st.x + st.y, st.x - st.y) * 0.5;
    vec2 cell = floor(rotated * gridCount);
    float diamond = mod(cell.x + cell.y, 2.0);
    return vec3(diamond);
}

// ============================================
// 5. 무지개 격자 (셀마다 다른 색)
// ============================================
vec3 pattern_rainbow_grid(vec2 st) {
    float gridCount = 5.0;
    vec2 cell = floor(st * gridCount);
    // 셀 인덱스를 기반으로 HSL-like 색상 생성
    vec3 color = vec3(
        fract((cell.x + cell.y) * 0.3),           // 빨강
        fract(cell.x * 0.2 + cell.y * 0.5),       // 초록
        fract(cell.x * 0.5 + cell.y * 0.2)        // 파랑
    );
    return color;
}

// ============================================
// 6. 동그라미 격자 (각 셀에 원)
// ============================================
vec3 pattern_circle_grid(vec2 st) {
    float gridCount = 5.0;
    vec2 cell = floor(st * gridCount);
    vec2 grid = fract(st * gridCount) - 0.5; // 셀 중심을 (0,0)으로
    // 원의 반지름 (0.5 = 셀 가득, 0.3 = 작은 원)
    float circle = 1.0 - step(0.3, length(grid));
    return vec3(circle);
}

// ============================================
// 7. 회전하는 원 격자 (셀 속 애니메이션)
// ============================================
vec3 pattern_animated_circles(vec2 st, float time) {
    float gridCount = 4.0;
    vec2 cell = floor(st * gridCount);
    vec2 grid = fract(st * gridCount) - 0.5;

    // 각 셀마다 다른 회전 속도
    float angle = time * (0.5 + fract(sin(cell.x * 12.9898 + cell.y * 78.233) * 43758.5453));
    float c = cos(angle);
    float s = sin(angle);
    vec2 rotated = vec2(grid.x * c - grid.y * s, grid.x * s + grid.y * c);

    // 회전하는 바(막대) 그리기
    float bar = smoothstep(0.05, 0.0, abs(rotated.x));
    return vec3(bar);
}

// ============================================
// 8. 물결 격자 (셀마다 크기가 변하는 원)
// ============================================
vec3 pattern_pulsing_grid(vec2 st, float time) {
    float gridCount = 6.0;
    vec2 cell = floor(st * gridCount);
    vec2 grid = fract(st * gridCount) - 0.5;

    // 각 셀마다 다른 위상의 파동
    float phase = sin(time * 2.0 + cell.x * 0.5 + cell.y * 0.8);
    float radius = 0.1 + 0.2 * (phase * 0.5 + 0.5); // 0.1 ~ 0.3 사이 변동

    float circle = 1.0 - step(radius, length(grid));
    // 원 색상도 시간에 따라 변함
    vec3 color = vec3(
        0.5 + 0.5 * sin(time + cell.x),
        0.5 + 0.5 * cos(time + cell.y),
        0.5 + 0.5 * sin(time * 1.3)
    );
    return color * circle;
}

// ============================================
// 메인: 화면을 4x2로 나눠 8개 패턴 동시 표시
// ============================================
void main() {
    vec2 st = gl_FragCoord.xy / u_resolution;

    // 화면을 4x2 그리드로 분할 (8칸)
    vec2 tileIndex = floor(st * vec2(4.0, 2.0));
    vec2 tileSt = fract(st * vec2(4.0, 2.0));

    // 타일 번호 계산 (0~7)
    int tile = int(tileIndex.x) + int(tileIndex.y) * 4;

    vec3 color;

    // 각 타일에 다른 패턴 할당
    switch(tile) {
        case 0:  color = pattern_grid(tileSt);              break;
        case 1:  color = pattern_checkerboard(tileSt);      break;
        case 2:  color = pattern_smooth_grid(tileSt);       break;
        case 3:  color = pattern_diamond(tileSt);           break;
        case 4:  color = pattern_rainbow_grid(tileSt);      break;
        case 5:  color = pattern_circle_grid(tileSt);       break;
        case 6:  color = pattern_animated_circles(tileSt, u_time); break;
        case 7:  color = pattern_pulsing_grid(tileSt, u_time);     break;
        default: color = vec3(0.0);
    }

    // 타일 사이에 구분선 추가 (시각적 구분)
    vec2 gridLine = step(0.98, fract(st * vec2(4.0, 2.0)));
    float divider = max(gridLine.x, gridLine.y);
    color = mix(color, vec3(0.2), divider);

    fragColor = vec4(color, 1.0);
}