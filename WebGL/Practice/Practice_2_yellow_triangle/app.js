const canvas = document.getElementById("glCanvas");
const gl = canvas.getContext("webgl2");

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

  const vertices = new Float32Array([0.0, 0.5, -0.5, -0.5, 0.5, -0.5]);

  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);

  const vbo = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

  const a_position = gl.getAttribLocation(program, "a_position");
  gl.enableVertexAttribArray(a_position);
  gl.vertexAttribPointer(a_position, 2, gl.FLOAT, false, 0, 0);

  // Uniform 위치
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

    // Uniform 값 전달
    gl.uniform2f(u_resolution, canvas.width, canvas.height);
    gl.uniform1f(u_time, time);
    gl.uniform2f(u_mouse, mouseX, mouseY);

    gl.bindVertexArray(vao);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    requestAnimationFrame(render);
  }

  render();
}

init();
