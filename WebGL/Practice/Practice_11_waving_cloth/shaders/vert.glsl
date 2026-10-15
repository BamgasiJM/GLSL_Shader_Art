#version 300 es

// [a_: 정점마다 전달되는 데이터]
in vec2 a_position;
in vec2 a_uv;

// [v_: 프래그먼트 셰이더로 보간하여 전달]
out vec2 v_uv;
out float v_elevation; // 주름의 높낮이를 프래그먼트로 전달하여 명암 계산용

// [u_: 모든 정점에 동일하게 전달되는 값]
uniform float u_time;
uniform mat4 u_projection;
uniform mat4 u_view;

void main() {
    v_uv = a_uv;

    vec3 pos = vec3(a_position, 0.0);

    // 천이 흔들리는 듯한 복합 파동 효과 (여러 파장을 중첩)
    float wave1 = sin(pos.x * 4.0 + u_time * 1.5) * 0.1;
    float wave2 = cos(pos.y * 3.0 + u_time * 1.2) * 0.1;
    float wave3 = sin((pos.x + pos.y) * 2.0 + u_time * 0.8) * 0.05;

    float elevation = wave1 + wave2 + wave3;

    // Z축으로 높낮이를 주어 3D 입체감 부여
    pos.z += elevation;

    // 프래그먼트 셰이더로 높낮이 정보 전달
    v_elevation = elevation;

    gl_Position = u_projection * u_view * vec4(pos, 1.0);
}