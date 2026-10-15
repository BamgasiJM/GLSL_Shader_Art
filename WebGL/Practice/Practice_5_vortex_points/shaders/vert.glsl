#version 300 es

precision mediump float;

layout(location = 0) in float vertexIndex;

uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_mouse;

void main(void) {
  float idx = vertexIndex;

  float angle = idx * 0.3;
  float radius = 0.3 + sin(idx * 0.01) * 0.55;

  float heightOffset = u_time * 0.05;
  float rotationSpeed = u_time * 0.2;

  float finalAngle = angle + rotationSpeed;
  float height = mod(idx * 0.005 + heightOffset, 2.0) - 1.0;

  float x = radius * cos(finalAngle);
  float y = height;
  float z = radius * sin(finalAngle);

  gl_Position = vec4(x, y, z * 0.5, 1.0);
  gl_PointSize = 3.0;
}
