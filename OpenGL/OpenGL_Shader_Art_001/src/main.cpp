#include <glad/glad.h>
#include <GLFW/glfw3.h>
#include "embedded_shaders.h"

#include <filesystem>
#include <fstream>
#include <iostream>
#include <stdexcept>
#include <string>
#include <vector>

namespace fs = std::filesystem;

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
    const std::string label = std::string(artwork::name) + "/";
    const GLuint vertex = compileShader(GL_VERTEX_SHADER,
        reinterpret_cast<const char*>(artwork::vertexSource), label + "vert.glsl");
    GLuint fragment = 0;
    GLuint program = 0;
    try {
        fragment = compileShader(GL_FRAGMENT_SHADER,
            reinterpret_cast<const char*>(artwork::fragmentSource), label + "frag.glsl");
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

void saveFrame(const fs::path& path, int width, int height)
{
    const std::size_t rowSize = static_cast<std::size_t>(width) * 3;
    std::vector<unsigned char> pixels(rowSize * height);
    glPixelStorei(GL_PACK_ALIGNMENT, 1);
    glReadBuffer(GL_BACK);
    glReadPixels(0, 0, width, height, GL_RGB, GL_UNSIGNED_BYTE, pixels.data());
    if (glGetError() != GL_NO_ERROR)
        throw std::runtime_error("OpenGL framebuffer readback failed.");
    std::ofstream file(path, std::ios::binary);
    if (!file) throw std::runtime_error("Cannot create capture: " + path.string());
    file << "P6\n" << width << ' ' << height << "\n255\n";
    for (int row = height - 1; row >= 0; --row)
        file.write(reinterpret_cast<const char*>(pixels.data() + row * rowSize),
                   static_cast<std::streamsize>(rowSize));
    if (!file) throw std::runtime_error("Cannot write capture: " + path.string());
    std::cout << "Saved framebuffer: " << path.string() << '\n';
}

int main(int argc, char** argv)
{
    GLFWwindow* window = nullptr;
    GLuint program = 0;
    GLuint vao = 0;
    bool initialized = false;
    int result = 0;
    try {
        int frameLimit = 0;
        fs::path capture;
        const std::string artName = artwork::name;
        for (int i = 1; i < argc; ++i) {
            const std::string argument = argv[i];
            if (argument == "--frames" && i + 1 < argc) {
                const std::string value = argv[++i];
                std::size_t consumed = 0;
                frameLimit = std::stoi(value, &consumed);
                if (frameLimit <= 0 || consumed != value.size())
                    throw std::runtime_error("--frames requires a positive integer.");
            } else if (argument == "--capture" && i + 1 < argc) {
                capture = argv[++i];
            } else {
                throw std::runtime_error("Usage: " + artName + ".exe [--frames N] [--capture output.ppm]");
            }
        }
        if (!capture.empty() && frameLimit == 0)
            throw std::runtime_error("Use --frames N with --capture output.ppm.");

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
        const std::string windowTitle = "OpenGL 4.6 Core - " + artName;
        window = glfwCreateWindow(960, 640, windowTitle.c_str(), nullptr, nullptr);
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

        std::cout << "Artwork: " << artName << '\n';
        std::cout << "Shaders: embedded in executable\n";
        program = loadProgram();
        const GLint resolutionLocation = glGetUniformLocation(program, "u_resolution");
        const GLint timeLocation = glGetUniformLocation(program, "u_time");
        glGenVertexArrays(1, &vao);
        glBindVertexArray(vao);
        int renderedFrames = 0;
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
            ++renderedFrames;
            if (frameLimit > 0 && renderedFrames == frameLimit && !capture.empty())
                saveFrame(capture, width, height);
            glfwSwapBuffers(window);
            if (frameLimit > 0 && renderedFrames >= frameLimit) break;
        }
        std::cout << "Rendered frames: " << renderedFrames << '\n';
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
