# General AI Toolkit Scripts

This directory contains a collection of scripts and tools organized into four main categories: AI tools, C++ development tools, general software scripts, and rules conversion utilities.

## Directory Structure

```
scripts/
├── ai-tools-scripts/          # AI-powered development tools
├── cpp-tools/                 # C++ development and analysis tools
├── general-sw-scripts/        # General software development utilities
└── rules-converter/           # MDC to various AI editor rules converter
```

---

## AI Tools Scripts (`ai-tools-scripts/`)

### Core Scripts

#### `clean-up-with-ai.sh`
**Description**: Automated code cleanup tool that launches multiple AI-powered refactoring tasks in parallel terminal windows.

**Usage**:
```bash
./clean-up-with-ai.sh
```

**What it does**:
- Launches 11 predefined code refactoring tasks using Gemini AI
- Each task runs in a separate terminal window
- Tasks include: forward declarations, unused code removal, const optimization, code deduplication, etc.
- Uses `launch-gemini.sh` internally

**Example tasks executed**:
- Substitute include directives with forward declarations
- Remove unused files, variables, and functions
- Add const to variables that never change
- Move function implementations from .h to .cpp files
- Fix static analyzer issues

---

#### `launch-gemini.sh`
**Description**: Launches Google Gemini AI CLI with randomly selected API keys and proxy configuration.

**Usage**:
```bash
./launch-gemini.sh [gemini-cli-options]
./launch-gemini.sh -p "Your prompt here" -m "gemini-2.5-flash"
```

**Features**:
- Randomly selects from 10 different API keys
- Configures proxy settings (127.0.0.1:2080)
- Supports all standard Gemini CLI options
- Automatic yes (-y) flag for confirmations

**Example**:
```bash
./launch-gemini.sh -p "Refactor this C++ code for better performance"
```

---

#### `run-cursor.sh`
**Description**: Launches Cursor AI editor with proper configuration and sandbox bypass.

**Usage**:
```bash
./run-cursor.sh [cursor-options]
```

**Features**:
- Auto-detects Cursor AppImage files
- Ensures executable permissions
- Runs with `--no-sandbox` for compatibility
- Passes through additional command-line arguments

**Example**:
```bash
./run-cursor.sh /path/to/project
```

---

#### `run-windsurf.sh`
**Description**: Launches Windsurf AI editor with proxy configuration and bypass settings.

**Usage**:
```bash
./run-windsurf.sh
```

**Features**:
- Sets up HTTP/HTTPS proxy (127.0.0.1:2080)
- Configures SOCKS5 proxy
- Bypass list for local domains (*.coreops.ru, *.devos.club)
- Alternative proxychains4 configuration (commented)

---

### Subdirectories

#### `vscode-auto-inserter/`
**Description**: Automated VS Code interaction tool that can simulate keyboard sequences.

**Usage**:
```bash
cd vscode-auto-inserter
poetry install
poetry run python auto-inserter/main.py
```

**Features**:
- Executes keyboard sequences (Escape, Ctrl+L, text input, Enter)
- Configurable iterations (default: 20)
- 10-minute delays between iterations
- Wayland compatibility
- Systemd service integration

#### `vscode-automation/` & `vscode-downloader/`
Additional VS Code automation tools and downloaders.

---

## C++ Tools (`cpp-tools/`)

### Analysis Scripts

#### `timeout-kill-gdb.py`
**Description**: GDB timeout management tool that prevents infinite debugging sessions.

**Usage**:
```python
import timeout_kill_gdb
# Use within GDB scripts
```

**Features**:
- 120-second default timeout
- Thread-based monitoring
- Automatic process termination
- Signal handling for cleanup

---

#### `timeout-kill-lldb.py`
**Description**: LLDB timeout and crash report generation tool.

**Usage**:
```python
import timeout_kill_lldb
# Use within LLDB debugging sessions
```

**Features**:
- Crash report generation
- Backtrace export to text files
- Process state monitoring
- Thread-safe operation
- Prevents duplicate crash reports

---

### Analysis Tools

#### `cpp-static-analyzer/`
**Description**: Comprehensive C++ static analysis suite running multiple tools in parallel.

**Usage**:
```bash
cd cpp-static-analyzer
./cpp-analyze.py /path/to/build /path/to/src
./cpp-analyze.py /path/to/build /path/to/src --output custom_report.txt
```

**Integrated Tools**:
- Clang Static Analyzer
- clangd
- cppcheck
- IKOS
- Flawfinder
- xunused
- scan-build

**Output**: Consolidated analysis report (`cpp-analysis-report.txt`)

---

#### `list-cpp-functions/`
**Description**: C++ function and method extraction tool with intelligent parsing.

**Usage**:
```bash
cd list-cpp-functions
poetry install
poetry run python cpp-function-analyzer.py /path/to/source
poetry run python cpp-function-analyzer.py /path/to/source --output json
poetry run python cpp-function-analyzer.py /path/to/source --verbose
```

**Features**:
- Extracts global functions and class methods
- Handles namespace and class scope
- Qt framework detection and filtering
- Recursive directory scanning
- JSON and text output formats
- Duplicate filtering
- Parameter display in verbose mode

