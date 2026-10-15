#version 300 es
precision highp float;

in vec3 v_normal;
in vec3 v_position;
in vec2 v_uv;

uniform vec3 u_lightDirection;
uniform vec3 u_viewPos;
uniform vec3 u_baseColor;

out vec4 outColor;

void main() {
    // 기본 물리값 설정
    vec3 normal = normalize(v_normal);
    vec3 lightDir = normalize(u_lightDirection);
    vec3 viewDir = normalize(u_viewPos - v_position);
    vec3 reflectDir = reflect(-lightDir, normal);

    // 1. Ambient (환경광)
    float ambientStrength = 0.2;
    vec3 ambient = ambientStrength * u_baseColor;

    // 2. Diffuse (난반사)
    float diff = max(dot(normal, lightDir), 0.3);
    vec3 diffuse = diff * u_baseColor;

    // 3. Specular (정반사 - Glossy 효과)
    float specularStrength = 0.8; // 반사광 강도
    float shininess = 16.0;      // 광택의 날카로움
    float spec = pow(max(dot(viewDir, reflectDir), 0.0), shininess);
    vec3 specular = specularStrength * spec * vec3(1.0, 1.0, 1.0);

    // 최종 색상 결합
    vec3 result = ambient + diffuse + specular;
    outColor = vec4(result, 1.0);
}
