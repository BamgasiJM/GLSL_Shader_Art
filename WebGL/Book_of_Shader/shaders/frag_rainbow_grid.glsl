#version 300 es
precision highp float;

uniform vec2 u_resolution;

out vec4 fragColor;

vec3 pattern_rainbow_grid(vec2 st) {
    float gridCount = 5.0;
    vec2 cell = floor(st * gridCount);
    vec3 color = vec3(
        fract((cell.x + cell.y) * 0.3),
        fract(cell.x * 0.2 + cell.y * 0.5),
        fract(cell.x * 0.5 + cell.y * 0.2)
    );
    return color;
}

void main() {
    vec2 st = gl_FragCoord.xy / u_resolution;
    fragColor = vec4(pattern_rainbow_grid(st), 1.0);
}
