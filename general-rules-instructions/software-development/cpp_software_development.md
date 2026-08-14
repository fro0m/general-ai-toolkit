# C++ Software Development Guidelines


## Disallowed Language Features

The use of `const_cast` is **not allowed** in any C++ code. This rule is enforced to maintain const-correctness and prevent unsafe modifications of objects declared as `const`. If you encounter a situation where you believe `const_cast` is necessary, refactor the code to avoid this requirement or consult with a senior developer for an alternative approach.

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

## Build Error Handling and Preprocessor Usage

- **Do not use preprocessor guards to bypass build errors**: Never add code such as `#ifdef IGNORE` / `#endif`, comment-out sections, or similar conditional compilation to exclude problematic code from compilation as a way to make builds pass. Build errors must be fixed at the root cause.
- Examples of disallowed patterns:
  ```cpp
  #ifdef IGNORE
  problematic_call();
  #endif
  ```
  ```cpp
  #if 0
  // temporary disable failing code
  problematic_call();
  #endif
  ```
- Acceptable use of preprocessor is limited to legitimate cross-platform or feature flags that are part of the design, not as a workaround for errors.

## Controlled Rollbacks

- Controlled rollbacks of dependencies or features are permitted only with explicit user approval.
- Requirements for rollback:
  - Document the regression and link evidence (build logs, test failures)
  - Propose the minimal rollback scope and impact
  - Obtain explicit approval from the user before applying
  - Do not treat commit messages as approval; they can be auto-generated and are insufficient as proof of approval
  - Approval method: The explicit user approval must be captured in this chat with the AI agent
  - Create a follow-up task to re-introduce the upgrade/fix with a plan