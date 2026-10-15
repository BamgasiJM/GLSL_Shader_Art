#version 300 es
precision mediump float;

in vec2 v_uv;

uniform sampler2D u_background;
uniform sampler2D u_circles;

out vec4 fragColor;

void main() {
  vec4 bg = texture(u_background, v_uv);
  vec4 circles = texture(u_circles, v_uv);

  vec3 color = bg.rgb;
  color = mix(color, circles.rgb, circles.a);

  fragColor = vec4(color, 1.0f);
}
