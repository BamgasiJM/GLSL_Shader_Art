// ========================================
// 캔버스 엘리먼트 참조
// ========================================
const canvas = document.getElementById("webgl_canvas");

// ========================================
// WebGL2 컨텍스트 생성
// ========================================
// 컨텍스트 옵션 해설:
//
// alpha: false
//   기본값(true)는 캔버스 뒤 배경과 프래그먼트 셰이더 출력이 알파 합성되어,
//   의도하지 않은 반투명 효과가 나타날 수 있음.
//   false로 지정하면 프레임버퍼가 항상 불투명으로 동작함.
//   → 셰이더 아트는 일반적으로 false 사용.
//
// antialias: false
//   래스터라이저 단계의 MSAA(멀티샘플 안티앨리어싱) 비활성화.
//   이 구조는 풀스크린 쿼드(4개 정점)만 그리므로 래스터화 단계의
//   앨리어싱이 발생하지 않음. 실제 형태는 프래그먼트 셰이더의 SDF 등으로
//   결정되는데, MSAA로는 해결 불가능.
//   → GPU 자원 절약할 가치가 있음.
//
// preserveDrawingBuffer: false
//   프레임 버퍼가 렌더링 사이에 유지될지 여부.
//   실시간 렌더링은 항상 새로 그리므로 false로 두면 브라우저가
//   버퍼를 재사용해 성능 향상.
//   → 스크린샷 캡처 필요 시 true로 변경.
const gl = canvas.getContext("webgl2", {
  alpha: false,
  antialias: false,
  preserveDrawingBuffer: false,
});

if (!gl) {
  alert("WebGL2를 지원하지 않는 브라우저입니다.");
  throw new Error("WebGL2 not supported");
}

// ========================================
// 캔버스 해상도 계산 및 뷰포트 동기화
// ========================================
// CSS 픽셀과 드로잉 버퍼 픽셀의 개념 정리:
//   CSS 픽셀(clientWidth/Height): 화면에 보이는 엘리먼트 크기.
//   드로잉 버퍼 픽셀(width/height): GPU가 실제로 렌더링하는 해상도.
//
// 고밀도 디스플레이(레티나 2배, 3배 등)에서는 CSS 픽셀 1개 = 물리 픽셀 2~3개.
// devicePixelRatio를 곱하지 않으면 드로잉 버퍼가 CSS 픽셀과 같아져
// 물리 픽셀에 미달하는 해상도로 렌더링되어 결과물이 흐릿함.
//
// 상한선을 2로 둔 이유:
//   3배율 이상(폴드형 핸드폰 등)에서는 프래그먼트 셰이더 연산량 증가가
//   눈에 띄는 성능 저하를 유발하지만, 체감 품질 차이는 미미함.
//   → 성능과 품질의 균형을 고려해 2로 제한.
const dpr = Math.min(window.devicePixelRatio || 1, 2);

function resizeCanvas() {
  const bufferWidth = Math.floor(canvas.clientWidth * dpr);
  const bufferHeight = Math.floor(canvas.clientHeight * dpr);

  // canvas.width를 할당하면 드로잉 버퍼가 재할당되고 GPU 메모리가 다시 쓰임.
  // 실제로 크기가 바뀐 경우에만 실행해 불필요한 GPU 리소스 재할당 방지.
  // 매 프레임에서 호출해도 안전하지만, 조건 검사로 효율성 향상.
  if (canvas.width !== bufferWidth || canvas.height !== bufferHeight) {
    canvas.width = bufferWidth;
    canvas.height = bufferHeight;
    // viewport를 드로잉 버퍼에 맞춰 설정. 변경하지 않으면 이전 뷰포트 유지됨.
    gl.viewport(0, 0, canvas.width, canvas.height);
  }
}

// ========================================
// 포인터 좌표 상태 및 변환
// ========================================
// 셰이더의 u_mouse 유니폼으로 전달할 마우스 좌표 저장소.
let mouseX = 0;
let mouseY = 0;

