#version 300 es
precision mediump float;

uniform vec2 u_resolution;

out vec4 fragColor;

float plot(vec2 st, float yPos) {
  return smoothstep(yPos - 0.02f, yPos, st.y) -
    smoothstep(yPos, yPos + 0.02f, st.y);
}

void main() {
  vec2 st = gl_FragCoord.xy / u_resolution;
  float y = step(0.5f, st.x);
  vec3 color = vec3(y);

  float mask = plot(st, y);
  color = (1.0f - mask) * color + mask * vec3(0.0f, 1.0f, 0.0f);
  fragColor = vec4(color, 1.0f);
}