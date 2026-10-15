#version 300 es

precision highp float;

uniform vec2 u_resolution;
uniform float u_time;
uniform vec2 u_mouse;

out vec4 outColor;

void main(void) {
  outColor = vec4(0.1, 0.7, 0.7, 1.0);
}
