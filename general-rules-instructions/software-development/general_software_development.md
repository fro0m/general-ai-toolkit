# AI Agent Software Development Guidelines

**Important Instruction for Processing Variables:**
For all `.mdc` and `.md` files, any text enclosed in curly braces, such as `{variable}`, must be substituted with the corresponding value found in the `rules_definitions.json` file. Announce in the chat each time such a variable is resolved.

## Core Development Principles for AI Agents

### 1. File Management Protocol 
**Critical**: Before applying any changes to files, AI agents must reread the target file to ensure they have the most current version. Files may have been modified outside of the current session by other processes, users, or concurrent operations.

#### File Change Workflow:
1. **Always reread before editing**: Use `read_file` to get the current state of a file before modifying it; your cached copy may be stale.
2. **Adapt to external changes**: If the file changed externally, adapt your edits to the current state and inform the user of any conflict.
3. **Edit files directly**: Never create backup copies (`.bak`, `.old`, `.tmp`, `file_v2.py`, etc.). Use version control (Git) for history and recovery; do not keep one-off file copies around.

#### Submodules and External Projects (CRITICAL RESTRICTION)
**NEVER modify files in submodules or external projects**. This includes:
- Git submodules (typically found in subdirectories that are separate repositories)
- Third-party libraries and dependencies (e.g., files in `external/`, `third_party/`, `vendor/`, `lib/`, `dependencies/` directories)
- Downloaded packages and frameworks (e.g., Qt libraries, CMake modules, package manager dependencies)
- Any files that are not part of the main project's source code

### 2. Task Management and Execution
- **Task Status Handling**:
  - **Before starting work**: Always check if a task is already in "Doing" status. If it is, skip it unless explicitly overridden by the user
  - **When starting a task**: Update its status to "Doing" and add a timestamp comment in the task description using the format: "Started by AI agent at: YYYY-MM-DDTHH:MM:SS"
  - **Task completion**: When finishing work on a task, update the status to "Done" or the appropriate completion status and add: "Completed by AI agent at: YYYY-MM-DDTHH:MM:SS"
  - **Abandoned tasks**: If you must abandon a task before completion, revert the status back to "To-do" and add: "Abandoned by AI agent at: YYYY-MM-DDTHH:MM:SS - [reason]"
  - **Conflict resolution**: If you encounter a "Doing" task that appears stale (no recent activity or updates), consult with the user before proceeding
  - This prevents multiple agents from working on the same task simultaneously and ensures clear ownership and progress tracking

### 3. Root Cause Analysis and Problem-Solving Approach

**CRITICAL: Never Disable or Ignore Problems**
When encountering build errors, test failures, or other issues in any part of the project:

- **NEVER disable building of specific components or modules** (e.g., disabling tests for specific libraries, excluding problematic code from builds)
- **NEVER ignore compilation warnings or errors** by commenting out problematic code or adding compiler pragmas to suppress warnings
- **NEVER skip or disable failing tests** unless they are explicitly marked as known issues with tracking tickets
- **NEVER use workarounds that bypass fundamental problems** without addressing the underlying cause

**Required Approach for All Issues:**
1. **Investigate thoroughly**: Analyze error messages, logs, and stack traces to understand the root cause
2. **Research the problem**: Look up documentation, known issues, and best practices for the specific technology or library
3. **Fix the actual cause**: Address the underlying issue rather than symptoms
4. **Verify the fix**: Ensure the solution resolves the problem completely and doesn't introduce new issues

When fixing bugs or addressing issues:
- **Primary approach**: Identify and fix the root cause of the problem
- **Avoid**: Adding defensive code, excessive error handling, or workarounds that mask the underlying issue
- **Prefer simplification**: If a function or component is problematic and its utility is questionable, remove it entirely rather than fixing it
- **Argument evaluation**: If function arguments are unused or unnecessary, remove them instead of attempting to fix their implementation
- **No fallbacks on invalid data or input**: see the "Error Handling and Invalid Data" section below.

### 3.1 Error Handling and Invalid Data

