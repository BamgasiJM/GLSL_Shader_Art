#version 300 es
precision highp float;

uniform float u_time;
uniform vec2 u_resolution;

out vec4 fragColor;

// Cosine Palette
vec3 palette(float t) {
  vec3 a = vec3(0.5f, 0.5f, 0.5f);
  vec3 b = vec3(0.5f, 0.5f, 0.5f);
  vec3 c = vec3(1.0f, 1.0f, 1.0f);
  vec3 d = vec3(0.263f, 0.416f, 0.557f);
  return a + b * cos(6.28318f * (c * t + d));
}

// SDF - Circle
float sdCircle(vec2 p, float r) {
  return length(p) - r;
}

// SDF - Box
float sdBox(vec2 p, vec2 b) {
  vec2 d = abs(p) - b;
  return length(max(d, 0.0f)) + min(max(d.x, d.y), 0.0f);
}

// SDF - Hexagon
float sdHexagon(vec2 p, float r) {
  const vec3 k = vec3(-0.8660254f, 0.5f, 0.57735027f);
  p = abs(p);
  p -= 2.0f * min(dot(k.xy, p), 0.0f) * k.xy;
  p -= vec2(clamp(p.x, -k.z * r, k.z * r), r);
  return length(p) * sign(p.y);
}

// Fractal Tiling
vec2 fractalTiling(vec2 p, float zoom, float time) {
  float scale = 1.0f;
  float angle = time * 0.1f;
  mat2 rot = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));

  for(int i = 0; i < 4; i++) {
    p = abs(p);
    p = rot * p;
    p -= zoom * scale;
    scale *= 0.5f;
  }
  return p;
}

// Smooth minimum for blending SDFs
float smin(float a, float b, float k) {
  float h = clamp(0.5f + 0.5f * (b - a) / k, 0.0f, 1.0f);
  return mix(b, a, h) - k * h * (1.0f - h);
}

void main() {
  vec2 uv = (gl_FragCoord.xy * 2.0f - u_resolution.xy) / min(u_resolution.x, u_resolution.y);

    // Fractal tiling transformation
  vec2 p = fractalTiling(uv, 0.5f, u_time);

    // Animated parameters
  float t = u_time * 0.5f;
  float scale = 1.0f + 0.3f * sin(t);

    // Multiple SDF shapes with animation
  float d1 = sdCircle(p * scale, 0.3f + 0.1f * sin(t * 2.0f));
  float d2 = sdBox(p * scale * 1.2f + vec2(0.2f * cos(t), 0.2f * sin(t)), vec2(0.25f, 0.25f));
  float d3 = sdHexagon(p * scale * 0.8f - vec2(0.15f * sin(t * 1.5f), 0.15f * cos(t * 1.5f)), 0.2f);

    // Blend shapes
  float d = smin(d1, d2, 0.2f);
  d = smin(d, d3, 0.15f);

    // Create pattern from distance field
  float pattern = sin(d * 10.0f - t * 3.0f) * 0.5f + 0.5f;

    // Cosine palette coloring
  float colorIndex = pattern + t * 0.2f + length(uv) * 0.3f;
  vec3 col = palette(colorIndex);

    // Glow effect based on distance
  float glow = 0.02f / abs(d);
  col += palette(t * 0.3f + 0.5f) * glow * 0.5f;

    // Add some grain/structure
  col += 0.05f * sin(d * 50.0f + t * 5.0f) * palette(t * 0.1f);

    // Vignette
  float vignette = 1.0f - smoothstep(0.5f, 1.5f, length(uv));
  col *= vignette;

  fragColor = vec4(col, 1.0f);
}