// 좌표 변환 흐름:
//   1. 브라우저 이벤트 → clientX/Y (CSS 픽셀, 브라우저 뷰포트 기준)
//   2. getBoundingClientRect() → 캔버스의 CSS 크기와 위치
//   3. CSS 픽셀 → 드로잉 버퍼 픽셀 (DPR을 고려한 스케일링)
//   4. Y축 반전 (WebGL 좌표계: 왼쪽 아래가 원점)
//
// 예: CSS상 400x300 캔버스, DPR 2배인 경우
//   canvas.width = 800, canvas.height = 600
//   스케일X = 800/400 = 2, 스케일Y = 600/300 = 2
function updatePointer(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  // CSS 픽셀 → 드로잉 버퍼 픽셀 스케일 비율 계산.
  // 캔버스가 CSS로 축소/확대되었을 때 정확한 좌표 매핑을 위해 필요.
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  mouseX = (clientX - rect.left) * scaleX;
  // Y축 반전: 브라우저(위가 0) → WebGL(아래가 0)
  mouseY = canvas.height - (clientY - rect.top) * scaleY;
}

// ========================================
// 마우스 입력 이벤트 등록
// ========================================
canvas.addEventListener("mousemove", (e) => {
  updatePointer(e.clientX, e.clientY);
});

// ========================================
// 터치 입력 이벤트 등록
// ========================================
// 모바일 환경에서는 마우스 이벤트가 발생하지 않으므로 touchmove 별도 처리.
// e.preventDefault()로 터치 드래그 시 페이지 스크롤 동시 발생 방지.
canvas.addEventListener(
  "touchmove",
  (e) => {
    if (e.touches.length > 0) {
      // 멀티터치 지원을 위해 배열이지만, 마우스 효과 목적이므로 첫 터치만 사용.
      updatePointer(e.touches[0].clientX, e.touches[0].clientY);
      e.preventDefault();
    }
  },
  // passive: false 필수. 기본값(true)이면 preventDefault() 호출 시 무시됨.
  // 최신 브라우저는 성능상 이유로 passive 기본값을 true로 강제하는 경향 있음.
  { passive: false }
);

// ========================================
// 셰이더 소스 파일 로드
// ========================================
// 지정한 URL에서 셰이더 GLSL 소스를 텍스트로 가져옴.
// response.ok 검증이 중요한 이유:
//   경로 오류 시 서버가 404.html 등 HTML 응답을 반환하는데,
//   이를 검사하지 않으면 HTML이 그대로 GLSL 소스로 취급됨.
//   컴파일 에러 메시지가 원인을 모호하게 만들어 디버깅 난제화.
async function loadShader(url) {
  const response = await fetch(url);
  if (!response.ok) {
    // HTTP 상태 코드와 URL을 함께 표시해 문제 빠른 파악 가능.
    throw new Error(`셰이더 파일 로드 실패 (${response.status}): ${url}`);
  }
  return await response.text();
}

// ========================================
// 셰이더 컴파일
// ========================================
// GLSL 소스를 GPU 드라이버에 전달해 컴파일하고 WebGLShader 객체 반환.
// 컴파일 실패 시 에러 로그를 담아 즉시 예외 발생 → init()에서 중단.
function compileShader(type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  // 컴파일은 비동기가 아니므로 다음 줄에서 곧바로 상태 확인 가능.
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader);
    // 실패 시 GPU 메모리 정리 필수.
    gl.deleteShader(shader);
    const typeName = type === gl.VERTEX_SHADER ? "Vertex" : "Fragment";
    throw new Error(`${typeName} 셰이더 컴파일 에러:\n${log}`);
  }
  return shader;
}

// ========================================
// 셰이더 프로그램 생성 및 링크
// ========================================
// 컴파일된 정점/프래그먼트 셰이더 두 개를 하나의 WebGLProgram으로 연결.
// 링크 단계에서는:
//   - 두 셰이더 간 varying 변수 인터페이스 일치 여부 검증
//   - 정점 attribute와 프래그먼트 uniform 호환성 확인
//   각 셰이더가 컴파일되어도 링크는 실패할 수 있음.
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

  // 링크 완료 후 처리:
  // 링크된 바이너리는 program 객체 내부에 보관됨.
  // 개별 셰이더 객체(vertexShader, fragmentShader)는 더 이상 불필요.
  // detach로 program과의 연결 해제, delete로 GPU 메모리 즉시 반환.
  gl.detachShader(program, vertexShader);
  gl.detachShader(program, fragmentShader);
  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);

  return program;
}

// ========================================
// 렌더 루프 상태 변수
// ========================================
// requestAnimationFrame의 핸들(ID). cancelAnimationFrame으로 루프 취소 시 필요.
let rafId = null;
// 현재 탭 가시성 상태. false이면 렌더 루프 일시 중지.
let isRunning = true;

