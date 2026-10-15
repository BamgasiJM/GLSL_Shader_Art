#version 300 es
precision highp float;

// JS에서 매 프레임 전달되는 uniform 변수
uniform float u_time;        // 누적 시간 (sec)
uniform vec2 u_resolution;   // 캔버스 해상도 (pixel)

// gl_FragColor 대신 out 변수로 직접 출력
out vec4 fragColor;

void main() {
    // 1. 픽셀 좌표를 0~1 범위로 정규화
    vec2 uv = gl_FragCoord.xy / u_resolution;

    // 2. 좌표 원점을 화면 중앙 (0,0)으로 이동, 범위를 -1.0~1.0로 확장
    //    이렇게 원점을 고정해두면 이후 원/사각형 등 도형 함수를 그대로 재사용할 수 있음
    vec2 pos = (uv - 0.5) * 2.0;

    // 3. 종횡비 보정 - x축만 늘려서 화면 비율이 달라져도 원이 타원으로 찌그러지지 않게 함
    pos.x *= u_resolution.x / u_resolution.y;

    // 4. 시간 배속 - 값이 작을수록 애니메이션이 느려짐
    float slowTime = u_time * 0.5;

    // 5. 원점(중심)으로부터의 거리 계산 - 중심이 0, 화면 끝으로 갈수록 값이 커짐
    float dist = length(pos);

    // 6. 거리값을 기반으로 한 방사형(radial) 사인파 생성
    //    -slowTime을 빼주면 파동이 시간에 따라 바깥쪽으로 퍼져나가는 것처럼 보임
    float wave = sin(dist * 12.0 - slowTime);

    // 7. sin()의 반환 범위는 -1.0~1.0이므로, 색상에 쓰기 위해 0.0~1.0으로 정규화
    wave = wave * 0.5 + 0.5;

    // 8. wave 값을 기준으로 두 색을 보간(mix)
    vec3 colorDeep = vec3(0.05, 0.15, 0.4);
    vec3 colorBright = vec3(0.2, 0.8, 1.0);
    vec3 finalColor = mix(colorDeep, colorBright, wave);

    // 9. 최종 색상 출력 (알파값 1.0 = 불투명)
    fragColor = vec4(finalColor, 1.0);
}
