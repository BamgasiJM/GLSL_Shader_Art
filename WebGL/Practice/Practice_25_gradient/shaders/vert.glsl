#version 300 es

layout(location = 0) in vec2 a_position;

uniform vec2 u_resolution;
uniform float u_time;
uniform vec2 u_mouse;

void main(void) {
  gl_Position = vec4(a_position, 0.0, 1.0);
}
