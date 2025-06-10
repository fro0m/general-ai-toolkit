#!/usr/bin/env python3

import argparse
import os
import re
import regex
from pathlib import Path
from typing import List, Dict, Set, Tuple, Optional


class CppFunctionAnalyzer:
    def __init__(self):
        # Regular expression for removing C/C++ comments
        self.comment_pattern = re.compile(
            r'//.*?$|/\*.*?\*/|\'(?:\\.|[^\\\'])*\'|"(?:\\.|[^\\"])*"',
            re.DOTALL | re.MULTILINE
        )
        
        # Regex pattern for finding C++ function declarations in .h and .cpp files
        # Updated to be more strict about function declarations vs. calls
        self.function_pattern = regex.compile(
            r'(?<!\bvirtual\s+)(?<!\bstatic\s+)(?<!\bconst\s+)(?<!\bextern\s+)(?<!\btypedef\s+)'
            r'(?<!\btemplate\s*<[^>]*>\s*)'
            r'(?<!\busing\s+)'
            r'(?<!\bfriend\s+)'
            r'(?<!\b#define\s+)'
            r'(?<!\benum\s+)'
            r'(?<!\bnamespace\s+)'
            r'(?!\bif\b|\belse\b|\bfor\b|\bwhile\b|\bswitch\b|\bcatch\b|\breturn\b|\bsizeof\b|\bdelete\b|\bnew\b)'
            r'(?:\b(?:virtual|static|inline|explicit|friend|const|extern)?\s+)*'
            r'(?!if|else|for|while|switch|catch|return|sizeof)(?:\w+::\s*)*(?!if|else|for|while|switch|catch|return|sizeof)[\w<>:~,\s\*&]+\s+'
            r'([\w_~]+)\s*\(([^;{}]*)\)\s*'
            r'(?:const|noexcept|override|final|volatile|\s)*'
            r'(?:(?=\{)|(?:=\s*0\s*;)|(?:=\s*default\s*;)|(?:=\s*delete\s*;)|(?:;))',
            flags=regex.MULTILINE
        )
        
        # Pattern for finding class and struct declarations with definitions (not just forward declarations)
        # Look for opening brace and ensure there's content and a closing brace
        self.class_pattern = regex.compile(
            r'\b(?:class|struct)\s+(\w+)(?:\s*:\s*(?:public|protected|private)\s+\w+(?:\s*,\s*(?:public|protected|private)\s+\w+)*)?\s*\{',
            flags=regex.MULTILINE
        )
        
        # Pattern to find forward declarations (to exclude them)
        self.forward_declaration_pattern = re.compile(
            r'\b(?:class|struct)\s+(\w+)\s*;',
            flags=re.MULTILINE
        )
        
        # Pattern for finding class method declarations inside class definitions
        self.class_method_pattern = regex.compile(
            r'(?:(?:public|protected|private)(?:\s*slots)?:)?(?:\s*)'
            r'(?:(?:virtual|static|inline|explicit|friend|const|extern)?\s+)*'
            r'(?!if|else|for|while|switch|catch|return|sizeof)(?:\w+::\s*)*(?!if|else|for|while|switch|catch|return|sizeof)[\w<>:~,\s\*&]+\s+'
            r'([\w_~]+)\s*\(([^;{}]*)\)\s*'
            r'(?:const|noexcept|override|final|volatile|\s)*'
            r'(?:(?=\{)|(?:=\s*0\s*;)|(?:=\s*default\s*;)|(?:=\s*delete\s*;)|(?:;))',
            flags=regex.MULTILINE
        )
        
        # Pattern to identify function calls (to exclude them)
        # Using regex module instead of re for variable-width lookbehind support
        self.function_call_pattern = regex.compile(
            r'(?<!\bvoid\s+|\bint\s+|\bchar\s+|\bdouble\s+|\bfloat\s+|\blong\s+|\bunsigned\s+|\bshort\s+|\bbool\s+|\bstruct\s+|\bclass\s+|\benum\s+|\bauto\s+|\bconst\s+)'
            r'(?<!\w\s+|\bvirtual\s+|\bstatic\s+|\bextern\s+|\binline\s+|\bexplicit\s+|\bfriend\s+)'
            r'(\w+)\s*\([^;{}]*\)\s*(?!;|{|=\s*0|=\s*default|=\s*delete)',
            flags=regex.MULTILINE
        )
        
        # Pattern for extracting namespace declarations
        self.namespace_pattern = re.compile(r'namespace\s+(\w+)\s*\{')
        
        # Improved pattern for function implementation detection
        self.function_impl_pattern = regex.compile(
            r'(?:(?:inline|static|const|virtual)\s+)?'  # Optional function specifiers
            r'(?:[\w<>\s:~,\*&]+\s+)?'  # Return type (optional for constructors)
            r'(?:(?P<namespace>[\w]+)::)?'  # Optional namespace
            r'(?:(?P<class>[\w]+)::)?'  # Optional class name
            r'(?P<function>[\w_~]+)'  # Function name
            r'\s*\((?P<params>[^{]*)\)\s*'  # Parameters
            r'(?:const|noexcept|override|final|volatile|\s)*'  # Optional qualifiers
            r'\s*{'  # Opening brace of function body
            ,
            flags=regex.MULTILINE
        )
        
        # Common control flow keywords to filter out
        self.control_keywords = {
            'if', 'else', 'for', 'while', 'switch', 'catch', 'return', 
            'sizeof', 'lambda', 'do', 'case', 'try', 'throw', 'delete', 'new',
            'NULL', 'nullptr', 'true', 'false', 'this', 'break', 'continue',
            'template', 'typedef', 'typename', 'goto', 'printf', 'cout', 'cin'
        }
        
        # Common function names that are likely function calls, not declarations
        self.common_function_calls = {
            'printf', 'sprintf', 'fprintf', 'scanf', 'fscanf', 'sscanf', 'qDebug', 
            'qWarning', 'qCritical', 'qInfo', 'qFatal', 'qUtf8Printable', 'malloc', 
            'free', 'realloc', 'calloc', 'memset', 'memcpy', 'strlen', 'strcmp',
            'strcpy', 'strcat', 'assert', 'exit', 'abort', 'std::cout', 'std::cin',
            'std::cerr', 'std::endl', 'QString', 'QByteArray', 'QVariant', 'QObject',
            'connect', 'disconnect', 'emit', 'signal', 'slot', 'tr', 'trUtf8'
        }

    def remove_comments(self, text):
        """Remove C and C++ style comments from text."""
        def _replacer(match):
            s = match.group(0)
            if s.startswith('/'):
                return " " * len(s)  # Replace comment with spaces to preserve line numbers
            else:
                return s  # Return string or character literals unchanged
        return self.comment_pattern.sub(_replacer, text)

    def analyze_file(self, file_path: str) -> Dict:
        """Analyze a C++ file and extract its functions and methods."""
        try:
            with open(file_path, 'r', encoding='utf-8') as file:
                content = file.read()
        except UnicodeDecodeError:
            # Try with latin-1 encoding as fallback
            with open(file_path, 'r', encoding='latin-1') as file:
                content = file.read()
        
        # Remove comments to avoid false positives
        content_without_comments = self.remove_comments(content)
                
        file_extension = os.path.splitext(file_path)[1].lower()
        
        results = {
            'file': file_path,
            'extension': file_extension,
            'global_functions': [],
            'class_methods': [],
            'function_implementations': [],
            'classes_and_structs': []  # New field to store class and struct names
        }
        
        # Find forward declarations to exclude them
        forward_declarations = set()
        for match in self.forward_declaration_pattern.finditer(content_without_comments):
            forward_declarations.add(match.group(1))
        
        # Find function calls to exclude them
        function_calls = set()
        for match in self.function_call_pattern.finditer(content_without_comments):
            function_calls.add(match.group(1))
        
        # Find global functions (declarations only)
        global_functions = self.function_pattern.finditer(content_without_comments)
        for match in global_functions:
            func_name = match.group(1)
            params = match.group(2).strip()
            
            # Skip control keywords and common function calls
            if func_name in self.control_keywords or func_name in self.common_function_calls:
                continue
                
            # Skip if it's likely a function call
            if func_name in function_calls:
                continue
                
            results['global_functions'].append({
                'name': func_name,
                'parameters': params,
                'position': match.start()
            })
        
        # Find class declarations and their methods
        class_matches = self.class_pattern.finditer(content_without_comments)
        for class_match in class_matches:
            class_name = class_match.group(1)
            class_start = class_match.start()
            
            # Skip forward declarations
            if class_name in forward_declarations:
                # Check if this is really a definition by looking for content between braces
                open_braces = 1
                class_end = class_start + len(class_match.group(0))
                has_content = False
                
                for i in range(class_end, len(content_without_comments)):
                    if content_without_comments[i] == '{':
                        open_braces += 1
                    elif content_without_comments[i] == '}':
                        open_braces -= 1
                        if open_braces == 0:
                            # Check if there's any non-whitespace content between braces
                            class_content = content_without_comments[class_end:i].strip()
                            if class_content:
                                has_content = True
                            class_end = i + 1
                            break
                
                if not has_content:
                    continue  # Skip empty class/struct definitions
            
            # Add class name to results
            class_or_struct = "class" if "class " in content_without_comments[class_start-10:class_start+10] else "struct"
            
            # Find the closing brace of the class
            # This is a simplistic approach; a proper parser would handle nested braces
            open_braces = 1
            class_end = class_start + len(class_match.group(0))
            class_body = ""
            
            for i in range(class_end, len(content_without_comments)):
                if content_without_comments[i] == '{':
                    open_braces += 1
                elif content_without_comments[i] == '}':
                    open_braces -= 1
                    if open_braces == 0:
                        class_body = content_without_comments[class_end:i].strip()
                        class_end = i + 1
                        break
            
            # Only add classes/structs with non-empty bodies
            if class_body:
                results['classes_and_structs'].append({
                    'type': class_or_struct,
                    'name': class_name,
                    'position': class_start
                })
                
                class_content = content_without_comments[class_start:class_end]
                
                # Find methods inside the class
                method_matches = self.class_method_pattern.finditer(class_content)
                for method_match in method_matches:
                    method_name = method_match.group(1)
                    params = method_match.group(2).strip()
                    
                    # Skip control keywords and common function calls
                    if method_name in self.control_keywords or method_name in self.common_function_calls:
                        continue
                    
                    # Skip if it's likely a function call
                    if method_name in function_calls:
                        continue
                        
                    results['class_methods'].append({
                        'class': class_name,
                        'name': method_name,
                        'parameters': params,
                        'position': class_start + method_match.start()
                    })
        
        # Find function implementations (especially in .cpp files)
        function_implementations = set()  # Use a set to avoid duplicates
        impl_matches = self.function_impl_pattern.finditer(content_without_comments)
        
        for impl_match in impl_matches:
            namespace = impl_match.group('namespace') or ""
            class_name = impl_match.group('class') or ""
            function_name = impl_match.group('function')
            params = impl_match.group('params').strip()
            
            # Skip control structures that may be matched incorrectly
            if function_name in self.control_keywords or function_name in self.common_function_calls:
                continue
            
            # Skip if it's likely a function call
            if function_name in function_calls:
                continue
                
            # Create a unique identifier for this implementation
            impl_id = f"{namespace}::{class_name}::{function_name}::{params}"
            
            # Only add if we haven't seen this implementation before
            if impl_id not in function_implementations:
                function_implementations.add(impl_id)
                
                # Add function implementation details
                implementation = {
                    'namespace': namespace,
                    'class': class_name,
                    'name': function_name,
                    'parameters': params,
                    'position': impl_match.start()
                }
                
                results['function_implementations'].append(implementation)
        
        return results

    def find_cpp_files(self, directory: str, recursive: bool = True) -> List[str]:
        """Find all C++ source and header files in the given directory."""
        cpp_files = []
        cpp_extensions = {'.cpp', '.cc', '.cxx', '.c++', '.h', '.hpp', '.hxx', '.h++', '.hh'}
        
        if recursive:
            for root, _, files in os.walk(directory):
                for file in files:
                    ext = os.path.splitext(file)[1].lower()
                    if ext in cpp_extensions:
                        cpp_files.append(os.path.join(root, file))
        else:
            for file in os.listdir(directory):
                if os.path.isfile(os.path.join(directory, file)):
                    ext = os.path.splitext(file)[1].lower()
                    if ext in cpp_extensions:
                        cpp_files.append(os.path.join(directory, file))
        
        return cpp_files

    def analyze_directory(self, directory: str, recursive: bool = True) -> List[Dict]:
        """Analyze all C++ files in a directory and return their functions and methods."""
        cpp_files = self.find_cpp_files(directory, recursive)
        results = []
        
        for file_path in cpp_files:
            file_result = self.analyze_file(file_path)
            results.append(file_result)
        
        return results
    
    def analyze_files(self, file_paths: List[str]) -> List[Dict]:
        """Analyze a list of C++ files and return their functions and methods."""
        results = []
        
        for file_path in file_paths:
            if os.path.exists(file_path):
                file_result = self.analyze_file(file_path)
                results.append(file_result)
            else:
                print(f"Warning: File not found: {file_path}")
        
        return results


