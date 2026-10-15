#version 300 es

// in: JS에서 버퍼로 넘겨준 데이터를 받는 키워드 (attribute를 줄여서 a_)
// a_position은 보통 -1.0 ~ 1.0 범위로 들어오며, 이를 0.0 ~ 1.0 범위로 변환하여 gl_Position에 할당.
in vec2 a_position;

// out: vs에서 fs로 데이터를 넘기기 위한 키워드 (varying을 줄여서 v_)
// v_uv: 프래그먼트 셰이더에 텍스처 좌표를 넘기기 위한 변수. 범위는 0.0 ~ 1.0
out vec2 v_uv;

void main() {
    // gl_Position: 버텍스 셰이더는 반드시 이 내장 변수에 좌표를 할당해야 함.
    gl_Position = vec4(a_position, 0.0, 1.0);

    // -1.0 ~ 1.0 범위를 0.0 ~ 1.0 범위로 변환하여 프래그먼트 셰이더에 넘깁니다.
    v_uv = a_position * 0.5 + 0.5;
}
