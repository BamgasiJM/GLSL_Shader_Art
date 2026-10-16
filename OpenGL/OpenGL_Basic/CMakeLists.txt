cmake_minimum_required(VERSION 3.24)
project(OpenGL_Basic LANGUAGES C CXX)

# The supplied glfw3.lib is an MSVC x64 static library built with /MDd.
if(NOT WIN32 OR NOT MSVC OR NOT CMAKE_SIZEOF_VOID_P EQUAL 8)
    message(FATAL_ERROR "The bundled GLFW requires MSVC x64 on Windows.")
endif()
if(CMAKE_CONFIGURATION_TYPES)
    set(CMAKE_CONFIGURATION_TYPES Debug CACHE STRING "Bundled GLFW supports Debug only" FORCE)
elseif(NOT CMAKE_BUILD_TYPE STREQUAL "Debug")
    message(FATAL_ERROR "The bundled GLFW uses /MDd. Configure with -DCMAKE_BUILD_TYPE=Debug.")
endif()
set(CMAKE_MSVC_RUNTIME_LIBRARY MultiThreadedDebugDLL)

# Some localized MSVC installations have no English language pack. Preserve the
# compiler's actual output bytes so Ninja can track included headers correctly.
if(CMAKE_GENERATOR STREQUAL "Ninja")
    include(cmake/DetectMsvcIncludes.cmake)
endif()

foreach(required IN ITEMS include/GLFW/glfw3.h include/glad/glad.h
        include/KHR/khrplatform.h lib/glfw3.lib src/glad.c
        shaders/vert.glsl shaders/frag.glsl)
    if(NOT EXISTS "${CMAKE_CURRENT_SOURCE_DIR}/${required}")
        message(FATAL_ERROR "Missing dependency: ${required}. See README.md.")
    endif()
endforeach()

add_library(basic_glfw STATIC IMPORTED)
set_target_properties(basic_glfw PROPERTIES
    IMPORTED_LOCATION "${CMAKE_CURRENT_SOURCE_DIR}/lib/glfw3.lib"
    INTERFACE_INCLUDE_DIRECTORIES "${CMAKE_CURRENT_SOURCE_DIR}/include"
    INTERFACE_LINK_LIBRARIES "user32;gdi32;shell32;uuid")

add_library(basic_glad STATIC src/glad.c)
target_include_directories(basic_glad PUBLIC "${CMAKE_CURRENT_SOURCE_DIR}/include")

# Embed one fixed pair of shaders into one executable.
set(generated_directory "${CMAKE_CURRENT_BINARY_DIR}/generated")
set(embedded_header "${generated_directory}/embedded_shaders.h")
add_custom_command(OUTPUT "${embedded_header}"
    COMMAND "${CMAKE_COMMAND}"
        "-DVERTEX_FILE=${CMAKE_CURRENT_SOURCE_DIR}/shaders/vert.glsl"
        "-DFRAGMENT_FILE=${CMAKE_CURRENT_SOURCE_DIR}/shaders/frag.glsl"
        "-DOUTPUT_FILE=${embedded_header}"
        -P "${CMAKE_CURRENT_SOURCE_DIR}/cmake/EmbedShaders.cmake"
    DEPENDS shaders/vert.glsl shaders/frag.glsl cmake/EmbedShaders.cmake
    COMMENT "Embedding GLSL for OpenGL_Basic"
    VERBATIM)

add_executable(OpenGL_Basic src/main.cpp "${embedded_header}")
target_include_directories(OpenGL_Basic PRIVATE "${generated_directory}")
target_compile_features(OpenGL_Basic PRIVATE cxx_std_17)
set_target_properties(OpenGL_Basic PROPERTIES CXX_EXTENSIONS OFF)
target_compile_definitions(OpenGL_Basic PRIVATE GLFW_INCLUDE_NONE WIN32_LEAN_AND_MEAN NOMINMAX)
target_compile_options(OpenGL_Basic PRIVATE /W4 /permissive- /utf-8)
target_link_libraries(OpenGL_Basic PRIVATE basic_glad basic_glfw opengl32)
set_property(DIRECTORY PROPERTY VS_STARTUP_PROJECT OpenGL_Basic)
