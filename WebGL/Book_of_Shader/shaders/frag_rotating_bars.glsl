#version 300 es
precision highp float;

uniform vec2 u_resolution;
uniform float u_time;

out vec4 fragColor;

vec3 rotating_bars(vec2 st, float time) {
    float gridCount = 5.0;
    vec2 cell = floor(st * gridCount);
    vec2 grid = fract(st * gridCount) - 0.5;

    float angle = time * (0.5 + fract(sin(cell.x * 12.9898 + cell.y * 78.233) * 43758.5453));
    float c = cos(angle);
    float s = sin(angle);
    vec2 rotated = vec2(grid.x * c - grid.y * s, grid.x * s + grid.y * c);

    float bar = smoothstep(0.05, 0.0, abs(rotated.x));
    return vec3(bar);
}

void main() {
    vec2 st = gl_FragCoord.xy / u_resolution;
    fragColor = vec4(rotating_bars(st, u_time), 1.0);
}
