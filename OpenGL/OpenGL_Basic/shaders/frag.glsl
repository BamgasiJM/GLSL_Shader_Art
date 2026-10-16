#version 460 core

uniform vec2 u_resolution; // Framebuffer pixels (includes display scaling).
uniform float u_time;      // Seconds since startup.
layout(location = 0) out vec4 fragColor;

void main()
{
    vec2 uv = (2.0 * gl_FragCoord.xy - u_resolution) / u_resolution.y;
    float radius = length(uv);
    float waves = 0.5 + 0.5 * cos(18.0 * radius - 2.5 * u_time);
    vec3 palette = 0.5 + 0.5 * cos(u_time * 0.3 + radius * 5.0
                                  + vec3(0.0, 2.0, 4.0));
    vec3 color = palette * waves * exp(-0.7 * radius);
    fragColor = vec4(color, 1.0);
}
