"""
Converter module for transforming Cursor IDE rules MDC files to VS Code instruction files.
"""
import os
import json
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple


def parse_mdc_file(file_path: str) -> str:
    """
    Read a Cursor IDE MDC file and return its content as plain text.
    
    Args:
        file_path: Path to the MDC file
        
    Returns:
        Content of the MDC file as plain text
    """
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Return the content as is, to be processed by convert_to_vscode_instructions
    return content


def _escape_yaml_string(value: str) -> str:
    """Escapes single quotes for YAML single-quoted strings."""
    return value.replace("'", "'''")


def convert_to_vscode_instructions(mdc_content: str) -> str:
    """
    Convert MDC content (JSON or YAML-like) to VS Code Copilot instruction file format.
    The output will have YAML frontmatter with 'description' (if available) and 'files: ["**"]',
    followed by the main instruction body.
    
    Args:
        mdc_content: Content from the MDC file
        
    Returns:
        Content formatted for VS Code instruction files
    """
    extracted_description: Optional[str] = None
    main_body_content_str: str = ""

    try:
        # Attempt to parse as JSON first
        data = json.loads(mdc_content)
        extracted_description = data.get("description")
        main_body_content_str = data.get("content", "")
        # Note: 'name' and 'rules' from JSON are not directly used in the new output format
    except json.JSONDecodeError:
        # JSON parsing failed, attempt to parse as YAML-like with frontmatter
        lines = mdc_content.splitlines()
        
        if lines and lines[0] == "---":
            frontmatter_lines: List[str] = []
            body_lines: List[str] = []
            in_frontmatter = True
            
            # Start scanning from the line *after* the first '---'
            for i in range(1, len(lines)):
                if in_frontmatter and lines[i] == "---":
                    in_frontmatter = False # Closing '---' found
                    continue # Don't add this '---' to body or frontmatter
                
                if in_frontmatter:
                    frontmatter_lines.append(lines[i])
                else:
                    body_lines.append(lines[i])
            
            if in_frontmatter: 
                # Closing '---' was not found, but we started with '---'.
                # This is malformed. Treat everything after the first '---' as body for robustness.
                # However, if no actual content follows, this list could be empty.
                main_body_content_str = "\n".join(frontmatter_lines) # frontmatter_lines here are actually body lines
            else:
                 # Properly closed frontmatter was found, parse it
                for fm_line in frontmatter_lines:
                    if ":" in fm_line:
                        key, val = fm_line.split(":", 1)
                        key = key.strip()
                        val = val.strip() # Raw value
                        if key == "description":
                            # Basic unquoting for description
                            if (val.startswith("'") and val.endswith("'")) or \
                               (val.startswith('"') and val.endswith('"')):
                                extracted_description = val[1:-1]
                            else:
                                extracted_description = val
                        # Other frontmatter keys like 'name', 'globs', 'alwaysApply' are ignored
                main_body_content_str = "\n".join(body_lines)

        else:
            # No leading '---', so assume the entire content is the main body
            main_body_content_str = mdc_content

    # Construct the output in VS Code instruction file format
    output_lines: List[str] = []
    output_lines.append("---")
    
    if extracted_description:
        output_lines.append(f"description: '{_escape_yaml_string(extracted_description)}'")
    
    output_lines.append('applyTo: "**"') # This ensures applyTo: "**"
    
    output_lines.append("---")
    output_lines.append("") # Blank line after frontmatter block
    
    # Append the main body content, stripping only leading/trailing whitespace from the whole block
    output_lines.append(main_body_content_str.strip())
            
    return "\n".join(output_lines)


def save_vscode_instructions(instructions_content: str, output_path: str) -> None:
    """
    Save VS Code instructions to a file.
    
    Args:
        instructions_content: Content for the instructions file
        output_path: Path to save the instructions file
    """
    # Create parent directories if they don't exist
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(instructions_content)


