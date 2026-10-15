/**
 * ============================================================================
 * [WebGL2 Procedural Animated Sphere]
 * - 기능: Sine 함수를 이용한 표면 변형(Wave), Phong Lighting, Blue Glossy Material
 * - 방식: 정점 데이터 생성 시 UV 좌표를 포함하여 수학적 변형 유도
 * ============================================================================
 */

const canvas = document.getElementById("webgl_canvas");
const gl = canvas.getContext("webgl2");

if (!gl) {
  console.error("WebGL2를 지원하지 않습니다.");
} else {
  // 셰이더(.glsl) 파일을 fetch로 비동기 로드한 뒤 초기화한다.
  main();
}

// --- [0. 셰이더 파일 로드 후 초기화 시작] ---
async function main() {
  try {
    const [vsSource, fsSource] = await Promise.all([
      loadShaderSource("shaders/vertex.glsl"),
      loadShaderSource("shaders/fragment.glsl"),
    ]);
    initWebGL(vsSource, fsSource);
  } catch (err) {
    console.error("셰이더 로드 실패:", err);
  }
}

// 셰이더 소스 파일(.glsl)을 텍스트로 읽어온다.
async function loadShaderSource(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${url} 로드 실패 (HTTP ${response.status})`);
  }
  return response.text();
}

function initWebGL(vsSource, fsSource) {
  // --- [1. 셰이더 소스 정의] ---
  // 셰이더 코드는 shaders/ 폴더의 .glsl 파일로 분리되어 있으며,
  // main()에서 fetch로 읽어와 매개변수(vsSource, fsSource)로 전달받는다.
  //  - shaders/vertex.glsl   (Vertex Shader)
  //  - shaders/fragment.glsl (Fragment Shader)

  // --- [2. 셰이더 컴파일 및 프로그램 생성] ---
  const program = createProgram(gl, vsSource, fsSource);
  gl.useProgram(program);

  // --- [3. 구(Sphere) 데이터 생성 (절차적 생성)] ---
  const { vertices, normals, uvs, indices } = generateSphere(1.3, 128, 128);

  // VAO 설정
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);

  // VBO 1: Positions
  const posBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);

  // VBO 2: Normals
  const normBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, normBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, normals, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(1);
  gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0);

  // VBO 3: UVs
  const uvBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, uvs, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(2);
  gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 0, 0);

  // EBO: Indices (Element Buffer Object)
  const indexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
  gl.bufferData(
    gl.ELEMENT_ARRAY_BUFFER,
    new Uint16Array(indices),
    gl.STATIC_DRAW,
  );

  // --- [4. Uniform 위치 찾기] ---
  const locs = {
    projection: gl.getUniformLocation(program, "u_projection"),
    view: gl.getUniformLocation(program, "u_view"),
    model: gl.getUniformLocation(program, "u_model"),
    time: gl.getUniformLocation(program, "u_time"),
    lightDir: gl.getUniformLocation(program, "u_lightDirection"),
    viewPos: gl.getUniformLocation(program, "u_viewPos"),
    baseColor: gl.getUniformLocation(program, "u_baseColor"),
  };

  // --- [5. 행렬 및 수학 라이브러리 (간이 구현)] ---
  // 실제 프로젝트에서는 gl-matrix 라이브러리 사용을 권장합니다.
  const projectionMatrix = perspective(
    (45 * Math.PI) / 180,
    canvas.width / canvas.height,
    0.1,
    100.0,
  );
  const viewMatrix = lookAt([0, 0, 5], [0, 0, 0], [0, 1, 0]);

  // --- [6. 렌더링 루프] ---
  gl.clearColor(1.0, 1.0, 1.0, 1.0); // 배경색: 화이트
  gl.enable(gl.DEPTH_TEST); // 깊이 테스트 활성화

  function render(time) {
    time *= 0.001; // 초 단위 변환

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.uniformMatrix4fv(locs.projection, false, projectionMatrix);
    gl.uniformMatrix4fv(locs.view, false, viewMatrix);

    // 모델 행렬: 기본 정체 행렬에서 시작
    const modelMatrix = mat4Identity();
    gl.uniformMatrix4fv(locs.model, false, modelMatrix);

    // Uniform 값 업데이트
    gl.uniform1f(locs.time, time);
    gl.uniform3f(locs.lightDir, 1.0, 2.0, 1.0); // 조명 방향
    gl.uniform3f(locs.viewPos, 0, 0, 5); // 카메라 위치
    gl.uniform3f(locs.baseColor, 0.0, 0.4, 1.0); // 구 색상: 파란색

    gl.bindVertexArray(vao);
    gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);

    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);
}

// --- [헬퍼 함수들] ---

function generateSphere(radius, lat, lon) {
  const vertices = [];
  const normals = [];
  const uvs = [];
  const indices = [];

  for (let i = 0; i <= lat; i++) {
    const theta = (i * Math.PI) / lat;
    const sinTheta = Math.sin(theta);
    const cosTheta = Math.cos(theta);

    for (let j = 0; j <= lon; j++) {
      const phi = (j * 2 * Math.PI) / lon;
      const sinPhi = Math.sin(phi);
      const cosPhi = Math.cos(phi);

      const x = cosPhi * sinTheta;
      const y = cosTheta;
      const z = sinPhi * sinTheta;

      vertices.push(x * radius, y * radius, z * radius);
      normals.push(x, y, z); // 구의 중심이 (0,0,0)이므로 정점 위치가 곧 법선
      uvs.push(j / lon, i / lat);
    }
  }

  for (let i = 0; i < lat; i++) {
    for (let j = 0; j < lon; j++) {
      const first = i * (lon + 1) + j;
      const second = first + lon + 1;
      indices.push(first, second, first + 1);
      indices.push(second, second + 1, first + 1);
    }
  }

  return {
    vertices: new Float32Array(vertices),
    normals: new Float32Array(normals),
    uvs: new Float32Array(uvs),
    indices,
  };
}

function createProgram(gl, vs, fs) {
  const vShader = createShader(gl, gl.VERTEX_SHADER, vs);
  const fShader = createShader(gl, gl.FRAGMENT_SHADER, fs);
  const prog = gl.createProgram();
  gl.attachShader(prog, vShader);
  gl.attachShader(prog, fShader);
  gl.linkProgram(prog);
  return prog;
}

function createShader(gl, type, source) {
  const s = gl.createShader(type);
  gl.shaderSource(s, source);
  gl.compileShader(s);
  return s;
}

// --- [최소한의 행렬 수학 라이브러리] ---
function mat4Identity() {
  return new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
}

function perspective(fovy, aspect, near, far) {
  const f = 1.0 / Math.tan(fovy / 2);
  const nf = 1 / (near - far);
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
  const z = normalize(subtract(eye, target));
  const x = normalize(cross(up, z));
  const y = normalize(cross(z, x));
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

// 벡터 연산 유틸리티
function normalize(v) {
  const len = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
  return [v[0] / len, v[1] / len, v[2] / len];
}
function subtract(a, b) {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}
function cross(a, b) {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}
function dot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}
