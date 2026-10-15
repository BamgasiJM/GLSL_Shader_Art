#version 300 es
precision highp float;

uniform vec2 u_resolution;

out vec4 fragColor;

vec3 pattern_diamond(vec2 st) {
    float gridCount = 8.0;
    vec2 rotated = vec2(st.x + st.y, st.x - st.y) * 0.5;
    vec2 cell = floor(rotated * gridCount);
    float diamond = mod(cell.x + cell.y, 2.0);
    return vec3(diamond);
}

void main() {
    vec2 st = gl_FragCoord.xy / u_resolution;
    fragColor = vec4(pattern_diamond(st), 1.0);
}
