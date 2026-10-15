#version 300 es
precision highp float;

uniform vec2 u_resolution;
uniform float u_time;

out vec4 fragColor;

vec3 pattern_pulsing_grid(vec2 st, float time) {
    float gridCount = 6.0;
    vec2 cell = floor(st * gridCount);
    vec2 grid = fract(st * gridCount) - 0.5;

    float phase = sin(time * 2.0 + cell.x * 0.5 + cell.y * 0.8);
    float radius = 0.1 + 0.2 * (phase * 0.5 + 0.5);
    float circle = 1.0 - step(radius, length(grid));

    vec3 color = vec3(
        0.5 + 0.5 * sin(time + cell.x),
        0.5 + 0.5 * cos(time + cell.y),
        0.5 + 0.5 * sin(time * 1.3)
    );
    return color * circle;
}

void main() {
    vec2 st = gl_FragCoord.xy / u_resolution;
    fragColor = vec4(pattern_pulsing_grid(st, u_time), 1.0);
}
