// ========================================
// 캔버스 엘리먼트 참조
// ========================================
// canvas는 브라우저가 관리하는 픽셀 버퍼를 가진 DOM 엘리먼트.
// 이 시점에는 아직 WebGL과 아무 관계도 없는 순수한 HTML 요소일 뿐임.
const canvas = document.getElementById("webgl_canvas");

// ========================================
// WebGL2 컨텍스트 생성
// ========================================
// getContext("webgl2")를 호출해야 비로소 이 canvas가 GPU 드라이버와
// 통신할 수 있는 창구를 얻음. 이후 gl.xxx() 형태의 모든 호출은
// 이 컨텍스트를 거쳐 GPU 드라이버에 명령을 전달하는 것.
const gl = canvas.getContext("webgl2");

if (!gl) {
  alert("WebGL2를 지원하지 않는 브라우저입니다.");
  throw new Error("WebGL2 not supported");
}

// ========================================
// 캔버스 크기 | 뷰포트 설정
// ========================================
// canvas.width/height : 실제 픽셀이 저장되는 드로잉 버퍼의 크기(개수)를 결정.
// 아직 이 단계에서는 버퍼 안에 어떤 색상 데이터도 채워지지 않은 빈 상태임.
canvas.width = 1000;
canvas.height = 1000;

// gl.viewport(0, 0, width, height) : 정점 셰이더가 출력하는 -1~1 범위의
// 클립 공간 좌표를, 위에서 정한 드로잉 버퍼의 몇 번째 픽셀에 대응시킬지
// 정하는 "좌표 변환 규칙"을 등록하는 호출. 아직 실제 정점 데이터는
// 하나도 없으므로, 이 시점에도 화면에는 아무것도 그려지지 않음.
gl.viewport(0, 0, canvas.width, canvas.height);

// ========================================
// 마우스 좌표 상태
// ========================================
// 이 변수들은 순수하게 JavaScript(CPU) 메모리에만 존재함.
// GPU는 이 값의 존재 자체를 전혀 모르는 상태이고, 렌더 루프에서
// uniform2f로 업로드되는 순간에만 GPU 쪽으로 값이 복사됨.
let mouseX = 0;
let mouseY = 0;

// ========================================
// 마우스 이동 이벤트 등록
// ========================================
canvas.addEventListener("mousemove", (e) => {
  // getBoundingClientRect() : 캔버스가 CSS로 실제 화면에 표시되는
  // 크기와 위치(CSS 픽셀 기준)를 가져옴. 드로잉 버퍼 픽셀 크기(canvas.width)와
  // 다를 수 있으므로 아래에서 스케일 비율을 구해 보정함.
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  // e.clientX/Y(브라우저 이벤트 좌표, CSS 픽셀)를 드로잉 버퍼 픽셀 좌표로 환산.
  mouseX = (e.clientX - rect.left) * scaleX;

  // 브라우저 좌표계는 왼쪽 위가 원점이지만, 셰이더 좌표계는 보통
  // 왼쪽 아래가 원점이므로 canvas.height에서 빼서 Y축을 반전시킴.
  // 이 변환을 하지 않으면 셰이더 안에서 마우스를 따라가는 효과를
  // 만들 때 위아래가 뒤집혀 보임.
  mouseY = canvas.height - (e.clientY - rect.top) * scaleY;
});

// ========================================
// 셰이더 소스 파일 로드
// ========================================
// .glsl 파일은 GPU가 바로 이해하는 바이너리가 아니라 사람이 읽는
// GLSL 텍스트 코드. fetch로 가져온 시점에는 그냥 문자열이고,
// GPU는 이 시점까지 아무것도 알지 못함(순수 CPU 단계).
async function loadShader(url) {
  const response = await fetch(url);

  // response.ok를 확인하지 않으면, 경로가 잘못됐을 때 서버가 반환하는
  // 404 응답 본문(HTML 문자열)이 그대로 셰이더 텍스트로 취급되어
  // 다음 단계인 컴파일에서 "원인 불명의 GLSL 문법 에러"로만 보이게 됨.
  if (!response.ok) {
    throw new Error(`셰이더 파일 로드 실패 (${response.status}): ${url}`);
  }
  return await response.text();
}

