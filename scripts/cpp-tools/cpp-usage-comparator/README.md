# C++ Usage Comparator

This script recursively analyzes two C++ directories (a "source" and a "usage" directory) to identify functions and variables that are defined in the source directory but are only used within the usage directory. Its primary purpose is to find code that is exclusively used by tests and not by the main application, which can help identify dead code or test-only components.

The script uses `libclang` to accurately parse C++ source code. For best results, it should be used with a `compile_commands.json` file.

## Prerequisites

Before running this script, you must have the following installed:

1.  **Python 3.8+**
2.  **Poetry** (for managing project dependencies). You can find installation instructions at the [official Poetry website](https://python-poetry.org/docs/#installation).
3.  **libclang:** The Clang C++ compiler's library.
    -   On Debian/Ubuntu: `sudo apt-get update && sudo apt-get install libclang-dev`
    -   On Red Hat/CentOS: `sudo yum install clang-devel`
    -   On macOS (with Homebrew): `brew install llvm`

## Installation

1.  Navigate to this directory:
    ```bash
    cd scripts/cpp_usage_comparator
    ```

2.  Install the project dependencies using Poetry. This will create a virtual environment and install the required `libclang` Python bindings.
    ```bash
    poetry install
    ```

## Usage

Run the script using `poetry run`, which ensures it executes within the correct virtual environment.

### Command-Line Arguments

```bash
poetry run python3 cpp-usage-comparator.py <source_directory> <usage_directory> [options]
```

-   `source_directory`: The path to the directory containing the primary source code.
-   `usage_directory`: The path to the directory to check for usages (e.g., a `tests` or `examples` directory).

### Options

-   `--compile-db <path>`: **(Recommended)** Path to the directory containing a `compile_commands.json` file. Providing this file dramatically improves parsing accuracy by giving the script access to the exact compiler flags, include paths, and definitions used in your project.
-   `-v`, `--verbose`: Enables detailed logging, which is useful for debugging. It prints every definition and usage found, along with the reasoning for including or excluding a symbol from the final report.

### How to Generate `compile_commands.json`

If your project uses CMake, you can generate this file by setting the `CMAKE_EXPORT_COMPILE_COMMANDS` flag during configuration:

```bash
# From your project's build directory
cmake -DCMAKE_EXPORT_COMPILE_COMMANDS=ON /path/to/your/source
```
This will create a `compile_commands.json` file in the build directory.

### Example

To find symbols defined in `/path/to/my_project/src` that are only used in `/path/to/my_project/tests`, assuming your `compile_commands.json` is in `/path/to/my_project/build`:

```bash
poetry run python3 cpp-usage-comparator.py \
  /path/to/my_project/src \
  /path/to/my_project/tests \
  --compile-db /path/to/my_project/build
```

To debug why a specific symbol isn't appearing in the report, run the same command with the `--verbose` flag:
```bash
poetry run python3 cpp-usage-comparator.py \
  /path/to/my_project/src \
  /path/to/my_project/tests \
  --compile-db /path/to/my_project/build \
  --verbose
```

## Troubleshooting

### `libclang.so` Not Found

The script's `libclang` dependency relies on the underlying Clang library (`libclang.so`, `.dll`, or `.dylib`). If the script fails to find it, you may need to specify its location manually.

1.  **Find the library path** on your system.
    -   On Linux: `find /usr -name "libclang.so.*"`
    -   On macOS: `find /usr/local/opt/llvm -name "libclang.dylib"`

2.  **Edit the `cpp-usage-comparator.py` script**:
    At the bottom of the file, uncomment and update the `Config.set_library_file` line with the correct path:
    ```python
    # In the if __name__ == "__main__": block
    from clang.cindex import Config
    Config.set_library_file('/path/to/your/libclang.so')
    ```
    For example:
    ```python
    from clang.cindex import Config
    Config.set_library_file('/usr/lib/x86_64-linux-gnu/libclang-14.so.1')
    ```