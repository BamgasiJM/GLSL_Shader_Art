#version 300 es

precision mediump float;

uniform vec2 u_resolution;
uniform float u_time;
uniform vec2 u_mouse;

out vec4 color;

void main() {
  color = vec4(0.0, 0.0, 0.0, 1.0);
}
