// ── 셰이더 소스 로드 ──
async function loadShader(url) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`[X] Shader Loading Failed: ${url}`);
    }
    return response.text();
}

function showError(msg) {
    const box = document.getElementById('errBox');
    box.style.display = 'block';
    box.textContent = msg;
}

// ── 셰이더 컴파일 ──
function compileShader(gl, src, type, name) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        const err = gl.getShaderInfoLog(s);
        showError(`[X] Shader compile failed (${name}):\n\n${err}\n\nSOURCE:\n${src}`);
        gl.deleteShader(s);
        return null;
    }
    return s;
}

// ── 프로그램 생성 ──
function createProgram(gl, vs, fs) {
    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        showError(`[X] Program link failed:\n\n${gl.getProgramInfoLog(prog)}`);
        throw new Error('Program link failed');
    }
    return prog;
}

// ── 투영 행렬 ──
function perspective(fov, aspect, near, far) {
    const f = 1.0 / Math.tan(fov / 2);
    const nf = 1 / (near - far);
    return new Float32Array([
        f / aspect, 0, 0, 0,
        0, f, 0, 0,
        0, 0, (far + near) * nf, -1,
        0, 0, 2 * far * near * nf, 0,
    ]);
}

// ── 뷰 행렬 ──
function lookAt(eye, center, up) {
    let zx = eye[0] - center[0], zy = eye[1] - center[1], zz = eye[2] - center[2];
    let l = 1 / Math.hypot(zx, zy, zz);
    const z = [zx * l, zy * l, zz * l];
    const x0 = up[1] * z[2] - up[2] * z[1], x1 = up[2] * z[0] - up[0] * z[2], x2 = up[0] * z[1] - up[1] * z[0];
    l = 1 / Math.hypot(x0, x1, x2);
    const x = [x0 * l, x1 * l, x2 * l];
    const y = [z[1] * x[2] - z[2] * x[1], z[2] * x[0] - z[0] * x[2], z[0] * x[1] - z[1] * x[0]];
    return new Float32Array([
        x[0], y[0], z[0], 0,
        x[1], y[1], z[1], 0,
        x[2], y[2], z[2], 0,
        -(x[0] * eye[0] + x[1] * eye[1] + x[2] * eye[2]),
        -(y[0] * eye[0] + y[1] * eye[1] + y[2] * eye[2]),
        -(z[0] * eye[0] + z[1] * eye[1] + z[2] * eye[2]),
        1,
    ]);
}

// ── Y 축 회전 행렬 ──
function rotateY(angle) {
    const c = Math.cos(angle), s = Math.sin(angle);
    return new Float32Array([
        c, 0, -s, 0,
        0, 1, 0, 0,
        s, 0, c, 0,
        0, 0, 0, 1
    ]);
}

// ── 16진수 색상을 RGB로 변환 ──
function hexToRgb(hex) {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    return { r, g, b };
}

// ── 메인 초기화 ──
async function init() {
    const canvas = document.getElementById('canvas');
    const gl = canvas.getContext('webgl2', { antialias: true });
    if (!gl) {
        showError('WebGL2 not supported');
        return;
    }

    try {
        // 셰이더 파일 로드
        const vertSrc = await loadShader('shaders/vert.glsl');
        const fragSrc = await loadShader('shaders/frag.glsl');

        // 셰이더 컴파일
        const vs = compileShader(gl, vertSrc, gl.VERTEX_SHADER, 'VERTEX');
        if (!vs) return;

        const fs = compileShader(gl, fragSrc, gl.FRAGMENT_SHADER, 'FRAGMENT');
        if (!fs) return;

        const prog = createProgram(gl, vs, fs);
        gl.useProgram(prog);

        // ── 지오메트리 설정 ──
        const vertices = new Float32Array([
            -0.8, -0.8, 0.0, 0.0, 0.0,
            0.8, -0.8, 0.0, 1.0, 0.0,
            0.8, 0.8, 0.0, 1.0, 1.0,
            -0.8, 0.8, 0.0, 0.0, 1.0,
        ]);
        const indices = new Uint16Array([0, 1, 2, 0, 2, 3]);

        const vao = gl.createVertexArray();
        gl.bindVertexArray(vao);

        const vbo = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 20, 0);

        gl.enableVertexAttribArray(1);
        gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 20, 12);

        const ebo = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ebo);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

        gl.bindVertexArray(null);

        // ── 유니폼 위치 ──
        const locProjection = gl.getUniformLocation(prog, 'uProjection');
        const locView = gl.getUniformLocation(prog, 'uView');
        const locModel = gl.getUniformLocation(prog, 'uModel');
        const locColor = gl.getUniformLocation(prog, 'uColor');

        // ── UI 엘리먼트 ──
        const colorPicker = document.getElementById('colorPicker');
        const colorSwatch = document.getElementById('colorSwatch');
        const rotSlider = document.getElementById('rotSlider');
        const rotVal = document.getElementById('rotVal');

        // ── 색상 픽커 변경 이벤트 ──
        colorPicker.addEventListener('change', (e) => {
            colorSwatch.style.background = e.target.value;
        });

        // 초기 색상 설정
        colorSwatch.style.background = colorPicker.value;

        // ── 렌더 루프 ──
        function render() {
            const { r, g, b } = hexToRgb(colorPicker.value);
            const rot = (rotSlider.value / 180) * Math.PI;
            rotVal.textContent = rotSlider.value + '°';

            gl.viewport(0, 0, canvas.width, canvas.height);
            gl.clearColor(0.04, 0.04, 0.08, 1.0);
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
            gl.enable(gl.DEPTH_TEST);

            const aspect = canvas.width / canvas.height;
            gl.uniformMatrix4fv(locProjection, false, perspective(Math.PI / 4, aspect, 0.1, 100));
            gl.uniformMatrix4fv(locView, false, lookAt([0, 0, 3], [0, 0, 0], [0, 1, 0]));
            gl.uniformMatrix4fv(locModel, false, rotateY(rot));
            gl.uniform4f(locColor, r, g, b, 1.0);

            gl.bindVertexArray(vao);
            gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);

            requestAnimationFrame(render);
        }
        render();

    } catch (error) {
        showError(`초기화 오류:\n${error.message}`);
        console.error(error);
    }
}

// ── 페이지 로드 완료 후 시작 ──
init();