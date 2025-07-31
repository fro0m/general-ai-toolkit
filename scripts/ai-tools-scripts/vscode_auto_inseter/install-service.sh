#!/usr/bin/env bash

# Script to install auto-inserter systemd service for the current user
echo "Installing Auto Inserter systemd service for user $(whoami)..."

# Create the service directory if it doesn't exist
mkdir -p ~/.config/systemd/user/

# Copy the service file
cp auto-inserter.service ~/.config/systemd/user/

# Reload systemd
systemctl --user daemon-reload

# Enable the service
systemctl --user enable auto-inserter.service

echo "Service installed. You can start it with: systemctl --user start auto-inserter.service"
echo "To check status: systemctl --user status auto-inserter.service"
