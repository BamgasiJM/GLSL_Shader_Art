#version 300 es

precision highp float;

in vec3 v_normal;
in vec3 v_localPos;

uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_mouse;

out vec4 fragColor;

void main() {
  vec3 absNormal = abs(v_normal);
  vec3 faceCoord;

  if (absNormal.x > absNormal.y && absNormal.x > absNormal.z) {
    faceCoord = vec3(v_localPos.y, v_localPos.z, 0.0);
  } else if (absNormal.y > absNormal.x && absNormal.y > absNormal.z) {
    faceCoord = vec3(v_localPos.x, v_localPos.z, 0.0);
  } else {
    faceCoord = vec3(v_localPos.x, v_localPos.y, 0.0);
  }

  float dist = length(faceCoord.xy);
  float wave = sin(dist * 8.0 - u_time * 3.0) * 0.5 + 0.5;
  float attenuation = 1.0 - smoothstep(0.0, 0.7, dist);
  wave = mix(0.5, wave, attenuation);

  fragColor = vec4(vec3(wave), 1.0);
}
