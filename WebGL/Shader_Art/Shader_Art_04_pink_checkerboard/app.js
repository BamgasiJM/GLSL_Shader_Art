const canvas = document.getElementById("webgl_canvas");
const gl = canvas.getContext("webgl2");

if (!gl) {
  alert("WebGL2를 지원하지 않는 브라우저입니다.");
  throw new Error("WebGL2 not supported");
}

canvas.width = 1000;
canvas.height = 1000;
gl.viewport(0, 0, canvas.width, canvas.height);

// 마우스 위치 저장용 변수
let mouseX = 0;
let mouseY = 0;

// 마우스 이동 이벤트 리스너 추가
canvas.addEventListener("mousemove", (e) => {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  mouseX = (e.clientX - rect.left) * scaleX;
  mouseY = canvas.height - (e.clientY - rect.top) * scaleY;
});

// ========================================
// 셰이더 로드 | 컴파일 | 프로그램 생성
// ========================================
async function loadShader(url) {
  const response = await fetch(url);
  return await response.text();
}

function compileShader(type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error("Shader compilation error:", gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function createProgram(vertexShader, fragmentShader) {
  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error("Program linking error:", gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return null;
  }
  return program;
}

// ========================================
// 초기화
// ========================================
async function init() {
  const vertexSource = await loadShader("shaders/vert.glsl");
  const fragmentSource = await loadShader("shaders/frag.glsl");

  const vertexShader = compileShader(gl.VERTEX_SHADER, vertexSource);
  const fragmentShader = compileShader(gl.FRAGMENT_SHADER, fragmentSource);
  const program = createProgram(vertexShader, fragmentShader);

  // VAO 생성 및 바인딩 : 가장 먼저 실행
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);

  // Full-screen quad (화면을 가득 채우는 사각형)
  const positions = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
  const positionBuffer = gl.createBuffer();

  // VAO가 바인딩된 상태에서 버퍼를 바인딩하고 데이터를 연결해야 함.
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

  // 모든 프로그램에서 동일한 속성 위치를 사용하도록 설정
  const a_position = gl.getAttribLocation(program, "a_position");
  gl.enableVertexAttribArray(a_position);
  gl.vertexAttribPointer(a_position, 2, gl.FLOAT, false, 0, 0);

  // Uniform 상수 설정 : 필요한 것만 생성
  const u_resolution = gl.getUniformLocation(program, "u_resolution");
  const u_time = gl.getUniformLocation(program, "u_time");
  const u_mouse = gl.getUniformLocation(program, "u_mouse");

  // ========================================
  // 렌더 루프
  // ========================================
  const startTime = Date.now();

  function render() {
    const time = (Date.now() - startTime) * 0.001;

    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(program);
    gl.uniform2f(u_resolution, canvas.width, canvas.height);
    gl.uniform1f(u_time, time);
    gl.uniform2f(u_mouse, mouseX, mouseY);

    gl.bindVertexArray(vao);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    requestAnimationFrame(render);
  }

  render();
}

init();
