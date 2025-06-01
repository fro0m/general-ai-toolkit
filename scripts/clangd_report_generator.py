#!/usr/bin/env python3

# Script to generate a codebase analysis report using clangd and clang-tidy.
# It processes source files listed in compile_commands.json that are located within
# the project_root directory or its subdirectories, and saves diagnostics to a
# specified output file (default: analyze_report.txt).
#
# Example Usage:
# 1. Basic usage with default output file:
#    ./generate_report.py /path/to/dir/with/compile_commands /path/to/project/root
#
# 2. Specify a custom output file:
#    ./generate_report.py /path/to/dir/with/compile_commands /path/to/project/root --output my_report.txt
#
# Requirements:
# - Python 3.x
# - clangd and clang-tidy installed and in PATH
# - compile_commands.json in the specified compile_commands_dir (generate with `bear -- make` or CMake)
# - project_root must be a valid directory (used for include paths and file filtering)
#
# Notes:
# - Only files within project_root or its subdirectories are analyzed.
# - The full path to the output report file is displayed at the start and end of the script run.
# - Detailed logs are printed to console (INFO level and above).
# - For large codebases, consider adding parallel processing for better performance.

import argparse
import json
import os
import subprocess
import logging
from pathlib import Path
from datetime import datetime

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)

def run_clangd_check(file_path: str, compile_commands_dir: str) -> str:
    """Run clangd --check on a single file and return diagnostics."""
    logging.info(f"Running clangd check on {file_path}")
    try:
        result = subprocess.run(
            ["clangd", "--check", file_path, "--path", compile_commands_dir],
            capture_output=True,
            text=True,
            check=False,
        )
        output = result.stdout + result.stderr
        if not output.strip():
            logging.info(f"No clangd issues found for {file_path}")
        else:
            logging.debug(f"clangd output for {file_path}:\n{output}")
        return output
    except subprocess.CalledProcessError as e:
        logging.error(f"clangd failed on {file_path}: {e.stderr}")
        return f"Error running clangd on {file_path}: {e.stderr}"
    except FileNotFoundError:
        logging.error("clangd not found in PATH")
        return "Error: clangd not found in PATH."

def run_clang_tidy_check(file_path: str, project_root: str) -> str:
    """Run clang-tidy on a single file and return diagnostics."""
    logging.info(f"Running clang-tidy check on {file_path}")
    try:
        result = subprocess.run(
            ["clang-tidy", file_path, "-checks=*", "--", f"-I{project_root}"],
            capture_output=True,
            text=True,
            check=False,
        )
        output = result.stdout + result.stderr
        if not output.strip():
            logging.info(f"No clang-tidy issues found for {file_path}")
        else:
            logging.debug(f"clang-tidy output for {file_path}:\n{output}")
        return output
    except subprocess.CalledProcessError as e:
        logging.error(f"clang-tidy failed on {file_path}: {e.stderr}")
        return f"Error running clang-tidy on {file_path}: {e.stderr}"
    except FileNotFoundError:
        logging.error("clang-tidy not found in PATH")
        return "Error: clang-tidy not found in PATH."

def is_file_in_project_root(file_path: str, project_root: str) -> bool:
    """Check if file_path is within project_root or its subdirectories."""
    file_path = Path(file_path).resolve()
    project_root = Path(project_root).resolve()
    try:
        file_path.relative_to(project_root)
        return True
    except ValueError:
        return False