def format_output(results: List[Dict], verbose: bool = False, output_format: str = 'text') -> str:
    """Format the analysis results based on the specified output format."""
    if output_format == 'json':
        import json
        return json.dumps(results, indent=2)
    
    # Track unique functions to avoid duplicates in output
    seen_functions = set()
    seen_methods = set()
    seen_classes = set()
    
    # Text output format
    output = []
    for file_result in results:
        file_path = file_result['file']
        output.append(f"File: {file_path}")
        
        if verbose:
            output.append(f"  Extension: {file_result['extension']}")
        
        # Display classes and structs
        if file_result['classes_and_structs']:
            output.append("  Classes and Structs:")
            for cls in sorted(file_result['classes_and_structs'], key=lambda x: x['name']):
                class_key = f"{cls['type']}:{cls['name']}"
                if class_key not in seen_classes:
                    output.append(f"    {cls['type']}: {cls['name']}")
                    seen_classes.add(class_key)
        
        if file_result['global_functions']:
            output.append("  Global Functions:")
            for func in sorted(file_result['global_functions'], key=lambda x: x['name']):
                # Use function name and parameters as a unique identifier
                func_key = f"{func['name']}:{func['parameters']}" if verbose else func['name']
                if func_key not in seen_functions:
                    if verbose:
                        output.append(f"    {func['name']}({func['parameters']})")
                    else:
                        output.append(f"    {func['name']}")
                    seen_functions.add(func_key)
        
        if file_result['class_methods']:
            output.append("  Class Methods:")
            for method in sorted(file_result['class_methods'], key=lambda x: (x['class'], x['name'])):
                # Use class, method name, and parameters as a unique identifier
                method_key = f"{method['class']}::{method['name']}:{method['parameters']}" if verbose else f"{method['class']}::{method['name']}"
                if method_key not in seen_methods:
                    if verbose:
                        output.append(f"    {method['class']}::{method['name']}({method['parameters']})")
                    else:
                        output.append(f"    {method['class']}::{method['name']}")
                    seen_methods.add(method_key)
        
        if file_result['function_implementations'] and verbose:
            output.append("  Function Implementations:")
            for impl in sorted(file_result['function_implementations'], 
                              key=lambda x: (x['namespace'], x['class'], x['name'])):
                class_prefix = ""
                if impl['namespace'] and impl['class']:
                    class_prefix = f"{impl['namespace']}::{impl['class']}::"
                elif impl['class']:
                    class_prefix = f"{impl['class']}::"
                elif impl['namespace']:
                    class_prefix = f"{impl['namespace']}::"
                
                # Use full qualified name and parameters as a unique identifier
                impl_key = f"{class_prefix}{impl['name']}:{impl['parameters']}"
                if impl_key not in seen_functions:
                    output.append(f"    {class_prefix}{impl['name']}({impl['parameters']})")
                    seen_functions.add(impl_key)
        
        output.append("")  # Empty line between files
    
    return "\n".join(output)


def main():
    parser = argparse.ArgumentParser(description='Analyze C++ files to list functions and class methods.')
    parser.add_argument('paths', nargs='+', help='Paths to C++ files or directories containing C++ files')
    parser.add_argument('-r', '--recursive', action='store_true', help='Recursively search directories for C++ files')
    parser.add_argument('-v', '--verbose', action='store_true', help='Display detailed information including function parameters')
    parser.add_argument('-f', '--format', choices=['text', 'json'], default='text', help='Output format (text or JSON)')
    parser.add_argument('-o', '--output', help='Output file path (default: stdout)')
    
    args = parser.parse_args()
    
    analyzer = CppFunctionAnalyzer()
    all_results = []
    
    for path in args.paths:
        if os.path.isfile(path):
            result = analyzer.analyze_file(path)
            all_results.append(result)
        elif os.path.isdir(path):
            results = analyzer.analyze_directory(path, args.recursive)
            all_results.extend(results)
        else:
            print(f"Warning: Path not found: {path}")
    
    output_str = format_output(all_results, args.verbose, args.format)
    
    if args.output:
        with open(args.output, 'w', encoding='utf-8') as out_file:
            out_file.write(output_str)
    else:
        print(output_str)


if __name__ == "__main__":
    main() 