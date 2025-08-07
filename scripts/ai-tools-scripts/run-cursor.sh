#!/bin/bash

# Find the AppImage file matching the pattern "Cursor-*.AppImage"
APPIMAGE=$(ls Cursor-*-x86_64.AppImage 2>/dev/null | head -n 1)

# Check if the AppImage file exists
if [[ -z "$APPIMAGE" ]]; then
    echo "No matching AppImage found!"
    exit 1
fi

# Launch the AppImage with the --no-sandbox parameter
chmod +x "$APPIMAGE" # Ensure the AppImage is executable
./"$APPIMAGE" --no-sandbox "$@"
