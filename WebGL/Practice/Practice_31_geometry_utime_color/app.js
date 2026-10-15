const canvas = document.getElementById("webgl_canvas");
const gl = canvas.getContext("webgl2");

if (!gl) {
  alert("WebGL2를 지원하지 않는 브라우저입니다.");
  throw new Error("WebGL2 not supported");
}

canvas.width = 1000;
canvas.height = 1000;
gl.viewport(0, 0, canvas.width, canvas.height);

let mouseX = 0;
let mouseY = 0;

canvas.addEventListener("mousemove", (e) => {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  mouseX = (e.clientX - rect.left) * scaleX;
  mouseY = canvas.height - (e.clientY - rect.top) * scaleY;
});

async function loadShader(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`셰이더 파일 로드 실패 (${response.status}): ${url}`);
  }
  return await response.text();
}

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

async function init() {
  const vertexSource = await loadShader("shaders/vert.glsl");
  const fragmentSource = await loadShader("shaders/frag.glsl");

  const vertexShader = compileShader(gl.VERTEX_SHADER, vertexSource);
  const fragmentShader = compileShader(gl.FRAGMENT_SHADER, fragmentSource);
  const program = createProgram(vertexShader, fragmentShader);

  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);

  // 6각형 정점 (중심 원점, 반지름 0.7)
  const positions = new Float32Array([
    0.7, 0.0,           // 0: 오른쪽
    0.35, 0.606,        // 1: 우상단
    -0.35, 0.606,       // 2: 좌상단
    -0.7, 0.0,          // 3: 왼쪽
    -0.35, -0.606,      // 4: 좌하단
    0.35, -0.606,       // 5: 우하단
  ]);

  const positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

  const a_position = gl.getAttribLocation(program, "a_position");
  if (a_position === -1) {
    throw new Error("a_position 속성을 셰이더에서 찾을 수 없습니다.");
  }
  gl.enableVertexAttribArray(a_position);
  gl.vertexAttribPointer(a_position, 2, gl.FLOAT, false, 0, 0);

  // 정점 인덱스 attribute
  const vertexIds = new Float32Array([0, 1, 2, 3, 4, 5]);
  const vertexIdBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexIdBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, vertexIds, gl.STATIC_DRAW);

  const a_vertexId = gl.getAttribLocation(program, "a_vertexId");
  if (a_vertexId !== -1) {
    gl.enableVertexAttribArray(a_vertexId);
    gl.vertexAttribPointer(a_vertexId, 1, gl.FLOAT, false, 0, 0);
  }

  const u_resolution = gl.getUniformLocation(program, "u_resolution");
  const u_time = gl.getUniformLocation(program, "u_time");
  const u_mouse = gl.getUniformLocation(program, "u_mouse");

  gl.useProgram(program);

  const startTime = Date.now();

  function render() {
    const time = (Date.now() - startTime) * 0.001;

    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.uniform2f(u_resolution, canvas.width, canvas.height);
    gl.uniform1f(u_time, time);
    gl.uniform2f(u_mouse, mouseX, mouseY);

    gl.bindVertexArray(vao);
    gl.drawArrays(gl.TRIANGLE_FAN, 0, 6);

    requestAnimationFrame(render);
  }

  render();
}

init().catch((err) => {
  console.error(err);
  alert(`초기화 실패: ${err.message}`);
});