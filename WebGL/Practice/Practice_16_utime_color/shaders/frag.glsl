#version 300 es
precision highp float;

uniform float u_time;

out vec4 fragColor;

void main(){
  fragColor = vec4(abs(sin(u_time)), 0.7, 0.7, 1.0);
}