This is the single source of truth for code-level error handling. No fallbacks,
no defaults, no "best-effort" recovery, no guessed values. Functions detect and
report problems; they never manufacture, coerce, or silently tolerate invalid
data.

#### Trusted source data

- Source-of-truth data (database rows, values produced by other internal
  functions, configuration) is **valid by contract**. Code may assume it.
- If a function **detects** that such data is invalid, it must **raise
  immediately** with a clear error naming the field/value and what was expected.
- Do **not** coerce, default, sanitize, synthesize, or guess a replacement value,
  and do **not** fall back to a degraded path. Repairing the data is the
  responsibility of the component that **writes** it (the DB writer, the
  producing function, the config source) — never the consumer's.
- The function's job is to surface the violation; fixing the data happens
  elsewhere.

#### Invalid input (caller errors)

- Functions must **not** attempt to process invalid input caused by incorrect
  API or function usage: wrong type, missing required argument, value out of the
  legal range, or a broken invariant.
- Such input is a **developer error**, not a runtime condition to recover from.
  Fail fast with an error that states which argument or invariant was violated
  and what was expected.
- Do not add defensive code that tries to "fix", coerce, or guess the caller's
  intent. Correct arguments are the caller's responsibility.

#### Untrusted boundary data

- External/boundary data (e.g. responses from network calls) **may be invalid**.
  Validate it at the boundary.
- On invalid boundary data, report it to the caller (or raise) — do **not**
  paper over it with a default, an empty result, or a guessed value.
- This is distinct from **end-user input**, whose validity and error behavior are
  governed by the product requirements (PRD), not by this rule.

#### Common rules

- Fail the operation **immediately** with a clear, specific error that names what
  went wrong and what input/state caused it.
- Never catch an error only to return a silent default, an empty result, or a
  guessed value. Surface the error instead.

### 3.2 Function Contracts: Preconditions and Postconditions

Every function defines a **contract**: its **preconditions** (what must hold on
entry — argument validity, required call order, object state) and its
**postconditions** (what the function guarantees before returning — result
invariants, the state changes it promises). Every function with a non-trivial
contract must **check** that contract, not merely imply it:

- Check **preconditions at entry**: an invalid argument (wrong type, missing,
  out of legal range), a violated call order, or a broken object state is a
  **caller (developer) error** per §3.1. A contract check is the sanctioned
  way to surface it — never guard a caller-contract violation with
  `if`/`else` "defensive" branches that hide the bug.
- Check **postconditions before returning**: the non-obvious invariants the
  function promises (a normalized result, a required side effect, a non-empty
  collection where the contract demands one).

Rules:

- **The checking mechanism is named by each language's own coding
  conventions** — languages do not share one mechanism (typically an
  `assert` statement or a project-standard assert macro). Follow the
  language-specific conventions; do not invent per-project mechanisms.
- Contract checks are **active in debug/test builds and compiled out in
  release** — they document and verify the contract during development and
  in the test suite, with zero production overhead.
- They target **developer/caller violations only**. They do **not** replace
  boundary validation of untrusted data (§3.1 — external input is validated
  at the boundary and errors are reported), and they do **not** decide the
  behavior for end-user input, which is governed by the product requirements.
- Do **not** check what the code trivially shows, do not check untrusted
  data with contract checks, and do not use contract checks for control
  flow. A trivial one-line function whose contract is fully expressed by its
  types needs no checks.

### 4. Code Quality and Maintenance Standards
- **Pre-existing dead/unused code or files**: if you encounter them, surface them to the user and ask before removing. Do not delete code you did not write as part of this task unless asked.
- Clean up temporary or one-time-use files you create during the task; do not leave them behind. Use version control (Git) for history instead of keeping file copies.
- Ensure all code follows the project's established patterns and conventions
- **Do not create file backups** (e.g., .bak, .backup, .old files) during development operations - rely on version control for file history and recovery
- **No Backward Compatibility**: When introducing a new feature to replace an old one, remove the old implementation completely. Do not maintain parallel code paths or deprecated functionality for backward compatibility. Keep only the current, preferred approach to maintain code simplicity and reduce maintenance burden, and always refactor the project to use the current approach throughout the codebase
- **No Debugging/Testing Methods in Production Code**: Never create debugging, testing, or validation methods in the main project source code. These concerns should be handled by separate unit tests that test only the public API. Keep production code clean and focused solely on business functionality. Prefer fewer unit-level checks over introducing test adapters or hooks to access internals

