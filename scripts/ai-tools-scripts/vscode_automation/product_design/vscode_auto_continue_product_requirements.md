# Product Requirements Document: VS Code Copilot Auto-Continue

## 1. Title and Overview
- **Title**: VS Code Copilot Auto-Continue
- **Overview**: This document outlines the product requirements for the "VS Code Copilot Auto-Continue" script, a VS Code console-based automation tool designed to enhance the productivity of developers using VS Code's Copilot Chat. The script automates repetitive interactions, allowing for a seamless and uninterrupted workflow when generating code, receiving suggestions, or performing complex tasks with the AI assistant.

## 2. Version History
| Version | Status                |
|---------|-----------------------|
| 1.0     | Implemented           |
| 1.1     | Requirements WIP      |

## 3. Purpose and Goals
- **Problem Statement**: Developers using VS Code Copilot Chat frequently encounter interruptions that require manual intervention, such as clicking "Continue," "Try Again," or "Accept." These actions, while small, break the user's focus and disrupt the creative coding process, leading to decreased efficiency and a fragmented user experience.
- **Goals**:
    - **Reduce manual interventions**: Eliminate the need for users to manually click common action buttons in the Copilot Chat interface by 95%.
    - **Improve workflow continuity**: Ensure a seamless, uninterrupted interaction with Copilot, allowing developers to stay "in the zone" for longer periods.
    - **Automate task continuation**: Proactively prompt the AI to continue its current task, preventing stalls and ensuring that long-running operations complete without user oversight.
    - **Intelligent Script Termination**: Automatically stop the script when it detects that the AI has likely completed all its tasks, preventing unnecessary background processing.
- **Vision Statement**: To create a "fire-and-forget" experience for VS Code Copilot users, where the AI assistant works autonomously to complete tasks without requiring manual nudges, making the human-AI collaboration feel effortless and truly intelligent.

## 4. Stakeholders
- **Internal Stakeholders**:
    - Product Manager
    - Lead Developer
    - QA Engineer
- **External Stakeholders**:
    - N/A

## 5. Target Audience
- **User Persona: Alex, the Senior Software Engineer**
    - **Demographics**: 32 years old, works remotely for a tech startup.
    - **Behaviors**: Spends 6-8 hours a day in VS Code, heavily relies on Copilot for boilerplate code, debugging, and exploring new libraries. Values efficiency and uninterrupted focus.
    - **Goals**: To write high-quality code quickly, meet tight deadlines, and minimize cognitive load from repetitive tasks.
    - **Frustrations**: Gets annoyed by the constant need to click "Continue" when generating long code blocks or "Try Again" when Copilot fails. These interruptions break his flow and make the AI feel less like a partner and more like a tool that needs constant supervision.
- **Needs and Pain Points**:
    - A way to keep Copilot working without having to babysit the interface.
    - An automated method to handle common interruptions and errors.
    - The ability to start a long task and trust that it will be completed without further input.

## 6. Scope
- **In-Scope**:
    - Automatically clicking the "Continue", "Try Again", "Keep", and "Accept" buttons.
    - Detecting when the AI is idle and automatically sending a prompt to continue the current task.
    - Providing a console command `autoContinue.stop()` for stopping the automation.
    - A debug mode to provide detailed logging of the script's actions.
    - Automatically stopping the script if it determines the AI has no more tasks.
- **Out-of-Scope**:
    - A graphical user interface (GUI) for configuration.
    - User-configurable prompts (the continuation prompt is hard-coded).
    - Support for environments other than the VS Code web-based interface where the script is injected.

## 7. User Stories
- **As a developer**, I want the script to automatically click the "Continue" button so that I can generate long files or code blocks without interruption.
- **As a developer**, I want the script to automatically click "Try Again" when Copilot encounters an error so that the AI can recover and complete my request without my intervention.
- **As a developer**, I want the script to automatically accept suggestions by clicking "Keep" or "Accept" so that I can maintain my workflow speed.
- **As a developer**, I want the script to recognize when Copilot has stopped working and prompt it to continue, but only if the chat input field is empty, to avoid overwriting my own text.
- **As a developer**, I want the script to automatically stop itself when it seems that after sending a prompt AI finishes the tasks less than 1 minue for several times in a row, so it doesn't keep running in the background forever.

## 8. Design and UX Considerations
- **Design Principles**:
    - **Invisible and Unobtrusive**: The script should run in the background with no visible UI, providing a seamless experience.
    - **Reliable and Predictable**: The automation should be consistent and trustworthy, correctly identifying and acting on the intended elements.
    - **Zero Configuration**: The script should work out-of-the-box with no setup required from the user.
