const canvas = document.getElementById("webgl_canvas");
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
// 셰이더 로드 및 컴파일
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

  // ========================================
  // 격자(Grid) 메시 데이터 생성
  // ========================================
  const gridX = 30; // 가로 분할 수
  const gridY = 30; // 세로 분할 수

  const positions = [];
  const indices = [];

  // 1. 버텍스 위치 생성 (-0.8 ~ 0.8 범위)
  for (let y = 0; y <= gridY; y++) {
    const v = y / gridY;
    const posY = -0.8 + v * 1.6; // -0.8에서 +0.8까지 보간

    for (let x = 0; x <= gridX; x++) {
      const u = x / gridX;
      const posX = -0.8 + u * 1.6; // -0.8에서 +0.8까지 보간
      positions.push(posX, posY);
    }
  }

  // 2. 인덱스(Triangle Index) 생성
  for (let y = 0; y < gridY; y++) {
    for (let x = 0; x < gridX; x++) {
      const row1 = y * (gridX + 1);
      const row2 = (y + 1) * (gridX + 1);

      // 사각형 하나당 삼각형 2개 구성
      indices.push(row1 + x, row2 + x, row1 + x + 1);
      indices.push(row1 + x + 1, row2 + x, row2 + x + 1);
    }
  }

  // VBO (Vertex Buffer Object) 생성 및 바인딩
  const positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

  // EBO (Element Array Buffer Object) 생성 및 바인딩
  const indexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
  gl.bufferData(
    gl.ELEMENT_ARRAY_BUFFER,
    new Uint16Array(indices),
    gl.STATIC_DRAW,
  );

  // 속성 포인터 설정
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

    // VAO 바인딩 후 그리기 (drawArrays 대신 drawElements 사용)
    gl.bindVertexArray(vao);
    gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);

    requestAnimationFrame(render);
  }

  render();
}

init();
