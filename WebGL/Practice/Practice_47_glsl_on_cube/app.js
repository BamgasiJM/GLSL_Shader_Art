const canvas = document.getElementById("webgl_canvas");
const gl = canvas.getContext("webgl2");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
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

// 캔버스 리사이즈
window.addEventListener("resize", () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  gl.viewport(0, 0, canvas.width, canvas.height);
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
// 큐브 지오메트리
// ========================================
function createCube() {
  const positions = [];
  const normals = [];
  const indices = [];

  const faces = [
    {
      normal: [0, 0, 1],
      vertices: [
        [-0.5, -0.5, 0.5],
        [0.5, -0.5, 0.5],
        [0.5, 0.5, 0.5],
        [-0.5, 0.5, 0.5],
      ],
    },
    {
      normal: [0, 0, -1],
      vertices: [
        [0.5, -0.5, -0.5],
        [-0.5, -0.5, -0.5],
        [-0.5, 0.5, -0.5],
        [0.5, 0.5, -0.5],
      ],
    },
    {
      normal: [0, 1, 0],
      vertices: [
        [-0.5, 0.5, 0.5],
        [0.5, 0.5, 0.5],
        [0.5, 0.5, -0.5],
        [-0.5, 0.5, -0.5],
      ],
    },
    {
      normal: [0, -1, 0],
      vertices: [
        [-0.5, -0.5, -0.5],
        [0.5, -0.5, -0.5],
        [0.5, -0.5, 0.5],
        [-0.5, -0.5, 0.5],
      ],
    },
    {
      normal: [1, 0, 0],
      vertices: [
        [0.5, -0.5, 0.5],
        [0.5, -0.5, -0.5],
        [0.5, 0.5, -0.5],
        [0.5, 0.5, 0.5],
      ],
    },
    {
      normal: [-1, 0, 0],
      vertices: [
        [-0.5, -0.5, -0.5],
        [-0.5, -0.5, 0.5],
        [-0.5, 0.5, 0.5],
        [-0.5, 0.5, -0.5],
      ],
    },
  ];

  let offset = 0;
  faces.forEach((face) => {
    face.vertices.forEach((v) => {
      positions.push(...v);
      normals.push(...face.normal);
    });
    indices.push(
      offset,
      offset + 1,
      offset + 2,
      offset,
      offset + 2,
      offset + 3,
    );
    offset += 4;
  });

  return {
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    indices: new Uint16Array(indices),
  };
}

// ========================================
// 행렬 유틸리티
// ========================================
function perspective(fov, aspect, near, far) {
  const f = 1.0 / Math.tan(fov / 2);
  const nf = 1.0 / (near - far);
  return new Float32Array([
    f / aspect,
    0,
    0,
    0,
    0,
    f,
    0,
    0,
    0,
    0,
    (far + near) * nf,
    -1,
    0,
    0,
    2 * far * near * nf,
    0,
  ]);
}

function lookAt(eye, target, up) {
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const cross = (a, b) => [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const norm = (v) => {
    const l = Math.sqrt(dot(v, v));
    return l > 0 ? [v[0] / l, v[1] / l, v[2] / l] : [0, 0, 0];
  };

  const z = norm(sub(eye, target));
  const x = norm(cross(up, z));
  const y = cross(z, x);

  return new Float32Array([
    x[0],
    y[0],
    z[0],
    0,
    x[1],
    y[1],
    z[1],
    0,
    x[2],
    y[2],
    z[2],
    0,
    -dot(x, eye),
    -dot(y, eye),
    -dot(z, eye),
    1,
  ]);
}

function rotateXYZ(rx, ry, rz) {
  const cx = Math.cos(rx),
    sx = Math.sin(rx);
  const cy = Math.cos(ry),
    sy = Math.sin(ry);
  const cz = Math.cos(rz),
    sz = Math.sin(rz);

  return new Float32Array([
    cy * cz,
    cy * sz,
    -sy,
    0,
    sx * sy * cz - cx * sz,
    sx * sy * sz + cx * cz,
    sx * cy,
    0,
    cx * sy * cz + sx * sz,
    cx * sy * sz - sx * cz,
    cx * cy,
    0,
    0,
    0,
    0,
    1,
  ]);
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

  const cube = createCube();

  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);

  const positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, cube.positions, gl.STATIC_DRAW);
  const a_position = gl.getAttribLocation(program, "a_position");
  gl.enableVertexAttribArray(a_position);
  gl.vertexAttribPointer(a_position, 3, gl.FLOAT, false, 0, 0);

  const normalBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, cube.normals, gl.STATIC_DRAW);
  const a_normal = gl.getAttribLocation(program, "a_normal");
  gl.enableVertexAttribArray(a_normal);
  gl.vertexAttribPointer(a_normal, 3, gl.FLOAT, false, 0, 0);

  const indexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, cube.indices, gl.STATIC_DRAW);

  // Uniform 위치
  const uniforms = {
    model: gl.getUniformLocation(program, "u_modelMatrix"),
    view: gl.getUniformLocation(program, "u_viewMatrix"),
    projection: gl.getUniformLocation(program, "u_projectionMatrix"),
    time: gl.getUniformLocation(program, "u_time"),
    resolution: gl.getUniformLocation(program, "u_resolution"),
    mouse: gl.getUniformLocation(program, "u_mouse"),
  };

  // 카메라 줌 (댐핑)
  let targetDistance = 3.0;
  let currentDistance = 3.0;

  canvas.addEventListener("wheel", (e) => {
    e.preventDefault();
    targetDistance = Math.max(
      1.5,
      Math.min(10.0, targetDistance + e.deltaY * 0.01),
    );
  });

  // ========================================
  // 렌더 루프
  // ========================================
  gl.clearColor(0, 0, 0, 1);
  gl.enable(gl.DEPTH_TEST);

  const startTime = Date.now();

  function render() {
    const time = (Date.now() - startTime) * 0.001;

    currentDistance += (targetDistance - currentDistance) * 0.1;

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.useProgram(program);

    const aspect = canvas.width / canvas.height;
    const projectionMatrix = perspective(Math.PI / 4, aspect, 0.1, 100.0);
    const viewMatrix = lookAt([0, 0, currentDistance], [0, 0, 0], [0, 1, 0]);
    const modelMatrix = rotateXYZ(time * 0.21, time * 0.27, time * 0.15);

    gl.uniformMatrix4fv(uniforms.projection, false, projectionMatrix);
    gl.uniformMatrix4fv(uniforms.view, false, viewMatrix);
    gl.uniformMatrix4fv(uniforms.model, false, modelMatrix);
    gl.uniform1f(uniforms.time, time);
    gl.uniform2f(uniforms.resolution, canvas.width, canvas.height);
    gl.uniform2f(uniforms.mouse, mouseX, mouseY);

    gl.bindVertexArray(vao);
    gl.drawElements(gl.TRIANGLES, cube.indices.length, gl.UNSIGNED_SHORT, 0);

    requestAnimationFrame(render);
  }

  render();
}

init();
