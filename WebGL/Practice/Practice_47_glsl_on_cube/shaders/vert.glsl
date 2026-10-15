#version 300 es

precision highp float;

in vec3 a_position;
in vec3 a_normal;

uniform mat4 u_modelMatrix;
uniform mat4 u_viewMatrix;
uniform mat4 u_projectionMatrix;
uniform vec2 u_resolution;
uniform float u_time;
uniform vec2 u_mouse;

out vec3 v_normal;
out vec3 v_localPos;

void main() {
  v_localPos = a_position;
  v_normal = a_normal;
  gl_Position = u_projectionMatrix * u_viewMatrix * u_modelMatrix * vec4(a_position, 1.0);
}
