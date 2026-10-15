#version 300 es
precision highp float;

uniform vec2 u_resolution;
uniform vec2 u_mouse;

out vec4 fragColor;

void main() {
  // 1. 픽셀 좌표와 마우스 좌표를 동일한 정규화 좌표계로 변환
  vec2 st = (gl_FragCoord.xy * 2.0 - u_resolution) / min(u_resolution.x, u_resolution.y);
  vec2 mouse = (u_mouse * 2.0 - u_resolution) / min(u_resolution.x, u_resolution.y);

  // 2. 마우스 위치(u_mouse)를 활용한 인터랙션
  // 마우스 위치에서 현재 픽셀까지의 거리 계산
  float dist = length(st - mouse);

  // 거리가 가까울수록 밝게 빛나는 광원 효과
  float glow = 0.05 / dist;
  vec3 color = vec3(1.0f) * glow * 0.3;

  fragColor = vec4(color, 1.0);
}