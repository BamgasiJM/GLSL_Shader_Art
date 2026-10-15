const CANVAS_SIZE = 300;
const shaderGallery = document.getElementById("shader_gallery");

const shaderSketches = [
  { title: "Simple Color", fragment: "shaders/frag_simple_color.glsl" },
  { title: "Step", fragment: "shaders/frag_step.glsl" },
  { title: "Smooth Step", fragment: "shaders/frag_smooth_step.glsl" },
  { title: "Time / Resolution", fragment: "shaders/frag_utime.glsl" },
  { title: "Mouse Glow", fragment: "shaders/frag_umouse.glsl" },
  { title: "Grid", fragment: "shaders/frag_grid.glsl" },
  { title: "Checkerboard", fragment: "shaders/frag_checkerboard.glsl" },
  { title: "Smooth Grid", fragment: "shaders/frag_smooth_grid.glsl" },
  { title: "Diamond Checkerboard", fragment: "shaders/frag_diamond_checkerboard.glsl" },
  { title: "Rainbow Grid", fragment: "shaders/frag_rainbow_grid.glsl" },
  { title: "Circle Grid", fragment: "shaders/frag_circle_grid.glsl" },
  { title: "Rotating Bars", fragment: "shaders/frag_rotating_bars.glsl" },
  { title: "Pulsing Grid", fragment: "shaders/frag_pulsing_grid.glsl" },
  { title: "Pulsing Circle", fragment: "shaders/frag_pulsing_circle.glsl" },
  { title: "Moving Square", fragment: "shaders/frag_moving_square.glsl" },
];

// ========================================
// 셰이더 로드 | 컴파일 | 프로그램 생성
// ========================================
async function loadShader(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${url} 파일을 불러오지 못했습니다.`);
  }
  return await response.text();
}

function compileShader(gl, type, source, label) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error(`${label} shader compilation error:`, gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function createProgram(gl, vertexShader, fragmentShader, label) {
  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error(`${label} program linking error:`, gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return null;
  }
  return program;
}

function createShaderCard(sketch) {
  const card = document.createElement("article");
  card.className = "shader-card";

  const title = document.createElement("h2");
  title.className = "shader-title";
  title.textContent = sketch.title;

  const canvas = document.createElement("canvas");
  canvas.className = "shader-canvas";
  canvas.width = CANVAS_SIZE;
  canvas.height = CANVAS_SIZE;

  card.append(title, canvas);
  shaderGallery.append(card);

  return canvas;
}

function createRenderer(canvas, vertexSource, sketch) {
  const gl = canvas.getContext("webgl2");

  if (!gl) {
    console.error("이 브라우저에서 WebGL2를 사용할 수 없습니다.");
    return null;
  }

  let mouseX = canvas.width * 0.5;
  let mouseY = canvas.height * 0.5;

  canvas.addEventListener("mousemove", (e) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    mouseX = (e.clientX - rect.left) * scaleX;
    mouseY = canvas.height - (e.clientY - rect.top) * scaleY;
  });

  return loadShader(sketch.fragment).then((fragmentSource) => {
    const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexSource, sketch.title);
    const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource, sketch.title);

    if (!vertexShader || !fragmentShader) {
      return null;
    }

    const program = createProgram(gl, vertexShader, fragmentShader, sketch.title);

    if (!program) {
      return null;
    }

    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    const positions = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
    const positionBuffer = gl.createBuffer();

    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

    const a_position = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(a_position);
    gl.vertexAttribPointer(a_position, 2, gl.FLOAT, false, 0, 0);

    return {
      canvas,
      gl,
      program,
      vao,
      uniforms: {
        resolution: gl.getUniformLocation(program, "u_resolution"),
        time: gl.getUniformLocation(program, "u_time"),
        mouse: gl.getUniformLocation(program, "u_mouse"),
      },
      getMouse: () => ({ x: mouseX, y: mouseY }),
    };
  });
}

// ========================================
// 초기화
// ========================================
async function init() {
  const vertexSource = await loadShader("shaders/vert.glsl");

  const renderers = (
    await Promise.all(
      shaderSketches.map((sketch) => {
        const canvas = createShaderCard(sketch);
        return createRenderer(canvas, vertexSource, sketch);
      }),
    )
  ).filter(Boolean);

  // ========================================
  // 렌더 루프
  // ========================================
  const startTime = performance.now();

  function render() {
    const time = (performance.now() - startTime) * 0.001;

    renderers.forEach((renderer) => {
      const { canvas, gl, program, vao, uniforms, getMouse } = renderer;
      const mouse = getMouse();

      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.useProgram(program);

      if (uniforms.resolution) {
        gl.uniform2f(uniforms.resolution, canvas.width, canvas.height);
      }

      if (uniforms.time) {
        gl.uniform1f(uniforms.time, time);
      }

      if (uniforms.mouse) {
        gl.uniform2f(uniforms.mouse, mouse.x, mouse.y);
      }

      gl.bindVertexArray(vao);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    });

    requestAnimationFrame(render);
  }

  render();
}

init();