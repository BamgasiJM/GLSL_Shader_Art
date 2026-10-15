#version 300 es
precision highp float;

// 유니폼 변수
uniform vec2 u_resolution;
uniform vec2 u_mousePos;
uniform vec2 u_mouseVel;
uniform sampler2D u_velocityTexture;

// 시뮬레이션 파라미터 (조정 가능)
uniform float u_dissipation;    // 속도 감쇠율 (매 프레임)
uniform float u_advectScale;    // 자기 이송 강도
uniform float u_splatRadius;    // 마우스 스플랫 반경
uniform float u_splatStrength;  // 마우스 속도 → 유체 속도 스케일

// 출력: RG 채널에 속도(velocity) 저장
out vec4 fragColor;

void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution;
    vec2 texel = 1.0 / u_resolution;

    // ----------------------------------------
    // 자기 이송(self-advection): 현재 속도장을 따라 이전 속도를 역추적
    // ----------------------------------------
    vec2 currentVel = texture(u_velocityTexture, uv).rg;
    vec2 backtraceUV = uv - currentVel * texel * u_advectScale;
    vec2 vel = texture(u_velocityTexture, backtraceUV).rg;

    // 감쇠 (시간이 지나면 서서히 정지)
    vel *= u_dissipation;

    // ----------------------------------------
    // 마우스 이동 속도를 스플랫으로 주입
    // ----------------------------------------
    vec2 mouseUV = u_mousePos / u_resolution;
    float dist = distance(uv, mouseUV);
    float falloff = exp(-dist * dist / u_splatRadius);

    vel += u_mouseVel * falloff * u_splatStrength;

    fragColor = vec4(vel, 0.0, 1.0);
}
