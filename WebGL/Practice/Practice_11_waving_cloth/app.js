const canvas = document.getElementById("webgl_canvas");
const gl = canvas.getContext("webgl2");
canvas.width = 1000;
canvas.height = 1000;
gl.viewport(0, 0, canvas.width, canvas.height);
gl.enable(gl.DEPTH_TEST);

let mouseX = 0;
let mouseY = 0;
canvas.addEventListener("mousemove", (e) => {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  mouseX = (e.clientX - rect.left) * scaleX;
  mouseY = canvas.height - (e.clientY - rect.top) * scaleY;
});

// ========================================
// 4x4 행렬 헬퍼 (perspective, lookAt)
// ========================================
function perspective(fovYRad, aspect, near, far) {
  const f = 1.0 / Math.tan(fovYRad / 2);
  const rangeInv = 1.0 / (near - far);
  return new Float32Array([
    f / aspect, 0, 0, 0,
    0, f, 0, 0,
    0, 0, (near + far) * rangeInv, -1,
    0, 0, near * far * rangeInv * 2, 0,
  ]);
}

function lookAt(eye, center, up) {
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const cross = (a, b) => [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
  const normalize = (a) => {
    const len = Math.hypot(a[0], a[1], a[2]);
    return len > 0 ? [a[0] / len, a[1] / len, a[2] / len] : [0, 0, 0];
  };

  const zAxis = normalize(sub(eye, center));
  const xAxis = normalize(cross(up, zAxis));
  const yAxis = cross(zAxis, xAxis);

  return new Float32Array([
    xAxis[0], yAxis[0], zAxis[0], 0,
    xAxis[1], yAxis[1], zAxis[1], 0,
    xAxis[2], yAxis[2], zAxis[2], 0,
    -(xAxis[0] * eye[0] + xAxis[1] * eye[1] + xAxis[2] * eye[2]),
    -(yAxis[0] * eye[0] + yAxis[1] * eye[1] + yAxis[2] * eye[2]),
    -(zAxis[0] * eye[0] + zAxis[1] * eye[1] + zAxis[2] * eye[2]),
    1,
  ]);
}

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

async function init() {
  const vertexSource = await loadShader("shaders/vert.glsl");
  const fragmentSource = await loadShader("shaders/frag.glsl");
  const vertexShader = compileShader(gl.VERTEX_SHADER, vertexSource);
  const fragmentShader = compileShader(gl.FRAGMENT_SHADER, fragmentSource);
  const program = createProgram(vertexShader, fragmentShader);

  // ========================================
  // 격자(Grid) 정점 데이터 생성 (40x40)
  // ========================================
  const cols = 10; // 가로 분할 수 (숫자를 높일수록 부드러워지지만 부하 증가)
  const rows = 10; // 세로 분할 수
  const positions = [];
  const uvs = [];
  const indices = [];
  const size = 0.8; // 0.8 스케일로 화면 잘림 방지

  for (let y = 0; y <= rows; y++) {
    for (let x = 0; x <= cols; x++) {
      // -0.8 ~ 0.8 범위로 좌표 생성
      const px = (x / cols) * 2 * size - size;
      const py = (y / rows) * 2 * size - size;
      positions.push(px, py);

      // UV 좌표는 0.0 ~ 1.0 범위
      const u = x / cols;
      const v = y / rows;
      uvs.push(u, v);
    }
  }

  // 인덱스 생성 (두 개의 삼각형으로 하나의 사각형 셀을 만듦)
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const topLeft = y * (cols + 1) + x;
      const topRight = topLeft + 1;
      const bottomLeft = (y + 1) * (cols + 1) + x;
      const bottomRight = bottomLeft + 1;

      indices.push(topLeft, bottomLeft, topRight);
      indices.push(topRight, bottomLeft, bottomRight);
    }
  }

  // ========================================
  // 버퍼 및 VAO 설정
  // ========================================
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);

  // 1. 위치 버퍼 (a_position)
  const positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
  const a_position = gl.getAttribLocation(program, "a_position");
  gl.enableVertexAttribArray(a_position);
  gl.vertexAttribPointer(a_position, 2, gl.FLOAT, false, 0, 0);

  // 2. UV 버퍼 (a_uv)
  const uvBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(uvs), gl.STATIC_DRAW);
  const a_uv = gl.getAttribLocation(program, "a_uv");
  gl.enableVertexAttribArray(a_uv);
  gl.vertexAttribPointer(a_uv, 2, gl.FLOAT, false, 0, 0);

  // 3. 인덱스 버퍼
  const indexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

  // Uniform 위치
  const u_time = gl.getUniformLocation(program, "u_time");
  const u_projection = gl.getUniformLocation(program, "u_projection");
  const u_view = gl.getUniformLocation(program, "u_view");

  // ========================================
  // 카메라 행렬 (기울어진 시점으로 천을 내려다봄)
  // ========================================
  const aspect = canvas.width / canvas.height;
  const projectionMatrix = perspective((45 * Math.PI) / 180, aspect, 0.1, 10);
  const viewMatrix = lookAt([0, -1.5, 1.0], [0, -0.25, 0], [0, 1, 0]);

  // ========================================
  // 렌더 루프
  // ========================================
  const startTime = Date.now();
  function render() {
    const time = (Date.now() - startTime) * 0.001;
    gl.clearColor(0.0, 0.1, 0.2, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.useProgram(program);
    gl.uniform1f(u_time, time);
    gl.uniformMatrix4fv(u_projection, false, projectionMatrix);
    gl.uniformMatrix4fv(u_view, false, viewMatrix);

    gl.bindVertexArray(vao);
    // drawArrays 대신 drawElements 사용
    gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);

    requestAnimationFrame(render);
  }
  render();
}
init();