# GDB Timeout Scripts

This directory contains Python scripts and shell wrappers that provide timeout functionality for GDB debugging, similar to the existing LLDB timeout functionality.

## Files

### Core Scripts
- `timeout_kill_gdb.py` - Python script that provides timeout functionality for GDB
- `run_gdb_with_timeout.sh` - Shell script for automated GDB execution with timeout
- `run_gdb_interactive.sh` - Shell script for interactive GDB session with timeout

### Legacy Scripts  
- `timeout_kill.py` - Original LLDB timeout script

## Usage

### Automated GDB Execution
```bash
./run_gdb_with_timeout.sh ./path/to/executable [timeout_seconds]
```
This will run the executable in GDB, automatically capture crash information, and kill the process after the specified timeout (default: 120 seconds).

### Interactive GDB Session
```bash
./run_gdb_interactive.sh ./path/to/executable [timeout_seconds]
```
This starts an interactive GDB session with timeout commands available. Use `run-timeout` instead of `run` and `continue-timeout` instead of `continue` to enable timeout monitoring.

### Manual GDB Command
```bash
gdb -batch -ex "source timeout_kill_gdb.py" -ex "set-timeout 120" -ex "run" -ex "bt" -ex "continue-timeout" ./executable
```

## GDB Commands Added

The `timeout_kill_gdb.py` script adds these custom GDB commands:

- `run-timeout [args]` - Run program with timeout monitoring
- `continue-timeout` - Continue program with timeout monitoring  
- `set-timeout <seconds>` - Set timeout value (default: 120 seconds)

## Features

- **Automatic Timeout**: Kills the process after specified timeout
- **Crash Analysis**: Automatically captures stack traces and thread information
- **Event Handling**: Monitors process exit events to stop timeout when appropriate
- **Thread Safety**: Uses threading to monitor timeout while allowing GDB to continue
- **Flexible Interface**: Both automated and interactive modes available

## Requirements

- Python 3.x
- GDB with Python support
- Linux environment (tested on Linux systems)

## Integration with UbegoMobileApp

These scripts are designed to work with the UbegoMobileApp build system. When using with the project:

1. Build the project using `./ai-toolkit-files/build.sh`
2. Run with timeout using one of the GDB scripts above
3. Replace `./ubego_executable` with the actual path to your built executable

## Comparison with LLDB

| Feature | LLDB Script | GDB Script |
|---------|-------------|------------|
| Timeout | ✓ | ✓ |
| Crash Analysis | ✓ | ✓ |
| Thread Info | ✓ | ✓ |
| Interactive Mode | ✓ | ✓ |
| Batch Mode | ✓ | ✓ |
| Platform | macOS/Linux | Linux |

Both provide equivalent functionality for debugging and timeout management.