def convert_to_windsurf_instructions(mdc_content: str) -> str:
    """
    Convert MDC content to Windsurf rules format.
    Windsurf rules have YAML frontmatter with trigger: always_on, description, and globs: **/*
    followed by the main instruction body.
    
    Args:
        mdc_content: Content from the MDC file
        
    Returns:
        Content formatted for Windsurf rules files
    """
    extracted_description: Optional[str] = None
    main_body_content_str: str = ""

    try:
        # Attempt to parse as JSON first
        data = json.loads(mdc_content)
        extracted_description = data.get("description")
        main_body_content_str = data.get("content", "")
        # Note: 'name' and 'rules' from JSON are not directly used in the new output format
    except json.JSONDecodeError:
        # JSON parsing failed, attempt to parse as YAML-like with frontmatter
        lines = mdc_content.splitlines()
        
        if lines and lines[0] == "---":
            frontmatter_lines: List[str] = []
            body_lines: List[str] = []
            in_frontmatter = True
            
            # Start scanning from the line *after* the first '---'
            for i in range(1, len(lines)):
                if in_frontmatter and lines[i] == "---":
                    in_frontmatter = False # Closing '---' found
                    continue # Don't add this '---' to body or frontmatter
                
                if in_frontmatter:
                    frontmatter_lines.append(lines[i])
                else:
                    body_lines.append(lines[i])
            
            if in_frontmatter: 
                # Closing '---' was not found, but we started with '---'.
                # This is malformed. Treat everything after the first '---' as body for robustness.
                main_body_content_str = "\n".join(frontmatter_lines)
            else:
                 # Properly closed frontmatter was found, parse it
                for fm_line in frontmatter_lines:
                    if ":" in fm_line:
                        key, val = fm_line.split(":", 1)
                        key = key.strip()
                        val = val.strip() # Raw value
                        if key == "description":
                            # Basic unquoting for description
                            if (val.startswith("'") and val.endswith("'")) or \
                               (val.startswith('"') and val.endswith('"')):
                                extracted_description = val[1:-1]
                            else:
                                extracted_description = val
                main_body_content_str = "\n".join(body_lines)

        else:
            # No leading '---', so assume the entire content is the main body
            main_body_content_str = mdc_content

    # Construct the output in Windsurf rules format
    output_lines: List[str] = []
    output_lines.append("---")
    output_lines.append("trigger: always_on")
    
    if extracted_description:
        output_lines.append(f"description: {extracted_description}")
    else:
        output_lines.append("description: ")
    
    output_lines.append("globs: **/*")
    output_lines.append("---")
    output_lines.append("") # Blank line after frontmatter block
    
    # Append the main body content, stripping only leading/trailing whitespace from the whole block
    output_lines.append(main_body_content_str.strip())
            
    return "\n".join(output_lines)


def save_windsurf_instructions(instructions_content: str, output_path: str) -> None:
    """
    Save Windsurf instructions to a file.
    
    Args:
        instructions_content: Content for the instructions file
        output_path: Path to save the instructions file
    """
    # Create parent directories if they don't exist
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(instructions_content)


def convert_to_cline_instructions(mdc_content: str) -> str:
    """
    Convert MDC content to Cline rules format.
    Cline rules are plain markdown files without frontmatter, similar to Roo Code format.
    
    Args:
        mdc_content: Content from the MDC file
        
    Returns:
        Content formatted for Cline rules files
    """
    extracted_description: Optional[str] = None
    main_body_content_str: str = ""

    try:
        # Attempt to parse as JSON first
        data = json.loads(mdc_content)
        extracted_description = data.get("description")
        main_body_content_str = data.get("content", "")
    except json.JSONDecodeError:
        # JSON parsing failed, attempt to parse as YAML-like with frontmatter
        lines = mdc_content.splitlines()
        
        if lines and lines[0] == "---":
            frontmatter_lines: List[str] = []
            body_lines: List[str] = []
            in_frontmatter = True
            
            # Start scanning from the line *after* the first '---'
            for i in range(1, len(lines)):
                if in_frontmatter and lines[i] == "---":
                    in_frontmatter = False # Closing '---' found
                    continue # Don't add this '---' to body or frontmatter
                
                if in_frontmatter:
                    frontmatter_lines.append(lines[i])
                else:
                    body_lines.append(lines[i])
            
            if in_frontmatter: 
                # Closing '---' was not found, but we started with '---'.
                # This is malformed. Treat everything after the first '---' as body for robustness.
                main_body_content_str = "\n".join(frontmatter_lines)
            else:
                 # Properly closed frontmatter was found, parse it
                for fm_line in frontmatter_lines:
                    if ":" in fm_line:
                        key, val = fm_line.split(":", 1)
                        key = key.strip()
                        val = val.strip() # Raw value
                        if key == "description":
                            # Basic unquoting for description
                            if (val.startswith("'") and val.endswith("'")) or \
                               (val.startswith('"') and val.endswith('"')):
                                extracted_description = val[1:-1]
                            else:
                                extracted_description = val
                main_body_content_str = "\n".join(body_lines)

        else:
            # No leading '---', so assume the entire content is the main body
            main_body_content_str = mdc_content

    # Construct the output for Cline format (plain text/markdown like Roo Code)
    output_parts: List[str] = []
    
    # Add description as a header if available
    if extracted_description:
        output_parts.append(f"# {extracted_description}")
        output_parts.append("")  # Add blank line after header
    
    # Add the main body content
    output_parts.append(main_body_content_str.strip())
    
    return "\n".join(output_parts)


