#!/bin/bash

# Interactive GDB with timeout script for UbegoMobileApp
# Usage: ./run_gdb_interactive.sh [executable_path] [timeout_seconds]

set -e

# Default values
DEFAULT_TIMEOUT=120
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TIMEOUT_SCRIPT="$SCRIPT_DIR/timeout_kill_gdb.py"

# Parse arguments
EXECUTABLE="${1:-./ubego_executable}"
TIMEOUT="${2:-$DEFAULT_TIMEOUT}"

# Validate executable exists
if [[ ! -f "$EXECUTABLE" ]]; then
    echo "ERROR: Executable not found: $EXECUTABLE"
    echo "Usage: $0 [executable_path] [timeout_seconds]"
    echo "Example: $0 ./build/bin/ubego_executable 120"
    exit 1
fi

# Validate timeout script exists
if [[ ! -f "$TIMEOUT_SCRIPT" ]]; then
    echo "ERROR: Timeout script not found: $TIMEOUT_SCRIPT"
    exit 1
fi

echo "Starting interactive GDB with timeout functionality..."
echo "Executable: $EXECUTABLE"
echo "Timeout: $TIMEOUT seconds"
echo "Timeout script: $TIMEOUT_SCRIPT"
echo ""

# Create GDB initialization file
GDB_INIT_FILE=$(mktemp)
trap "rm -f $GDB_INIT_FILE" EXIT

cat > "$GDB_INIT_FILE" << EOF
# Load the timeout script
source $TIMEOUT_SCRIPT

# Set the timeout value
set-timeout $TIMEOUT

# Set up for better debugging
set confirm off
set print pretty on
set print thread-events off

# Display available commands
echo \\n=== TIMEOUT COMMANDS AVAILABLE ===\\n
echo run-timeout [args]     - Run program with timeout monitoring
echo continue-timeout       - Continue program with timeout monitoring
echo set-timeout <seconds>  - Set timeout value
echo \\n=== STANDARD GDB COMMANDS ===\\n
echo run [args]             - Run program (without timeout)
echo continue               - Continue program (without timeout)
echo bt                     - Show backtrace
echo info threads           - Show thread information
echo info registers         - Show register values
echo \\n================================\\n
EOF

echo "Starting interactive GDB session..."
echo "Use 'run-timeout' instead of 'run' to enable timeout monitoring"
echo "Use 'continue-timeout' instead of 'continue' to enable timeout monitoring"
echo "Type 'quit' to exit GDB"
echo ""

# Run GDB interactively with initialization
gdb -x "$GDB_INIT_FILE" "$EXECUTABLE"

echo ""
echo "GDB session ended."