def generate_report(compile_commands_dir: str, project_root: str, output_file: str = "analyze_report.txt"):
    """Generate a report using clangd and clang-tidy for files in compile_commands.json within project_root."""
    logging.info(f"Starting report generation")
    compile_commands_path = Path(compile_commands_dir) / "compile_commands.json"
    output_file_path = Path(output_file).resolve()

    # Log the full path to the output file at the start
    logging.info(f"Output report will be saved to: {output_file_path}")
    logging.info(f"Compile Commands Directory: {compile_commands_dir}")
    logging.info(f"Project Root: {project_root}")

    # Check if compile_commands.json exists
    if not compile_commands_path.exists():
        logging.error(f"compile_commands.json not found in {compile_commands_dir}")
        raise FileNotFoundError(f"compile_commands.json not found in {compile_commands_dir}")

    # Check if project_root exists
    if not os.path.exists(project_root):
        logging.error(f"Project root directory {project_root} does not exist")
        raise FileNotFoundError(f"Project root directory {project_root} does not exist")

    # Read compile_commands.json
    logging.info(f"Reading {compile_commands_path}")
    try:
        with open(compile_commands_path, "r") as f:
            compile_commands = json.load(f)
    except json.JSONDecodeError as e:
        logging.error(f"Failed to parse compile_commands.json: {e}")
        raise

    # Filter files to only those in project_root or its subdirectories
    filtered_commands = [
        entry for entry in compile_commands
        if entry.get("file") and is_file_in_project_root(entry["file"], project_root)
    ]
    logging.info(f"Found {len(compile_commands)} files in compile_commands.json")
    logging.info(f"Filtered to {len(filtered_commands)} files within {project_root}")

    # Open report file
    logging.info(f"Writing report to {output_file_path}")
    with open(output_file_path, "w") as report:
        report.write("# Codebase Analysis Report\n\n")
        report.write(f"Compile Commands Directory: {compile_commands_dir}\n")
        report.write(f"Project Root: {project_root}\n")
        report.write(f"Generated on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
        report.write(f"Files Analyzed: {len(filtered_commands)} (filtered from {len(compile_commands)} total)\n\n")

        # Process each filtered file
        total_files = len(filtered_commands)
        if total_files == 0:
            logging.warning("No files found within project_root to analyze")
            report.write("No files found within project_root to analyze.\n")
            return output_file_path

        for i, entry in enumerate(filtered_commands, 1):
            file_path = entry.get("file")
            if not file_path or not os.path.exists(file_path):
                logging.warning(f"Skipping invalid or missing file: {file_path} ({i}/{total_files})")
                report.write(f"Skipping invalid or missing file: {file_path}\n")
                continue

            logging.info(f"Processing file {i}/{total_files}: {file_path}")
            report.write(f"\n## File: {file_path}\n")

            # Run clangd diagnostics
            report.write("\n### clangd Diagnostics\n")
            clangd_output = run_clangd_check(file_path, compile_commands_dir)
            report.write(clangd_output or "No issues found.\n")
            report.write("\n")

            # Run clang-tidy diagnostics
            report.write("### clang-tidy Diagnostics\n")
            clang_tidy_output = run_clang_tidy_check(file_path, project_root)
            report.write(clang_tidy_output or "No issues found.\n")
            report.write("\n" + "=" * 80 + "\n")

    logging.info(f"Report generation completed successfully")
    return output_file_path

def main():
    """Parse command-line arguments and generate the report."""
    parser = argparse.ArgumentParser(
        description="Generate a codebase analysis report using clangd and clang-tidy for files within project_root.",
        epilog=(
            "Example usage:\n"
            "  ./generate_report.py /path/to/dir/with/compile_commands /path/to/project/root\n"
            "  ./generate_report.py /path/to/dir/with/compile_commands /path/to/project/root --output my_report.txt\n\n"
            "Requirements:\n"
            "- clangd and clang-tidy must be installed and in PATH.\n"
            "- compile_commands.json must exist in compile_commands_dir (generate with `bear -- make` or CMake).\n"
            "- project_root must be a valid directory (used for include paths and file filtering).\n"
            "- Only files within project_root or its subdirectories are analyzed.\n"
            "- Detailed logs are printed to console (INFO level and above).\n"
            "- Full path to the output report is shown at the start and end of the run."
        ),
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument(
        "compile_commands_dir",
        help="Path to the directory containing compile_commands.json",
    )
    parser.add_argument(
        "project_root",
        help="Path to the project root directory (used for include paths and file filtering)",
    )
    parser.add_argument(
        "--output",
        default="analyze_report.txt",
        help="Output file for the report (default: analyze_report.txt)",
    )
    args = parser.parse_args()

    try:
        output_file_path = generate_report(args.compile_commands_dir, args.project_root, args.output)
        print(f"Report generated successfully at {output_file_path}")
    except FileNotFoundError as e:
        logging.error(f"Error: {e}")
        print(f"Error: {e}")
    except json.JSONDecodeError as e:
        logging.error(f"Error: {e}")
        print(f"Error: {e}")
    except Exception as e:
        logging.error(f"Unexpected error: {e}", exc_info=True)
        print(f"Unexpected error: {e}")

if __name__ == "__main__":
    main()
