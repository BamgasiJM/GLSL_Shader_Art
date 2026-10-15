#version 300 es
precision highp float;

uniform vec2 u_resolution;

out vec4 fragColor;

void main() {
  vec2 st = gl_FragCoord.xy / u_resolution;
  float gridCount = 5.0f;
  vec2 cell = floor(st * gridCount);
  vec3 color = vec3(fract((cell.x + cell.y) * 0.3f), fract(cell.x * 0.2f + cell.y * 0.5f), fract(cell.x * 0.5f + cell.y * 0.2f));

  fragColor = vec4(color, 1.0f);
}
