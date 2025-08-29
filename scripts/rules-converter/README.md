# Rules Converter

A Python application that converts Cursor IDE rules MDC files into VS Code instruction files, Roo Code rules files, Windsurf rules files, Cline rules files, and Kilo Code rules files.

## Output Formats

This converter transforms Cursor IDE rules MDC files into six different formats:

1. **VS Code instruction files** (.instructions.md) - Compatible with VS Code Copilot as described in the [VS Code Copilot Customization documentation](https://code.visualstudio.com/docs/copilot/copilot-customization#_instruction-files)
2. **Roo Code rules files** (.md) - Compatible with Roo Code custom instructions as described in the [Roo Code Custom Instructions documentation](https://docs.roocode.com/features/custom-instructions/)
3. **Windsurf rules files** (.md) - Compatible with Windsurf AI editor with YAML frontmatter format
4. **Cline rules files** (.md) - Compatible with Cline AI assistant as plain markdown files
5. **Kilo Code rules files** (.md) - Compatible with Kilo Code AI assistant as plain markdown files. Compatible with Kilo Code as described in the [Kilo Code Customization documentation](https://kilocode.ai/docs/advanced-usage/custom-rules)
6. **Gemini CLI rules files** (.md) - Compatible with Gemini CLI with import structure

#### Windsurf Format Details

Windsurf rules files are generated with the following YAML frontmatter:
```yaml
---
trigger: always_on
description: [extracted from original MDC file]
globs: **/*
---
```

#### Cline Format Details

Cline rules files are plain markdown files without frontmatter, similar to Roo Code format but stored in the `.clinerules/` directory. Cline automatically processes all markdown files in this directory.

#### Kilo Code Format Details

Kilo Code rules files are plain markdown files without frontmatter, similar to Roo Code format but stored in the `.kilocode/rules/` directory. Kilo Code automatically processes all markdown files in this directory.

### Output Directory Structure

When converting, the tool creates files in all six formats:

- **VS Code**: `.github/instructions/` directory with `.instructions.md` files
- **Roo Code**: `.roo/rules/` directory with `.md` files
- **Windsurf**: `.windsurf/rules/` directory with `.md` files
- **Cline**: `.clinerules/` directory with `.md` files
- **Kilo Code**: `.kilocode/rules/` directory with `.md` files
- **Gemini CLI**: `.gemini/` directory with `.md` files and a master `GEMINI.md` file

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

### Basic usage with default configuration:

```bash
poetry run rules-converter path/to/project
```

This will look for `rules_definitions.json` in the same directory as `raw-rules-template/` for variable substitution.

### Specify a custom configuration file:

```bash
poetry run rules-converter path/to/project path/to/rules-description.json
```

### Convert and save to a specific output directory:

```bash
poetry run rules-converter path/to/project -o path/to/output
```

### Full example with explicit configuration and output directory:

```bash
poetry run rules-converter path/to/project path/to/rules-description.json -o path/to/output
```

The tool processes template files through a 4-stage pipeline:
1. **Template Variable Substitution** - Replace `{variable}` placeholders with values from the JSON configuration file
2. **Path and File Validation** - Validate all file paths and references in processed rules
3. **Format Conversion** - Convert to VS Code, Roo Code, Windsurf, Cline, Kilo Code, and Gemini formats
4. **Deployment** - Place files in correct directory structure for each tool

When processing, the tool will:
- Convert `.mdc` template files to VS Code instruction files (`.instructions.md`) in `.github/instructions/`, Roo Code rules files (`.md`) in `.roo/rules/`, Windsurf rules files (`.md`) in `.windsurf/rules/`, Cline rules files (`.md`) in `.clinerules/`, Kilo Code rules files (`.md`) in `.kilocode/rules/`, and Gemini CLI rules files (`.md`) in `.gemini/`.
- For Gemini CLI, it will create a `.gemini/` directory in the project for individual rules and a `GEMINI.md` in the same directory to import them.
- Copy all non-template files from the source directory to the output directory (if output directory is specified), preserving the directory structure.
- Maintain the directory structure inside each tool's rules directories.

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
