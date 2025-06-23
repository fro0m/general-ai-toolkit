"""
Command-line interface for the rules converter.
"""
import os
import sys
import click
from .converter import convert_directory, convert_file


@click.command()
@click.argument('input_path', type=click.Path(exists=True))
@click.option(
    '--output-dir', '-o', 
    type=click.Path(), 
    help='Directory to save converted files. If not specified, files are saved alongside the original files.'
)
@click.option(
    '--recursive', '-r', 
    is_flag=True, 
    default=True, 
    help='Process directories recursively (default: True).'
)
def main(input_path, output_dir, recursive):
    """
    Convert Cursor IDE rules MDC files to VS Code instruction files and Roo Code rules files.
    Also copies non-MDC files from the source directory to the output directory.
    
    INPUT_PATH can be either a single file or a directory.
    
    Examples:
    
        # Convert a single file
        rules-converter path/to/file.mdc
        
        # Convert all .mdc files in a directory and copy other files
        rules-converter path/to/directory
        
        # Convert and save to specific output directory
        rules-converter path/to/directory -o path/to/output
    """
    input_path = os.path.abspath(input_path)
    
    if output_dir:
        output_dir = os.path.abspath(output_dir)
    
    try:
        # Check if the input path is a file or directory
        if os.path.isfile(input_path):
            if not input_path.endswith('.mdc'):
                click.echo(f"Warning: {input_path} does not have .mdc extension.")
                if not click.confirm("Continue anyway?"):
                    return
            
            vscode_output_path, roo_output_path = convert_file(input_path, output_dir)
            click.echo(f"Converted {input_path}:")
            click.echo(f"  - VS Code: {vscode_output_path}")
            click.echo(f"  - Roo Code: {roo_output_path}")
        
        elif os.path.isdir(input_path):
            if recursive:
                vscode_converted_files, roo_converted_files, copied_files, _ = convert_directory(input_path, output_dir)
                total_processed = len(vscode_converted_files) + len(copied_files)
                
                click.echo(f"Processed {total_processed} files from {input_path}")
                click.echo(f"- Converted {len(vscode_converted_files)} .mdc files")
                click.echo(f"  - VS Code instructions: {len(vscode_converted_files)} files")
                click.echo(f"  - Roo Code rules: {len(roo_converted_files)} files")
                click.echo(f"- Copied {len(copied_files)} other files")
                
                if vscode_converted_files or roo_converted_files:
                    click.echo("\nGenerated files:")
                    for file in vscode_converted_files:
                        click.echo(f"  - VS Code: {file}")
                    for file in roo_converted_files:
                        click.echo(f"  - Roo Code: {file}")
                    for file in copied_files:
                        click.echo(f"  - Copied: {file}")
                else:
                    click.echo("No files found.")
            else:
                # Process only the files in the top directory (not implemented)
                click.echo("Non-recursive mode not implemented.")
                sys.exit(1)
        
        else:
            click.echo(f"Error: {input_path} is neither a file nor a directory.")
            sys.exit(1)
    
    except Exception as e:
        click.echo(f"Error: {str(e)}", err=True)
        sys.exit(1)


if __name__ == "__main__":
    main()