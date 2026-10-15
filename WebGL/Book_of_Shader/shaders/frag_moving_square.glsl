#version 300 es
precision highp float;

uniform vec2 u_resolution;
uniform float u_time;

out vec4 fragColor;

float box(vec2 st, vec2 center, vec2 size) {
    vec2 halfSize = size * 0.5;
    vec2 edge = smoothstep(halfSize, halfSize - 0.01, abs(st - center));
    return edge.x * edge.y;
}

void main() {
    vec2 st = gl_FragCoord.xy / u_resolution;

    vec2 centerA = vec2(
        0.5 + 0.28 * sin(u_time * 2.0),
        0.5 + 0.28 * sin(u_time * 3.0)
    );
    vec2 centerB = vec2(
        0.5 + 0.28 * sin(u_time * 3.0 + 1.57),
        0.5 + 0.28 * sin(u_time * 2.0)
    );

    float squareA = box(st, centerA, vec2(0.09));
    float squareB = box(st, centerB, vec2(0.09));
    float guideA = 0.003 / max(distance(st, centerA), 0.003);
    float guideB = 0.003 / max(distance(st, centerB), 0.003);

    vec3 background = vec3(0.08, 0.06, 0.10);
    vec3 color = background;
    color += vec3(1.0, 0.48, 0.16) * squareA;
    color += vec3(0.18, 0.72, 1.0) * squareB;
    color += vec3(0.25, 0.18, 0.10) * guideA;
    color += vec3(0.08, 0.16, 0.26) * guideB;

    fragColor = vec4(color, 1.0);
}
