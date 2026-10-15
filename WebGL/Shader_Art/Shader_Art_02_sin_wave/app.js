const canvas = document.getElementById("webgl_canvas");
const gl = canvas.getContext("webgl2");

if (!gl) {
  alert("WebGL2를 지원하지 않는 브라우저입니다.");
  throw new Error("WebGL2 not supported");
}

// ========================================
// 캔버스 크기 | 뷰포트 설정
// ========================================
canvas.width = 1000;
canvas.height = 1000;
gl.viewport(0, 0, canvas.width, canvas.height);

// ========================================
// 마우스 좌표 상태
// ========================================
let mouseX = 0;
let mouseY = 0;

// ========================================
// 마우스 이동 이벤트 등록
// ========================================
canvas.addEventListener("mousemove", (e) => {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  mouseX = (e.clientX - rect.left) * scaleX;
  mouseY = canvas.height - (e.clientY - rect.top) * scaleY;
});

// ========================================
// 셰이더 소스 파일 로드
// ========================================
async function loadShader(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`셰이더 파일 로드 실패 (${response.status}): ${url}`);
  }
  return await response.text();
}

// ========================================
// 셰이더 컴파일
// ========================================
function compileShader(type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    const typeName = type === gl.VERTEX_SHADER ? "Vertex" : "Fragment";
    throw new Error(`${typeName} 셰이더 컴파일 에러:\n${log}`);
  }
  return shader;
}

// ========================================
// 셰이더 프로그램 생성 및 링크
// ========================================
function createProgram(vertexShader, fragmentShader) {
  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    throw new Error(`프로그램 링크 에러:\n${log}`);
  }
  return program;
}

// ========================================
// 초기화 및 렌더 루프 시작
// ========================================
async function init() {
  const vertexSource = await loadShader("shaders/vert.glsl");
  const fragmentSource = await loadShader("shaders/frag.glsl");

  const vertexShader = compileShader(gl.VERTEX_SHADER, vertexSource);
  const fragmentShader = compileShader(gl.FRAGMENT_SHADER, fragmentSource);
  const program = createProgram(vertexShader, fragmentShader);

  // ----------------------------------------
  // VAO(Vertex Array Object) 생성 및 바인딩
  // ----------------------------------------
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);

  // ----------------------------------------
  // 정점 버퍼 생성 (풀스크린 쿼드)
  // ----------------------------------------
  const positions = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
  const positionBuffer = gl.createBuffer();

  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

  // ----------------------------------------
  // 정점 attribute 연결
  // ----------------------------------------
  const a_position = gl.getAttribLocation(program, "a_position");
  if (a_position === -1) {
    throw new Error("a_position 속성을 셰이더에서 찾을 수 없습니다.");
  }
  gl.enableVertexAttribArray(a_position);
  gl.vertexAttribPointer(a_position, 2, gl.FLOAT, false, 0, 0);

  // ----------------------------------------
  // 유니폼 위치 조회
  // ----------------------------------------
  const u_resolution = gl.getUniformLocation(program, "u_resolution");
  const u_time = gl.getUniformLocation(program, "u_time");
  const u_mouse = gl.getUniformLocation(program, "u_mouse");

  // ----------------------------------------
  // 프로그램 활성화
  // ----------------------------------------
  gl.useProgram(program);

  // ----------------------------------------
  // 렌더 루프
  // ----------------------------------------
  const startTime = Date.now();

  function render() {
    const time = (Date.now() - startTime) * 0.001; // 밀리초 → 초 단위 변환

    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.uniform2f(u_resolution, canvas.width, canvas.height);
    gl.uniform1f(u_time, time);
    gl.uniform2f(u_mouse, mouseX, mouseY);

    gl.bindVertexArray(vao);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    requestAnimationFrame(render);
  }

  render();
}

init().catch((err) => {
  console.error(err);
  alert(`초기화 실패: ${err.message}`);
});