// ========================================
// 셰이더 컴파일
// ========================================
// 여기서 처음으로 데이터가 CPU에서 GPU 쪽으로 넘어감.
function compileShader(type, source) {
  // createShader : GPU 드라이버 안에 내용이 비어있는 셰이더 객체를 생성.
  // 아직 이 객체는 어떤 GLSL 코드도 담고 있지 않음.
  const shader = gl.createShader(type);

  // shaderSource : CPU에 있던 GLSL 텍스트(source)를 이 셰이더 객체 안에 채워 넣음.
  // 이 시점에도 GPU 입장에서는 여전히 "해석되지 않은 텍스트"일 뿐.
  gl.shaderSource(shader, source);

  // compileShader : GPU 드라이버 내부 컴파일러가 텍스트를 실제로 실행
  // 가능한 형태로 변환하는 단계. 이 호출이 끝나야 비로소 이 객체가
  // GPU에서 의미를 갖는 "컴파일된 셰이더"가 됨.
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    const typeName = type === gl.VERTEX_SHADER ? "Vertex" : "Fragment";

    // 실패 시 null을 반환하는 대신 예외를 던짐. null을 반환하면
    // 호출부에서 매번 검증하지 않는 한 무효한 셰이더 객체로 다음 단계
    // (attachShader 등)가 그대로 진행되어, 실제 문제 발생 지점과
    // 증상이 나타나는 지점이 멀어져 디버깅이 어려워짐.
    throw new Error(`${typeName} 셰이더 컴파일 에러:\n${log}`);
  }
  return shader;
}

// ========================================
// 셰이더 프로그램 생성 및 링크
// ========================================
function createProgram(vertexShader, fragmentShader) {
  // createProgram : 두 셰이더를 담을 빈 프로그램 컨테이너를 GPU에 생성.
  const program = gl.createProgram();

  // attachShader : 컴파일된 정점/프래그먼트 셰이더를 이 프로그램에 연결.
  // 아직 두 셰이더는 서로 독립된 객체이며, 연결만 된 상태.
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);

  // linkProgram : 정점 셰이더가 out으로 내보내는 값과 프래그먼트
  // 셰이더가 in으로 받는 값의 이름·타입이 일치하는지 검증하고,
  // 두 셰이더를 하나의 실행 파이프라인으로 결합함. 개별 컴파일이
  // 각각 성공해도 이 단계에서 실패할 수 있는 별도의 실패 지점.
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    throw new Error(`프로그램 링크 에러:\n${log}`);
  }

  // 링크가 끝난 이 program 객체가 이후 모든 렌더링의 실행 단위가 됨.
  return program;
}

