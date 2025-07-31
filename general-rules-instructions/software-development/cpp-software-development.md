# C++ Software Development Guidelines

## Include Path Management

Always use direct `#include` paths instead of relative paths with `../`. This improves code maintainability and reduces coupling between directory structures.

**Preferred:**
```cpp
#include "file.h"
#include "utils/helper.h"
```

**Avoid:**
```cpp
#include "../file.h"
#include "../../utils/helper.h"
```

Use `target_include_directories()` in CMake or equivalent build system configurations to specify additional include directories when needed. This allows the build system to resolve include paths properly without requiring relative path navigation in source files.

## Post-Task Routine

After completing any C++ development task, always run the following static analysis routine to ensure code quality and identify potential issues:

### Comprehensive Static Analysis

Run the comprehensive static analysis script to perform multi-tool analysis:

```bash
python3 /home/dev/dev/prj/general-ai-toolkit/scripts/cpp_analyze.py [source_directory]
```

This script performs parallel execution of:
- **clangd**: Language server diagnostics and semantic analysis
- **clang-tidy**: Modern C++ linting and best practices checking
- **Clang Static Analyzer**: Deep static analysis for bugs and security issues
- **cppcheck**: Static analysis for C/C++ code
- **IKOS**: Abstract interpretation-based static analyzer
- **Flawfinder**: Security vulnerability scanner

The script automatically:
- Detects available tools and skips unavailable ones
- Runs all tools in parallel for efficient analysis
- Consolidates results into a single comprehensive report
- Provides detailed logging and progress tracking
- Generates actionable recommendations for code improvement

### Usage Examples

```bash
# Analyze current directory
python3 /home/dev/dev/prj/general-ai-toolkit/scripts/cpp_analyze.py .

# Analyze specific source directory
python3 /home/dev/dev/prj/general-ai-toolkit/scripts/cpp_analyze.py src/

# Analyze with verbose output
python3 /home/dev/dev/prj/general-ai-toolkit/scripts/cpp_analyze.py src/ --verbose
```

### Integration with Build Process

For automated integration, consider adding the analysis script to your CMake post-build steps or CI/CD pipeline to ensure continuous code quality monitoring.