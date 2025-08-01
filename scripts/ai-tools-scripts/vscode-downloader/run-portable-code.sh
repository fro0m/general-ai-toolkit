#!/bin/bash

if [ $# -ne 1 ]; then
    echo "Usage: $0 <relative-install-dir>"
    exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INSTALL_DIR="$SCRIPT_DIR/$1"

if [ ! -x "$INSTALL_DIR/code" ]; then
    echo "VS Code portable not found in $INSTALL_DIR. Did you run the install script?"
    exit 1
fi

"$INSTALL_DIR/code" --proxy-server="127.0.0.1:2080" --proxy-bypass-list="*.coreops.ru,*.devos.club"
