# VS Code Copilot Instructions
<!-- Converted from Cursor IDE rules -->

## JavaScript Standards

Standards and practices for JavaScript development

When working with JavaScript code, please follow these guidelines:

- Use modern ES6+ syntax when possible
- Prefer arrow functions for callbacks
- Use async/await instead of raw promises
- Always include proper error handling
- Document complex functions with JSDoc comments

## File Patterns
This instruction applies to the following file patterns:
- `*.js`
- `*.jsx`
- `*.ts`
- `*.tsx`

## Linting Rules
Please follow these code quality guidelines:

- When you see pattern `console\.log\(`: Consider using a logger instead of console.log for production code
- When you see pattern `TODO:`: There's a TODO comment that needs to be addressed
- When you see pattern `var `: Use 'let' or 'const' instead of 'var' for variable declarations
