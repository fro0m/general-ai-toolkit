#!/bin/bash

# Determine the working directory
if [ $# -eq 0 ]; then
  workdir=$(dirname "$0")
else
  workdir="$1"
fi

# Check if the working directory is a Git repository
if ! git -C "$workdir" rev-parse 2>/dev/null; then
  echo "Error: $workdir is not a Git repository"
  exit 1
fi

# Remove any existing "backup" remote to avoid conflicts
git -C "$workdir" remote remove backup 2>/dev/null || true

# Add the remote named "backup"
echo "Adding remote backup"
if ! git -C "$workdir" remote add backup git@gitlab.com:kofr/cloudoffice.git; then
  echo "Error: Failed to add remote backup"
  exit 1
fi

# Get the current branch
current_branch=$(git -C "$workdir" symbolic-ref --short HEAD 2>/dev/null)
if [ -z "$current_branch" ]; then
  echo "Error: Not on a branch"
  git -C "$workdir" remote remove backup
  exit 1
fi

# Push the current branch to the "backup" remote with --force
echo "Pushing branch $current_branch to backup with --force"
git -C "$workdir" push --force backup "$current_branch"
push_status=$?

# Remove the "backup" remote
echo "Removing remote backup"
git -C "$workdir" remote remove backup

# Check if the push was successful
if [ $push_status -ne 0 ]; then
  echo "Error: Failed to push branch $current_branch"
  exit 1
fi
