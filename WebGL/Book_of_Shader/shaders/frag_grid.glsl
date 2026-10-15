#version 300 es
precision highp float;

uniform vec2 u_resolution;

out vec4 fragColor;

vec3 pattern_grid(vec2 st) {
    float gridCount = 10.0;
    vec2 grid = fract(st * gridCount);
    float border = step(0.95, grid.x) + step(0.95, grid.y);
    return vec3(border);
}

void main() {
    vec2 st = gl_FragCoord.xy / u_resolution;
    fragColor = vec4(pattern_grid(st), 1.0);
}
