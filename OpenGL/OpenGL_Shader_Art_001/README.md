# OpenGL Shader Art 001

Windows 11에서 C++17, CMake, GLFW, GLAD로 구성하는 OpenGL 4.6 Core 셰이더 아트 프로젝트입니다.
작품별 GLSL을 실행 파일 안에 포함해 `Art_001.exe`, `Art_002.exe`처럼 개별 프로그램을 만듭니다.
각 EXE를 더블클릭하면 실행 옵션이나 외부 GLSL 파일 없이 해당 작품이 표시됩니다.
기본 창 크기는 960×640입니다.

## 개발 환경

| 항목 | 설정 |
| --- | --- |
| 운영체제 | Windows 11, x64 |
| 언어 | C++17, C |
| 컴파일러 | MSVC x64 |
| 빌드 도구 | CMake 3.24 이상, Ninja |
| 에디터 | VS Code, Microsoft C/C++ 확장 |
| 그래픽 API | OpenGL 4.6 Core, GLSL 4.60 |
| 라이브러리 | GLFW 3.4.0, GLAD 0.1.36 |
| 빌드 구성 | Debug, 동적 Debug CRT(`/MDd`) |

Visual Studio 또는 Build Tools에서 **Desktop development with C++** 워크로드와 Windows SDK를 설치합니다.
CMake와 Ninja는 `PATH`에서 실행할 수 있도록 설정합니다. GPU와 드라이버는 OpenGL 4.6을 지원해야 합니다.

## 라이브러리 준비

### GLFW

