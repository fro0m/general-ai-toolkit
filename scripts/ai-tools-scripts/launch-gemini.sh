#!/bin/bash

# This script launches the gemini CLI with a randomly selected API key from a predefined list.

# Define your list of API keys with email comments
API_KEYS=(
    # fro0m.work@gmail.com
    "AIzaSyB2jo_ElGk5I3Gzljk1sfDZwlgDnZwvKvc"

    # fro0mberg@gmail.com
    "AIzaSyAfmi56pp38LHScgM9dq0IubL_ruhWrj-s"

    # p79955956975@gmail.com
    "AIzaSyDPphkSMXnfox_5XXDjv3vZA3-jkpPTqds"

    # fro0m.spam@gmail.com
    "AIzaSyBjArWvYp3mD9apeVINd2W9mARqaORNfbs"

    # ko.frumkin@gmail.com
    "AIzaSyByWH1XxYjlbot_f7jFjsUKlfHpsZF7HV8"

    # konfru3@gmail.com
    "AIzaSyDPphkSMXnfox_5XXDjv3vZA3-jkpPTqds"

    # ubego.inquire@gmail.com
    "AIzaSyDjD_e8qad9545_aiurKVZPI90g39brd2k"
)

# Select a random API key
RANDOM_INDEX=$((RANDOM % ${#API_KEYS[@]}))
KEY="${API_KEYS[$RANDOM_INDEX]}"

# Export the environment variable so child processes can see it
#export GEMINI_API_KEY="$KEY"

echo "The GEMINI_API_KEY="$KEY""
# Run the gemini CLI without specifying the key on the command line
GEMINI_API_KEY="$KEY" gemini -y --proxy="http://127.0.0.1:2080" "$@"
