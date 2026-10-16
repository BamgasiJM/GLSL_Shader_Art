foreach(required IN ITEMS VERTEX_FILE FRAGMENT_FILE OUTPUT_FILE)
    if(NOT DEFINED ${required})
        message(FATAL_ERROR "Missing embedding parameter: ${required}")
    endif()
endforeach()

# Byte arrays preserve quotes, backslashes, UTF-8 and GLSL preprocessor text.
file(READ "${VERTEX_FILE}" vertex_hex HEX)
file(READ "${FRAGMENT_FILE}" fragment_hex HEX)
string(REGEX REPLACE "([0-9a-f][0-9a-f])" "0x\\1," vertex_bytes "${vertex_hex}")
string(REGEX REPLACE "([0-9a-f][0-9a-f])" "0x\\1," fragment_bytes "${fragment_hex}")
get_filename_component(output_directory "${OUTPUT_FILE}" DIRECTORY)
file(MAKE_DIRECTORY "${output_directory}")
file(WRITE "${OUTPUT_FILE}"
    "// Generated from GLSL. Edit shaders/vert.glsl and shaders/frag.glsl.\n"
    "#pragma once\n"
    "namespace shaders {\n"
    "inline constexpr unsigned char vertexSource[] = {${vertex_bytes}0};\n"
    "inline constexpr unsigned char fragmentSource[] = {${fragment_bytes}0};\n"
    "}\n")