**Example Output**:
```
Global Functions:
- main(int argc, char* argv[])
- calculateSum(int a, int b)

Classes Found:
MyClass:
- MyClass()
- ~MyClass()
- processData(const std::string& input)
```

---

#### `cpp-usage-comparator/`
**Description**: Identifies C++ functions/variables defined in source but only used in test directories.

**Usage**:
```bash
cd cpp-usage-comparator
poetry install
poetry run python cpp-usage-comparator.py /path/to/source /path/to/tests
```

**Features**:
- Uses libclang for accurate parsing
- Works with `compile_commands.json`
- Identifies test-only code
- Dead code detection
- Recursive directory analysis

**Example Output**:
```
Functions only used in tests:
- testHelperFunction() (defined in src/utils.cpp, used only in tests/)
- debugPrintState() (defined in src/debug.cpp, used only in tests/)
```

---

## General Software Scripts (`general-sw-scripts/`)

#### `backup-git.sh`
**Description**: Git repository backup tool that pushes current branch to a backup remote.

**Usage**:
```bash
./backup-git.sh [directory]
./backup-git.sh  # Uses current directory
./backup-git.sh /path/to/repo
```

**Features**:
- Validates Git repository
- Adds temporary backup remote (gitlab.com)
- Force pushes current branch
- Cleans up backup remote after push
- Error handling and validation

**Example**:
```bash
cd /my/project
../backup-git.sh
# Output: Pushing branch main to backup with --force
#         Removing remote backup
```

---

## Rules Converter (`rules-converter/`)

### Main Tool

#### `run-converter.sh`
**Description**: Wrapper script for the rules-converter Python tool that transforms Cursor IDE rules into multiple AI editor formats.

**Usage**:
```bash
./run-converter.sh input.mdc
./run-converter.sh input.mdc --output-dir /custom/output
```

**Supported Output Formats**:
1. **VS Code** (`.instructions.md`) - VS Code Copilot customization
2. **Roo Code** (`.md`) - Roo Code custom instructions  
3. **Windsurf** (`.md`) - With YAML frontmatter
4. **Cline** (`.md`) - Plain markdown format

**Example Conversion**:
Input: `my-rules.mdc`
```
# Cursor Rules
These are my coding guidelines...
```

Output directory structure:
```
output/
├── vscode/
│   └── my-rules.instructions.md
├── roocode/
│   └── my-rules.md
├── windsurf/
│   └── my-rules.md  # With YAML frontmatter
└── cline/
    └── my-rules.md
```

**Windsurf Format Example**:
```yaml
---
trigger: always_on
description: Coding guidelines conversion
globs: **/*
---
# Your converted rules here
```

### Installation & Setup

```bash
cd rules-converter
./install.sh  # Sets up Poetry environment
./run-converter.sh example.mdc  # Test conversion
```

**Features**:
- Poetry-based dependency management
- Multiple output format support
- Preserves markdown formatting
- Automatic directory structure creation
- YAML frontmatter generation for Windsurf
- Error handling and validation

---

## Installation & Prerequisites

### System Requirements
- **Linux** (Ubuntu/Debian preferred)
- **Python 3.8+**
- **Poetry** (for Python projects)
- **libclang-dev** (for C++ analysis tools)
- **Git**
- **Various AI editor AppImages/installations**

### Quick Setup
```bash
# Install system dependencies
sudo apt-get update
sudo apt-get install python3-poetry libclang-dev git

# For each Poetry project:
cd [project-directory]
poetry install
```

### Proxy Configuration
Many scripts are configured for proxy usage:
- HTTP/HTTPS Proxy: `127.0.0.1:2080`
- SOCKS5 Proxy: `127.0.0.1:2080`
- Bypass domains: `*.coreops.ru`, `*.devos.club`

---

## Usage Examples

### Complete C++ Project Analysis
```bash
# Static analysis
cd cpp-tools/cpp-static-analyzer
./cpp-analyze.py /project/build /project/src

# Function extraction
cd ../list-cpp-functions
poetry run python cpp-function-analyzer.py /project/src --verbose

# Usage comparison
cd ../cpp-usage-comparator
poetry run python cpp-usage-comparator.py /project/src /project/tests
```

### AI-Powered Refactoring Workflow
```bash
# Start automated cleanup
cd ai-tools-scripts
./clean-up-with-ai.sh

# Manual AI interaction
./launch-gemini.sh -p "Optimize this C++ function for performance"

# Launch editors
./run-cursor.sh /project/path
./run-windsurf.sh
```

### Rules Conversion Pipeline
```bash
cd rules-converter
./run-converter.sh my-cursor-rules.mdc
# Creates rules for VS Code, Roo Code, Windsurf, and Cline
```

### Git Backup Workflow
```bash
cd /my/important/project
/path/to/scripts/general-sw-scripts/backup-git.sh
# Safely backs up current branch to GitLab
```

---

## Contributing

When adding new scripts:
1. Place in appropriate subdirectory
2. Include detailed README.md
3. Add Poetry configuration for Python projects
4. Update this main README.md
5. Include usage examples and error handling

## License

See individual script directories for specific licensing information.
