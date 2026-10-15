const canvas = document.getElementById("webgl_canvas");
const gl = canvas.getContext("webgl2");

if (!gl) {
  alert("WebGL2를 지원하지 않는 브라우저입니다.");
  throw new Error("WebGL2 not supported");
}

canvas.width = 1000;
canvas.height = 1000;

gl.viewport(0, 0, canvas.width, canvas.height);


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

function createFramebuffer(width, height) {
  const texture = gl.createTexture();

  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    width,
    height,
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    null,
  );

  const framebuffer = gl.createFramebuffer();

  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);

  gl.framebufferTexture2D(
    gl.FRAMEBUFFER,
    gl.COLOR_ATTACHMENT0,
    gl.TEXTURE_2D,
    texture,
    0,
  );

  if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
    throw new Error("Framebuffer 생성 실패");
  }

  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.bindTexture(gl.TEXTURE_2D, null);

  return {
    framebuffer,
    texture,
  };
}

function createQuad(program) {
  const vao = gl.createVertexArray();

  gl.bindVertexArray(vao);

  const positions = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);

  const buffer = gl.createBuffer();

  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

  const location = gl.getAttribLocation(program, "a_position");

  if (location === -1) {
    throw new Error("a_position 속성을 셰이더에서 찾을 수 없습니다.");
  }

  gl.enableVertexAttribArray(location);
  gl.vertexAttribPointer(location, 2, gl.FLOAT, false, 0, 0);
  gl.bindVertexArray(null);

  return vao;
}

function getCommonUniforms(program) {
  return {
    time: gl.getUniformLocation(program, "u_time"),
  };
}

function bindTexture(texture, unit, location) {
  gl.activeTexture(gl.TEXTURE0 + unit);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.uniform1i(location, unit);
}

function renderPass({
  program,
  vao,
  framebuffer,
  uniforms,
  time,
  textures = [],
}) {
  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);

  gl.viewport(0, 0, canvas.width, canvas.height);

  gl.useProgram(program);
  gl.bindVertexArray(vao);

  if (uniforms.time) {
    gl.uniform1f(uniforms.time, time);
  }

  if (uniforms.resolution) {
    gl.uniform2f(uniforms.resolution, canvas.width, canvas.height);
  }

  textures.forEach((item) => {
    bindTexture(item.texture, item.unit, item.location);
  });

  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

async function init() {
  const vertexSource = await loadShader("shaders/vert.glsl");
  const backgroundSource = await loadShader("shaders/frag_background.glsl");
  const circlesSource = await loadShader("shaders/frag_circles.glsl");
  const compositeSource = await loadShader("shaders/frag_composite.glsl");

  const vertexShader = compileShader(gl.VERTEX_SHADER, vertexSource);

  const backgroundProgram = createProgram(
    vertexShader,
    compileShader(gl.FRAGMENT_SHADER, backgroundSource),
  );
  const circlesProgram = createProgram(
    vertexShader,
    compileShader(gl.FRAGMENT_SHADER, circlesSource),
  );
  const compositeProgram = createProgram(
    vertexShader,
    compileShader(gl.FRAGMENT_SHADER, compositeSource),
  );

  const backgroundVAO = createQuad(backgroundProgram);
  const circlesVAO = createQuad(circlesProgram);
  const compositeVAO = createQuad(compositeProgram);

  const backgroundUniforms = getCommonUniforms(backgroundProgram);
  const circlesUniforms = getCommonUniforms(circlesProgram);

  const compositeUniforms = {
    ...getCommonUniforms(compositeProgram),
    background: gl.getUniformLocation(compositeProgram, "u_background"),
    circles: gl.getUniformLocation(compositeProgram, "u_circles"),
  };

  const backgroundTarget = createFramebuffer(canvas.width, canvas.height);
  const circlesTarget = createFramebuffer(canvas.width, canvas.height);

  const startTime = Date.now();

  function render() {
    const time = (Date.now() - startTime) * 0.001;

    // Pass 1: Background
    renderPass({
      program: backgroundProgram,
      vao: backgroundVAO,
      framebuffer: backgroundTarget.framebuffer,
      uniforms: backgroundUniforms,
      time,
    });

    // Pass 2: Circles
    renderPass({
      program: circlesProgram,
      vao: circlesVAO,
      framebuffer: circlesTarget.framebuffer,
      uniforms: circlesUniforms,
      time,
    });

    // Pass 3: Composite → Canvas
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    gl.viewport(0, 0, canvas.width, canvas.height);

    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(compositeProgram);
    gl.bindVertexArray(compositeVAO);

    gl.uniform1f(compositeUniforms.time, time);

    bindTexture(backgroundTarget.texture, 0, compositeUniforms.background);
    bindTexture(circlesTarget.texture, 1, compositeUniforms.circles);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    requestAnimationFrame(render);
  }

  render();
}

init().catch((err) => {
  console.error(err);
  alert(`초기화 실패: ${err.message}`);
});
