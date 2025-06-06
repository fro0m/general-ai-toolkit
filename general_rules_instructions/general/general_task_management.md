
For .mdc and .md files for the text enclosed in {variable} brackets use substitutions from rules_definitions.json files. Everytime you resolve such variable output a message in the chat.

# Task management
Always do these tasks first sequentially: 
1. Get a first uncompleted task (use list_tasks with parameter "status": ["To-do", "Doing"]) from the dartboard {DartboardID} from the Dart MCP server.
2. Do this task.
3. For code editing tasks, perform these additional actions:
   a. Remove legacy code and unused files.
   b. Make sure that project builds.
   c. Create or update a unit test.
   d. Run Unit tests and fix issues until unit tests pass successfully.
   e. Update {ApplicationName}_product_requirements.md and {ApplicationName}_architecture.md files to make them meet actual project state.
   f. git commit with a meaningful commit message.
4. Set the completed task Status to Done with Dart MCP server.
5. Update actual tasks list from the workspace {DartboardID}.
6. Start this workflow starting with task 1. again until no uncompleted tasks left.

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