def save_cline_instructions(instructions_content: str, output_path: str) -> None:
    """
    Save Cline instructions to a file.
    
    Args:
        instructions_content: Content for the instructions file
        output_path: Path to save the instructions file
    """
    # Create parent directories if they don't exist
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(instructions_content)


def convert_to_roo_instructions(mdc_content: str) -> str:
    """
    Convert MDC content to Roo Code instructions format.
    Roo Code instructions are plain text/markdown files without frontmatter.
    
    Args:
        mdc_content: Content from the MDC file
        
    Returns:
        Content formatted for Roo Code instruction files
    """
    extracted_description: Optional[str] = None
    main_body_content_str: str = ""

    try:
        # Attempt to parse as JSON first
        data = json.loads(mdc_content)
        extracted_description = data.get("description")
        main_body_content_str = data.get("content", "")
    except json.JSONDecodeError:
        # JSON parsing failed, attempt to parse as YAML-like with frontmatter
        lines = mdc_content.splitlines()
        
        if lines and lines[0] == "---":
            frontmatter_lines: List[str] = []
            body_lines: List[str] = []
            in_frontmatter = True
            
            # Start scanning from the line *after* the first '---'
            for i in range(1, len(lines)):
                if in_frontmatter and lines[i] == "---":
                    in_frontmatter = False # Closing '---' found
                    continue # Don't add this '---' to body or frontmatter
                
                if in_frontmatter:
                    frontmatter_lines.append(lines[i])
                else:
                    body_lines.append(lines[i])
            
            if in_frontmatter: 
                # Closing '---' was not found, but we started with '---'.
                # This is malformed. Treat everything after the first '---' as body for robustness.
                main_body_content_str = "\n".join(frontmatter_lines)
            else:
                 # Properly closed frontmatter was found, parse it
                for fm_line in frontmatter_lines:
                    if ":" in fm_line:
                        key, val = fm_line.split(":", 1)
                        key = key.strip()
                        val = val.strip() # Raw value
                        if key == "description":
                            # Basic unquoting for description
                            if (val.startswith("'") and val.endswith("'")) or \
                               (val.startswith('"') and val.endswith('"')):
                                extracted_description = val[1:-1]
                            else:
                                extracted_description = val
                main_body_content_str = "\n".join(body_lines)

        else:
            # No leading '---', so assume the entire content is the main body
            main_body_content_str = mdc_content

    # Construct the output for Roo Code format (plain text/markdown)
    output_parts: List[str] = []
    
    # Add description as a header if available
    if extracted_description:
        output_parts.append(f"# {extracted_description}")
        output_parts.append("")  # Add blank line after header
    
    # Add the main body content
    output_parts.append(main_body_content_str.strip())
    
    return "\n".join(output_parts)


def save_roo_instructions(instructions_content: str, output_path: str) -> None:
    """
    Save Roo Code instructions to a file.
    
    Args:
        instructions_content: Content for the instructions file
        output_path: Path to save the instructions file
    """
    # Create parent directories if they don't exist
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(instructions_content)


