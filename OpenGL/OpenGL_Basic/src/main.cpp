#include <glad/glad.h>
#include <GLFW/glfw3.h>
#include "embedded_shaders.h"

#include <iostream>
#include <stdexcept>
#include <string>
#include <vector>

GLuint compileShader(GLenum type, const char* source, const std::string& label)
{
    const GLuint shader = glCreateShader(type);
    glShaderSource(shader, 1, &source, nullptr);
    glCompileShader(shader);
    GLint success = GL_FALSE;
    glGetShaderiv(shader, GL_COMPILE_STATUS, &success);
    if (success != GL_TRUE) {
        GLint length = 0;
        glGetShaderiv(shader, GL_INFO_LOG_LENGTH, &length);
        std::vector<char> log(static_cast<std::size_t>(length) + 1, '\0');
        glGetShaderInfoLog(shader, static_cast<GLsizei>(log.size()), nullptr, log.data());
        glDeleteShader(shader);
        throw std::runtime_error("Embedded shader compilation failed: " + label + "\n" + log.data());
    }
    return shader;
}

GLuint loadProgram()
{
    const GLuint vertex = compileShader(GL_VERTEX_SHADER,
        reinterpret_cast<const char*>(shaders::vertexSource), "shaders/vert.glsl");
    GLuint fragment = 0;
    GLuint program = 0;
    try {
        fragment = compileShader(GL_FRAGMENT_SHADER,
            reinterpret_cast<const char*>(shaders::fragmentSource), "shaders/frag.glsl");
        program = glCreateProgram();
        glAttachShader(program, vertex);
        glAttachShader(program, fragment);
        glLinkProgram(program);
        GLint success = GL_FALSE;
        glGetProgramiv(program, GL_LINK_STATUS, &success);
        if (success != GL_TRUE) {
            GLint length = 0;
            glGetProgramiv(program, GL_INFO_LOG_LENGTH, &length);
            std::vector<char> log(static_cast<std::size_t>(length) + 1, '\0');
            glGetProgramInfoLog(program, static_cast<GLsizei>(log.size()), nullptr, log.data());
            throw std::runtime_error(std::string("Shader program link failed:\n") + log.data());
        }
    } catch (...) {
        if (program) glDeleteProgram(program);
        if (fragment) glDeleteShader(fragment);
        glDeleteShader(vertex);
        throw;
    }
    glDeleteShader(vertex);
    glDeleteShader(fragment);
    return program;
}

int main()
{
    GLFWwindow* window = nullptr;
    GLuint program = 0;
    GLuint vao = 0;
    bool initialized = false;
    int result = 0;
    try {
        glfwSetErrorCallback([](int code, const char* description) {
            std::cerr << "GLFW error " << code << ": " << description << '\n';
        });
        std::cout << "GLFW headers: " << GLFW_VERSION_MAJOR << '.' << GLFW_VERSION_MINOR
                  << '.' << GLFW_VERSION_REVISION << "\nGLFW library: "
                  << glfwGetVersionString() << '\n';
        if (!glfwInit()) throw std::runtime_error("GLFW initialization failed.");
        initialized = true;
        glfwWindowHint(GLFW_CONTEXT_VERSION_MAJOR, 4);
        glfwWindowHint(GLFW_CONTEXT_VERSION_MINOR, 6);
        glfwWindowHint(GLFW_OPENGL_PROFILE, GLFW_OPENGL_CORE_PROFILE);
        window = glfwCreateWindow(960, 640, "OpenGL Basic - OpenGL 4.6 Core", nullptr, nullptr);
        if (!window)
            throw std::runtime_error("Cannot create OpenGL 4.6 Core context. Check GPU/driver support.");
        glfwMakeContextCurrent(window);
        if (!gladLoadGLLoader(reinterpret_cast<GLADloadproc>(glfwGetProcAddress)))
            throw std::runtime_error("GLAD 0.1.36 initialization failed.");
        if (!GLAD_GL_VERSION_4_6)
            throw std::runtime_error("The context does not support OpenGL 4.6.");
        GLint profile = 0;
        glGetIntegerv(GL_CONTEXT_PROFILE_MASK, &profile);
        if ((profile & GL_CONTEXT_CORE_PROFILE_BIT) == 0)
            throw std::runtime_error("The context is not OpenGL Core Profile.");
        std::cout << "OpenGL: " << glGetString(GL_VERSION)
                  << "\nGLSL: " << glGetString(GL_SHADING_LANGUAGE_VERSION)
                  << "\nRenderer: " << glGetString(GL_RENDERER) << '\n';
        glfwSwapInterval(1);
        glfwSetFramebufferSizeCallback(window, [](GLFWwindow*, int width, int height) {
            glViewport(0, 0, width, height);
        });
        glfwSetKeyCallback(window, [](GLFWwindow* current, int key, int, int action, int) {
            if (key == GLFW_KEY_ESCAPE && action == GLFW_PRESS)
                glfwSetWindowShouldClose(current, GLFW_TRUE);
        });

        program = loadProgram();
        std::cout << "Shaders: embedded vert.glsl and frag.glsl" << std::endl;
        const GLint resolutionLocation = glGetUniformLocation(program, "u_resolution");
        const GLint timeLocation = glGetUniformLocation(program, "u_time");
        glGenVertexArrays(1, &vao);
        glBindVertexArray(vao);
        while (!glfwWindowShouldClose(window)) {
            glfwPollEvents();
            int width = 0;
            int height = 0;
            glfwGetFramebufferSize(window, &width, &height);
            if (width == 0 || height == 0) {
                glfwWaitEventsTimeout(0.05);
                continue;
            }
            glViewport(0, 0, width, height);
            glUseProgram(program);
            glUniform2f(resolutionLocation, static_cast<float>(width), static_cast<float>(height));
            glUniform1f(timeLocation, static_cast<float>(glfwGetTime()));
            glDrawArrays(GL_TRIANGLES, 0, 3);
            if (glGetError() != GL_NO_ERROR)
                throw std::runtime_error("OpenGL rendering error.");
            glfwSwapBuffers(window);
        }
    } catch (const std::exception& error) {
        std::cerr << error.what() << '\n';
        result = 1;
    }
    if (vao) glDeleteVertexArrays(1, &vao);
    if (program) glDeleteProgram(program);
    if (window) glfwDestroyWindow(window);
    if (initialized) glfwTerminate();
    return result;
}
