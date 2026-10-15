#version 300 es
precision highp float;

uniform vec2 u_resolution;
uniform float u_time;

out vec4 fragColor;

void main() {
    // 정규화된 좌표 (0.0 ~ 1.0)
    vec2 uv = gl_FragCoord.xy / u_resolution;

    // 시간에 따라 변하는 색상
    vec3 color = vec3(
        0.5 + 0.5 * sin(u_time),
        0.5 + 0.5 * sin(u_time + 2.0),
        0.5 + 0.5 * sin(u_time + 4.0)
    );

    fragColor = vec4(color, 1.0);
}