GLFW는 창 생성, OpenGL 컨텍스트 관리, 키보드 입력을 담당합니다.
[GLFW 3.4 소스](https://github.com/glfw/glfw/releases/tag/3.4)를 다운로드하고
MSVC x64 환경에서 정적 라이브러리, Debug, `/MDd` 구성으로 빌드합니다.

소스 압축을 푼 `glfw` 디렉터리를 기준으로 x64 Developer PowerShell에서 실행합니다.

```powershell
cmake -S ./glfw -B ./glfw-build -G Ninja -DCMAKE_BUILD_TYPE=Debug -DBUILD_SHARED_LIBS=OFF -DGLFW_BUILD_DOCS=OFF -DGLFW_BUILD_TESTS=OFF -DGLFW_BUILD_EXAMPLES=OFF
cmake --build ./glfw-build
```

`glfw/include/GLFW/glfw3.h`를 프로젝트의 `include/GLFW/`에,
`glfw-build/src/glfw3.lib`를 `lib/`에 배치합니다.
프로젝트는 정적 GLFW 라이브러리를 링크하므로 `GLFW_DLL`을 정의하지 않습니다.

### GLAD

GLAD는 OpenGL 함수 포인터를 로딩합니다.
[GLAD 0.1.36](https://pypi.org/project/glad/0.1.36/) 또는
[GLAD 1 웹 생성기](https://glad.dav1d.de/)에서 다음 설정으로 파일을 생성합니다.

| 옵션 | 값 |
| --- | --- |
| Language | C/C++ |
| Specification | OpenGL (`gl`) |
| API | OpenGL 4.6 |
| Profile | Core |
| Extensions | 없음 |
| Loader | 포함 |

생성 파일을 다음 위치에 배치합니다.

| 생성 파일 | 프로젝트 경로 |
| --- | --- |
| `include/glad/glad.h` | `include/glad/glad.h` |
| `include/KHR/khrplatform.h` | `include/KHR/khrplatform.h` |
| `src/glad.c` | `src/glad.c` |
| 생성기 라이선스 | `src/GLAD-LICENSE.txt` |

GLAD 0.1.36의 헤더는 `<glad/glad.h>`이며 초기화 함수는 `gladLoadGLLoader()`입니다.
컨텍스트를 생성하고 현재 스레드에 연결한 뒤 초기화합니다.

```cpp
glfwMakeContextCurrent(window);
gladLoadGLLoader(reinterpret_cast<GLADloadproc>(glfwGetProcAddress));
```

라이브러리 파일을 준비한 뒤에는 Python이나 네트워크 연결 없이 빌드할 수 있습니다.

## 프로젝트 구조

```text
GLSL_Shader_Art/
├─ .vscode/
│  ├─ tasks.json                 # 빌드 작업
│  ├─ launch.json                # MSVC 디버깅 설정
│  └─ extensions.json            # 권장 확장
├─ OpenGL/
│  ├─ CMakeLists.txt             # OpenGL 프로젝트 진입점
│  └─ OpenGL_Shader_Art_001/
│     ├─ CMakeLists.txt          # 소스, 라이브러리, 링크 설정
│     ├─ CMakePresets.json       # MSVC x64 Debug 프리셋
│     ├─ .gitignore
│     ├─ README.md
│     ├─ cmake/DetectMsvcIncludes.cmake
│     ├─ cmake/EmbedShaders.cmake # GLSL을 C++ 바이트 배열로 변환
│     ├─ tools/build.ps1         # MSVC 환경 설정 및 빌드
│     ├─ src/
│     │  ├─ main.cpp            # 창 생성, 내장 셰이더 컴파일, 렌더링
│     │  ├─ glad.c
│     │  └─ GLAD-LICENSE.txt
│     ├─ shaders/
│     │  ├─ Art_001/
│     │  │  ├─ vert.glsl
│     │  │  └─ frag.glsl
│     │  └─ Art_002/
│     │     ├─ vert.glsl
│     │     └─ frag.glsl
│     ├─ include/
│     │  ├─ GLFW/glfw3.h
│     │  ├─ glad/glad.h
│     │  └─ KHR/khrplatform.h
│     ├─ lib/glfw3.lib
│     └─ build/windows-debug/   # 빌드 시 생성, Git 제외
│        ├─ Art_001.exe
│        ├─ Art_002.exe
│        └─ generated/          # 작품별 내장 셰이더 헤더
└─ WebGL/                       # WebGL 셰이더 아트 프로젝트
```

CMake는 `glad.c`를 정적 라이브러리로 빌드하고 GLFW 및 Windows 시스템 라이브러리를 실행 파일에 연결합니다.
`shaders/Art_숫자` 형식의 폴더를 자동으로 찾아 같은 이름의 실행 파일을 정의합니다.
각 폴더에는 `vert.glsl`과 `frag.glsl`이 모두 있어야 합니다.
`EmbedShaders.cmake`는 GLSL의 내용을 바이트 배열로 변환하고 C++ 컴파일러가 이를 EXE에 포함합니다.
`generated/`의 헤더는 자동 생성 파일이므로 셰이더 편집은 `shaders/`에서 합니다.
`DetectMsvcIncludes.cmake`는 MSVC의 언어별 헤더 경로 출력 형식을 감지해 Ninja의 헤더 의존성 추적에 사용합니다.

## 빌드 및 실행

### PowerShell

저장소 루트에서 실행합니다.
빌드 스크립트는 `vswhere.exe`로 MSVC 설치 경로를 찾고 x64 개발 환경을 설정합니다.

```powershell
# Art_001만 빌드 → build/windows-debug/Art_001.exe
powershell.exe -NoProfile -ExecutionPolicy Bypass -File ./OpenGL/OpenGL_Shader_Art_001/tools/build.ps1 -Art Art_001

# Art_002만 빌드 → build/windows-debug/Art_002.exe
powershell.exe -NoProfile -ExecutionPolicy Bypass -File ./OpenGL/OpenGL_Shader_Art_001/tools/build.ps1 -Art Art_002

# 전체 작품 빌드
powershell.exe -NoProfile -ExecutionPolicy Bypass -File ./OpenGL/OpenGL_Shader_Art_001/tools/build.ps1

# 선택한 작품을 빌드한 뒤 실행
powershell.exe -NoProfile -ExecutionPolicy Bypass -File ./OpenGL/OpenGL_Shader_Art_001/tools/build.ps1 -Art Art_002 -Run

# 생성된 EXE 직접 실행 (파일 탐색기에서 더블클릭해도 동일)
& ./OpenGL/OpenGL_Shader_Art_001/build/windows-debug/Art_002.exe
```

CMake 캐시를 다시 구성하려면 빌드 스크립트에 `-Fresh`를 추가합니다.
`-Run`만 지정하면 `Art_001`을 빌드하고 실행합니다.
`Esc` 또는 창 닫기로 프로그램을 종료합니다.

### CMake 직접 사용

x64 Developer PowerShell에서 실행합니다.

```powershell
Set-Location ./OpenGL/OpenGL_Shader_Art_001
cmake --preset windows-debug

# 선택한 작품만 빌드
cmake --build --preset windows-debug --target Art_002

# 전체 작품 빌드
cmake --build --preset windows-debug
& ./build/windows-debug/Art_002.exe
```

### VS Code

1. 저장소 루트 `GLSL_Shader_Art`를 엽니다.
2. Microsoft C/C++ 확장을 설치합니다.
3. `Ctrl+Shift+B`를 누르고 `Art_002`를 입력하면 `Art_002.exe`가 생성됩니다.
4. 실행하려면 `F5`에서 `OpenGL Shader Art (MSVC x64 Debug)`를 선택하고 작품 이름을 입력합니다.

`Ctrl+Shift+B`는 선택한 작품만 빌드합니다.
`F5`는 모든 작품을 빌드한 뒤 입력한 이름의 EXE를 디버거로 실행합니다.
변경이 없는 작품은 다시 컴파일하지 않습니다.
`F5`만으로도 빌드와 실행이 가능하며, 실행 중인 창은 다음 빌드 전에 종료합니다.
디버깅 없이 확인하려면 생성된 EXE를 더블클릭합니다.

## 작품별 셰이더 관리

각 작품은 `shaders/Art_001`, `shaders/Art_002`처럼 별도 폴더에 저장합니다.
폴더마다 `vert.glsl`과 `frag.glsl`을 한 쌍으로 배치합니다.
`Art_001`은 색상 고리 예제이며, `Art_002`는 같은 셰이더를 복사한 새 작품 작성용 템플릿입니다.

작품 폴더 이름이 CMake 빌드 대상과 EXE 이름이 됩니다.
작품 이름은 EXE에 포함되어 창 제목과 콘솔에 표시됩니다.

```powershell
# 저장소 루트 기준
& ./OpenGL/OpenGL_Shader_Art_001/build/windows-debug/Art_001.exe
& ./OpenGL/OpenGL_Shader_Art_001/build/windows-debug/Art_002.exe
```

새 작품을 추가하는 순서는 다음과 같습니다.

1. `shaders/Art_003`과 같은 폴더를 만듭니다.
2. 템플릿의 `vert.glsl`과 `frag.glsl`을 복사한 뒤 수정합니다.
3. 저장하고 `Ctrl+Shift+B`에서 `Art_003`을 입력해 빌드합니다.
4. `build/windows-debug/Art_003.exe`를 더블클릭하거나 `F5`에서 `Art_003`을 입력합니다.

작품 추가 시 C++ 소스나 CMake 설정을 수정할 필요는 없습니다.
폴더를 추가하면 다음 구성·빌드 과정에서 자동으로 등록됩니다.
각 EXE에는 해당 작품의 셰이더만 포함됩니다. EXE 파일명을 바꾸어도 내장된 작품은 바뀌지 않습니다.

## 셰이더 작성

각 작품 폴더의 두 셰이더는 `#version 460 core`를 사용합니다.
`vert.glsl`은 `gl_VertexID`로 전체 화면 삼각형의 정점 위치를 생성합니다.
`main.cpp`는 Core Profile에 필요한 VAO를 생성하고 삼각형을 그립니다.
`frag.glsl`에서 픽셀별 색상을 계산합니다.

| Uniform | 타입 | 의미 |
| --- | --- | --- |
| `u_resolution` | `vec2` | 프레임버퍼의 실제 픽셀 크기 |
| `u_time` | `float` | GLFW 타이머의 초 단위 값 |

셰이더를 수정하고 해당 작품을 빌드하면 내장 데이터가 갱신되어 EXE에 반영됩니다.
셰이더 파일의 변경은 빌드 의존성으로 추적되므로 C++ 소스를 수정할 필요는 없습니다.
실행 중인 프로그램에는 변경이 바로 반영되지 않으며, 빌드 후 다시 실행합니다.

GLSL 소스는 빌드할 때 EXE에 포함되며, GPU용 셰이더 컴파일과 프로그램 링크는 실행 시 드라이버가 수행합니다.
GLSL 문법 오류는 실행 시 콘솔에 작품 이름과 셰이더 이름, 오류 내용으로 출력됩니다.
빌드 성공이 GLSL의 유효성까지 보장하는 것은 아니므로 실행하여 결과를 확인합니다.

WebGL과 비교할 때는 색상 계산과 시간·해상도 uniform을 공유하고,
GLSL 버전 지시문과 정밀도 선언을 각 환경에 맞게 조정합니다.

## 렌더링 확인

실행 시 콘솔에 GLFW, OpenGL, GLSL 버전과 GPU 이름이 출력됩니다.
프로그램은 OpenGL 4.6 지원 및 Core Profile 여부를 검사합니다.

저장소 루트에서 다음 명령을 실행하면 3프레임을 렌더링하고 마지막 프레임을 PPM 이미지로 저장합니다.

```powershell
& ./OpenGL/OpenGL_Shader_Art_001/build/windows-debug/Art_001.exe --frames 3 --capture ./OpenGL/OpenGL_Shader_Art_001/build/frame.ppm
```

`--frames N`은 지정한 프레임 수 이후 프로그램을 종료합니다.
`--capture`는 `--frames`와 함께 사용하며, 저장할 상위 디렉터리는 실행 전에 생성되어 있어야 합니다.

## EXE 이동 및 배포

각 작품의 EXE는 GLSL, GLFW, GLAD 코드를 포함하므로 외부 `shaders/` 폴더나 GLFW DLL을 함께 옮길 필요가 없습니다.
EXE만 다른 폴더에 복사해 실행할 수 있습니다.
실행 PC에는 OpenGL 4.6을 지원하는 GPU 및 드라이버가 필요합니다.

이 프로젝트의 프리셋과 링크 설정은 MSVC x64 Debug(`/MDd`)를 사용합니다.
따라서 현재 EXE는 Debug CRT가 설치된 개발 환경에서 실행합니다.
셰이더를 내장하는 것과 C++ 런타임을 내장하는 것은 별도의 설정입니다.

개발 도구가 없는 PC에 배포하려면 Release 구성을 추가해야 합니다.
동적 CRT(`/MD`)를 사용하면 배포 대상 PC에 Visual C++ Redistributable이 필요합니다.
C++ 런타임까지 포함한 단일 EXE를 만들려면 GLFW와 앱, GLAD를 모두 Release 정적 CRT(`/MT`)로 빌드하도록
라이브러리와 CMake 설정을 함께 변경해야 합니다. 이 프로젝트의 Debug 프리셋은 `/MDd` 전용입니다.

## 다운로드

- [Visual Studio Build Tools](https://visualstudio.microsoft.com/downloads/#build-tools-for-visual-studio)
- [CMake](https://cmake.org/download/)
- [Ninja](https://github.com/ninja-build/ninja/releases)
- [GLFW 3.4](https://github.com/glfw/glfw/releases/tag/3.4)
- [GLAD 0.1.36](https://pypi.org/project/glad/0.1.36/)
- [GLAD 1 웹 생성기](https://glad.dav1d.de/)
