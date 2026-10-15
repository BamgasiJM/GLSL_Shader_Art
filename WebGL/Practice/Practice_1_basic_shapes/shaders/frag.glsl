#version 300 es
precision highp float;

uniform vec2 u_resolution;
out vec4 outColor;

// -------------------------------------------------------- //
// ========= 정사각형을 그리는 거리장 (Signed Distance Field)
float boxSDF(vec2 p, vec2 size) {
// 위치 p와 정사각형 크기 size를 입력받아 거리를 반환하는 함수
    vec2 d = abs(p) - size;
    // 현재 좌표의 절댓값에서 정사각형 반크기를 뺌 (중심에서의 상대 거리 계산)
    return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
    // 정사각형 경계 밖의 거리 + 경계 안쪽의 거리 (음수면 내부, 양수면 외부)
}

// ========= 마름모를 그리는 거리장
float diamondSDF(vec2 p, float size) {
// 위치 p와 마름모 크기 size를 입력받아 거리를 반환하는 함수
    vec2 rotated = vec2(p.x + p.y, p.x - p.y) * 0.707;
    // 좌표를 45도 회전 (0.707은 1/√2로 정규화 계수)
    vec2 d = abs(rotated) - size;
    // 회전된 좌표의 절댓값에서 마름모 크기를 뺌
    return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
    // 회전된 정사각형처럼 계산하면 마름모 거리장 완성
}

// ========= 원을 그리는 거리장
float circleSDF(vec2 p, float radius) {
// 위치 p와 반지름 radius를 입력받아 거리를 반환하는 함수
    return length(p) - radius;
    // 중심으로부터의 거리에서 반지름을 뺌 (가장 간단한 거리장)
}

// ========= n각형을 그리는 거리장
float polygonSDF(vec2 p, float sides, float radius) {
// 위치 p, 변의 개수 sides, 반지름 radius를 입력받아 거리를 반환하는 함수
    float angle = atan(p.y, p.x);
    // 현재 좌표의 각도를 계산 (-π ~ π 범위)
    float len = length(p);
    // 중심으로부터의 거리(벡터의 크기) 계산
    float anglePerSide = 6.28318 / sides;
    // 360도(2π = 6.28318)를 변의 개수로 나눔 (한 변이 차지하는 각도)
    float halfAngle = anglePerSide * 0.5;
    // 한 변의 각도의 절반 (정렬을 위한 오프셋)
    float normalizedAngle = mod(angle + halfAngle, anglePerSide) - halfAngle;
    // 현재 각도를 -halfAngle ~ halfAngle 범위로 정규화 (변의 중심을 0도로)
    float boundaryRadius = radius / cos(normalizedAngle);
    // apothem(중심에서 변까지의 수직거리)을 역코사인으로 변환하여 반지름 계산
    return len - boundaryRadius;
    // 중심으로부터의 실제 거리에서 경계 반지름을 뺌 (음수면 내부, 양수면 외부)
}

// -------------------------------------------------------- //
void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution * 2.0 - 1.0;
    // 화면 좌표(0 ~ width, 0 ~ height)를 정규화 좌표로 변환 (-1.0 ~ 1.0)

    uv.x *= u_resolution.x / u_resolution.y;
    // x 좌표를 종횡비로 보정하여 도형이 일그러지지 않도록 함

    float dist = 1000.0;
    // 거리값을 초기화 (매우 큰 값으로 설정)

    // 화면을 4등분하여 각 도형 배치
    if (uv.x < 0.0 && uv.y > 0.0) {
    // 좌상단 사각형 영역 체크 (x < 0 AND y > 0)
        vec2 p = uv - vec2(-0.5, 0.5);
        // 도형의 중심을 좌상단 영역에 배치 (-0.5, 0.5)
        dist = boxSDF(p, vec2(0.3));
        // 정사각형 거리장 계산 (크기 0.3)
    }
    else if (uv.x > 0.0 && uv.y > 0.0) {
    // 우상단 사각형 영역 체크 (x > 0 AND y > 0)
        vec2 p = uv - vec2(0.5, 0.5);
        // 도형의 중심을 우상단 영역에 배치 (0.5, 0.5)
        dist = diamondSDF(p, 0.3);
        // 마름모 거리장 계산 (크기 0.3)
    }
    else if (uv.x < 0.0 && uv.y < 0.0) {
    // 좌하단 사각형 영역 체크 (x < 0 AND y < 0)
        vec2 p = uv - vec2(-0.5, -0.5);
        // 도형의 중심을 좌하단 영역에 배치 (-0.5, -0.5)
        dist = circleSDF(p, 0.3);
        // 원 거리장 계산 (반지름 0.3)
    }
    else {
    // 우하단 사각형 영역 (위 조건에 해당하지 않는 경우)
        vec2 p = uv - vec2(0.5, -0.5);
        // 도형의 중심을 우하단 영역에 배치 (0.5, -0.5)
        dist = polygonSDF(p, 5.0, 0.3);
        // 5각형 거리장 계산 (5개 변, 반지름 0.3)
    }

    float edge = fwidth(dist) * 0.0;
    // 픽셀 간 거리 변화율을 계산하여 경계 두께 결정 (* 0.0으로 선명한 경계)
    float fill = smoothstep(edge, -edge, dist);
    // 거리값을 0 ~ 1 범위의 부드러운 값으로 변환 (경계 anti-aliasing)

    if (fill < 0.01) {
    // 채우기 값이 거의 0에 가까우면 (도형 외부)
        discard;
        // 이 픽셀을 그리지 않음 (배경색이 보이도록 투과)
    }

    vec3 mintColor = vec3(0.85f, 0.87f, 0.91f);
    // 민트색 정의 (R=0.85, G=0.87, B=0.91)
    vec3 color = mix(vec3(0.0), mintColor, fill);
    // 검정색(내부)과 민트색(외부) 사이를 fill값으로 보간 (선형 혼합)

    outColor = vec4(color, 1.0);
    // 최종 색상에 완전 불투명도(alpha=1.0)를 더하여 출력
}
