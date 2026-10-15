#version 300 es
precision mediump float;

uniform vec2 u_resolution;
uniform vec2 u_mouse;

out vec4 fragColor;

void main() {
  // gl_FragCoord: 현재 픽셀 좌표(0,0 ~ 해상도). u_resolution으로 나눠 [0,1] 정규화 좌표로 변환
  vec2 st = gl_FragCoord.xy / u_resolution;
  // 마우스 좌표도 해상도로 나눠 [0,1] 범위의 정규화 좌표로 변환
  vec2 mouse = u_mouse / u_resolution;

  // 그래디언트 밴드(전환 영역)의 절반 폭. 고정값 0.3 사용
  float bandWidth = 0.3;
  // 아래 주석을 해제하면 마우스 세로 위치에 따라 밴드 폭이 0.05 ~ 0.5 범위로 변한다.
  // float bandWidth = 0.05 + mouse.y * 0.45;
  // 그래디언트 전환 영역은 마우스 위치를 따라다닌다.
  // - mouse.x: 그래디언트 밴드의 중심 위치
  // - mouse.y: 밴드의 폭을 조절 (위로 갈수록 넓어짐)

  // 밴드의 왼쪽 경계(시작 지점): 마우스 중심에서 반쪽 폭만큼 왼쪽
  float edge0 = mouse.x - bandWidth;
  // 밴드의 오른쪽 경계(끝 지점): 마우스 중심에서 반쪽 폭만큼 오른쪽
  float edge1 = mouse.x + bandWidth;

  // smoothstep(edge0, edge1, st.x):
  // st.x가 edge0 이하이면 0, edge1 이상이면 1,
  // 사이 구간에서는 부드럽게(3차 곡선) 0→1로 보간된 값을 반환한다.
  float stepColor = smoothstep(edge0, edge1, st.x);

  // 계산된 값을 그레이스케일 밝기로 사용해 출력 (알파 = 1.0으로 완전 불투명)
  fragColor = vec4(vec3(stepColor), 1.0);
}
