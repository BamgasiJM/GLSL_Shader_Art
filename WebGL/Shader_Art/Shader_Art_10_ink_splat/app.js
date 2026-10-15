const canvas = document.getElementById("webgl_canvas");
const gl = canvas.getContext("webgl2");

if (!gl) {
  alert("WebGL2를 지원하지 않는 브라우저입니다.");
  throw new Error("WebGL2 not supported");
}

// 부호 있는 속도값을 RGBA16F 텍스처에 렌더링하기 위해 필요
if (!gl.getExtension("EXT_color_buffer_float")) {
  alert("이 브라우저는 float 텍스처 렌더링(EXT_color_buffer_float)을 지원하지 않습니다.");
  throw new Error("EXT_color_buffer_float not supported");
}

// RGBA16F 텍스처에 LINEAR 필터링을 사용하기 위해 필요
const supportsLinearFloat = !!gl.getExtension("OES_texture_float_linear");
const velocityFilter = supportsLinearFloat ? gl.LINEAR : gl.NEAREST;

// ========================================
// 캔버스 크기 | 뷰포트 설정
// ========================================
canvas.width = 1000;
canvas.height = 1000;
gl.viewport(0, 0, canvas.width, canvas.height);

// ========================================
// 마우스 좌표 / 속도 추적
// ========================================
let mouseX = 0;
let mouseY = 0;
let lastMouseX = 0;
let lastMouseY = 0;
let mouseVelX = 0;
let mouseVelY = 0;
let hasMoved = false;

// ========================================
// 유체 시뮬레이션 파라미터
// ========================================
let dissipation = 0.899;      // 속도 감쇠율 (매 프레임)
let advectScale = 10.0;       // 자기 이송 강도
let splatRadius = 0.001;      // 마우스 스플랫 반경
let splatStrength = 1.2;      // 마우스 속도 → 유체 속도 스케일

// ========================================
// 마우스 이벤트 등록
// ========================================
canvas.addEventListener("mousemove", (e) => {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  mouseX = (e.clientX - rect.left) * scaleX;
  mouseY = canvas.height - (e.clientY - rect.top) * scaleY;

  if (!hasMoved) {
    lastMouseX = mouseX;
    lastMouseY = mouseY;
    hasMoved = true;
  }

  mouseVelX = mouseX - lastMouseX;
  mouseVelY = mouseY - lastMouseY;

  lastMouseX = mouseX;
  lastMouseY = mouseY;
});

canvas.addEventListener("mouseleave", () => {
  mouseVelX = 0;
  mouseVelY = 0;
});

// ========================================
// 유체 시뮬레이션 제어 슬라이더
// ========================================
const dissipationSlider = document.getElementById("dissipationSlider");
const advectScaleSlider = document.getElementById("advectScaleSlider");
const splatRadiusSlider = document.getElementById("splatRadiusSlider");
const splatStrengthSlider = document.getElementById("splatStrengthSlider");
const dissipationValue = document.getElementById("dissipationValue");
const advectScaleValue = document.getElementById("advectScaleValue");
const splatRadiusValue = document.getElementById("splatRadiusValue");
const splatStrengthValue = document.getElementById("splatStrengthValue");

if (dissipationSlider) {
  dissipationSlider.addEventListener("input", (e) => {
    dissipation = parseFloat(e.target.value);
    dissipationValue.textContent = dissipation.toFixed(3);
  });
}

if (advectScaleSlider) {
  advectScaleSlider.addEventListener("input", (e) => {
    advectScale = parseFloat(e.target.value);
    advectScaleValue.textContent = advectScale.toFixed(1);
  });
}

if (splatRadiusSlider) {
  splatRadiusSlider.addEventListener("input", (e) => {
    splatRadius = parseFloat(e.target.value);
    splatRadiusValue.textContent = splatRadius.toFixed(4);
  });
}

