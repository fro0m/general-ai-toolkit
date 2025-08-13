#!/bin/bash
set -e

if [ $# -ne 1 ]; then
    echo "Usage: $0 <relative-install-dir>"
    exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INSTALL_DIR="$SCRIPT_DIR/$1"
VSCODE_URL="https://code.visualstudio.com/sha/download?build=stable&os=linux-x64"

mkdir -p "$INSTALL_DIR"

# Preserve data directory if it exists
if [ -d "$INSTALL_DIR/data" ]; then
    echo "Preserving existing data directory..."
    mv "$INSTALL_DIR/data" "$INSTALL_DIR/data_backup"
    DATA_PRESERVED=1
else
    DATA_PRESERVED=0
fi

# Remove all files except data_backup (if present)
find "$INSTALL_DIR" -mindepth 1 -maxdepth 1 ! -name 'data_backup' -exec rm -rf {} +

# Download and extract to a temporary directory
TMP_TAR="$INSTALL_DIR/vscode.tar.gz"
TMP_EXTRACT="$INSTALL_DIR/__vscode_extract"
echo "Downloading latest VS Code..."
curl -L "$VSCODE_URL" -o "$TMP_TAR"
mkdir -p "$TMP_EXTRACT"
echo "Extracting VS Code to temporary directory..."
tar -xzf "$TMP_TAR" -C "$TMP_EXTRACT"

# Move extracted files to install directory (excluding data)
# The archive usually has a single top-level directory, so move its contents
TOP_LEVEL=$(find "$TMP_EXTRACT" -mindepth 1 -maxdepth 1 -type d | head -n 1)
if [ -z "$TOP_LEVEL" ]; then
    echo "Extraction failed: No top-level directory found."
    rm -rf "$TMP_EXTRACT" "$TMP_TAR"
    exit 1
fi
shopt -s dotglob
mv "$TOP_LEVEL"/* "$INSTALL_DIR"/
shopt -u dotglob

rm -rf "$TMP_EXTRACT" "$TMP_TAR"

# Restore data directory
if [ "$DATA_PRESERVED" -eq 1 ]; then
    mv "$INSTALL_DIR/data_backup" "$INSTALL_DIR/data"
else
    mkdir -p "$INSTALL_DIR/data"
fi

# Set correct permissions for chrome-sandbox
if [ -f "$INSTALL_DIR/chrome-sandbox" ]; then
    echo "Setting permissions for chrome-sandbox (requires sudo)..."
    if sudo chown root:root "$INSTALL_DIR/chrome-sandbox" && sudo chmod 4755 "$INSTALL_DIR/chrome-sandbox"; then
        echo "chrome-sandbox permissions set successfully."
    else
        echo "WARNING: Failed to set permissions for chrome-sandbox."
        echo "You may need to run the following commands manually:"
        echo "  sudo chown root:root \"$INSTALL_DIR/chrome-sandbox\""
        echo "  sudo chmod 4755 \"$INSTALL_DIR/chrome-sandbox\""
    fi
else
    echo "WARNING: chrome-sandbox not found! VS Code may not start securely."
fi

echo "VS Code portable installed/updated in $INSTALL_DIR"