- **User Flows**: The script is run by injecting its contents into the VS Code Developer Tools console. Once running, the user flow is passive. The user works in VS Code as usual, and the script intervenes automatically when needed. The only active interaction is the `autoContinue.stop()` console command to terminate the script.

## 9. Technical Requirements
- **Platform Requirements**: The script must be compatible with VS Code from `scripts/vscode_automation/vscode-main` and VS Code Copilot from `scripts/vscode_automation/vscode-copilot-chat-main`.
- **Performance Requirements**: The script must have a negligible impact on VS Code performance, with checks running efficiently in the background. The interval for checks should not be more frequent than every 5 seconds to avoid performance degradation.

## 10. Dependencies
- **Internal Dependencies**: None.
- **External Dependencies**: The script is dependent on the DOM structure and class names used by the VS Code Copilot Chat interface. Changes to the VS Code UI may require updates to the script's selectors.

## 11. Success Metrics
- **Key Performance Indicators (KPIs)**:
    - **Number of automated clicks**: Track the total number of buttons clicked automatically per user session. A high number indicates the script is successfully reducing manual effort.
    - **Number of automated prompts sent**: Measure how many times the script proactively continues a task.
- **User Feedback Mechanisms**: Monitor developer forums and feedback channels for comments related to workflow interruptions. A reduction in complaints about "having to click continue" will be a key indicator of success.

## 12. Risks and Assumptions
- **Risks**:
    - **UI Changes**: The VS Code team could update the Copilot Chat UI, breaking the script's selectors. Mitigation: The script uses a wide range of selectors for each button to be resilient to minor changes. Major changes will require a script update.
    - **Unintended Clicks**: The script could misidentify an element and click something unintended. Mitigation: Selectors are designed to be highly specific to the chat and action context.
- **Assumptions**:
    - Users are running the script in a compatible VS Code environment.
    - The core functionality and class names of the Copilot Chat interface will remain relatively stable.

## 13. Feature Subsections
#### Automatic Button Clicking
- **Description**: This feature is the core of the automation, responsible for identifying and clicking key action buttons within the Copilot Chat interface. It enhances user flow by handling common interruptions automatically.
- **Goal**: To eliminate the need for the user to manually click "Continue", "Try Again", "Keep", or "Accept", allowing for a seamless interaction with the AI.
- **Use Cases**:
    1.  **Long Code Generation**: A user asks Copilot to generate a large file. Copilot writes a portion and then displays a "Continue" button. The script detects and clicks the button, prompting Copilot to continue generating the file.
    2.  **Error Recovery**: Copilot fails to process a request and shows a "Try Again" button. The script automatically clicks it, re-submitting the request.
- **Visual UI**: This feature has no visual UI. It interacts directly with the existing VS Code interface elements.
- **User Requirements**: The user requires the script to be reliable and fast, clicking the correct buttons within a few seconds of them appearing.
- **User**: Alex, the Senior Software Engineer.

#### Idle Task Detection and Auto-Stop
- **Description**: This feature provides an intelligent mechanism to halt the script's operation when it determines that the AI agent has likely completed all its assigned tasks. This prevents the script from running indefinitely in the background and attempting to prompt an idle AI.
- **Goal**: To automatically and gracefully stop the automation when the user's work session appears to be complete, conserving resources and avoiding unnecessary actions.
- **Use Cases**:
    1.  **Task Completion**: The AI has finished all its work. The last few interactions were very quick (e.g., simple acknowledgments). The script detects this pattern of rapid, short tasks and automatically stops itself.
- **Visual UI**: This feature has no visual UI. It will log a message to the console when it auto-stops.
- **User Requirements**: The user needs a reliable way for the script to stop itself without requiring manual intervention. The detection logic should be tuned to avoid premature termination while a complex task is still in progress. The heuristic for this is defined as: if the last 3 tasks were each completed in under 20 seconds (totaling less than 1 minute), the script will terminate.
- **User**: Alex, the Senior Software Engineer.

#### Automated Task Continuation
- **Description**: This feature ensures that Copilot does not remain idle if a task is incomplete. When no buttons are available, the AI is not actively working, and the chat input field is empty, the script sends a predefined prompt to encourage it to continue its task.
- **Goal**: To prevent the AI from stalling and ensure that long-running or complex tasks are seen through to completion without manual prompting.
- **Use Cases**:
    1.  **Stalled Generation**: Copilot finishes a response but the overall task is not complete. The user is away from the keyboard and has not typed anything in the chat. After a short period of inactivity, the script sends the prompt "Continue executing the current task...", re-engaging the AI.
- **Visual UI**: No visual UI. The feature interacts with the chat input field programmatically.
- **User Requirements**: The user needs the script to be intelligent enough to know when it's appropriate to send the continuation prompt, avoiding spamming the chat.
- **User**: Alex, the Senior Software Engineer.
