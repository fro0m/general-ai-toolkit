## AI Agent File Management Guidelines

**Critical**: Before applying any changes to files, the AI agent must reread the target file to ensure it has the most current version. Files may have been modified outside of the current session by other processes, users, or concurrent operations.

### File Change Protocol for AI Agents

1. **Always reread before editing**: Use `read_file` tool to get the current state of any file before applying modifications
2. **Verify file content**: Compare the current file content with your cached version to detect any external changes
3. **Handle conflicts gracefully**: If the file has been modified externally:
   - Analyze the changes to understand their impact
   - Adapt your modifications to work with the current file state
   - Inform the user about any conflicts or adjustments made
4. **Document assumptions**: When making changes, note what version of the file you're working with

### Example Workflow for File Modifications

```bash
# Before modifying any file, always check its current state
# 1. Read the current file content
# 2. Compare with cached/expected content
# 3. Apply changes that are compatible with current state
# 4. If conflicts exist, resolve them appropriately
```

The product must satisfy {ApplicationName}_product_requirements.md and architecture.md files. {ApplicationName}_product_requirements.md has a higher priority than architecture.md .

Before creating any new classes, the `{ApplicationName}_architecture.md` document must be updated to reflect these planned changes. Both the `{ApplicationName}_product_requirements.md` and `{ApplicationName}_architecture.md` files must always accurately represent the current state of the project.

When fixing bugs or addressing issues, the primary approach must be to identify and fix the root cause of the problem. Do not add defensive code, excessive error handling, or workarounds that mask the underlying issue.

If you encounter issues related to function definitions, syntax, or return types, first evaluate if the function is genuinely necessary. Prefer removing the function entirely over implementing or fixing it if its utility is questionable.

Similarly, if you encounter issues with function arguments (e.g., how they are used or if they are used at all), first assess if these arguments are actually needed. Prefer removing unused or unnecessary arguments instead of attempting to fix their implementation or usage.

Use all coding guidelines from {CodingGuidelinesURLs} list, which can contain both web URLs and local file paths. The content from these guidelines should be incorporated with the current file content.
