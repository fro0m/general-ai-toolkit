# VS Code Copilot Auto-Continue: Software Architecture

## 1. Introduction
This document outlines the software architecture for the "VS Code Copilot Auto-Continue" script. It details the script's components, their interactions, and the overall design principles that ensure its functionality, maintainability, and resilience. This architecture is derived from the product requirements specified in the [Product Requirements Document](./vscode_auto_continue_product_requirements.md).

## 2. High-Level Architecture
The script is designed as a single, self-contained JavaScript module that is injected into the VS Code Developer Tools console. It operates by periodically scanning the DOM of the Copilot Chat panel to detect actionable elements and idle states.

The architecture is based on a simple, event-driven model orchestrated by a main loop. The core components are:
- **A global `autoContinue` object**: Serves as the main namespace and entry point for the script.
- **State Manager**: Manages the script's internal state (e.g., running or stopped).
- **Configuration Module**: Centralizes all DOM selectors and hard-coded strings for easy updates.
- **Main Loop**: The heart of the script, which orchestrates all actions.
- **Action Modules**: A collection of functions, each responsible for a specific task like clicking a button or sending a prompt.
- **Logging Utility**: Provides console feedback for debugging and monitoring.

## 3. Component Breakdown

### 3.1. The `autoContinue` Object
This is the main global object that encapsulates all the script's logic and data. It prevents pollution of the global namespace and provides a clear API.

```javascript
const autoContinue = {
  config: { ... },
  state: { ... },
  start: function() { ... },
  stop: function() { ... },
  mainLoop: function() { ... },
  // ... other private functions
};
```

- **API**:
    - `autoContinue.start()`: Initializes the script and starts the main loop. This is called automatically when the script is injected.
    - `autoContinue.stop()`: Stops the main loop and cleans up any resources.

### 3.2. State Management
The `state` object holds the script's current status.

- **Properties**:
    - `isRunning` (boolean): Indicates if the main loop is active.
    - `timerId` (number): Stores the ID of the `setInterval` timer for the main loop, so it can be cleared by `stop()`.
    - `lastActivityTime` (Date): Timestamp of the last detected AI activity. Used for idle detection.
    - `shortTaskCount` (number): Counter for consecutive fast tasks, used for the auto-stop feature.

### 3.3. Configuration Module
The `config` object centralizes all constants, making the script easier to maintain, especially when the VS Code UI changes.

- **Properties**:
    - `selectors` (object): A nested object containing all CSS selectors for buttons (`continue`, `tryAgain`, `accept`, etc.) and other UI elements like the chat input field.
    - `prompts` (object): Stores the predefined continuation prompt.
    - `intervals` (object): Defines time intervals for the main loop and other time-based logic (e.g., idle timeout).

### 3.4. Main Loop (`mainLoop`)
This function is the core of the script's operation. It is executed repeatedly using `setInterval`.

- **Logic**:
    1.  Check if the script is in the `running` state. If not, exit.
    2.  Call `checkForButtons()` to find and click any actionable buttons. If a button is clicked, reset the idle timer and exit the current loop iteration.
    3.  If no buttons are found, call `checkForIdle()` to see if the AI has stalled.
    4.  If the AI is idle, check if the chat input field is empty to avoid interfering with user input.
    5.  If the input field is empty, call `sendContinuationPrompt()`.
    6.  Call `autoStopLogic()` to check if the script should terminate itself.

### 3.5. Action Functions
These are specialized functions that perform a single, well-defined action.

- `clickButton(selector)`: Finds an element by its selector and dispatches a `click` event.
- `checkForButtons()`: Iterates through the button selectors in the `config` and calls `clickButton` if a match is found.
- `checkForIdle()`: Checks if the time since `lastActivityTime` has exceeded the configured idle threshold.
- `sendContinuationPrompt()`: Enters the continuation prompt into the chat input field and simulates a send action.
- `autoStopLogic()`: Implements the heuristic for automatically stopping the script based on the `shortTaskCount` and task completion times.

### 3.6. Logging
A simple logging function that respects a debug flag.

- `log(message, level)`: Prints a message to the console. If `level` is 'debug', it only prints if a debug flag is enabled.

## 4. Data Flow
The data flow is unidirectional and straightforward:

1.  **Initialization**: The script is injected. `autoContinue.start()` is called, setting `state.isRunning` to `true` and starting the `mainLoop` via `setInterval`.
2.  **DOM Interaction**: The `mainLoop` reads the DOM to detect UI elements.
3.  **State Update**: Based on the DOM state, action functions are called. These actions may trigger changes in the UI. The script's internal `state` (e.g., `lastActivityTime`) is updated.
4.  **User Interaction**: The user can manually stop the script by calling `autoContinue.stop()`, which sets `state.isRunning` to `false` and clears the timer.

## 5. Error Handling and Resilience
- **Selector Specificity**: Selectors are designed to be as specific as possible to avoid unintended clicks.
- **Graceful Failure**: If a selector does not find an element, the script simply moves on without throwing an error. This makes it resilient to minor UI changes or variations.
- **Manual Override**: The user always has the ability to stop the script immediately with `autoContinue.stop()`.
- **UI Change Mitigation**: By centralizing selectors in the `config` object, updating the script to adapt to UI changes is a streamlined process.
