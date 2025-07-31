
# Product Requirements Document: Rules Converter

## 1. Introduction

*   **Purpose**: The Rules Converter is a command-line tool that transforms `.mdc` files from Cursor IDE into several other formats for use in different AI-powered code editors and assistants. This ensures that a single source of truth for coding rules and instructions can be used across multiple development environments.
*   **Target Audience**: Developers who use multiple AI coding tools (like VS Code Copilot, Roo Code, Windsurf, and Cline) and want to maintain a consistent set of custom instructions across all of them.
*   **Scope**: This document covers the current functionality of the Rules Converter, which includes converting `.mdc` files to formats for VS Code, Roo Code, Windsurf, and Cline, and handling both single files and entire directories.

## 2. Goals and Objectives

*   **Business Goals**:
    *   Improve developer efficiency by allowing them to manage a single set of rules for multiple tools.
    *   Encourage the adoption of standardized coding practices within development teams by making it easy to share and deploy rules.
*   **Product Goals**:
    *   Provide a reliable and easy-to-use tool for converting `.mdc` files.
    *   Support the most common AI coding assistants.
    *   Ensure that the converted files are placed in the correct directory structure for each respective tool.

## 3. User Personas and Stories

*   **User Persona: "Alex the Polyglot Developer"**
    *   **Goals**: To use the best AI tool for the task at hand without having to manually duplicate and reformat custom instructions.
    *   **Motivations**: Efficiency, consistency, and a desire to stay on the cutting edge of AI development tools.
    *   **Pain Points**: Manually maintaining the same set of rules in different formats for VS Code, Roo Code, and other tools is time-consuming and error-prone.
*   **User Stories**:
    *   "As Alex, I want to convert a single `.mdc` file so that I can quickly test a new rule in all my supported editors."
    *   "As Alex, I want to convert an entire directory of `.mdc` files so that I can set up a new project with all my standard rules in one command."
    *   "As Alex, I want the converter to automatically place the output files in the correct locations for each tool so that I don't have to move them manually."

## 4. Features and Functionality

*   **Feature List**:
    *   Convert `.mdc` files to VS Code instruction files (`.instructions.md`).
    *   Convert `.mdc` files to Roo Code rules files (`.md`).
    *   Convert `.mdc` files to Windsurf rules files (`.md` with YAML frontmatter).
    *   Convert `.mdc` files to Cline rules files (`.md`).
    *   Process a single `.mdc` file.
    *   Process all `.mdc` files in a directory and its subdirectories.
    *   Copy non-`.mdc` files to a specified output directory.
    *   Place converted files in the standard directory structure for each tool (`.github/instructions/`, `.roo/rules/`, `.windsurf/rules/`, `.clinerules/`).
*   **Prioritization (MoSCoW)**:
    *   **Must-have**: Conversion to all four formats, single file conversion, directory conversion.
    *   **Should-have**: Correct output directory structure, copying of non-`.mdc` files.
    *   **Could-have**: Additional output formats in the future.
    *   **Won't-have**: A graphical user interface (GUI).

## 5. Non-Functional Requirements

*   **Performance**: The tool should be able to convert a typical project's ruleset (e.g., 50 files) in under 5 seconds.
*   **Scalability**: The tool should be able to handle directories with hundreds of files and nested subdirectories.
*   **Security**: As a local command-line tool, it does not have any specific security requirements beyond standard file system permissions.
*   **Usability**: The tool should have a clear command-line interface with helpful instructions and error messages.
*   **Compatibility**: The tool is written in Python and should be compatible with Python 3.7+. It should run on Linux, macOS, and Windows.

## 6. Assumptions and Constraints

*   **Assumptions**:
    *   Users have Python and Poetry (or pip) installed.
    *   The input `.mdc` files are well-formed (either JSON or YAML-like with frontmatter).
*   **Constraints**:
    *   The tool is a command-line application only.
    *   The output directory structures are dictated by the requirements of the target tools.

## 7. Success Metrics

*   **Key Performance Indicators (KPIs)**:
    *   Number of downloads/installs (if published to a package repository).
    *   User feedback and bug reports.
    *   Adoption by internal development teams.

## 8. Future Work

*   **Roadmap**:
    *   Support for additional AI tool formats as they become popular.
    *   A "watch" mode to automatically re-run the conversion when `.mdc` files are changed.
*   **Ideas for Later**:
    *   A configuration file to allow users to specify which output formats they want to generate.
    *   Integration with build systems or CI/CD pipelines.
