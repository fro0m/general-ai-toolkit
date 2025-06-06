For .mdc and .md files for the text enclosed in {variable} brackets use substitutions from rules_definitions.json files. Everytime you resolve such variable output a message in the chat.

# Task management

Follow this workflow for managing tasks:

1.  **Retrieve Task:**
    *   Get the first uncompleted task from the Dart MCP server (use `list_tasks` with `status: ["To-do", "Doing"]` for dartboard `{DartboardID}`).
    *   If no uncompleted tasks are found, and you have processed at least one task in this cycle, the workflow is complete.
    *   If no workspace or tasks are found in Dart initially, stop execution. Do not create new tasks or modify existing task descriptions.

2.  **Execute Task:**
    *   Perform the actions required to complete the retrieved task.

3.  **Post-Task Routine (for code editing tasks):**
    *   Perform these actions automatically without prompting:
        *   **Clean Up:** Remove legacy code and unused files.
        *   **Build Verification:** Ensure the project builds successfully. If the build fails, identify and fix all build issues before proceeding.
        *   **Testing:**
            *   Create or update unit tests.
            *   Run unit tests and fix any issues until all tests pass.
        *   **Documentation Update:** Update `{ApplicationName}_product_requirements.md` and `{ApplicationName}_architecture.md` files to reflect the actual project state.
        *   **Version Control:** Commit changes with a meaningful git commit message.

4.  **Update Task Status:**
    *   Set the completed task's status to "Done" using the Dart MCP server.

5.  **Refresh Task List:**
    *   Update the list of actual tasks from the workspace `{DartboardID}`.

6.  **Repeat Workflow:**
    *   Go back to step 1 to process the next uncompleted task. Continue until no uncompleted tasks remain.

If you do not find the workspace and tasks in Dart stop executing. Do not create new tasks and do not change tasks description.

# MCP use
Use sequential-thinking MCP server all the time.
Use tavily-search MCP server to search actual technical topics.
Use brave-search MCP server to search general topics and market insights and trends.
Use context7 MCP server to search actual programming languages and frameworks documentation.
Use fetcher MCP to get content from URLs. Everytime you use fetcher output a message in the chat.

# Editing files
Make required edits to files.
Do not ask for prompts for executing bash commands.

# Handling errors in documentation and guidelines 
If you find any errors in rules, guidelines, instructions, product requirements, architecture, documentatnion, etc fix it in the assosiated document.

