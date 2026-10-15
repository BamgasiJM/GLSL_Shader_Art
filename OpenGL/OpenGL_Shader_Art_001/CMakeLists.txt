cmake_minimum_required(VERSION 3.24)
project(OpenGL_Shader_Art_001 LANGUAGES C CXX)

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
        include/KHR/khrplatform.h lib/glfw3.lib src/glad.c)
    if(NOT EXISTS "${CMAKE_CURRENT_SOURCE_DIR}/${required}")
        message(FATAL_ERROR "Missing dependency: ${required}. See README.md.")
    endif()
endforeach()

add_library(glfw_bundled STATIC IMPORTED)
set_target_properties(glfw_bundled PROPERTIES
    IMPORTED_LOCATION "${CMAKE_CURRENT_SOURCE_DIR}/lib/glfw3.lib"
    INTERFACE_INCLUDE_DIRECTORIES "${CMAKE_CURRENT_SOURCE_DIR}/include"
    INTERFACE_LINK_LIBRARIES "user32;gdi32;shell32;uuid")

add_library(glad STATIC src/glad.c)
target_include_directories(glad PUBLIC "${CMAKE_CURRENT_SOURCE_DIR}/include")

# Each complete Art_NNN directory becomes an executable with embedded GLSL.
file(GLOB artwork_directories CONFIGURE_DEPENDS LIST_DIRECTORIES true
    "${CMAKE_CURRENT_SOURCE_DIR}/shaders/Art_*")
set(artwork_targets)
foreach(artwork_directory IN LISTS artwork_directories)
    if(NOT IS_DIRECTORY "${artwork_directory}")
        continue()
    endif()
    get_filename_component(artwork_name "${artwork_directory}" NAME)
    if(NOT artwork_name MATCHES "^Art_[0-9]+$")
        message(FATAL_ERROR "Artwork folder must be named Art_001, Art_002, etc.: ${artwork_name}")
    endif()
    foreach(shader IN ITEMS vert.glsl frag.glsl)
        if(NOT EXISTS "${artwork_directory}/${shader}")
            message(FATAL_ERROR "Missing shader: ${artwork_directory}/${shader}")
        endif()
    endforeach()
    set(generated_directory "${CMAKE_CURRENT_BINARY_DIR}/generated/${artwork_name}")
    set(embedded_header "${generated_directory}/embedded_shaders.h")
    add_custom_command(OUTPUT "${embedded_header}"
        COMMAND "${CMAKE_COMMAND}"
            "-DART_NAME=${artwork_name}"
            "-DVERTEX_FILE=${artwork_directory}/vert.glsl"
            "-DFRAGMENT_FILE=${artwork_directory}/frag.glsl"
            "-DOUTPUT_FILE=${embedded_header}"
            -P "${CMAKE_CURRENT_SOURCE_DIR}/cmake/EmbedShaders.cmake"
        DEPENDS "${artwork_directory}/vert.glsl" "${artwork_directory}/frag.glsl"
            "${CMAKE_CURRENT_SOURCE_DIR}/cmake/EmbedShaders.cmake"
        COMMENT "Embedding GLSL for ${artwork_name}"
        VERBATIM)
    add_executable(${artwork_name} src/main.cpp "${embedded_header}")
    target_include_directories(${artwork_name} PRIVATE "${generated_directory}")
    target_compile_features(${artwork_name} PRIVATE cxx_std_17)
    set_target_properties(${artwork_name} PROPERTIES CXX_EXTENSIONS OFF)
    target_compile_definitions(${artwork_name} PRIVATE GLFW_INCLUDE_NONE WIN32_LEAN_AND_MEAN NOMINMAX)
    target_compile_options(${artwork_name} PRIVATE /W4 /permissive- /utf-8)
    target_link_libraries(${artwork_name} PRIVATE glad glfw_bundled opengl32)
    list(APPEND artwork_targets ${artwork_name})
endforeach()
if(NOT artwork_targets)
    message(FATAL_ERROR "Create shaders/Art_001 with vert.glsl and frag.glsl.")
endif()
list(GET artwork_targets 0 first_artwork)
set_property(DIRECTORY PROPERTY VS_STARTUP_PROJECT "${first_artwork}")
