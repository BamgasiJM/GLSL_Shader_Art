#version 300 es

precision mediump float;

uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_mouse;

out vec4 outColor;

void main(void) {
  float hue = mod(u_time * 0.3, 1.0);
  vec3 color = vec3(
    0.5 + 0.5 * sin(hue * 6.28),
    0.5 + 0.5 * sin(hue * 6.28 + 2.0),
    0.5 + 0.5 * sin(hue * 6.28 + 4.0)
  );

  vec2 coord = gl_PointCoord - 0.5;
  float dist = length(coord);
  float alpha = 1.0 - smoothstep(0.0, 0.5, dist);

  outColor = vec4(color, alpha);
}
