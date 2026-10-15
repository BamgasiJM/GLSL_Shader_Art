#version 300 es

layout(location = 0) in vec2 a_position;
layout(location = 1) in float a_vertexId;

uniform vec2 u_resolution;
uniform float u_time;
uniform vec2 u_mouse;

void main(void) {
  vec2 pos = a_position;
  float amplitude = 0.08;

  // 각 정점마다 다른 위상으로 움직임
  int id = int(a_vertexId);
  float phase = float(id) * 1.047; // 60도씩 위상 차이
  float offset = amplitude * sin(u_time + phase);

  // 정점을 원점에서 바깥쪽으로 밀어냄
  pos += normalize(a_position) * offset;

  gl_Position = vec4(pos, 0.0, 1.0);
}
