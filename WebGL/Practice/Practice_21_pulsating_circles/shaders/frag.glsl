#version 300 es
precision highp float;

uniform vec2 u_resolution;
uniform float u_time;

out vec4 fragColor;

void main() {
  vec2 st = gl_FragCoord.xy / u_resolution;
  float gridCount = 6.0f;

  vec2 cell = floor(st * gridCount);
  vec2 grid = fract(st * gridCount) - 0.5f;
  float phase = sin(u_time * 2.0f + cell.x * 0.5f + cell.y * 0.8f);
  float radius = 0.1f + 0.2f * (phase * 0.5f + 0.5f);
  float circle = 1.0f - step(radius, length(grid));

  vec3 color = vec3(0.5f + 0.5f * sin(u_time + cell.x), 0.5f + 0.5f * cos(u_time + cell.y), 0.5f + 0.5f * sin(u_time * 1.3f));

  fragColor = vec4(color * circle, 1.0f);
}