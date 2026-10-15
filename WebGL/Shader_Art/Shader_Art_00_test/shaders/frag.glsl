#version 300 es
precision highp float;

uniform vec2 u_resolution;

out vec4 fragColor;

void main() {
  vec2 st = gl_FragCoord.xy / u_resolution;
  float gridCount = 10.0;
  vec2 grid = fract(st * gridCount);
  float border = step(0.95, grid.x) + step(0.95, grid.y);
  fragColor = vec4(vec3(border), 1.0);
}