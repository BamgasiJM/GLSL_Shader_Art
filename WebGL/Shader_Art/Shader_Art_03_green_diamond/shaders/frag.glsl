#version 300 es

precision mediump float;

uniform float u_time;
uniform vec2 u_resolution;

out vec4 FragColor;

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution.xy * 2.0f - 1.0f; // Normalize to [-1, 1]
  float radius = abs(uv.x) + abs(uv.y);
  float maxRadius = 0.0f + 1.0f * abs(sin(u_time * 0.5)); // Pulsing radius over time

    // Calculate the color based on distance from center
  if(radius <= maxRadius) {
    FragColor = vec4(0.26, 1.0f, 0.73f, 1.0f);
  } else {
    FragColor = vec4(0.15f, 0.15f, 0.19f, 1.0f);
  }
}
