#version 300 es
precision mediump float;

uniform vec2 u_resolution;

out vec4 fragColor;

float plot(vec2 st, float pct) {
  return smoothstep(pct - 0.02f, pct, st.y) -
    smoothstep(pct, pct + 0.02f, st.y);
}

void main() {
  vec2 st = gl_FragCoord.xy / u_resolution;
  float y = pow(st.x, 5.0f);
  vec3 color = vec3(y);

  float pct = plot(st, y);
  color = (1.0f - pct) * color + pct * vec3(0.0f, 1.0f, 0.0f);

  fragColor = vec4(color, 1.0f);
}