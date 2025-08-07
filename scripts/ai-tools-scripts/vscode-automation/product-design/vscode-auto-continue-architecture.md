# VS Code Auto-Continue Script: Software Architecture v3.0

## 1. Introduction
This document outlines the software architecture for the "VS Code Auto-Continue Script" version 3.0. The script has been significantly simplified to focus solely on immediate button clicking without task detection or text insertion capabilities.

**Important Note**: This document describes the `auto-continue.js` script only. This is not to be confused with the separate `auto-inserter.js` script which has different functionality and architecture.

## 2. High-Level Architecture
The `auto-continue.js` script is designed as a single, self-contained JavaScript module that operates by periodically scanning the DOM of the Copilot Chat panel to detect and immediately click actionable buttons.

The simplified architecture consists of:
- **Global `autoContinue` object**: Main API entry point
- **State Manager**: Minimal state tracking (running status, cooldowns)
- **Configuration Module**: Button selectors and timing configurations
- **Main Loop**: Simplified scanning and clicking logic
- **Button Clicking Function**: Core functionality for detecting and clicking buttons
- **Logging Utility**: Debug and monitoring output

## 3. Component Breakdown

### 3.1. The `autoContinue` Object
Global object providing the public API:

```javascript
window.autoContinue = {
  start: startAutoContinue,
  stop: stopAutoContinue,
  clickButtonByText: clickButtonByText,
  enableDebug: () => { state.debugMode = true; },
  disableDebug: () => { state.debugMode = false; },
  getState: () => ({ ...state }),
  version: '3.0'
};
```

### 3.2. State Management
Minimal state tracking for core functionality:

- **Properties**:
    - `isRunning` (boolean): Main loop status
    - `timerId` (number): Interval timer ID for cleanup
    - `lastClick` (number): Timestamp for cooldown management
    - `isProcessing` (boolean): Prevents concurrent main loop execution
    - `cleanupCounter` (number): Periodic maintenance counter
    - `debugMode` (boolean): Debug logging toggle

### 3.3. Configuration Module
Centralized button selectors and timing:

- **Properties**:
    - `selectors.buttons`: Button selector arrays for Continue, Try Again, Keep, Accept actions
### 3.4. Main Loop (`mainLoop`)
Simplified loop that focuses only on button detection and clicking:

- **Logic**:
    1. Check if script is running and not already processing
    2. Perform periodic cleanup of clicked button markers
    3. Call `checkForButtons()` to scan for and click actionable buttons
    4. Exit - no idle detection or task tracking

### 3.5. Action Functions
Streamlined functions for core functionality:

- `clickButton(selector)`: Core function that finds and clicks eligible buttons with proper validation
- `checkForButtons()`: Iterates through button configurations and attempts clicking
- `clickButtonByText(buttonName)`: Public API method to click specific button types
- **Removed**: All text insertion, task detection, and idle monitoring functions

### 3.6. Button Detection Logic
Enhanced button validation:

- **Visibility Check**: Ensures button is visually displayed and has dimensions
- **Enable Check**: Verifies button is not disabled or aria-disabled
- **Cooldown Management**: Prevents rapid consecutive clicks
- **Exclusion Patterns**: Skips buttons that shouldn't be auto-clicked
- **Click Marking**: Prevents double-clicking same button

### 3.7. Logging
Simplified logging with debug mode support:

- `log(message, level, data)`: Console output with color coding and timestamps
- Respects `debugMode` flag for debug-level messages
- Convenience methods: `log.info()`, `log.error()`, `log.success()`, etc.

## 4. Data Flow
Simplified unidirectional flow:

1. **Initialization**: `autoContinue.start()` begins interval-based scanning
2. **Button Detection**: Main loop scans DOM for actionable buttons
3. **Immediate Clicking**: Eligible buttons are clicked immediately without waiting
4. **Cooldown**: Brief pause before next scan cycle
5. **User Control**: Manual stop via `autoContinue.stop()`

## 5. Error Handling and Resilience
- **Robust Selectors**: Multiple selector patterns per button type for better coverage
- **Graceful Degradation**: Continues operation when individual selectors fail
- **Exception Handling**: Try-catch blocks prevent crashes from DOM manipulation errors
- **Manual Control**: Always-available stop mechanism
- **Cleanup**: Periodic removal of temporary DOM markers

---

**Note**: This architecture document describes the `auto-continue.js` script only, which focuses exclusively on immediate button clicking automation. This is separate from the `auto-inserter.js` script which has different functionality.
