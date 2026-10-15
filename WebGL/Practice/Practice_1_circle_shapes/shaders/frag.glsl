#version 300 es
precision highp float;

uniform vec2 u_resolution;
out vec4 outColor;

// Perlin noise 함수 (2D gradient noise)
float perlinNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);

    float n00 = fract(sin(dot(i, vec2(12.9898, 78.233))) * 43758.5453);
    float n10 = fract(sin(dot(i + vec2(1.0, 0.0), vec2(12.9898, 78.233))) * 43758.5453);
    float n01 = fract(sin(dot(i + vec2(0.0, 1.0), vec2(12.9898, 78.233))) * 43758.5453);
    float n11 = fract(sin(dot(i + vec2(1.0, 1.0), vec2(12.9898, 78.233))) * 43758.5453);

    float nx0 = mix(n00, n10, f.x);
    float nx1 = mix(n01, n11, f.x);
    return mix(nx0, nx1, f.y) * 2.0 - 1.0;
}

float circleSDF(vec2 p, float radius) {
    return length(p) - radius;
}

float undulatingCircle(vec2 p, float radius, float frequency, float amplitude) {
    float angle = atan(p.y, p.x);
    float len = length(p);
    float variedRadius = radius + sin(angle * frequency) * amplitude;
    return len - variedRadius;
}

float complexOrganic(vec2 p, float radius) {
    float angle = atan(p.y, p.x);
    float len = length(p);
    float variation = sin(angle * 2.0) * 0.1 +
                      sin(angle * 4.0) * 0.07 +
                      sin(angle * 8.0) * 0.1;
    float variedRadius = radius + variation;
    return len - variedRadius;
}

float noisyOrganic(vec2 p, float radius) {
    float angle = atan(p.y, p.x);
    float len = length(p);
    float noise = perlinNoise(vec2(angle * 3.0, len * 0.1));
    float variedRadius = radius + noise * 0.1;
    return len - variedRadius;
}

void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution * 2.0 - 1.0;
    uv.x *= u_resolution.x / u_resolution.y;

    vec2 p = vec2(0.0);
    float dist = 0.0;

    if (uv.x < 0.0 && uv.y > 0.0) {
        p = uv - vec2(-0.5, 0.5);
        dist = circleSDF(p, 0.3);
    }
    else if (uv.x > 0.0 && uv.y > 0.0) {
        p = uv - vec2(0.5, 0.5);
        dist = undulatingCircle(p, 0.3, 9.0, 0.05);
    }
    else if (uv.x < 0.0 && uv.y < 0.0) {
        p = uv - vec2(-0.5, -0.5);
        dist = complexOrganic(p, 0.3);
    }
    else {
        p = uv - vec2(0.5, -0.5);
        dist = noisyOrganic(p, 0.3);
    }

    float fill = smoothstep(fwidth(dist), -fwidth(dist), dist);

    if (fill < 0.01) discard;

    vec3 color = mix(vec3(0.0), vec3(0.85, 0.87, 0.91), fill);
    outColor = vec4(color, 1.0);
}
