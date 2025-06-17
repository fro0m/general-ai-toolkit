The product must satisfy {ApplicationName}_product_requirements.md and architecture.md files. {ApplicationName}_product_requirements.md has a higher priority than architecture.md .

Before creating any new classes, the `{ApplicationName}_architecture.md` document must be updated to reflect these planned changes. Both the `{ApplicationName}_product_requirements.md` and `{ApplicationName}_architecture.md` files must always accurately represent the current state of the project.

When fixing bugs or addressing issues, the primary approach must be to identify and fix the root cause of the problem. Do not add defensive code, excessive error handling, or workarounds that mask the underlying issue.

If you encounter issues related to function definitions, syntax, or return types, first evaluate if the function is genuinely necessary. Prefer removing the function entirely over implementing or fixing it if its utility is questionable.

Similarly, if you encounter issues with function arguments (e.g., how they are used or if they are used at all), first assess if these arguments are actually needed. Prefer removing unused or unnecessary arguments instead of attempting to fix their implementation or usage.

Use all coding guidelines from {CodingGuidelinesURLs} list, which can contain both web URLs and local file paths. The content from these guidelines should be incorporated with the current file content.
