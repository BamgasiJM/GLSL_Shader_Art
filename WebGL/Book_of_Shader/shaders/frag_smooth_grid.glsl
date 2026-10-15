#version 300 es
precision highp float;

uniform vec2 u_resolution;

out vec4 fragColor;

vec3 pattern_smooth_grid(vec2 st) {
    float gridCount = 4.0;
    vec2 grid = fract(st * gridCount);
    float borderX = smoothstep(0.0, 0.3, grid.x) * (1.0 - smoothstep(0.7, 1.0, grid.x));
    float borderY = smoothstep(0.0, 0.3, grid.y) * (1.0 - smoothstep(0.7, 1.0, grid.y));
    float border = 1.0 - borderX * borderY;
    return vec3(border);
}

void main() {
    vec2 st = gl_FragCoord.xy / u_resolution;
    fragColor = vec4(pattern_smooth_grid(st), 1.0);
}