#### Code Comment Standards
**Prohibited Comments**:
- **NO AI Agent Activity Comments**: Do not add comments explaining what the AI agent has done (e.g., "// Added by AI agent", "// Fixed by Claude")
- **NO Obvious Code Explanations**: Do not add comments that simply restate what the code does (e.g., `i++; // increment i`)
- **NO Section Annotations**: Do not annotate code with comment blocks that divide code into sections (e.g., `// === MAIN LOGIC ===`, `// --- Helper Functions ---`)
- **NO Future planning**: Do not add TODO comments for genuine future improvements
- **NO Comments Without Request**: Do not add comments to source code unless explicitly requested by the user. Code should be self-documenting through clear naming and structure

**Allowed Comments**:
- Complex business logic explanations that clarify **why** something is done, not **what** is done (only when explicitly requested)
- Non-obvious algorithm explanations or mathematical formulas (only when explicitly requested)
- Important warnings about potential side effects or limitations (only when explicitly requested)
- API documentation for public interfaces (when required by project standards or explicitly requested)

### 5. Coding Guidelines Integration
Use all coding guidelines from the `{CodingGuidelinesURLs}` list, which can contain both web URLs and local file paths. The content from these guidelines should be incorporated with the current file content and project requirements.

## AI Agent Communication Guidelines

### Clear Communication Patterns
- **Announce actions**: Clearly state what operations you are performing (e.g., "Reading file X to check current state")
- **Explain reasoning**: Provide context for your decisions and modifications
- **Report conflicts**: If file conflicts or issues are detected, explain them clearly
- **Document changes**: Summarize what was modified and why

### Error Handling and Recovery
- If file read operations fail, report the specific error and stop; do not silently fall back to a guess or cached copy.
- If conflicts are detected during file operations, prioritize data integrity and surface the conflict to the user.
- Always validate that changes can be applied safely before execution.
- Provide clear error messages and suggested resolution steps; never mask an error behind a default value.

## Build and Testing Requirements

### Continuous Verification
- **Build verification**: Confirm that the project builds successfully after changes
- **Test execution**: Run all available unit tests and ensure they pass
- **Dependency validation**: Verify that all imports and dependencies are correctly resolved
- **Integration testing**: Ensure new changes integrate properly with existing codebase

### Failure Recovery Protocol
- If builds fail: Identify root causes and implement fixes until build succeeds
- If tests fail: Debug and fix underlying issues until all unit tests pass
- If integration issues arise: Resolve compatibility problems before proceeding
- **Do not proceed** to the next development phase until current issues are resolved

## Documentation and Version Control

### Documentation Updates
- Update technical documentation to reflect current project state
- Ensure code comments are clear and helpful for future AI agents and developers
- Maintain architectural decision records for significant changes
- Keep README and other documentation files and setup instructions current

### Version Control Best Practices
- Use clear, descriptive commit messages
- Consider conventional commit formats (e.g., `feat: add new login endpoint`)
- Commit changes in logical, atomic units
- Ensure all changes are properly tracked and reversible

## AI Agent Collaboration Guidelines

### Multi-Agent Environments
- Coordinate with other AI agents to avoid conflicting modifications
- Use proper file locking mechanisms when available
- Communicate changes clearly in shared environments
- Respect existing work patterns and established conventions

### Human-AI Collaboration
- Clearly explain technical decisions to human developers
- Provide options when multiple valid approaches exist
- Ask for clarification when requirements are ambiguous
- Maintain transparency in all operations and decision-making processes

---

**Note**: These guidelines are designed to ensure consistent, reliable, and maintainable software development practices across all AI coding assistants and development environments. Always prioritize code quality, project integrity, and clear communication.



# Principles 
## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.