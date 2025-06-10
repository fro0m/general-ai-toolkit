# C++ Function Analyzer

A Python tool to analyze C++ source code files (.cpp, .cc, .cxx, .c++) and header files (.h, .hpp, .hxx, .h++) to extract and list all functions and class methods.

## Features

- Extracts global functions from C++ files
- Identifies class and struct declarations with actual definitions (not just forward declarations)
- Detects function implementations in .cpp files
- Handles namespace and class scope resolution
- Filters out duplicate entries in the output
- Intelligently distinguishes between function declarations and function calls
- Robust Qt framework detection to exclude Qt classes and model functions
- Supports recursive directory scanning
- Accepts multiple files and directories in a single command
- Output in both text and JSON formats
- Function and method parameters display in verbose mode
- Alphabetical sorting of functions and methods for better readability
- Detection of duplicates and filtering of false positives

## Installation

This project uses Poetry for dependency management.

```bash
# Clone the repository
git clone <repository-url>
cd cpp-function-analyzer

# Install dependencies with Poetry
poetry install
```

After installation, you can run the tool either as a Python script or as a command:

```bash
# Run as a Python script
poetry run python cpp_function_analyzer.py path/to/file.cpp

# Run as a command
poetry run cpp-function-analyzer path/to/file.cpp
```

If you want to install it globally, you can use:

```bash
poetry build
pip install dist/*.whl
```

Then you can run it directly:

```bash
cpp-function-analyzer path/to/file.cpp
```

## Usage

```bash
# Analyze a single file
cpp-function-analyzer path/to/file.cpp

# Analyze multiple files
cpp-function-analyzer path/to/file1.cpp path/to/file2.cpp path/to/file3.h

# Analyze a directory (non-recursive)
cpp-function-analyzer path/to/directory

# Analyze multiple directories
cpp-function-analyzer path/to/directory1 path/to/directory2

# Analyze a mix of files and directories
cpp-function-analyzer path/to/file.cpp path/to/directory

# Analyze a directory recursively
cpp-function-analyzer -r path/to/directory

# Display detailed information including parameters
cpp-function-analyzer -v path/to/file.cpp

# Output in JSON format
cpp-function-analyzer -f json path/to/file.cpp

# Save results to a file
cpp-function-analyzer -o results.txt path/to/file.cpp
```

## Command Line Options

- `paths`: One or more paths to C++ files or directories containing C++ files
- `-r, --recursive`: Recursively search directories for C++ files
- `-v, --verbose`: Display detailed information including function parameters
- `-f, --format`: Output format (text or JSON)
- `-o, --output`: Output file path (default: stdout)

## JSON Output Format

When using the `-f json` option, the tool outputs a structured JSON format that can be easily parsed by other tools:

```json
[
  {
    "file": "example.cpp",
    "extension": ".cpp",
    "global_functions": [
      {
        "name": "functionName",
        "parameters": "param1, param2",
        "position": 123
      }
    ],
    "class_methods": [
      {
        "class": "ClassName",
        "name": "methodName",
        "parameters": "param1, param2",
        "position": 456
      }
    ],
    "function_implementations": [
      {
        "namespace": "namespaceName",
        "class": "ClassName",
        "name": "methodName",
        "parameters": "param1, param2",
        "position": 789
      }
    ],
    "classes_and_structs": [
      {
        "type": "class",
        "name": "ClassName",
        "position": 100
      },
      {
        "type": "struct",
        "name": "StructName",
        "position": 200
      }
    ]
  }
]
```

## Class and Struct Detection

The tool only identifies classes and structs that have actual definitions with non-empty bodies, not just forward declarations. For example:

```cpp
// This will be detected
class MyClass {
    int member;
    void method();
};

// This will NOT be detected (forward declaration)
class ForwardDeclared;

// This will NOT be detected (empty definition)
struct EmptyStruct {};
```

## Function Detection

The tool is designed to distinguish between function declarations/definitions and function calls:

```cpp
// This will be detected (function declaration)
void myFunction(int param);

// This will be detected (function definition)
int calculateSum(int a, int b) {
    return a + b;
}

// This will NOT be detected (function call)
result = calculateSum(5, 10);

// Common library functions are automatically excluded
printf("Hello, world!");
qUtf8Printable(myString);
```

## Qt Framework Support

The tool has special handling for Qt framework code:

```cpp
// These Qt classes will NOT be detected as functions
QWidget *widget = new QWidget();
QFrame frame;
QHBoxLayout *layout = new QHBoxLayout();
QStringList items;

// These Qt model functions will be filtered out
beginInsertRows(parent, first, last);
endInsertRows();
dataChanged(topLeft, bottomRight);
```

## Duplicate Filtering

The tool automatically filters out duplicate entries in the output. If the same function or method appears multiple times in the analyzed files, it will only be listed once in the output.

## Limitations

This tool uses regex patterns to identify C++ functions and methods, which may not handle all complex C++ syntax constructs correctly. Some known limitations:

- Template metaprogramming may not be fully parsed
- Nested templates with complex syntax might be missed
- Heavily preprocessor-dependent code might not be analyzed correctly
- It works best with standard C++ coding conventions

## License

[MIT License](LICENSE) 