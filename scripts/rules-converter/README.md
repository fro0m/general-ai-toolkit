# Rules Converter

A simple Python application that converts Cursor IDE rules MDC files into VS Code instruction files.

## File Format

This converter transforms Cursor IDE rules MDC files into VS Code instruction files (.instructions.md) as described in the [VS Code Copilot Customization documentation](https://code.visualstudio.com/docs/copilot/copilot-customization#_instruction-files). 

VS Code instruction files are plain text files that provide guidance to Copilot. The converter preserves the entire content of the MDC file as-is and saves it as a .instructions.md file in the appropriate location.

## Installation

This project uses Poetry for dependency management.

1.  **Install Poetry**:
    If you don't have Poetry installed, follow the instructions on the [official Poetry website](https://python-poetry.org/docs/#installation).

2.  **Install dependencies**:
    Navigate to the project root directory and run:
    ```bash
    poetry install
    ```

## Usage

After installation, you can run the script using `poetry run`.

### Convert a single file:

```bash
poetry run rules-converter path/to/file.mdc
```

### Convert all MDC files in a directory and copy other files (recursive):

```bash
poetry run rules-converter path/to/directory
```

### Convert and save to a specific output directory:

```bash
poetry run rules-converter path/to/directory -o path/to/output
```

When converting a directory, the tool will:
- Convert `.mdc` files to VS Code instruction files (`.instructions.md`) and place them in the `.github/instructions/` directory
- Copy all non-`.mdc` files from the source directory to the output directory, preserving the directory structure
- Maintain the directory structure inside the `.github/instructions` directory

### Help

```bash
poetry run rules-converter --help
```

## Development

To set up the development environment:

1.  **Install Poetry** (if not already installed, see Installation section).
2.  **Clone the repository** (if you haven't already).
3.  **Install dependencies**:
    ```bash
    poetry install
    ```
4.  **Activate the virtual environment**:
    Poetry creates a virtual environment for the project. You can activate it by running:
    ```bash
    poetry shell
    ```
    Alternatively, you can run commands within the environment using `poetry run <command>`.

## Alternative Installation (using pip)

If you prefer not to use Poetry, you can still install the package using pip, but Poetry is the recommended method for managing this project.

```bash
# Ensure you have pip installed
# Clone the repository
pip install -e .
```
To run the script if installed with pip:
```bash
rules-converter path/to/file.mdc
```
