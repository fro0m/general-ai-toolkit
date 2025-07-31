# Cursor Auto Continue

A Python application that executes a sequence of keyboard tasks a specified number of times (MAX_ITERATIONS) and then exits.

## Features

- Presses Escape key
- Presses Ctrl+L
- Types a specified text
- Presses Enter key
- Presses Escape key again
- Repeats the sequence a configurable number of times (MAX_ITERATIONS=20 by default)
- Waits 10 minutes between sequence iterations
- Works on Ubuntu with Wayland

## Requirements

- Python 3.8+
- Poetry package manager
- Ubuntu with Wayland display server

## Installation

1. Clone this repository:
   ```
   git clone <repository-url>
   cd auto-inserter
   ```

2. Install dependencies using Poetry:
   ```
   poetry install
   ```

## Usage

To run the application:

```
poetry run python auto-inserter/main.py
```

To run it in the background:

```
nohup poetry run python auto-inserter/main.py &
```

## Creating a systemd service

To run the application as a service on system startup, create a systemd service file:

1. Create a systemd service file:

```bash
sudo nano /etc/systemd/user/auto-inserter.service
```

2. Add the following content (adjust the paths as needed):

```
[Unit]
Description=Auto Inserter Keyboard Automation
After=graphical-session.target

[Service]
Type=simple
ExecStart=/usr/bin/env bash -c 'cd /path/to/auto-inserter && poetry run python auto-inserter/main.py'
Restart=always
RestartSec=5
Environment=DISPLAY=:0

[Install]
WantedBy=default.target
```

3. Enable and start the service:

```bash
systemctl --user enable auto-inserter.service
systemctl --user start auto-inserter.service
```

## Limitations

- This application requires a running graphical session
- It may not work if the display is locked or the user is logged out
- Requires DISPLAY environment variable to be properly set
- Exits after completing MAX_ITERATIONS sequences (configurable in the code)
