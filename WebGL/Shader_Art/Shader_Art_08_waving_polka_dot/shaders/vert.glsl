#version 300 es

in vec4 a_position;
out vec2 v_uv;

uniform float u_time;
uniform vec2 u_mouse; // 마우스 인터랙션을 위한 유니폼 추가 (선택적)

void main() {
    // 1. UV 좌표 생성
    // 버텍스 범위(-0.8 ~ 0.8)를 [0.0, 1.0] 텍스처 좌표계로 정확히 매핑
    // (-0.8 / 1.6) + 0.5 = 0.0, (0.8 / 1.6) + 0.5 = 1.0
    v_uv = (a_position.xy / 1.6) + 0.5;

    vec4 pos = a_position;

    // 2. 2차원 원형 파동(Radial Wave)을 이용한 입체적 3D 물결 계산
    // 중심점(0.0, 0.0) 또는 특정 지점으로부터의 거리를 기반으로 3D 지형 형태 구성
    float dist = length(pos.xy);

    // X, Y 복합 축 파동 계산 (시간과 거리에 따른 동심원 형태의 변형)
    float waveX = sin(pos.x * 6.0 + u_time * 2.0);
    float waveY = cos(pos.y * 6.0 + u_time * 2.0);
    float radialWave = sin(dist * 8.0 - u_time * 3.0);

    // 3. Y축 수직 출렁임 (Height Field 변형)
    // 두 파동을 중첩시켜 정복합적인 복사면 왜곡 생성
    pos.y += (waveX + waveY) * 0.05;

    // 4. 입체감(Perspective Displacement) 연산
    // 카메라 행렬 없이 2D 공간에서 입체감을 극대화하기 위해
    // Z축 깊이(Depth) 변형을 Y축 스케일 및 X축 입체 변위와 결합
    float depth = radialWave * 0.15;

    // 깊이감에 따른 Y축 추가 이동 (카메라 시점이 위에서 아래를 내려다보는 듯한 3D 효과 연출)
    pos.y += depth * 0.5;

    // Z 버퍼 깊이 전달
    pos.z = depth;

    // 5. 최종 버텍스 위치 결정
    gl_Position = pos;
}