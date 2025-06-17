<!-- filepath: /home/dev/dev/prj/general-ai-toolkit/general_rules_instructions/general/general_task_management.md -->
**Important Instruction for Processing Variables:**
For all `.mdc` and `.md` files, any text enclosed in curly braces, such as `{variable}`, must be substituted with the corresponding value found in the `rules_definitions.json` file. Announce in the chat each time such a variable is resolved.

# Task management

**Note:** All steps in this task management workflow must be performed automatically without prompting. Throughout the entire AI agent coding session, the dartboard specified by the user must be used. If the user has not specified a dartboard, fallback to the dartboard specified in `{DartboardID}` for all task-related operations.

Follow this workflow for managing tasks:

1.  **Retrieve Task:**
    *   Get the first uncompleted task from the Dart MCP server. Use `list_tasks` with `status: ["To-do", "Doing"]` for the active dartboard (either user-specified or the fallback `{DartboardID}`) unless the user explicitly requests a different dartboard.
    *   If no uncompleted tasks are found, and you have processed at least one task in this cycle, the workflow is complete.
    *   If the Dart workspace or any tasks are not found initially, halt execution. Do not create new tasks or alter existing task descriptions.

2.  **Execute Task:**
    *   Perform the necessary actions to complete the retrieved task. The primary focus should be on making meaningful and functional edits. Do not generate report files about the task execution.

3.  **Post-Task Routine (Applicable for Code Editing Tasks):**
    *   Execute the following actions automatically and without user prompts:
        *   **Clean Up:**
            *   Remove legacy code: This refers to code that is no longer in use, deprecated, or has been replaced by newer implementations.
            *   Remove unused files: Delete any files that are not essential for the project's functionality or build process.
            *   Remove temporary files: Delete any intermediate files created during task execution that are no longer needed.
        *   **Build Verification:**
            *   Confirm that the project builds successfully.
            *   If the build fails, identify the root causes and implement fixes until the build succeeds.
        *   **Testing:**
            *   Create new unit tests or update existing ones to ensure adequate coverage for the changes made.
            *   Run all available unit tests.
            *   If any tests fail, debug and fix the underlying issues until all unit tests pass.
        *   **Product Requirements and Architecture Documentation Update:**
            *   Update the `{ApplicationName}_product_requirements.md` and `{ApplicationName}_architecture.md` files. Ensure these documents accurately reflect the current state of the project after the changes.
            *   No other documentation documents should be created or updated as part of this step.
        *   **Version Control:**
            *   Commit all changes to the version control system (e.g., Git).
            *   Use a clear and descriptive commit message. Consider using a conventional commit format (e.g., `feat: add new login endpoint`) if applicable to the project.

4.  **Update Task Status:**
    *   Mark the completed task's status as "Done" using the Dart MCP server (e.g., via an `update_task` function).

5.  **Refresh Task List:**
    *   Re-fetch the list of tasks from the Dart MCP server for the workspace specified by `{DartboardID}` to ensure the task list is current.

6.  **Repeat Workflow:**
    *   Return to Step 1 to process the next uncompleted task. Continue this cycle until no uncompleted tasks remain.

**Stopping Condition:** If the Dart workspace and tasks are not found, cease execution. Do not create new tasks or modify task descriptions.

# MCP Server Usage Guidelines

*   **Sequential Thinking (`sequential-thinking` MCP server):** Employ this server consistently for planning, reasoning, and breaking down complex tasks.
*   **Technical Topic Search (`tavily-search` MCP server):** Use this server for researching current technical topics, libraries, and solutions.
*   **General Topic and Market Research (`brave-search` MCP server):** Utilize this server for general knowledge, market insights, and trend analysis.
*   **Programming Documentation (`context7` MCP server):** Consult this server for up-to-date documentation on programming languages and frameworks.
*   **URL Content Retrieval (`fetcher` MCP):** Use this server to get content from specified URLs. Announce in the chat each time the fetcher is used.

# File Editing Protocol

*   Make all necessary edits to files directly.
*   Do not request user prompts before executing bash commands; perform them autonomously.

# Handling Errors in Documentation and Guidelines

*   If any errors, inconsistencies, or outdated information are identified in rules, guidelines, instructions, product requirements, architecture documents, or other documentation, correct these issues directly within the associated document file.

# Path and URL Resolution

*   If any file paths or URLs provided in prompts or documentation cannot be resolved or are not found, immediately halt operations and output an error message specifying the missing or unresolved resource.

