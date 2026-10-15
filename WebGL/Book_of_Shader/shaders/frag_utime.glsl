#version 300 es
precision highp float;

uniform vec2 u_resolution;
uniform float u_time;

out vec4 fragColor;

void main(void){
  vec2 pos = gl_FragCoord.xy / u_resolution;
  fragColor = vec4(pos.x, pos.y, 0.0, 1.0);
}