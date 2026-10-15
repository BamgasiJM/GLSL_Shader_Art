#version 300 es

precision mediump float;

uniform vec2 u_resolution;
uniform float u_time;
uniform vec2 u_mouse;

out vec4 outColor;

void main() {
  outColor = vec4(1.0, 0.5, 0.0, 1.0);
}
