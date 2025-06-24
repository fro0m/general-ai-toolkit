# AI Agent Software Development Guidelines

**Important Instruction for Processing Variables:**
For all `.mdc` and `.md` files, any text enclosed in curly braces, such as `{variable}`, must be substituted with the corresponding value found in the `rules_definitions.json` file. Announce in the chat each time such a variable is resolved.

## Core Development Principles for AI Agents

### 1. File Management Protocol (MANDATORY)
**Critical**: Before applying any changes to files, AI agents must reread the target file to ensure they have the most current version. Files may have been modified outside of the current session by other processes, users, or concurrent operations.

#### File Change Workflow:
1. **Always reread before editing**: Use `read_file` tool to get the current state of any file before applying modifications
2. **Verify file content**: Compare the current file content with your cached version to detect any external changes
3. **Handle conflicts gracefully**: If the file has been modified externally:
   - Analyze the changes to understand their impact
   - Adapt your modifications to work with the current file state
   - Inform the user about any conflicts or adjustments made
4. **Document assumptions**: When making changes, note what version of the file you're working with
5. **Direct File Editing Only**:
    - All edits must be made directly to the target files
    - Never create backup copies (e.g., .bak, .backup, .old, .tmp, ~, .swp, etc.)
    - Do not create legacy versions of files (e.g., file_v2.py, file.old.js)
    - Do not create temporary files with modified content
    - Use version control (e.g., Git) for tracking changes instead of creating file copies
    - If you need to reference previous versions, use the version control history, not file copies

#### Submodules and External Projects (CRITICAL RESTRICTION)
**NEVER modify files in submodules or external projects**. This includes:
- Git submodules (typically found in subdirectories that are separate repositories)
- Third-party libraries and dependencies (e.g., files in `external/`, `third_party/`, `vendor/`, `lib/`, `dependencies/` directories)
- Downloaded packages and frameworks (e.g., Qt libraries, CMake modules, package manager dependencies)
- Any files that are not part of the main project's source code

#### Example File Modification Workflow:
```bash
# Step-by-step process for AI agents:
# 1. Read current file content using read_file tool
# 2. Compare with cached/expected content
# 3. Identify any external changes or conflicts
# 4. Apply changes that are compatible with current state
# 5. If conflicts exist, resolve them appropriately
# 6. Document the changes made and reasoning
```

### 2. Task Management and Execution
- **Task Status Handling**:
  - When a task is started, update its status to "Doing" and record the start time in the task description using the format: "Execution started at: YYYY-MM-DD Thh:mm"
  - If a task is in "Doing" status and has been worked on for less than 2 hours, skip it as it's likely being handled by another AI agent
  - Only pick up tasks that are either in "To-do" status or have been in "Doing" status for more than 2 hours
  - This prevents multiple agents from working on the same task simultaneously and ensures tasks don't get stuck indefinitely

### 3. Product Requirements and Architecture Compliance
- The product must satisfy `{ApplicationName}_product_requirements.md` and `{ApplicationName}_architecture.md` files
- `{ApplicationName}_product_requirements.md` has **higher priority** than `{ApplicationName}_architecture.md`
- Before creating any new classes or major components, update the `{ApplicationName}_architecture.md` document to reflect these planned changes
- Both documents must **always accurately represent the current state** of the project after any modifications

### 3. Root Cause Analysis and Problem-Solving Approach
When fixing bugs or addressing issues:
- **Primary approach**: Identify and fix the root cause of the problem
- **Avoid**: Adding defensive code, excessive error handling, or workarounds that mask the underlying issue
- **Prefer simplification**: If a function or component is problematic and its utility is questionable, remove it entirely rather than fixing it
- **Argument evaluation**: If function arguments are unused or unnecessary, remove them instead of attempting to fix their implementation

### 4. Code Quality and Maintenance Standards
- Remove legacy code that is no longer in use, deprecated, or replaced by newer implementations
- Delete unused files that are not essential for the project's functionality or build process
- Clean up temporary files created during development that are no longer needed
- Ensure all code follows the project's established patterns and conventions
- **Do not create file backups** (e.g., .bak, .backup, .old files) during development operations - rely on version control for file history and recovery

### 5. Coding Guidelines Integration
Use all coding guidelines from the `{CodingGuidelinesURLs}` list, which can contain both web URLs and local file paths. The content from these guidelines should be incorporated with the current file content and project requirements.

## AI Agent Communication Guidelines

### Clear Communication Patterns
- **Announce actions**: Clearly state what operations you are performing (e.g., "Reading file X to check current state")
- **Explain reasoning**: Provide context for your decisions and modifications
- **Report conflicts**: If file conflicts or issues are detected, explain them clearly
- **Document changes**: Summarize what was modified and why

### Error Handling and Recovery
- If file read operations fail, report the specific error and attempt alternative approaches
- If conflicts are detected during file operations, prioritize data integrity
- Always validate that changes can be applied safely before execution
- Provide clear error messages and suggested resolution steps

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
