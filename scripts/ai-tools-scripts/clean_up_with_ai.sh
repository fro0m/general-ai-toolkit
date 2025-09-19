#!/bin/bash


# it uses launch-genimi.sh to execute tasks.

# List of terminal emulators to try in order
terminal_candidates=(gnome-terminal konsole xfce4-terminal xterm)

# Function to find the first available terminal emulator
find_terminal() {
  for term in "${terminal_candidates[@]}"; do
    if command -v "$term" >/dev/null 2>&1; then
      echo "$term"
      return 0
    fi
  done
  return 1
}

# Function to launch given command in a new terminal window
launch_in_terminal() {
  local cmd="$1"
  local terminal
  terminal=$(find_terminal)

  if [ -z "$terminal" ]; then
    echo "No supported terminal emulator found."
    exit 1
  fi

  case "$(basename "$terminal")" in
    gnome-terminal)
      "$terminal" -- bash -c "$cmd"
      ;;
    konsole)
      "$terminal" -e bash -c "$cmd"
      ;;
    xfce4-terminal)
      "$terminal" --hold -e bash -c "$cmd"
      ;;
    xterm)
      "$terminal" -hold -e "$cmd"
      ;;
    *)
      echo "Found terminal '$terminal' but no run configuration defined."
      exit 1
      ;;
  esac
}

# List of tasks
tasks=(
  "Substitute include directives of types which are used only as pointers in header files with forward declarations"
  "Check for usage of all files, data structures and variables and remove them if they are unused or simplify if they can be simplified. Also check source code files on the disk and remove them if they are not used by the project. Remove all [[maybe_unused]] or actually unused variables and functions. Remove unused include directives"
  "Check every function for unused arguments and remove these arguments from function definition"
  "Refactor the code For every variable remove double checks for illegal value more than 1 time in each function"
  "Check all variables and add const to them if they never change"
  "Move functions implementation in .cpp file instead of .h file"
  "Move repeated code to reusable functions and substitute such code with the new reusable functions"
  "Ensure uninitialized variables have explicit default value initialization. Exclude classes and structs with no arguments constructors"
  "move all constants to anonymous namespace starting with k letter"
  "Change the order of field declarations for better readability: first the constructor and methods, then the attributes. Order of class sections should be public, protected, private"
  "ensure uninitialized variables have explicit default value initialization. Exclude classes and structs with no arguments constructors."
)

for CURRENT_TASK in "${tasks[@]}"; do
  echo "Launching task: $CURRENT_TASK"
  # Compose the command string: run launch_gemini.sh with CURRENT_TASK and keep the terminal open
#   cmd="launch-gemini.sh -p \"For DesktopStorybook $CURRENT_TASK\" -m \"gemini-2.5-flash\"; exec bash"
  cmd="launch-gemini.sh -p \"For DesktopStorybook $CURRENT_TASK\"; exec bash"

  # Call the function to launch in terminal in the background
  launch_in_terminal "$cmd" &

  # Optional delay between launching terminals
  sleep 5s
done

# Optional: wait for all launched terminals to finish (can be removed if you want the script to exit immediately)
wait
