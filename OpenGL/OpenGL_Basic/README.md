# OpenGL Basic

Windows 11, C++17, CMake, GLFW, GLAD를 사용하는 OpenGL 4.6 Core 셰이더 아트의 기본 프로젝트입니다.
`shaders/vert.glsl`과 `shaders/frag.glsl` 한 쌍으로 `OpenGL_Basic.exe` 하나를 만듭니다.
GLSL은 빌드할 때 EXE에 포함되며, 실행 옵션 없이 더블클릭으로 실행할 수 있습니다.

## 개발 환경

| 항목 | 설정 |
| --- | --- |
| 컴파일러 | MSVC x64, C++17 |
| 빌드 도구 | CMake 3.24 이상, Ninja |
| 그래픽 API | OpenGL 4.6 Core, GLSL 4.60 |
| 라이브러리 | GLFW 3.4.0 정적 라이브러리, GLAD 0.1.36 |
| 빌드 구성 | Debug, 동적 Debug CRT(`/MDd`) |

Visual Studio 또는 Build Tools의 **Desktop development with C++** 워크로드와 Windows SDK가 필요합니다.
CMake와 Ninja는 `PATH`에서 실행할 수 있어야 하며 GPU 드라이버는 OpenGL 4.6을 지원해야 합니다.
VS Code에서는 Microsoft C/C++ 확장을 설치합니다.

## 구조

```text
OpenGL_Basic/
├─ CMakeLists.txt
├─ CMakePresets.json
├─ .gitignore
├─ README.md
├─ cmake/
│  ├─ DetectMsvcIncludes.cmake   # MSVC/Ninja 헤더 의존성 감지
│  └─ EmbedShaders.cmake        # 단일 GLSL 쌍을 EXE에 포함
├─ tools/build.ps1             # MSVC 환경 설정 및 빌드
├─ src/
│  ├─ main.cpp                 # 창, 셰이더 컴파일, 렌더링 루프
│  ├─ glad.c
│  └─ GLAD-LICENSE.txt
├─ shaders/
│  ├─ vert.glsl
│  └─ frag.glsl
├─ include/
│  ├─ GLFW/glfw3.h
│  ├─ glad/glad.h
│  └─ KHR/khrplatform.h
├─ lib/glfw3.lib
└─ build/windows-debug/        # 자동 생성, Git 제외
   ├─ OpenGL_Basic.exe
   └─ generated/embedded_shaders.h
```

프로그램은 창 생성, GLAD 초기화, 셰이더 컴파일·링크, 전체 화면 삼각형 렌더링을 수행합니다.
창 크기는 960×640이며 크기를 변경하면 해상도 uniform과 뷰포트도 갱신합니다.
`Esc` 또는 창 닫기로 종료합니다.

## VS Code에서 실행

저장소 루트 `GLSL_Shader_Art`를 엽니다.
실행 및 디버그 창(`Ctrl+Shift+D`)에서 **OpenGL Basic (MSVC x64 Debug)**을 선택한 뒤 `F5`를 누릅니다.
작품 이름 입력 없이 Basic을 빌드하고 실행합니다.

빌드만 하려면 **터미널 → 작업 실행 → Build OpenGL Basic**을 선택합니다.
`Ctrl+Shift+B`의 기본 작업은 여러 작품용 Shader Art 프로젝트에 연결되어 있습니다.
Basic에는 별도의 빌드 작업과 실행 구성이 있습니다.

## PowerShell에서 빌드 및 실행

저장소 루트에서 실행합니다.

```powershell
# 빌드
powershell.exe -NoProfile -ExecutionPolicy Bypass -File ./OpenGL/OpenGL_Basic/tools/build.ps1

# 빌드 후 실행
powershell.exe -NoProfile -ExecutionPolicy Bypass -File ./OpenGL/OpenGL_Basic/tools/build.ps1 -Run

# EXE 직접 실행
& ./OpenGL/OpenGL_Basic/build/windows-debug/OpenGL_Basic.exe
```

스크립트는 MSVC x64 개발 환경을 설정한 뒤 CMake를 호출합니다.
캐시를 다시 구성하려면 `-Fresh`를 추가합니다.

x64 Developer PowerShell에서는 CMake를 직접 사용할 수 있습니다.

```powershell
Set-Location ./OpenGL/OpenGL_Basic
cmake --preset windows-debug
cmake --build --preset windows-debug
& ./build/windows-debug/OpenGL_Basic.exe
```

## 셰이더 수정

`shaders/vert.glsl`은 `gl_VertexID`로 전체 화면 삼각형을 생성하고,
`shaders/frag.glsl`은 각 픽셀의 색상을 계산합니다. 두 파일은 `#version 460 core`를 사용합니다.

| Uniform | 타입 | 의미 |
| --- | --- | --- |
| `u_resolution` | `vec2` | 프레임버퍼의 실제 픽셀 크기 |
| `u_time` | `float` | GLFW 타이머의 초 단위 값 |

1. 실행 중인 창을 닫습니다.
2. `shaders/frag.glsl` 또는 `vert.glsl`을 수정하고 저장합니다.
3. Basic 실행 구성을 선택한 상태에서 `F5`를 누릅니다.

GLSL 변경은 빌드 의존성으로 추적되어 EXE의 셰이더 데이터가 갱신됩니다.
`generated/embedded_shaders.h`는 자동 생성 파일이므로 직접 수정하지 않습니다.
GPU용 셰이더 컴파일과 링크는 실행 시 드라이버가 수행하며 오류는 콘솔에 출력됩니다.

## EXE 실행 조건

GLSL과 GLFW·GLAD 코드는 EXE에 포함되므로 외부 셰이더 파일이나 GLFW DLL은 필요하지 않습니다.
현재 구성은 `/MDd`이므로 Debug CRT가 설치된 개발 환경에서 실행합니다.
다른 PC에 C++ 런타임까지 포함한 단일 EXE로 배포하려면 GLFW와 앱·GLAD를 모두 Release `/MT`로 빌드하도록
라이브러리와 CMake 설정을 함께 변경해야 합니다.
