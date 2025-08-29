#!/bin/bash

# =============================================================================
# Install Tools in Project Script
# =============================================================================
#
# DESCRIPTION:
#   This script creates symbolic links from files in a source directory to a
#   target project directory. It safely handles existing files by prompting
#   the user for confirmation before removal.
#
# USAGE:
#   ./install_tools_in_project.sh <target_directory> [source_directory]
#
# PARAMETERS:
#   target_directory (required): Directory where symbolic links will be created
#   source_directory (optional): Directory containing files to link
#                               Default: ./copy-content-to-prj-directory
#
# FEATURES:
#   - Creates symbolic links for all files and directories in source
#   - Prompts user before removing existing files/directories
#   - Validates source and target directory existence
#   - Provides clear feedback during installation process
#   - Handles both regular files and hidden files (starting with .)
#
# EXAMPLES:
#   # Use default source directory
#   ./install_tools_in_project.sh /path/to/my/project
#
#   # Specify custom source directory
#   ./install_tools_in_project.sh /path/to/my/project /path/to/tools
#
# SAFETY:
#   - Never removes files without explicit user confirmation
#   - Validates all directory paths before proceeding
#   - Uses 'rm -rf' only after user confirmation
#   - Creates symbolic links with verbose output for tracking
#
# =============================================================================

# Check if a target directory was provided
if [ -z "$1" ]; then
  echo "Usage: $0 <target_directory> [source_directory]"
  echo "  target_directory: Directory where symbolic links will be created"
  echo "  source_directory: Directory containing files to link (default: ./copy-content-to-prj-directory)"
  exit 1
fi

# Set script parameters
TARGET_DIR="$1"
SOURCE_DIR="${2:-./copy-content-to-prj-directory}"

# Validate target directory exists
if [ ! -d "$TARGET_DIR" ]; then
  echo "Error: Target directory '$TARGET_DIR' does not exist."
  exit 1
fi

# Validate source directory exists
if [ ! -d "$SOURCE_DIR" ]; then
  echo "Error: Source directory '$SOURCE_DIR' does not exist."
  exit 1
fi

# Function to prompt user for confirmation before removing existing files
# Parameters:
#   $1: item name (filename or directory name)
#   $2: item type description
# Returns: 0 if user confirms, 1 if user declines
confirm_removal() {
  local item="$1"
  local item_type="$2"
  echo -n "File/directory '$item' already exists in target. Remove it? (y/N): "
  read -r response
  case "$response" in
    [yY][eE][sS]|[yY])  # Accept various forms of "yes"
      return 0
      ;;
    *)  # Default to "no" for any other input
      return 1
      ;;
  esac
}

# Change to source directory to process files from there
cd "$SOURCE_DIR" || exit 1

echo "Creating symbolic links from '$SOURCE_DIR' to '$TARGET_DIR'..."

# Process all files and directories in source (including hidden ones)
for f in ./* ./.*
do
  # Skip current directory and parent directory references
  [ "$f" = "." ] && continue
  [ "$f" = ".." ] && continue

  # Calculate the target path for the symbolic link
  target_path="$TARGET_DIR/$(basename "$f")"

  # Check if target file/directory already exists (including broken symlinks)
  if [ -e "$target_path" ] || [ -L "$target_path" ]; then
    # Prompt user for confirmation before removal
    if confirm_removal "$(basename "$f")" "file/directory"; then
      echo "Removing existing '$target_path'..."
      rm -rf "$target_path"  # Remove file or directory recursively
    else
      echo "Skipping '$f' (user declined removal)"
      continue  # Skip to next file
    fi
  fi

  # Create symbolic link with verbose output
  if ln -sfv "$PWD/$f" "$TARGET_DIR/"; then
    echo "Created link: $target_path -> $PWD/$f"
  else
    echo "Failed to create link for: $f"
  fi
done

echo "Installation complete."

# =============================================================================
# End of Script
# =============================================================================