// ========================================
// 초기화 및 렌더 루프 시작
// ========================================
async function init() {
  // 이 시점의 vertexSource/fragmentSource는 아직 CPU 메모리 안의
  // 문자열일 뿐, GPU와는 무관한 데이터.
  const vertexSource = await loadShader("shaders/vert.glsl");
  const fragmentSource = await loadShader("shaders/frag.glsl");

  // 컴파일 : 텍스트 → GPU가 실행 가능한 셰이더 객체.
  const vertexShader = compileShader(gl.VERTEX_SHADER, vertexSource);
  const fragmentShader = compileShader(gl.FRAGMENT_SHADER, fragmentSource);

  // 링크 : 두 셰이더 객체 → 하나의 실행 파이프라인(program).
  const program = createProgram(vertexShader, fragmentShader);

  // ----------------------------------------
  // VAO(Vertex Array Object) 생성 및 바인딩
  // ----------------------------------------
  // VAO는 그 자체로 정점 데이터를 담는 그릇이 아니라, 아래에서 설정할
  // "버퍼 바인딩 + attribute 해석 규칙"의 조합을 하나로 묶어 기록해두는
  // 컨테이너. 반드시 버퍼 관련 설정보다 먼저 바인딩해야, 이후의
  // bindBuffer/vertexAttribPointer 호출 결과가 이 VAO에 귀속됨.
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);

  // ----------------------------------------
  // 정점 좌표 원본 데이터 정의 (아직 CPU, 아직 "정점" 아님)
  // ----------------------------------------
  // 이 배열은 이 시점에 그냥 8개의 숫자가 나열된 것일 뿐임.
  // -1, -1 / 1, -1 / -1, 1 / 1, 1 로 2개씩 묶어보면 사람 눈에는
  // 클립 공간의 네 꼭짓점처럼 보이지만, JS도 GPU도 아직
  // "2개씩 묶어서 정점 하나로 취급하라"는 규칙을 알지 못함.
  // 이 규칙은 훨씬 아래의 vertexAttribPointer에서 비로소 정해짐.
  const positions = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);

  // ----------------------------------------
  // 정점 버퍼(VBO) 생성 및 GPU 업로드
  // ----------------------------------------
  // createBuffer : GPU 메모리 상에 빈 버퍼 객체를 생성.
  const positionBuffer = gl.createBuffer();

  // bindBuffer(ARRAY_BUFFER, ...) : 이후의 버퍼 관련 호출이 이
  // positionBuffer를 대상으로 하도록 지정. VAO가 바인딩된 상태에서
  // 호출해야, 아래 vertexAttribPointer 설정이 이 VAO에 기록됨.
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

  // bufferData : CPU에 있던 positions 배열(숫자 나열)을 GPU 메모리로
  // 실제 복사하는 단계. 데이터가 CPU → GPU로 넘어가지만, GPU 입장에서는
  // 여전히 "8개의 float가 나열된 바이트 덩어리"일 뿐, 아직 정점이라는
  // 의미는 부여되지 않은 상태.
  gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

  // ----------------------------------------
  // Attribute 연결 : 바이트 덩어리를 "정점"으로 해석하는 규칙
  // ----------------------------------------
  // getAttribLocation : 링크된 program 안에서 "a_position"이라는
  // 이름의 정점 셰이더 입력이 몇 번 슬롯에 배정되었는지 조회.
  // 이름이 다르거나 GLSL 컴파일러가 사용되지 않는 변수로 판단해
  // 제거한 경우 -1이 반환됨.
  const a_position = gl.getAttribLocation(program, "a_position");
  if (a_position === -1) {
    // 검증 없이 진행하면 vertexAttribPointer가 잘못된 인덱스에
    // 조용히 적용되고, 화면에 아무것도 그려지지 않는 원인 불명
    // 상태로 이어짐.
    throw new Error("a_position 속성을 셰이더에서 찾을 수 없습니다.");
  }

  // enableVertexAttribArray : 위 슬롯을 사용하겠다고 활성화.
  gl.enableVertexAttribArray(a_position);

  // vertexAttribPointer(a_position, 2, FLOAT, ...) : 바로 이 호출이
  // "GPU 메모리의 바이트 덩어리를 float 2개씩 끊어서, 그 각각을
  // a_position이라는 정점 셰이더 입력 하나로 취급하라"는 해석 규칙을
  // 확정하는 지점. 이 호출 이전까지는 positionBuffer가 그냥 8개의
  // float였을 뿐이지만, 이 호출 이후로는 GPU가 그것을 4개의 정점으로
  // 인식하게 됨. 이 규칙은 현재 바인딩된 VAO(vao)에 기록됨.
  gl.vertexAttribPointer(a_position, 2, gl.FLOAT, false, 0, 0);

  // ----------------------------------------
  // 유니폼 위치 조회
  // ----------------------------------------
  // Attribute가 "정점마다 다른 값"을 전달하는 통로라면, 유니폼은
  // "한 번의 드로우 콜 동안 모든 정점·픽셀에 동일하게 적용되는 값"을
  // 전달하는 통로. 여기서는 위치(location)만 미리 조회해두고,
  // 실제 값은 아직 전달하지 않음. 위치 자체는 프로그램이 존재하는 동안
  // 변하지 않으므로 렌더 루프 밖에서 한 번만 구하면 충분함.
  const u_resolution = gl.getUniformLocation(program, "u_resolution");
  const u_time = gl.getUniformLocation(program, "u_time");
  const u_mouse = gl.getUniformLocation(program, "u_mouse");

  // ----------------------------------------
  // 프로그램 활성화
  // ----------------------------------------
  // useProgram : 지금까지 준비한 program을 GPU가 실제로 실행할
  // 대상으로 지정. 이 애플리케이션은 프로그램을 하나만 사용하므로
  // 초기화 단계에서 한 번만 호출하면 충분하고, 이후 drawArrays가
  // 호출될 때마다 이 program을 기준으로 파이프라인이 실행됨.
  gl.useProgram(program);

  // ----------------------------------------
  // 렌더 루프
  // ----------------------------------------
  const startTime = Date.now();

  function render() {
    // 매 프레임 CPU 쪽에서 계산되는 값. 아직 GPU로 전달되지 않은 상태.
    const time = (Date.now() - startTime) * 0.001;

    // clearColor + clear : 이전 프레임에 기록되어 있던 색상 버퍼
    // 내용을 지정한 배경색(검은색)으로 덮어씀. 이 시점의 화면은
    // 아직 이번 프레임의 결과를 담고 있지 않음.
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // uniform2f/1f : CPU 변수(canvas.width/height, time, mouseX/Y)의
    // 현재 값을 GPU의 유니폼 슬롯으로 복사. 이 호출들이 실행되는
    // 순간 비로소 이번 프레임의 시간과 마우스 좌표가 GPU로 넘어감.
    gl.uniform2f(u_resolution, canvas.width, canvas.height);
    gl.uniform1f(u_time, time);
    gl.uniform2f(u_mouse, mouseX, mouseY);

    // bindVertexArray(vao) : init()에서 기록해둔 "버퍼 + attribute
    // 해석 규칙" 묶음을 다시 활성화. 이 한 줄로 positionBuffer를
    // 4개의 정점으로 해석하는 설정 전체가 복원됨.
    gl.bindVertexArray(vao);

    // drawArrays(TRIANGLE_STRIP, 0, 4) : 여기서부터 GPU 파이프라인이
    // 자동으로 실행됨.
    //   1) 정점 셰이더가 4개 정점 각각에 대해 한 번씩 실행되어
    //      클립 공간 좌표를 결정.
    //   2) 삼각형 스트립 방식으로 이 4개 정점이 2개의 삼각형(=화면
    //      전체를 덮는 사각형)으로 조립됨.
    //   3) 래스터화 단계에서 이 삼각형들이 뷰포트 크기(1000x1000)에
    //      맞춰 개별 픽셀 후보로 쪼개짐.
    //   4) 프래그먼트 셰이더가 이 픽셀 하나하나에 대해 독립적으로
    //      실행되며, 방금 전달한 u_resolution/u_time/u_mouse 값과
    //      픽셀 좌표를 조합해 최종 색상을 계산.
    //   5) 계산된 색상이 프레임버퍼(색상 버퍼)에 기록되고, 이 버퍼가
    //      곧 캔버스 화면에 그대로 표시됨.
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    // requestAnimationFrame : 브라우저의 다음 리프레시 주기에 맞춰
    // render를 다시 예약. 이 재귀 호출 구조 덕분에 다음 프레임에서
    // time 값이 갱신되어 애니메이션이 만들어짐.
    requestAnimationFrame(render);
  }

  render();
}

// init()은 비동기 함수이므로, 내부에서 던진 예외(fetch 실패, 컴파일/링크
// 에러, attribute 누락 등)는 여기서 catch해야 처리되지 않은 Promise
// 거부로 콘솔에만 조용히 남는 것을 방지할 수 있음.
init().catch((err) => {
  console.error(err);
  alert(`초기화 실패: ${err.message}`);
});