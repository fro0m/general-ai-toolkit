#!/bin/bash

# GDB with timeout script for UbegoMobileApp
# Usage: ./run_gdb_with_timeout.sh [executable_path] [timeout_seconds]

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

echo "Starting GDB with timeout functionality..."
echo "Executable: $EXECUTABLE"
echo "Timeout: $TIMEOUT seconds"
echo "Timeout script: $TIMEOUT_SCRIPT"
echo ""

# Create GDB command file for automation
GDB_CMD_FILE=$(mktemp)
trap "rm -f $GDB_CMD_FILE" EXIT

cat > "$GDB_CMD_FILE" << EOF
# Load the timeout script
source $TIMEOUT_SCRIPT

# Set the timeout value
set-timeout $TIMEOUT

# Set up for crash analysis
set confirm off
set print thread-events off

# Run the program with timeout
run-timeout

# If we get here, the program stopped (crashed or breakpoint)
echo \\n=== CRASH ANALYSIS ===\\n
bt
echo \\n=== THREAD INFO ===\\n
info threads
echo \\n=== REGISTERS ===\\n
info registers
echo \\n=== ANALYSIS COMPLETE ===\\n

# Continue execution (will be killed by timeout if needed)
continue-timeout

# Exit GDB
quit
EOF

echo "Running GDB with timeout monitoring..."
echo "GDB will automatically:"
echo "  1. Load timeout functionality"
echo "  2. Run the program"
echo "  3. Capture crash information if it crashes"
echo "  4. Kill the process after $TIMEOUT seconds if it doesn't exit"
echo ""

# Run GDB with the command file
gdb -batch -x "$GDB_CMD_FILE" "$EXECUTABLE"

echo ""
echo "GDB session completed."
