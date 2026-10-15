const canvas = document.getElementById("webgl_canvas");
const gl = canvas.getContext("webgl2");

// 캔버스의 픽셀 크기를 1000×1000으로 설정한다.
// (CSS 크기와 별개로, 실제 렌더링 해상도를 결정한다.)
canvas.width = 1000;
canvas.height = 1000;

// WebGL 뷰포트를 캔버스 전체에 맞춘다.
// (x, y, width, height) 순서이며, 이후 gl_Position은 이 좌표계를 기준으로 화면에 매핑된다.
gl.viewport(0, 0, canvas.width, canvas.height);

// 마우스 위치를 저장할 전역 변수.
// 캔버스 좌표계(좌하단이 원점)로 변환된 값이 들어간다.
let mouseX = 0;
let mouseY = 0;

// 마우스가 캔버스 위에서 움직일 때마다 호출되는 이벤트 리스너.
// e: 브라우저가 전달하는 MouseEvent 객체.
// rect: 캔버스의 화면상 위치와 크기를 담은 DOMRect 객체.
// scaleX, scaleY: CSS 픽셀과 실제 캔버스 픽셀 간의 비율(디스플레이 배율 대응).
// 결과: mouseX, mouseY 전역 변수에 캔버스 좌표계 기준 값이 저장된다.
canvas.addEventListener("mousemove", (e) => {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  mouseX = (e.clientX - rect.left) * scaleX;
  mouseY = canvas.height - (e.clientY - rect.top) * scaleY;
});

// 지정된 URL에서 셰이더 소스 코드를 비동기로 불러오는 함수.
// url: 불러올 셰이더 파일의 경로 문자열 (예: "shaders/frag.glsl").
// 반환값: fetch로 받은 Response 객체의 body를 문자열로 변환한 Promise<string>.
// 이 반환값은 init() 함수 내에서 await로 받아 vertexSource, fragmentSource 변수에 할당된다.
async function loadShader(url) {
  return (await fetch(url)).text();
}

// WebGL 셰이더를 컴파일하는 함수.
// type: 생성할 셰이더 종류. gl.VERTEX_SHADER 또는 gl.FRAGMENT_SHADER 상수를 인자로 받는다.
// source: loadShader()로 불러온 GLSL 소스 코드 문자열.
// 동작: gl.createShader()로 셰이더 객체를 생성하고, gl.shaderSource()로 소스를 주입한 뒤 gl.compileShader()로 컴파일한다.
// 반환값: 컴파일된 WebGLShader 객체.
// 이 반환값은 createProgram() 함수의 인자로 전달된다.
function compileShader(type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  return shader;
}

// 정점 셰이더와 프래그먼트 셰이더를 하나의 프로그램으로 링크하는 함수.
// vs: compileShader(gl.VERTEX_SHADER, ...)의 반환값인 WebGLShader 객체.
// fs: compileShader(gl.FRAGMENT_SHADER, ...)의 반환값인 WebGLShader 객체.
// 동작: gl.createProgram()으로 프로그램을 생성하고, attachShader()로 두 셰이더를 붙인 뒤 linkProgram()으로 링크한다.
// 반환값: 링크된 WebGLProgram 객체.
// 이 반환값은 init() 함수의 program 변수에 저장되며, 이후 gl.useProgram()과 gl.getAttribLocation(), gl.getUniformLocation()의 인자로 사용된다.
function createProgram(vs, fs) {
  const program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  return program;
}

