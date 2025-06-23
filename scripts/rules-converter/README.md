# Rules Converter

A Python application that converts Cursor IDE rules MDC files into both VS Code instruction files and Roo Code rules files.

## Output Formats

This converter transforms Cursor IDE rules MDC files into two different formats:

1. **VS Code instruction files** (.instructions.md) - Compatible with VS Code Copilot as described in the [VS Code Copilot Customization documentation](https://code.visualstudio.com/docs/copilot/copilot-customization#_instruction-files)
2. **Roo Code rules files** (.md) - Compatible with Roo Code custom instructions as described in the [Roo Code Custom Instructions documentation](https://docs.roocode.com/features/custom-instructions/)

### Output Directory Structure

When converting, the tool creates files in both formats:

- **VS Code**: `.github/instructions/` directory with `.instructions.md` files
- **Roo Code**: `.roo/rules/` directory with `.md` files

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
- Convert `.mdc` files to both VS Code instruction files (`.instructions.md`) in `.github/instructions/` and Roo Code rules files (`.md`) in `.roo/rules/`
- Copy all non-`.mdc` files from the source directory to the output directory (if output directory is specified), preserving the directory structure
- Maintain the directory structure inside both the `.github/instructions` and `.roo/rules` directories

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
