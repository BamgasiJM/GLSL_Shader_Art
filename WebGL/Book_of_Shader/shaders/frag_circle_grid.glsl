#version 300 es
precision highp float;

uniform vec2 u_resolution;

out vec4 fragColor;

vec3 pattern_circle_grid(vec2 st) {
    float gridCount = 5.0;
    vec2 grid = fract(st * gridCount) - 0.5;
    float circle = 1.0 - step(0.3, length(grid));
    return vec3(circle);
}

void main() {
    vec2 st = gl_FragCoord.xy / u_resolution;
    fragColor = vec4(pattern_circle_grid(st), 1.0);
}
