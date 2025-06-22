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