// render 함수는 init() 내부에서 비동기 초기화 완료 후 실제 구현으로 재할당.
// 이유: visibilitychange 리스너가 init() 완료 이전에 등록될 수 있기 때문에,
// 함수가 존재하지 않아 에러 발생하는 것을 방지하기 위해 빈 함수로 우선 선언.
// (클로저를 통해 init 내부에서 재할당 시 외부 참조도 갱신됨.)
let render = () => {};

// ========================================
// 탭 가시성 변경에 따른 렌더 루프 제어
// ========================================
// 브라우저는 백그라운드 탭의 requestAnimationFrame을 자동으로 지연시킴.
// 명시적으로 cancelAnimationFrame을 호출하면:
//   - GPU/CPU 자원 즉시 반환 (배터리 절감, 다른 탭 성능 향상)
//   - 재개 시점이 명확함 (visibilitychange 발생 시점에 정확히 재개)
// → 모바일 배터리 수명과 멀티태스킹 환경에서 중요.
document.addEventListener("visibilitychange", () => {
  isRunning = document.visibilityState === "visible";
  if (isRunning) {
    // 포그라운드 복귀: 다음 프레임 예약.
    rafId = requestAnimationFrame(render);
  } else if (rafId !== null) {
    // 백그라운드 전환: 현재 예약된 프레임 취소.
    cancelAnimationFrame(rafId);
    rafId = null;
  }
});

