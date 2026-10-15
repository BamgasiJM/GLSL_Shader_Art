#version 300 es
precision highp float;

uniform vec2 u_resolution;
uniform float u_time;

out vec4 fragColor;

float ring(float dist, float radius, float width) {
    return smoothstep(radius + width, radius, dist) -
        smoothstep(radius, radius - width, dist);
}

void main() {
    vec2 st = gl_FragCoord.xy / u_resolution;
    vec2 pos = st - 0.5;

    float dist = length(pos);
    float angle = atan(pos.y, pos.x);
    float wave = sin(angle * 8.0 + u_time * 2.5) * 0.025;

    float radius = 0.22 + wave;
    float outerRing = ring(dist, radius, 0.025);
    float innerRing = ring(dist, 0.10 + 0.03 * sin(u_time * 3.0), 0.018);

    float glow = 0.015 / max(abs(dist - radius), 0.015);
    float centerPulse = 1.0 - smoothstep(0.03, 0.08 + 0.02 * sin(u_time * 4.0), dist);

    vec3 background = vec3(0.04, 0.05, 0.08);
    vec3 color = background;
    color += vec3(0.10, 0.55, 1.0) * outerRing;
    color += vec3(0.95, 0.35, 0.80) * innerRing;
    color += vec3(0.05, 0.20, 0.35) * glow;
    color += vec3(1.0, 0.85, 0.45) * centerPulse;

    fragColor = vec4(color, 1.0);
}
