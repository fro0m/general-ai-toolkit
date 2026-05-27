#!/bin/bash
set -e

if [ $# -ne 1 ]; then
    echo "Usage: $0 <install-dir>"
    echo "  install-dir can be absolute or relative to this script directory"
    exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [[ "$1" = /* ]]; then
    INSTALL_DIR="$1"
else
    INSTALL_DIR="$SCRIPT_DIR/$1"
fi
VSCODE_URL="https://code.visualstudio.com/sha/download?build=stable&os=linux-x64"

mkdir -p "$INSTALL_DIR"

# Download and extract to a temporary directory first.
# This avoids modifying the existing installation until the new payload is valid.
TMP_ROOT="$(mktemp -d)"
TMP_TAR="$TMP_ROOT/vscode.tar.gz"
TMP_EXTRACT="$TMP_ROOT/extract"
TMP_STAGE="$TMP_ROOT/stage"

cleanup() {
    rm -rf "$TMP_ROOT"
}
trap cleanup EXIT

echo "Downloading latest VS Code..."
curl -L "$VSCODE_URL" -o "$TMP_TAR"
mkdir -p "$TMP_EXTRACT"
echo "Extracting VS Code to temporary directory..."
tar -xzf "$TMP_TAR" -C "$TMP_EXTRACT"

# The archive usually has a single top-level directory; stage its contents.
TOP_LEVEL=$(find "$TMP_EXTRACT" -mindepth 1 -maxdepth 1 -type d | head -n 1)
if [ -z "$TOP_LEVEL" ]; then
    echo "Extraction failed: No top-level directory found."
    exit 1
fi

mkdir -p "$TMP_STAGE"
cp -a "$TOP_LEVEL"/. "$TMP_STAGE"/

if [ ! -x "$TMP_STAGE/code" ]; then
    echo "Extraction failed: 'code' executable not found in downloaded archive."
    exit 1
fi

# Refresh install content while preserving portable user data in INSTALL_DIR/data.
echo "Updating VS Code files while preserving user data..."
find "$INSTALL_DIR" -mindepth 1 -maxdepth 1 ! -name 'data' -exec rm -rf {} +
shopt -s dotglob
mv "$TMP_STAGE"/* "$INSTALL_DIR"/
shopt -u dotglob

# Ensure portable data directory exists for first-time installs.
mkdir -p "$INSTALL_DIR/data"

# Set correct permissions for chrome-sandbox
SANDBOX="$INSTALL_DIR/chrome-sandbox"
WRAPPER="$INSTALL_DIR/code-no-sandbox"
if [ -f "$SANDBOX" ]; then
    echo "Setting permissions for chrome-sandbox..."
    SANDBOX_OK=false

    # 1st attempt: non-interactive sudo (no password prompt)
    if sudo -n chown root:root "$SANDBOX" 2>/dev/null && sudo -n chmod 4755 "$SANDBOX" 2>/dev/null; then
        SANDBOX_OK=true
    fi

    # 2nd attempt: interactive sudo (prompts for password if a TTY is available)
    if [ "$SANDBOX_OK" = false ] && [ -t 0 ]; then
        echo "Non-interactive sudo unavailable. Trying interactive sudo (you may be prompted for a password)..."
        if sudo chown root:root "$SANDBOX" && sudo chmod 4755 "$SANDBOX"; then
            SANDBOX_OK=true
        fi
    fi

    if [ "$SANDBOX_OK" = true ]; then
        echo "chrome-sandbox permissions set successfully."
        # Remove stale no-sandbox wrapper if sandbox is now working
        rm -f "$WRAPPER"
    else
        echo "WARNING: Could not set chrome-sandbox permissions."
        echo "Creating a no-sandbox wrapper script at: $WRAPPER"
        cat > "$WRAPPER" <<'EOF'
#!/bin/bash
# Launches VS Code without the setuid sandbox (fallback when chrome-sandbox
# cannot be given root ownership/setuid bit).
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec "$SCRIPT_DIR/code" --no-sandbox "$@"
EOF
        chmod +x "$WRAPPER"
        echo ""
        echo "To launch VS Code use: $WRAPPER"
        echo "Or fix the sandbox manually:"
        echo "  sudo chown root:root \"$SANDBOX\""
        echo "  sudo chmod 4755 \"$SANDBOX\""
    fi
else
    echo "WARNING: chrome-sandbox not found! VS Code may not start securely."
fi

echo "VS Code portable installed/updated in $INSTALL_DIR"
