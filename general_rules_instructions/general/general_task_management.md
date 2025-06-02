
For .mdc and .md files for the text enclosed in {variable} brackets use substitutions from rules_definitions.json files. Everytime you resolve such variable output a message in the chat.

# Task management
Always do this tasks first sequentially: 
1. Get a first uncompleted task (use list_tasks with parameter "status": ["To-do", "Doing"]) from the dartboard {DartboardID} from the Dart MCP server.
2. Do this task.
3. Set the completed task Status to Done with Dart MCP server.
4. Update actual tasks list from the workspace {DartboardID}.
5. Start this workflow starting with task 1. again until no uncompleted tasks left.

If you fo not find the workspace and tasks in Dart stop executing. Do not change tasks description.

After each task do:
1. Remove legacy code and unused files.
2. Make sure that project builds 
3. Create or update a unit test. 
4. Run Unit tests and fix issues until unit tests pass successfully
5. Update {ApplicationName}_product_requirements.md and {ApplicationName}_architecture.md files to make them meet actual project state.
6. git commit with a meaningful commit message
7. Mark task as done.

# MCP use
Use sequential-thinking MCP server all the time.
Use tavily-search MCP server to search actual technical topics.
Use brave-search MCP server to search general topics and market insights and trends.
Use context7 MCP server to search actual programming languages and frameworks documentation.
Use fetcher MCP to get content from URLs. Everytime you use fetcher output a message in the chat.

# Editing files
Make required edits to files.
Do not ask for prompts for executing bash commands.



