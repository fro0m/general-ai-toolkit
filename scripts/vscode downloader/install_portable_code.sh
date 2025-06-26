#!/bin/bash
set -e

if [ $# -ne 1 ]; then
    echo "Usage: $0 <relative-install-dir>"
    exit 1
fi

# Get the absolute path to the script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INSTALL_DIR="$SCRIPT_DIR/$1"

# Download the latest VS Code .tar.gz URL
VSCODE_URL="https://code.visualstudio.com/sha/download?build=stable&os=linux-x64"

# Create install directory
mkdir -p "$INSTALL_DIR"

# Download and extract
TMP_TAR="$INSTALL_DIR/vscode.tar.gz"
curl -L "$VSCODE_URL" -o "$TMP_TAR"
tar -xzf "$TMP_TAR" -C "$INSTALL_DIR" --strip-components=1
rm "$TMP_TAR"

# Create the data folder for portable mode
mkdir -p "$INSTALL_DIR/data"

# Set correct permissions for chrome-sandbox
if [ -f "$INSTALL_DIR/chrome-sandbox" ]; then
    sudo chown root "$INSTALL_DIR/chrome-sandbox"
    sudo chmod 4755 "$INSTALL_DIR/chrome-sandbox"
fi

echo "VS Code portable installed in $INSTALL_DIR"
