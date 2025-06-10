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
        self.function_pattern = regex.compile(
            r'(?<!\bvirtual\s+)(?<!\bstatic\s+)(?<!\bconst\s+)(?<!\bextern\s+)(?<!\btypedef\s+)'
            r'(?<!\btemplate\s*<[^>]*>\s*)'
            r'(?<!\busing\s+)'
            r'(?<!\bfriend\s+)'
            r'(?<!\b#define\s+)'
            r'(?<!\benum\s+)'
            r'(?<!\bnamespace\s+)'
            r'(?:\b(?:virtual|static|inline|explicit|friend|const|extern)?\s+)*'
            r'(?!if|else|for|while|switch|catch|return|sizeof)(?:\w+::\s*)*(?!if|else|for|while|switch|catch|return|sizeof)[\w<>:~,\s\*&]+\s+'
            r'([\w_~]+)\s*\(([^;{}]*)\)\s*'
            r'(?:const|noexcept|override|final|volatile|\s)*'
            r'(?:(?=\{)|(?:=\s*0\s*;)|(?:=\s*default\s*;)|(?:=\s*delete\s*;)|(?:;))',
            flags=regex.MULTILINE
        )
        
        # Pattern for finding class and struct declarations
        self.class_pattern = regex.compile(
            r'\b(?:class|struct)\s+(\w+)(?:\s*:\s*(?:public|protected|private)\s+\w+(?:\s*,\s*(?:public|protected|private)\s+\w+)*)?\s*\{',
            flags=regex.MULTILINE
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
        self.control_keywords = {'if', 'else', 'for', 'while', 'switch', 'catch', 'return', 
                                'sizeof', 'lambda', 'do', 'case', 'try', 'throw'}

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
            'function_implementations': []
        }
        
        # Find global functions (declarations only)
        global_functions = self.function_pattern.finditer(content_without_comments)
        for match in global_functions:
            func_name = match.group(1)
            params = match.group(2).strip()
            
            # Skip control keywords
            if func_name in self.control_keywords:
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
            
            # Find the closing brace of the class
            # This is a simplistic approach; a proper parser would handle nested braces
            open_braces = 1
            class_end = class_start + len(class_match.group(0))
            
            for i in range(class_end, len(content_without_comments)):
                if content_without_comments[i] == '{':
                    open_braces += 1
                elif content_without_comments[i] == '}':
                    open_braces -= 1
                    if open_braces == 0:
                        class_end = i + 1
                        break
            
            class_content = content_without_comments[class_start:class_end]
            
            # Find methods inside the class
            method_matches = self.class_method_pattern.finditer(class_content)
            for method_match in method_matches:
                method_name = method_match.group(1)
                params = method_match.group(2).strip()
                
                # Skip control keywords
                if method_name in self.control_keywords:
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
            if function_name in self.control_keywords:
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


def format_output(results: List[Dict], verbose: bool = False, output_format: str = 'text') -> str:
    """Format the analysis results based on the specified output format."""
    if output_format == 'json':
        import json
        return json.dumps(results, indent=2)
    
    # Text output format
    output = []
    for file_result in results:
        file_path = file_result['file']
        output.append(f"File: {file_path}")
        
        if verbose:
            output.append(f"  Extension: {file_result['extension']}")
        
        if file_result['global_functions']:
            output.append("  Global Functions:")
            for func in sorted(file_result['global_functions'], key=lambda x: x['name']):
                if verbose:
                    output.append(f"    {func['name']}({func['parameters']})")
                else:
                    output.append(f"    {func['name']}")
        
        if file_result['class_methods']:
            output.append("  Class Methods:")
            for method in sorted(file_result['class_methods'], key=lambda x: (x['class'], x['name'])):
                if verbose:
                    output.append(f"    {method['class']}::{method['name']}({method['parameters']})")
                else:
                    output.append(f"    {method['class']}::{method['name']}")
        
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
                
                output.append(f"    {class_prefix}{impl['name']}({impl['parameters']})")
        
        output.append("")  # Empty line between files
    
    return "\n".join(output)


def main():
    parser = argparse.ArgumentParser(description='Analyze C++ files to list functions and class methods.')
    parser.add_argument('path', help='Path to a C++ file or directory containing C++ files')
    parser.add_argument('-r', '--recursive', action='store_true', help='Recursively search directories for C++ files')
    parser.add_argument('-v', '--verbose', action='store_true', help='Display detailed information including function parameters')
    parser.add_argument('-f', '--format', choices=['text', 'json'], default='text', help='Output format (text or JSON)')
    parser.add_argument('-o', '--output', help='Output file path (default: stdout)')
    
    args = parser.parse_args()
    
    analyzer = CppFunctionAnalyzer()
    
    path = args.path
    if os.path.isfile(path):
        results = [analyzer.analyze_file(path)]
    else:
        results = analyzer.analyze_directory(path, args.recursive)
    
    output_str = format_output(results, args.verbose, args.format)
    
    if args.output:
        with open(args.output, 'w', encoding='utf-8') as out_file:
            out_file.write(output_str)
    else:
        print(output_str)


if __name__ == "__main__":
    main() 