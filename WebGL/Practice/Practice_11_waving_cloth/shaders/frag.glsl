#version 300 es
precision highp float;

// [v_: 정점 셰이더로부터 보간되어 전달됨]
in vec2 v_uv;
in float v_elevation;

// [u_: 균일 변수]
uniform float u_time;

// [out: 최종 색상]
out vec4 fragColor;

void main() {
    // 1. 천의 미세한 직조 질감 (선택 사항, 너무 강하면 눈이 아플 수 있어 약하게 설정)
    float texturePattern = sin(v_uv.x * 60.0) * cos(v_uv.y * 60.0);
    float baseColor = texturePattern * 0.1 + 0.5; // 은은한 기본 명암

    // 2. 파동에 따른 명암 (Elevation 기반 라이팅)
    // elevation이 높으면(+) 밝게, 낮으면(-) 어둡게
    float lighting = v_elevation * 2.0; // 명암 대비 강도 조절

    // 3. 최종 밝기 계산 (0.0 ~ 1.0 범위로 클램핑)
    float finalBrightness = clamp(baseColor + lighting, 0.0, 1.0);

    // 4. 천 색상 설정 (푸른빛이 도는 차가운 회색)
    vec3 clothColor = vec3(finalBrightness) * vec3(0.85, 0.9, 1.0);

    fragColor = vec4(clothColor, 1.0);
}