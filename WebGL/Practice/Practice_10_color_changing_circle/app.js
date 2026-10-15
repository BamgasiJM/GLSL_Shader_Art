// ==========================================
// 1. GLSL Shader Source (WebGL 2 ES)
// ==========================================

const vsSource = `#version 300 es
in vec2 a_position;
void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
}`;

const fsSource = `#version 300 es
precision highp float;

out vec4 fragColor;

uniform vec2 u_resolution;
uniform vec2 u_mouse; // 스크린 좌표계 (좌하단이 0,0)

void main() {
    // 픽셀 좌표 정규화 (-1.0 ~ 1.0 범위, 가로세로 비율 보정)
    vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution) / min(u_resolution.x, u_resolution.y);

    // 마우스 좌표 정규화 (-1.0 ~ 1.0 범위, 가로세로 비율 보정)
    vec2 mouseUV = (u_mouse * 2.0 - u_resolution) / min(u_resolution.x, u_resolution.y);

    // 원점(0,0)으로부터의 픽셀 거리 계산
    float distToCenter = length(uv);

    // step(edge, x) 함수를 사용하여 반지름 0.4인 원 영역 정의
    // distToCenter가 0.4보다 작으면 1.0(원 내부), 크면 0.0(원 외부) 반환
    float circle = 1.0 - step(0.4, distToCenter);

    // 마우스가 화면 중심(0,0)으로부터 떨어진 거리 계산
    float mouseDistToCenter = length(mouseUV);

    // 마우스 거리에 따른 동적 색상 연산 (두 색상의 선형 보간)
    vec3 colorA = vec3(0.1, 0.8, 0.6); // 민트
    vec3 colorB = vec3(0.9, 0.2, 0.5); // 핑크

    // 마우스 거리가 멀어질수록 colorB 비율이 높아짐
    vec3 dynamicColor = mix(colorA, colorB, clamp(mouseDistToCenter * 0.5, 0.0, 1.0));

    // 원 내부에만 컬러를 적용하고 외부는 검은색
    fragColor = vec4(dynamicColor * circle, 1.0);
}`;

// ==========================================
// 2. WebGL 2 초기화 및 컴파일
// ==========================================

const canvas = document.getElementById('glCanvas');
const gl = canvas.getContext('webgl2');

if (!gl) {
    console.error('WebGL 2를 지원하지 않는 브라우저입니다.');
}

function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}

const vertexShader = createShader(gl, gl.VERTEX_SHADER, vsSource);
const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fsSource);

const program = gl.createProgram();
gl.attachShader(program, vertexShader);
gl.attachShader(program, fragmentShader);
gl.linkProgram(program);

if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error(gl.getProgramInfoLog(program));
}

// ==========================================
// 3. 버퍼 데이터 전송 및 연결
// ==========================================

// 화면 전체를 채우는 사각형 정점 정의 (클립 공간 좌표 -1.0 ~ 1.0)
const vertices = new Float32Array([
    -1.0, -1.0,
     1.0, -1.0,
    -1.0,  1.0,
    -1.0,  1.0,
     1.0, -1.0,
     1.0,  1.0,
]);

const buffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

// attribute 매핑
const positionLoc = gl.getAttribLocation(program, "a_position");
gl.enableVertexAttribArray(positionLoc);
gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);

// uniform 변수 핸들러 가져오기
const resolutionLoc = gl.getUniformLocation(program, "u_resolution");
const mouseLoc = gl.getUniformLocation(program, "u_mouse");

// ==========================================
// 4. 이벤트 및 렌더링 루프 설정
// ==========================================

let mouseX = window.innerWidth / 2;
let mouseY = window.innerHeight / 2;

window.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    // WebGL의 gl_FragCoord는 좌측 하단이 (0,0)이므로 Y축을 스크린 크기 기준으로 뒤집습니다.
    mouseY = window.innerHeight - e.clientY;
});

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

function render() {
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(program);

    // 유니폼 데이터 업데이트
    gl.uniform2f(resolutionLoc, canvas.width, canvas.height);
    gl.uniform2f(mouseLoc, mouseX, mouseY);

    // 사각형 그리기
    gl.drawArrays(gl.TRIANGLES, 0, 6);

  requestAnimationFrame(render);
}

render();