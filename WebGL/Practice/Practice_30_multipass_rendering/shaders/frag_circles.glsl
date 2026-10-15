#version 300 es
precision mediump float;

in vec2 v_uv;

uniform float u_time;

out vec4 fragColor;

float random(vec2 p) {
  return fract(sin(dot(p, vec2(127.1f, 311.7f))) * 43758.5453123f);
}

void main() {
  vec2 uv = v_uv;

  float gridSize = 15.0f;
  vec2 gridPos = floor(uv * gridSize);
  vec2 cellUv = fract(uv * gridSize);

  float speed = 0.2f + random(gridPos) * 2.0f;
  float maxSize = 0.1f + random(gridPos + vec2(1.0f)) * 0.2f;
  float size = abs(sin(u_time * speed)) * maxSize;

  float dist = distance(cellUv, vec2(0.5f));
  float circles = 1.0f - smoothstep(size, size + 0.1f, dist); // 경계선 부드럽게

  fragColor = vec4(vec3(1.0f), circles);
}
