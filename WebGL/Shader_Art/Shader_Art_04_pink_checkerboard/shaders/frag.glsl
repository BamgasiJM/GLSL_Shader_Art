#version 300 es

precision mediump float;

// 최종 출력 색상 변수 (RGBA)
out vec4 fragColor;

// 외부에서 전달되는 유니폼 변수
uniform float u_time;        // 경과 시간 (초 단위)
uniform vec2 u_resolution;   // 화면/캔버스 해상도 (너비, 높이)

void main() {
    // 픽셀 좌표를 [0.0, 1.0] 범위의 정규화된 텍스처 좌표(UV)로 변환
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;

    // 그리드의 가로/세로 칸 수 정의 (10x10 그리드)
  float N = 10.0f;

    // UV 좌표를 N배 확장하여 그리드 좌표계 생성
  vec2 gridUV = uv * N;

    // 현재 픽셀이 속한 격자 Cell의 인덱스 (정수 단위 [0, N-1])
  vec2 cell = floor(gridUV);

    // 각 Cell 내부의 지역 좌표계를 [-1.0, 1.0] 범위로 정규화 (중심이 0.0)
  vec2 localUV = fract(gridUV) * 2.0f - 1.0f;

    // 맨해튼 거리를 이용한 다이아몬드(마름모) 형태 거리 계산
  float diamond = abs(localUV.x) + abs(localUV.y);

    // 각 Cell별 고유 1차원 인덱스 계산 (0 ~ N*N-1)
  float idx = cell.x * N + cell.y;
  float total = N * N; // 전체 Cell 개수 (100개)

    // Cell 인덱스 기반의 위상(Phase) Offset 계산 ([0, 2*PI] 범위)
  float phase = idx / total * 6.2832f;

    // 시간에 따라 변화하는 파동 값 계산 (sin 함수 사용)
  float pulse = 0.5f + 1.0f * sin(u_time * 1.5f - phase);

    // 파동 값에 맞춰 동적으로 변경되는 마름모의 최대 반지름 계산
  float maxRadius = 0.65f + 0.25f * pulse;

    // 안티앨리어싱(경계 완화) 처리를 위한 임계 폭 설정
  float antialias = 0.02f;

    // smoothstep을 이용해 마름모 경계를 부드럽게 처리하고 Alpha 값 생성
  float alpha = 1.0f - smoothstep(maxRadius - antialias, maxRadius + antialias, diamond);

    // 마름모의 기본 색상 지정 (분홍색 계열)
  vec3 color = vec3(0.98f, 0.42f, 0.76f);

    // 알파값을 곱한 최종 색상 출력 (검은색 배경 위 합성)
  fragColor = vec4(color * alpha, 1.0f);
}