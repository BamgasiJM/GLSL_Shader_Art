#version 300 es
precision highp float;

uniform vec2 u_resolution;

out vec4 fragColor;

void main() {
  // gl_FragCoord를 해상도로 나눠 [0,1] 범위의 정규화된 좌표로 변환
  vec2 st = gl_FragCoord.xy / u_resolution;

  // 화면을 gridCount x gridCount 개의 격자로 나눈다.
  float gridCount = 5.0f;
  // fract: 각 셀 내부의 로컬 좌표(0~1)를 구하고, 0.5를 빼서 [-0.5, 0.5] 범위로 만든다.
  // 즉 각 셀의 중심이 (0, 0)이 되도록 좌표계를 옮긴다.
  vec2 grid = fract(st * gridCount) - 0.5f;

  // length(grid): 셀 중심으로부터의 거리.
  // step(0.3, 거리): 거리가 0.3 미만이면 0, 0.3 이상이면 1을 반환.
  // 1에서 빼면 거리가 0.3 미만(원 내부)인 픽셀만 1(흰색)이 된다.
  // → 각 셀의 중앙에 반지름 0.3인 원이 그려진다.
  float circle = 1.0f - step(0.3f, length(grid));

  // 원 내부는 흰색(1), 외부는 검정(0)으로 그레이스케일 출력 (알파 = 1.0)
  fragColor = vec4(vec3(circle), 1.0f);
}