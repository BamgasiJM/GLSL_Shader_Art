set(probe_directory "${CMAKE_CURRENT_BINARY_DIR}/CMakeFiles/msvc-includes")
file(MAKE_DIRECTORY "${probe_directory}")
file(WRITE "${probe_directory}/probe.c" "#include <stddef.h>\n")
execute_process(
    COMMAND "${CMAKE_C_COMPILER}" /nologo /showIncludes /c
        "${probe_directory}/probe.c" "/Fo${probe_directory}/probe.obj"
    RESULT_VARIABLE probe_result
    OUTPUT_VARIABLE probe_output
    ERROR_VARIABLE probe_error
    ENCODING NONE)
if(NOT probe_result EQUAL 0)
    message(FATAL_ERROR "MSVC include dependency probe failed: ${probe_error}")
endif()
# Match the localized prefix before an absolute Windows header path.
string(REGEX MATCH "[\r\n]([^\r\n]+: )[A-Za-z]:[/\\\\]" probe_match "${probe_output}\n${probe_error}")
if(NOT probe_match)
    message(FATAL_ERROR "Cannot detect the MSVC /showIncludes prefix for Ninja.")
endif()
set(CMAKE_CL_SHOWINCLUDES_PREFIX "${CMAKE_MATCH_1}")
if(NOT CMAKE_CURRENT_SOURCE_DIR STREQUAL CMAKE_SOURCE_DIR)
    # Ninja writes one global rules file for the parent build as well.
    set(CMAKE_CL_SHOWINCLUDES_PREFIX "${CMAKE_MATCH_1}" PARENT_SCOPE)
endif()
