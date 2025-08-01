import argparse
import os
import sys
from collections import defaultdict
from clang.cindex import Index, CursorKind, TranslationUnit, CompilationDatabase

# Add supported C++ file extensions
SUPPORTED_EXTENSIONS = {'.cpp', '.hpp', '.h', '.c', '.cc', '.hxx', '.cxx'}

# Named constant for parse options
PARSE_OPTIONS = TranslationUnit.PARSE_SKIP_FUNCTION_BODIES

def find_cpp_files(root_dir, exclude_dir=None):
    """
    Recursively finds all C++ source files in a directory, optionally excluding a subdirectory.
    """
    cpp_files = []
    abs_exclude_dir = os.path.abspath(exclude_dir) if exclude_dir else None
    
    for dirpath, _, filenames in os.walk(root_dir):
        if abs_exclude_dir and os.path.abspath(dirpath).startswith(abs_exclude_dir):
            continue
        for filename in filenames:
            if os.path.splitext(filename)[1].lower() in SUPPORTED_EXTENSIONS:
                cpp_files.append(os.path.join(dirpath, filename))
    return cpp_files

def get_cursor_location(cursor):
    """Get the file path from a cursor's location, if available."""
    if cursor and cursor.location and cursor.location.file:
        return cursor.location.file.name
    return None

def analyze_code(directory_path, exclude_path=None, compile_db=None, verbose=False):
    """
    Parses C++ files in a directory to find definitions and usages of functions and variables.
    Uses USR (Unified Symbol Resolution) to uniquely identify symbols.
    """
    definitions = {}
    usages = defaultdict(set)
    
    files = find_cpp_files(directory_path, exclude_dir=exclude_path)
    index = Index.create()

    print(f"Analyzing {len(files)} files in {directory_path}...")

    for filepath in files:
        args = ['-x', 'c++']
        if compile_db:
            # Get compile commands for the specific file
            commands = compile_db.getCompileCommands(filepath)
            if commands:
                # Extract arguments from the compile command
                args.extend([arg for arg in commands[0].arguments if arg not in ['-c', commands[0].filename]])

        try:
            tu = index.parse(filepath, args=args, options=PARSE_OPTIONS)
            if not tu:
                if verbose:
                    print(f"Warning: Could not parse {filepath}", file=sys.stderr)
                continue

            for cursor in tu.cursor.walk_preorder():
                # Find definitions (functions, variables)
                if cursor.is_definition():
                    if cursor.kind in {CursorKind.FUNCTION_DECL, CursorKind.VAR_DECL, CursorKind.CXX_METHOD}:
                        usr = cursor.get_usr()
                        if usr:
                            definitions[usr] = (cursor.spelling, get_cursor_location(cursor))
                            if verbose:
                                print(f"Found DEF: {cursor.spelling} (USR: {usr}) in {get_cursor_location(cursor)}")

                # Find usages (references to functions or variables)
                if cursor.kind in {CursorKind.CALL_EXPR, CursorKind.DECL_REF_EXPR}:
                    ref_cursor = cursor.referenced
                    if ref_cursor:
                        usr = ref_cursor.get_usr()
                        if usr:
                            usages[usr].add(filepath)
                            if verbose:
                                print(f"Found USE: {ref_cursor.spelling} (USR: {usr}) in {filepath}")

        except Exception as e:
            print(f"Error processing file {filepath}: {e}", file=sys.stderr)
            
    return definitions, usages


def compare_usages(source_dir, usage_dir, compile_db=None, verbose=False):
    """
    Compares C++ symbol usages between a source directory and a usage directory.
    
    Identifies symbols defined in source_dir, used in usage_dir, but NOT used in source_dir.
    """
    abs_source_dir = os.path.abspath(source_dir)
    abs_usage_dir = os.path.abspath(usage_dir)

    # 1. Find all definitions in the source directory
    print(f"--- Step 1: Scanning for definitions in {source_dir} ---")
    source_definitions, _ = analyze_code(abs_source_dir, exclude_path=abs_usage_dir, compile_db=compile_db, verbose=verbose)
    
    source_defs_filtered = {
        usr: (name, loc) for usr, (name, loc) in source_definitions.items() 
        if loc and os.path.abspath(loc).startswith(abs_source_dir)
    }
    print(f"Found {len(source_defs_filtered)} definitions in source directory.")

    # 2. Find all usages within the source directory (excluding usage_dir)
    print(f"\n--- Step 2: Scanning for usages within {source_dir} ---")
    _, source_usages = analyze_code(abs_source_dir, exclude_path=abs_usage_dir, compile_db=compile_db, verbose=verbose)

    # 3. Find all usages within the usage directory
    print(f"\n--- Step 3: Scanning for usages within {usage_dir} ---")
    _, usage_dir_usages = analyze_code(abs_usage_dir, compile_db=compile_db, verbose=verbose)

    # 4. Analyze and find symbols used only in the usage directory
    print("\n--- Step 4: Comparing usages ---")
    test_only_symbols = defaultdict(set)

    for usr, files_used_in in usage_dir_usages.items():
        if usr in source_defs_filtered:
            if usr not in source_usages:
                symbol_name = source_defs_filtered[usr][0]
                test_only_symbols[symbol_name].update(files_used_in)
                if verbose:
                    print(f"  [+] Symbol '{symbol_name}' (USR: {usr}) is test-only.")
            elif verbose:
                print(f"  [-] Symbol '{source_defs_filtered[usr][0]}' (USR: {usr}) is used in source code, skipping.")
        elif verbose:
            print(f"  [ ] Symbol with USR '{usr}' is used in tests but not defined in source, skipping.")

    return test_only_symbols


def main():
    parser = argparse.ArgumentParser(
        description="Compare C++ function and variable usage between two directories. "
                    "Finds symbols defined in the source directory that are only used in the usage directory (e.g., test-only code)."
    )
    parser.add_argument("source_directory", help="The directory containing the primary source code.")
    parser.add_argument("usage_directory", help="The directory to check for usages (e.g., a 'tests' directory).")
    parser.add_argument("--compile-db", help="Path to the directory containing compile_commands.json.")
    parser.add_argument("-v", "--verbose", action="store_true", help="Enable detailed logging output.")
    args = parser.parse_args()

    if not os.path.isdir(args.source_directory):
        print(f"Error: Source directory not found at '{args.source_directory}'", file=sys.stderr)
        sys.exit(1)
    if not os.path.isdir(args.usage_directory):
        print(f"Error: Usage directory not found at '{args.usage_directory}'", file=sys.stderr)
        sys.exit(1)

    comp_db = None
    if args.compile_db:
        db_path = os.path.join(args.compile_db, "compile_commands.json")
        if not os.path.exists(db_path):
            print(f"Error: compile_commands.json not found in '{args.compile_db}'", file=sys.stderr)
            sys.exit(1)
        try:
            comp_db = CompilationDatabase.fromDirectory(args.compile_db)
        except Exception as e:
            print(f"Error loading compilation database: {e}", file=sys.stderr)
            sys.exit(1)

    test_only = compare_usages(args.source_directory, args.usage_directory, compile_db=comp_db, verbose=args.verbose)

    print("\n--- Analysis Complete ---")
    if not test_only:
        print("No symbols found that are exclusively used in the usage directory.")
    else:
        print(f"Found {len(test_only)} symbols defined in '{args.source_directory}' that are only used in '{args.usage_directory}':\n")
        for symbol, files in sorted(test_only.items()):
            print(f"Symbol: {symbol}")
            for f in sorted(list(files)):
                print(f"  - Used in: {f}")
            print("-" * 20)

if __name__ == "__main__":
    main()