// ========================================
// 초기화 및 렌더 루프 시작
// ========================================
async function init() {
  const vertexSource = await loadShader("shaders/vert.glsl");
  const fragmentSource = await loadShader("shaders/frag.glsl");

  const vertexShader = compileShader(gl.VERTEX_SHADER, vertexSource);
  const fragmentShader = compileShader(gl.FRAGMENT_SHADER, fragmentSource);
  const program = createProgram(vertexShader, fragmentShader);

  // ----------------------------------------
  // VAO(Vertex Array Object) 생성 및 바인딩
  // ----------------------------------------
  // VAO는 GPU 상태 캡슐화 객체.
  // 이후 호출되는 모든 attribute/버퍼 바인딩 상태를 기록함.
  // 반드시 버퍼 설정보다 먼저 바인딩해야, 뒤의 호출들이 이 VAO에 귀속됨.
  // 렌더 루프에서 VAO를 바인딩하면 여기서 설정한 상태 전체가 복원됨.
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);

  // ----------------------------------------
  // 정점 버퍼 생성 (풀스크린 쿼드)
  // ----------------------------------------
  // 클립 공간 좌표 범위: -1~1.
  // 4개 정점: (-1,-1), (1,-1), (-1,1), (1,1)
  // → gl.TRIANGLE_STRIP으로 화면 전체를 덮는 2개 삼각형 구성.
  // 별도 기하학 없이 프래그먼트 셰이더만으로 픽셀마다 연산해 이미지 생성.
  // (SDF, 노이즈, 레이마칭 등 모든 연산이 셰이더에서 이루어짐.)
  const positions = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
  const positionBuffer = gl.createBuffer();

  // 순서 매우 중요:
  //   1. VAO 바인딩 (이미 위에서 함)
  //   2. ARRAY_BUFFER 바인딩
  //   3. bufferData 업로드
  //   4. vertexAttribPointer 설정
  // 이 순서가 아니면 attribute 상태가 VAO에 기록되지 않음.
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

  // ----------------------------------------
  // 정점 attribute 연결
  // ----------------------------------------
  // getAttribLocation 반환값:
  //   양수 = attribute 인덱스 (셰이더에서 찾음)
  //   -1 = 셰이더에 존재 안 함 또는 미사용 변수로 컴파일러가 제거함.
  // -1일 때 검증하지 않으면:
  //   vertexAttribPointer(-1, ...) 은 조용히 무시됨.
  //   → 정점 데이터가 셰이더에 전달되지 않아도 경고 없음.
  //   → 화면에 아무것도 안 그려지는데 원인 파악 어려움.
  // → 반드시 검증해서 문제를 빠르게 발견해야 함.
  const a_position = gl.getAttribLocation(program, "a_position");
  if (a_position === -1) {
    throw new Error("a_position 속성을 셰이더에서 찾을 수 없습니다.");
  }
  // enableVertexAttribArray: attribute 수신 활성화.
  // vertexAttribPointer: 버퍼 데이터 레이아웃 명시.
  //   (인덱스, 컴포넌트 수, 타입, 정규화, stride, offset)
  gl.enableVertexAttribArray(a_position);
  gl.vertexAttribPointer(a_position, 2, gl.FLOAT, false, 0, 0);

  // ----------------------------------------
  // 유니폼 위치 조회
  // ----------------------------------------
  // 유니폼: 모든 정점/프래그먼트 셰이더 인스턴스가 공유하는 읽기 전용 데이터.
  // getUniformLocation은 셰이더 내 해당 유니폼의 GPU 내부 위치를 반환.
  // 위치는 프로그램 바이너리가 존재하는 동안 고정이므로,
  // 렌더 루프 밖에서 한 번만 조회하고 재사용하면 성능 최적화.
  // (매 프레임 조회해도 비용은 작지만, 불필요한 작업.)
  const u_resolution = gl.getUniformLocation(program, "u_resolution");
  const u_time = gl.getUniformLocation(program, "u_time");
  const u_mouse = gl.getUniformLocation(program, "u_mouse");

  // ----------------------------------------
  // 프로그램 활성화
  // ----------------------------------------
  // useProgram은 이후의 gl.uniform*() 호출과 그리기 명령이
  // 어떤 프로그램을 사용할지 지정.
  // 이 애플리케이션은 프로그램 1개만 사용하므로 여기서 1회만 호출하면 충분.
  // 여러 프로그램을 번갈아 쓸 필요 없으면 렌더 루프에서 반복할 이유 없음.
  // (프로그램 전환은 GPU 파이프라인 플러시를 유발해 성능 비용이 있음.)
  gl.useProgram(program);

  // 초기화 단계에서 캔버스 크기 1회 설정.
  // 이후 창 크기 변경 이벤트마다 재계산해 드로잉 버퍼 해상도 동기화.
  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);

  // ----------------------------------------
  // 렌더 루프 함수 정의 및 실행
  // ----------------------------------------
  // render 함수는 외부 render 변수에 할당됨 (init 시작 시 빈 함수로 선언).
  // 클로저를 통해 program, vao, u_resolution 등 모든 초기화 상태 접근 가능.
  const startTime = Date.now();

  render = function () {
    // 경과 시간 계산: 밀리초 → 초 단위.
    // time은 셰이더의 u_time으로 전달되어 애니메이션 드라이브.
    const time = (Date.now() - startTime) * 0.001;

    // 프레임버퍼를 검은색으로 초기화.
    // RGBA(0, 0, 0, 1): 불투명한 검은색.
    gl.clearColor(0, 0, 0, 1);
    // COLOR_BUFFER_BIT: 색상 버퍼만 지움 (깊이 버퍼는 사용 안 함).
    gl.clear(gl.COLOR_BUFFER_BIT);

    // 유니폼 값 갱신 (매 프레임 필요한 것들만).
    // location 조회는 생략 (위에서 이미 조회함).
    gl.uniform2f(u_resolution, canvas.width, canvas.height);
    gl.uniform1f(u_time, time);
    gl.uniform2f(u_mouse, mouseX, mouseY);

    // VAO 재바인딩:
    // 다른 코드가 VAO를 건드렸을 가능성에 대비해 명시적으로 유지.
    // VAO 1개만 사용하는 구조라면 생략 가능하지만, 방어적 코딩으로 포함.
    gl.bindVertexArray(vao);
    // 드로잉 명령: 삼각형 스트립, 정점 0~3 (4개 정점 = 2개 삼각형).
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    // 다음 프레임 예약 (탭이 포그라운드일 때만).
    // visibilitychange 리스너가 isRunning을 관리.
    if (isRunning) {
      rafId = requestAnimationFrame(render);
    }
  };

  // 첫 프레임 시작.
  rafId = requestAnimationFrame(render);
}

// ========================================
// 애플리케이션 시작
// ========================================
// init()은 async 함수이므로 Promise를 반환.
// 내부에서 던진 예외를 catch하지 않으면 "unhandled rejection" 경고 발생.
// 사용자에게 명확한 피드백 제공하기 위해 catch 필수.
init().catch((err) => {
  // 콘솔에 전체 스택 트레이스 출력 (개발자용).
  console.error(err);
  // 사용자에게 알림 (에러 메시지만 표시).
  alert(`초기화 실패: ${err.message}`);
});