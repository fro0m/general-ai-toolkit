#!/bin/bash

# Exit on error
set -e

echo "Installing Rules Converter..."

# Check if Python is installed
if ! command -v python &> /dev/null; then
    echo "Python is not installed. Please install Python 3.8 or higher."
    exit 1
fi

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python -m venv venv
fi

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate

# Install dependencies
echo "Installing dependencies..."
pip install -r requirements.txt

# Install the package in development mode
echo "Installing the package..."
pip install -e .

echo ""
echo "Installation complete!"
echo "To use the tool, either:"
echo "1. Activate the virtual environment: source venv/bin/activate"
echo "2. Then run: rules-converter path/to/source -o path/to/output"
echo ""
echo "Or run directly with: venv/bin/rules-converter path/to/source -o path/to/output"