def convert_file(input_path_str: str, output_dir_str: Optional[str] = None) -> Tuple[str, str, str, str]:
    """
    Convert a single MDC file to VS Code instructions format, Roo Code format, Windsurf format, and Cline format.
    
    Args:
        input_path_str: Path to the input MDC file
        output_dir_str: Directory to save the output file (optional)
        
    Returns:
        Tuple of (VS Code instructions file path, Roo Code instructions file path, Windsurf instructions file path, Cline instructions file path)
    """
    input_path_abs = os.path.abspath(input_path_str)
    input_file_name = os.path.basename(input_path_abs)
    input_file_dir = os.path.dirname(input_path_abs)

    try:
        mdc_content = parse_mdc_file(input_path_abs)
        vscode_instructions_content = convert_to_vscode_instructions(mdc_content)
        roo_instructions_content = convert_to_roo_instructions(mdc_content)
        windsurf_instructions_content = convert_to_windsurf_instructions(mdc_content)
        cline_instructions_content = convert_to_cline_instructions(mdc_content)
        
        base_for_output: str
        if output_dir_str:
            base_for_output = os.path.abspath(output_dir_str)
        else:
            # Check if input is inside .cursor/rules structure
            path_parts = Path(input_file_dir).parts
            try:
                rules_index = path_parts.index("rules")
                cursor_index = path_parts.index(".cursor")
                if rules_index == cursor_index + 1 and rules_index == len(path_parts) -1 : # .cursor/rules is the immediate parent
                     # Go up two levels from 'rules' to get parent of '.cursor'
                    base_for_output = str(Path(input_file_dir).parent.parent)
                else: # .cursor/rules/some/sub/dir
                    # Find the parent of .cursor
                    base_for_output = str(Path(input_file_dir).parents[len(path_parts) - 1 - cursor_index -1])

            except ValueError: # .cursor or rules not in path
                base_for_output = input_file_dir
        
        # VS Code output structure: base_for_output/.github/instructions/original_filename.instructions.md
        github_instructions_dir = os.path.join(base_for_output, ".github", "instructions")
        vscode_output_filename = os.path.splitext(input_file_name)[0] + ".instructions.md"
        vscode_output_path = os.path.join(github_instructions_dir, vscode_output_filename)
        save_vscode_instructions(vscode_instructions_content, vscode_output_path)
        
        # Roo Code output structure: base_for_output/.roo/rules/original_filename.md
        roo_rules_dir = os.path.join(base_for_output, ".roo", "rules")
        roo_output_filename = os.path.splitext(input_file_name)[0] + ".md"
        roo_output_path = os.path.join(roo_rules_dir, roo_output_filename)
        save_roo_instructions(roo_instructions_content, roo_output_path)
        
        # Windsurf output structure: base_for_output/.windsurf/rules/original_filename.md
        windsurf_rules_dir = os.path.join(base_for_output, ".windsurf", "rules")
        windsurf_output_filename = os.path.splitext(input_file_name)[0] + ".md"
        windsurf_output_path = os.path.join(windsurf_rules_dir, windsurf_output_filename)
        save_windsurf_instructions(windsurf_instructions_content, windsurf_output_path)
        
        # Cline output structure: base_for_output/.clinerules/original_filename.md
        cline_rules_dir = os.path.join(base_for_output, ".clinerules")
        cline_output_filename = os.path.splitext(input_file_name)[0] + ".md"
        cline_output_path = os.path.join(cline_rules_dir, cline_output_filename)
        save_cline_instructions(cline_instructions_content, cline_output_path)
        
        return vscode_output_path, roo_output_path, windsurf_output_path, cline_output_path
    except Exception as e:
        print(f"Error converting {input_path_abs}: {str(e)}")
        raise


def copy_file(input_path: str, output_dir: str) -> str:
    """
    Copy a file from the input path to the output directory.
    
    Args:
        input_path: Path to the input file
        output_dir: Directory to save the output file
        
    Returns:
        Path to the copied file
    """
    # Create output directories if they don't exist
    os.makedirs(output_dir, exist_ok=True)
    
    # Determine the output file path
    output_path = os.path.join(
        output_dir,
        os.path.basename(input_path)
    )
    
    # Copy the file
    with open(input_path, 'rb') as source_file:
        with open(output_path, 'wb') as dest_file:
            dest_file.write(source_file.read())
            
    return output_path


