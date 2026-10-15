#version 300 es
precision highp float;

uniform vec2 u_resolution;

out vec4 fragColor;

void main() {
  vec2 st = gl_FragCoord.xy / u_resolution;

  float gridCount = 8.0f;

  // 각 셀의 인덱스 (정수 부분)
  vec2 cell = floor(st * gridCount);

  // 셀 인덱스의 합이 짝수면 0, 홀수면 1 -> BLACK / WHITE로 사용됨.
  float checker = mod(cell.x + cell.y, 2.0f);

  fragColor = vec4(vec3(checker), 1.0f);

}

// ┌─────────────────────────────────────┐
// │  st (0~1)                           │
// │    │                                │
// │    ▼                                │
// │  st * gridCount  →  (0~10)          │
// │    │                                │
// │    ▼                                │
// │  ┌─────┬─────┬─────┐                │
// │  │ 0,0 │ 1,0 │ 2,0 │  ← floor()     │
// │  ├─────┼─────┼─────┤    = 셀 인덱스  │
// │  │ 0,1 │ 1,1 │ 2,1 │                │
// │  └─────┴─────┴─────┘                │
// │    │                                │
// │    ▼                                │
// │  fract() → 각 셀 내부 좌표 (0~1)      │
// └─────────────────────────────────────┘
// | 함수              | 쓰임                      |
// | --------------- | ----------------------- |
// | `floor(st * n)` | **어느 셀에 속하는지** (셀 인덱스)  |
// | `fract(st * n)` | **셀 내부에서의 상대 위치** (0~1) |
