#version 300 es
precision highp float;

uniform vec2 u_resolution;

out vec4 fragColor;

void main() {
  vec2 st = gl_FragCoord.xy / u_resolution;
  float gridCount = 4.0f;
  vec2 grid = fract(st * gridCount);

  float borderX = smoothstep(0.0f, 0.25f, grid.x) * (1.0f - smoothstep(0.75f, 1.0f, grid.x));
  float borderY = smoothstep(0.0f, 0.25f, grid.y) * (1.0f - smoothstep(0.75f, 1.0f, grid.y));
  float border = 1.0f - borderX * borderY;

  fragColor = vec4(vec3(border), 1.0f);

}