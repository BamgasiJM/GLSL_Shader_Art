#version 300 es
precision mediump float;

in vec2 v_uv;

uniform float u_time;

out vec4 fragColor;

void main() {
  vec2 uv = v_uv;

  float wave = sin(uv.x * 3.0f + u_time * 1.3f) * cos(uv.y * 3.0f + u_time * 1.3f);
  float gradient = smoothstep(0.0f, 0.2f, uv.y);

  float value = 0.3f + wave * 0.4f + gradient * 0.5f;

  fragColor = vec4(value, 0.6, 0.8, 1.0f);
}
