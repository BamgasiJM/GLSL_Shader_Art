#version 300 es

precision highp float;

in vec2 a_position;

uniform vec2 u_resolution;
uniform float u_time;

void main() {
  gl_Position = vec4(a_position.x, a_position.y, 0.0f, 1.0f);
}
