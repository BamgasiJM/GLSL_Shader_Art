#version 300 es
precision highp float;

uniform vec2 u_resolution; // JavaScript에서 gl.uniform2f()로 전달
uniform float u_time; // JavaScript에서 gl.uniform1f()`

out vec4 fragColor;

void main() {
  // gl_FragCoord를 해상도로 나눠 [0,1] 범위의 정규화된 좌표로 변환
  vec2 st = gl_FragCoord.xy / u_resolution;

  // 화면을 gridCount x gridCount 개의 격자(셀)로 나눈다. 여기서는 40x40 격자.
  float gridCount = 40.0f;

  // floor: 각 픽셀이 속한 셀의 인덱스 (예: 0~39 범위의 정수)
  // 이 값으로 "이 픽셀이 몇 번째 셀에 있는가"를 식별한다.
  vec2 cell = floor(st * gridCount);

  // fract: 셀 내부에서의 로컬 좌표. 0~1 사이 값에서 0.5를 빼서 [-0.5, 0.5] 범위로 만든다.
  // 즉 각 셀의 중심이 (0, 0)이 되도록 좌표계를 옮긴다.
  vec2 grid = fract(st * gridCount) - 0.5f;

  // 셀마다 서로 다른 회전 속도를 만들기 위한 "의사 난수" 해시.
  // sin()과 곱셈을 조합한 잘 알려진 해시 기법으로, 셀 인덱스(cell)가 같으면 항상 같은 0~1 값이 나온다.
  // 여기에 시간(u_time)을 곱해 셀마다 각도가 다르게, 시간에 따라 회전하도록 한다.
  float angle = u_time * (0.5f + fract(sin(cell.x * 12.9898f + cell.y * 78.233f) * 43758.5453f));

  // 회전 변환에 사용할 코사인/사인 값을 미리 계산
  float c = cos(angle);
  float s = sin(angle);

  // 셀 중심을 기준으로 로컬 좌표(grid)를 angle만큼 회전시킨 좌표를 계산
  // 2D 회전 행렬: [cos -sin; sin cos] * (x, y)
  vec2 rotated = vec2(grid.x * c - grid.y * s, grid.x * s + grid.y * c);

  // 회전된 좌표의 x가 0에 가까울수록(즉 세로 축 위) 밝게 표시한다.
  // smoothstep(0.05, 0.0, abs(rotated.x)):
  //   |rotated.x| >= 0.05이면 0, |rotated.x| == 0이면 1,
  //   그 사이는 부드럽게 보간 → 각 셀 중앙에 세로로 얇은 "막대(bar)"가 그려진다.
  //   참고: edge0(0.05) > edge1(0.0)이라 일반적인 smoothstep과 방향이 반대인 "역방향" 사용.
  float bar = smoothstep(0.05f, 0.0f, abs(rotated.x));

  // 막대 밝기를 그레이스케일로 출력 (알파 = 1.0으로 불투명)
  fragColor = vec4(vec3(bar), 1.0f);
}
