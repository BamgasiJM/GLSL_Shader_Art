#version 300 es
precision mediump float;

uniform vec2 u_resolution;
uniform vec2 u_mouse;

out vec4 fragColor;

void main() {
  vec2 st = gl_FragCoord.xy / u_resolution;
  vec2 mouse = u_mouse / u_resolution;
  float stepColor = step(mouse.x, st.x);

  fragColor = vec4(vec3(stepColor), 1.0f);
}