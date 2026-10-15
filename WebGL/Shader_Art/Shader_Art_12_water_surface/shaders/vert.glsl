#version 300 es
precision highp float;

in vec2 a_position;
out vec2 v_texCoord;

void main() {
  v_texCoord = a_position * 0.5f + 0.5f;
  gl_Position = vec4(a_position, 0.0f, 1.0f);
}