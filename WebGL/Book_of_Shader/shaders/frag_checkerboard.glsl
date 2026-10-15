#version 300 es
precision highp float;

uniform vec2 u_resolution;

out vec4 fragColor;

vec3 pattern_checkerboard(vec2 st) {
    float gridCount = 8.0;
    vec2 cell = floor(st * gridCount);
    float checker = mod(cell.x + cell.y, 2.0);
    return vec3(checker);
}

void main() {
    vec2 st = gl_FragCoord.xy / u_resolution;
    fragColor = vec4(pattern_checkerboard(st), 1.0);
}
