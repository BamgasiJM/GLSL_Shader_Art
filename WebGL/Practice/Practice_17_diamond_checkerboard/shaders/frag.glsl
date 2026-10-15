#version 300 es
precision highp float;

uniform vec2 u_resolution;

out vec4 fragColor;

void main() {
  vec2 st = gl_FragCoord.xy / u_resolution;
  float gridCount = 8.0f;

  vec2 rotated = vec2(st.x + st.y, st.x - st.y) * 0.5f;
  vec2 cell = floor(rotated * gridCount);
  float diamont = mod(cell.x + cell.y, 2.0f);

  fragColor = vec4(vec3(diamont), 1.0f);
}