if (splatStrengthSlider) {
  splatStrengthSlider.addEventListener("input", (e) => {
    splatStrength = parseFloat(e.target.value);
    splatStrengthValue.textContent = splatStrength.toFixed(2);
  });
}

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
  const simFragmentSource = await loadShader("shaders/sim.glsl");
  const displayFragmentSource = await loadShader("shaders/display.glsl");

  const vertexShader = compileShader(gl.VERTEX_SHADER, vertexSource);
  const simFragmentShader = compileShader(gl.FRAGMENT_SHADER, simFragmentSource);
  const displayFragmentShader = compileShader(gl.FRAGMENT_SHADER, displayFragmentSource);

  const simProgram = createProgram(vertexShader, simFragmentShader);
  const displayProgram = createProgram(vertexShader, displayFragmentShader);

  // ----------------------------------------
  // 정점 버퍼 생성 (풀스크린 쿼드) - 두 프로그램이 공유
  // ----------------------------------------
  const positions = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
  const positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

  const setupVAO = (program) => {
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    const a_position = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(a_position);
    gl.vertexAttribPointer(a_position, 2, gl.FLOAT, false, 0, 0);

    return vao;
  };

  const simVAO = setupVAO(simProgram);
  const displayVAO = setupVAO(displayProgram);

  // ----------------------------------------
  // 유니폼 위치 조회
  // ----------------------------------------
  const sim_u_resolution = gl.getUniformLocation(simProgram, "u_resolution");
  const sim_u_mousePos = gl.getUniformLocation(simProgram, "u_mousePos");
  const sim_u_mouseVel = gl.getUniformLocation(simProgram, "u_mouseVel");
  const sim_u_velocityTexture = gl.getUniformLocation(simProgram, "u_velocityTexture");
  const sim_u_dissipation = gl.getUniformLocation(simProgram, "u_dissipation");
  const sim_u_advectScale = gl.getUniformLocation(simProgram, "u_advectScale");
  const sim_u_splatRadius = gl.getUniformLocation(simProgram, "u_splatRadius");
  const sim_u_splatStrength = gl.getUniformLocation(simProgram, "u_splatStrength");

  const disp_u_resolution = gl.getUniformLocation(displayProgram, "u_resolution");
  const disp_u_velocityTexture = gl.getUniformLocation(displayProgram, "u_velocityTexture");

  // ----------------------------------------
  // 텍스처 생성 (속도장 버퍼용 핑-퐁 렌더링)
  // ----------------------------------------
  const createVelocityTexture = () => {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, velocityFilter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, velocityFilter);

    // 초기값: 속도 0. 부호 있는 값을 그대로 저장하기 위해 RGBA16F 사용
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA16F,
      canvas.width,
      canvas.height,
      0,
      gl.RGBA,
      gl.FLOAT,
      null
    );

    return texture;
  };

  const velocityTexture0 = createVelocityTexture();
  const velocityTexture1 = createVelocityTexture();

  // 프레임버퍼 생성
  const createFramebuffer = (texture) => {
    const fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);

    const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    if (status !== gl.FRAMEBUFFER_COMPLETE) {
      console.error("Framebuffer not complete:", status);
    }

    return fb;
  };

  const fb0 = createFramebuffer(velocityTexture0);
  const fb1 = createFramebuffer(velocityTexture1);

  // 핑-퐁 상태
  let currentReadIndex = 0;

  const swapBuffers = () => {
    currentReadIndex = 1 - currentReadIndex;
  };

  const getReadTexture = () => (currentReadIndex === 0 ? velocityTexture0 : velocityTexture1);
  const getWriteTexture = () => (currentReadIndex === 0 ? velocityTexture1 : velocityTexture0);
  const getWriteFramebuffer = () => (currentReadIndex === 0 ? fb1 : fb0);

  // ----------------------------------------
  // 렌더 루프
  // ----------------------------------------
  function render() {
    const readTexture = getReadTexture();
    const writeFramebuffer = getWriteFramebuffer();

    // ========== Pass 1: 오프스크린, 속도장 시뮬레이션 업데이트 ==========
    gl.useProgram(simProgram);
    gl.bindVertexArray(simVAO);
    gl.bindFramebuffer(gl.FRAMEBUFFER, writeFramebuffer);
    gl.viewport(0, 0, canvas.width, canvas.height);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, readTexture);
    gl.uniform1i(sim_u_velocityTexture, 0);

    gl.uniform2f(sim_u_resolution, canvas.width, canvas.height);
    gl.uniform2f(sim_u_mousePos, mouseX, mouseY);
    gl.uniform2f(sim_u_mouseVel, mouseVelX, mouseVelY);
    gl.uniform1f(sim_u_dissipation, dissipation);
    gl.uniform1f(sim_u_advectScale, advectScale);
    gl.uniform1f(sim_u_splatRadius, splatRadius);
    gl.uniform1f(sim_u_splatStrength, splatStrength);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    // 마우스 속도는 한 프레임만 주입 (계속 움직이지 않으면 0으로 감쇠)
    mouseVelX = 0;
    mouseVelY = 0;

    // ========== Pass 2: 캔버스, 속도장 크기로 잉크색 표시 ==========
    gl.useProgram(displayProgram);
    gl.bindVertexArray(displayVAO);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, getWriteTexture());
    gl.uniform1i(disp_u_velocityTexture, 0);

    gl.uniform2f(disp_u_resolution, canvas.width, canvas.height);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    swapBuffers();

    requestAnimationFrame(render);
  }

  render();
}

init().catch((err) => {
  console.error(err);
  alert(`초기화 실패: ${err.message}`);
});