// WebGL 파이프라인을 초기화하고 렌더 루프를 시작하는 비동기 함수.
// 내부에서 loadShader()를 호출해 셰이더 소스를 불러오고,
// compileShader()와 createProgram()을 순서대로 호출해 실행 가능한 프로그램을 만든다.
// 이후 VAO, 버퍼, 어트리뷰트, 유니폼을 설정하고 requestAnimationFrame 기반의 render() 루프를 시작한다.
async function init() {
  // loadShader()의 반환값(문자열)을 await로 받아 각각 저장한다.
  // 이 문자열은 compileShader()의 두 번째 인자(source)로 전달된다.
  const vertexSource = await loadShader("shaders/vert.glsl");
  const fragmentSource = await loadShader("shaders/frag.glsl");

  // compileShader()의 반환값(WebGLShader)을 createProgram()의 인자(vs, fs)로 넘겨 프로그램을 생성한다.
  // 생성된 WebGLProgram 객체를 program 변수에 저장한다.
  const program = createProgram(
    compileShader(gl.VERTEX_SHADER, vertexSource),
    compileShader(gl.FRAGMENT_SHADER, fragmentSource)
  );

  // VAO(Vertex Array Object)를 생성한다.
  // VAO는 이후 바인딩된 버퍼, 어트리뷰트 포인터 등의 설정 상태를 하나의 객체로 묶어 관리한다.
  // 반환값: WebGLVertexArrayObject 객체.
  const vao = gl.createVertexArray();

  // 생성한 VAO를 현재 컨텍스트에 바인딩한다.
  // 이후 버퍼와 어트리뷰트 설정은 이 VAO에 기록된다.
  gl.bindVertexArray(vao);

  // GPU에 정점 데이터를 전달할 버퍼를 생성한다.
  // 반환값: WebGLBuffer 객체.
  const positionBuffer = gl.createBuffer();

  // 생성한 버퍼를 ARRAY_BUFFER 슬롯에 바인딩한다.
  // 이후 bufferData() 호출은 이 바인딩된 버퍼에 데이터를 쓴다.
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

  // 전체 화면을 덮는 삼각형 스트립용 정점 좌표를 Float32Array로 생성한다.
  // (-1,-1), (1,-1), (-1,1), (1,1) 네 점으로 두 개의 삼각형을 구성해 전체 화면을 채운다.
  // 이 배열은 gl.bufferData()의 두 번째 인자(data)로 전달되어 GPU 버퍼에 복사된다.
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

  // 셰이더 프로그램에서 "a_position" 어트리뷰트의 위치 인덱스를 조회한다.
  // program: createProgram()의 반환값인 WebGLProgram 객체.
  // 반환값: 어트리뷰트의 location 번호(number). 셰이더에 없으면 -1을 반환한다.
  const a_position = gl.getAttribLocation(program, "a_position");

  // 위에서 얻은 location 번호를 활성화한다.
  // 활성화된 어트리뷰트만 vertexAttribPointer()의 설정이 적용된다.
  gl.enableVertexAttribArray(a_position);

  // 현재 ARRAY_BUFFER에 바인딩된 positionBuffer의 데이터를 a_position 어트리뷰트에 연결한다.
  // 인자 순서: (location, size, type, normalize, stride, offset)
  // size=2: 정점당 2개의 float(x, y)를 읽는다.
  // type=gl.FLOAT: 32비트 부동소수점 형식.
  // stride=0, offset=0: 데이터가 연속적으로 배치되어 있음을 의미한다.
  gl.vertexAttribPointer(a_position, 2, gl.FLOAT, false, 0, 0);

  // 셰이더 프로그램 내 유니폼 변수의 location을 조회한다.
  // program: 링크된 WebGLProgram 객체.
  // 반환값: 각 유니폼의 WebGLUniformLocation 객체.
  // 이 객체들은 이후 gl.uniform*() 함수의 첫 번째 인자로 전달되어 값을 주입한다.
  const u_resolution = gl.getUniformLocation(program, "u_resolution");
  const u_time = gl.getUniformLocation(program, "u_time");
  const u_mouse = gl.getUniformLocation(program, "u_mouse");

  // 위에서 생성한 program을 현재 렌더링에 사용할 프로그램으로 설정한다.
  gl.useProgram(program);

  // 렌더 루프 시작 시점의 타임스탬프를 기록한다.
  // 반환값: 밀리초 단위의 number.
  // 이 값은 render() 함수 내에서 Date.now()와의 차이를 계산할 때 기준점으로 사용된다.
  const startTime = Date.now();

  // 매 프레임마다 호출되는 렌더 함수.
  // 내부에서 time을 계산하고 유니폼을 갱신한 뒤, gl.drawArrays()로 화면을 그린다.
  // 마지막에 requestAnimationFrame(render)를 호출해 다음 프레임을 예약한다.
  // 반환값: 없음(void).
  function render() {
    // 현재 시각과 startTime의 차이를 초 단위로 변환한다.
    // 결과: 경과 시간(초)을 담은 number. 이 값은 u_time 유니폼에 전달된다.
    const time = (Date.now() - startTime) * 0.001;

    // 프레임버퍼의 초기화 색상을 (0.1, 0.1, 0.1, 1)로 설정한다.
    // 이후 gl.clear() 호출 시 이 색상으로 화면을 지운다.
    gl.clearColor(0.1, 0.1, 0.1, 1);

    // COLOR_BUFFER_BIT 플래그로 색상 버퍼를 위에서 설정한 clearColor로 초기화한다.
    gl.clear(gl.COLOR_BUFFER_BIT);

    // u_resolution 유니폼에 캔버스의 너비와 높이를 vec2 형태로 전달한다.
    // (canvas.width, canvas.height)는 gl.uniform2f()의 두 번째, 세 번째 인자(number)가 된다.
    gl.uniform2f(u_resolution, canvas.width, canvas.height);

    // u_time 유니폼에 경과 시간(초)을 float 형태로 전달한다.
    // time(number)는 gl.uniform1f()의 두 번째 인자가 된다.
    gl.uniform1f(u_time, time);

    // u_mouse 유니폼에 마우스 좌표를 vec2 형태로 전달한다.
    // (mouseX, mouseY)는 캔버스 이벤트 리스너에서 갱신된 전역 변수의 값이다.
    gl.uniform2f(u_mouse, mouseX, mouseY);

    // 이전에 설정한 VAO를 다시 바인딩한다.
    // 이로써 a_position과 positionBuffer 간의 연결 상태가 복원된다.
    gl.bindVertexArray(vao);

    // TRIANGLE_STRIP 모드로 4개의 정점을 그린다.
    // (mode, first, count) 순서이며, count=4는 네 점으로 두 삼각형을 그림을 의미한다.
    // 결과: 프래그먼트 셰이더가 모든 픽셀에 대해 실행되며 화면이 출력된다.
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    // 브라우저의 다음 리페인트 직전에 render 함수를 다시 호출하도록 예약한다.
    // 이로써 연속적인 애니메이션 루프가 형성된다.
    requestAnimationFrame(render);
  }

  // 렌더 루프를 최초로 한 번 호출한다.
  // 이 호출 이후 requestAnimationFrame에 의해 재귀적으로 반복 실행된다.
  render();
}

// init() 함수를 실행하여 전체 WebGL 파이프라인을 구성하고 렌더링을 시작한다.
init();