def convert_directory(input_dir_str: str, output_dir_str: Optional[str] = None) -> Tuple[List[str], List[str], List[str], List[str], List[str]]:
    """
    Convert all MDC files in a directory and its subdirectories.
    If the input directory is not .cursor/rules, it will specifically look for .cursor/rules within it.
    Handles output directory structure based on whether an output directory is specified.
    Also copies non-MDC files to the output directory if one is specified.
    
    Args:
        input_dir_str: Directory containing MDC files or a project root.
        output_dir_str: Directory to save output files (optional).
        
    Returns:
        Tuple containing (list of VS Code converted file paths, list of Roo Code converted file paths, list of Windsurf converted file paths, list of Cline converted file paths, list of copied file paths)
    """
    input_dir_abs = os.path.abspath(input_dir_str)
    vscode_converted_files = []
    roo_converted_files = []
    windsurf_converted_files = []
    cline_converted_files = []
    copied_files = []

    actual_mdc_search_root: str
    project_root_for_no_output_dir: str 

    # Check if input_dir_str itself is '.cursor/rules' or a subdirectory within it
    path_obj = Path(input_dir_abs)
    if path_obj.name == "rules" and path_obj.parent.name == ".cursor":
        actual_mdc_search_root = input_dir_abs
        project_root_for_no_output_dir = str(path_obj.parent.parent) # Parent of .cursor
    else:
        # Assume input_dir_str is a project root, look for .cursor/rules within it
        actual_mdc_search_root = os.path.join(input_dir_abs, ".cursor", "rules")
        project_root_for_no_output_dir = input_dir_abs

    if not os.path.isdir(actual_mdc_search_root):
        print(f"Info: MDC rule directory not found at {actual_mdc_search_root}. No .mdc files will be converted from this path.")
        return [], [], [], [], []

    base_for_output: str
    if output_dir_str:
        base_for_output = os.path.abspath(output_dir_str)
    else:
        base_for_output = project_root_for_no_output_dir
    
    for root, _, files in os.walk(actual_mdc_search_root):
        for file in files:
            input_path_abs = os.path.join(root, file)
            
            # rel_path is relative to actual_mdc_search_root to preserve structure within .github/instructions and .roo/rules
            rel_path_from_search_root = os.path.relpath(root, actual_mdc_search_root)
            if rel_path_from_search_root == '.':
                rel_path_from_search_root = ''
                
            if file.endswith(".mdc"):
                mdc_content = parse_mdc_file(input_path_abs)
                vscode_instructions_content = convert_to_vscode_instructions(mdc_content)
                roo_instructions_content = convert_to_roo_instructions(mdc_content)
                windsurf_instructions_content = convert_to_windsurf_instructions(mdc_content)
                cline_instructions_content = convert_to_cline_instructions(mdc_content)
                
                # Determine output paths
                # VS Code: base_for_output / .github / instructions / rel_path_from_search_root / filename.instructions.md
                vscode_output_instructions_subdir = os.path.join(base_for_output, ".github", "instructions", rel_path_from_search_root)
                vscode_output_filename = os.path.splitext(os.path.basename(input_path_abs))[0] + ".instructions.md"
                vscode_output_path = os.path.join(vscode_output_instructions_subdir, vscode_output_filename)
                save_vscode_instructions(vscode_instructions_content, vscode_output_path)
                vscode_converted_files.append(vscode_output_path)
                
                # Roo Code: base_for_output / .roo / rules / rel_path_from_search_root / filename.md
                roo_output_rules_subdir = os.path.join(base_for_output, ".roo", "rules", rel_path_from_search_root)
                roo_output_filename = os.path.splitext(os.path.basename(input_path_abs))[0] + ".md"
                roo_output_path = os.path.join(roo_output_rules_subdir, roo_output_filename)
                save_roo_instructions(roo_instructions_content, roo_output_path)
                roo_converted_files.append(roo_output_path)
                
                # Windsurf: base_for_output / .windsurf / rules / rel_path_from_search_root / filename.md
                windsurf_output_rules_subdir = os.path.join(base_for_output, ".windsurf", "rules", rel_path_from_search_root)
                windsurf_output_filename = os.path.splitext(os.path.basename(input_path_abs))[0] + ".md"
                windsurf_output_path = os.path.join(windsurf_output_rules_subdir, windsurf_output_filename)
                save_windsurf_instructions(windsurf_instructions_content, windsurf_output_path)
                windsurf_converted_files.append(windsurf_output_path)
                
                # Cline: base_for_output / .clinerules / rel_path_from_search_root / filename.md
                cline_output_rules_subdir = os.path.join(base_for_output, ".clinerules", rel_path_from_search_root)
                cline_output_filename = os.path.splitext(os.path.basename(input_path_abs))[0] + ".md"
                cline_output_path = os.path.join(cline_output_rules_subdir, cline_output_filename)
                save_cline_instructions(cline_instructions_content, cline_output_path)
                cline_converted_files.append(cline_output_path)
            
            elif output_dir_str: # Only copy non-MDC files if an output_dir_str is specified
                # Non-MDC files are copied relative to output_dir_str, maintaining structure from actual_mdc_search_root
                # output_dir_str / rel_path_from_search_root / file
                file_output_dir_specific = os.path.join(os.path.abspath(output_dir_str), rel_path_from_search_root)
                # Note: copy_file expects output_dir to be the direct parent for the file, not a base output dir
                output_path = copy_file(input_path_abs, file_output_dir_specific)
                copied_files.append(output_path)
    
    return vscode_converted_files, roo_converted_files, windsurf_converted_files, cline_converted_files, copied_files