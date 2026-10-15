#version 300 es
layout(location = 0) in vec3 a_position;
layout(location = 1) in vec3 a_normal;
layout(location = 2) in vec2 a_uv;

uniform mat4 u_projection;
uniform mat4 u_view;
uniform mat4 u_model;
uniform float u_time;

out vec3 v_normal;
out vec3 v_position;
out vec2 v_uv;

void main() {
    // 1. 절차적 변형 (Sine Wave): UV 좌표를 활용해 반지름을 조절
    // 파동의 높이를 계산하여 정점의 위치를 미세하게 이동시킴
    float displacement = sin(a_position.x * 5.0 + u_time) *
                         sin(a_position.y * 5.0 + u_time) *
                         sin(a_position.z * 5.0 + u_time) * 0.3;

    vec3 displacedPosition = a_position + normalize(a_position) * displacement;

    // 2. 좌표 변환
    vec4 worldPosition = u_model * vec4(displacedPosition, 1.0);
    v_position = worldPosition.xyz;
    v_normal = mat3(u_model) * a_normal; // 법선 벡터 변환
    v_uv = a_uv;

    gl_Position = u_projection * u_view * worldPosition;
}
