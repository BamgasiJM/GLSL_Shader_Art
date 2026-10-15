#version 300 es
precision mediump float;

uniform vec2 u_resolution;  // JavaScript에서 gl.uniform2f()로 전달된다.

out vec4 fragColor;

// pcurve: "power curve" 형태의 곡선 함수
//   f(x) = k * x^a * (1 - x)^b   (0 <= x <= 1)
// - a, b가 1보다 크면 곡선의 양 끝(시작/끝)이 평평해지고,
//   a가 클수록 상승이 뒤쪽으로, b가 클수록 상승이 앞쪽으로 몰린다.
// - k는 정규화 상수로, 곡선의 최댓값이 정확히 1이 되도록 만들어 주는 계수다.
//     k = (a+b)^(a+b) / (a^a * b^b)
//   실제로 f(x)는 x = a/(a+b) 지점에서 최댓값 1을 갖는다.
float pcurve(float x, float a, float b) {
    // 정규화 상수 k 계산 (분모의 0^0 문제를 피하기 위해 a, b는 0보다 커야 함)
    float k = pow(a + b, a + b) / (pow(a, a) * pow(b, b));
    // k를 곱해 최댓값이 1이 되도록 스케일링한 곡선 반환
    return k * pow(x, a) * pow(1.0f - x, b);
}

void main() {
    // gl_FragCoord: 현재 픽셀의 좌표(0, 0 ~ 해상도 크기)
    // u_resolution으로 나눠 [0, 1] 범위의 정규화된 좌표 st로 변환
    vec2 st = gl_FragCoord.xy / u_resolution;

    // 정규화된 x 좌표를 pcurve에 넣어 y값을 계산
    // a = 8, b = 1 → 최댓값 지점이 x = 8/9 ≈ 0.89 이므로,
    // 화면 오른쪽 끝 부분에서 그래디언트가 급격하게 밝아지는 곡선이 된다.
    float yPos = pcurve(st.x, 8.0f, 1.0f);

    // yPos 값을 그대로 RGB에 넣어 그레이스케일(밝기)로 표현
    // yPos = 0이면 검정, yPos = 1이면 흰색
    vec3 color = vec3(yPos);

    // 최종 출력 색상 (RGB + 알파 = 1.0으로 완전 불투명)
    fragColor = vec4(color, 1.0f);
}
