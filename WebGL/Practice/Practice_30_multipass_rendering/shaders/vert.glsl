#version 300 es

layout(location = 0) in vec2 a_position;

uniform vec2 u_resolution;
uniform float u_time;
uniform vec2 u_mouse;

out vec2 v_uv;

void main(void) {
  gl_Position = vec4(a_position, 0.0, 1.0);
  v_uv = (a_position + 1.0) * 0.5;
}
