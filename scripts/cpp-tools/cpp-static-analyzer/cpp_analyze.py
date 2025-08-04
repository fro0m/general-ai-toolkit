#!/usr/bin/env python3

"""
Comprehensive C++ Static Analysis Tool

This script runs multiple C++ static analysis tools in parallel subprocesses and generates
a consolidated report with all issues found. It integrates:
- Clang Static Analyzer
- clangd
- cppcheck
- IKOS (Inferencing Kernel for Open Static Analysis)
- Flawfinder
- xunused
- scan-build

Example Usage:
   ./cpp_analyze.py /path/to/build /path/to/src

This command analyzes the source files in `/path/to/src` using the compilation
database found in `/path/to/build/compile_commands.json`.

Additional options:
- To specify a custom output file for the report:
  ./cpp_analyze.py /path/to/build /path/to/src --output cpp_analysis_report.txt

- To enable parallel analysis with 4 jobs:
  ./cpp_analyze.py /path/to/build /path/to/src --parallel 4

Requirements:
- Python 3.x
- clangd, clang-tidy, clang-static-analyzer installed and in PATH
- cppcheck installed and in PATH
- IKOS installed and in PATH (optional)
- Flawfinder installed and in PATH
- xunused installed and in PATH. To install, you can run the following commands:
  - sudo apt install llvm-18-dev libclang-18-dev
  - git clone https://github.com/mgehre/xunused.git
  - cd xunused && mkdir build && cd build
  - cmake .. && make
- scan-build installed and in PATH.
- A `compile_commands.json` file in the build directory.
- The source directory must be a valid directory.

Notes:
- Only files within the source directory or its subdirectories are analyzed.
- Tools run in parallel subprocesses for better performance.
- Results are consolidated into a single comprehensive report.
- Detailed logs are printed to console.
"""

import argparse
import json
import os
import subprocess
import logging
import concurrent.futures
import threading
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Tuple, Optional
import shutil
import shlex

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)

class AnalysisResult:
    """Container for analysis results from a single tool."""
    def __init__(self, tool_name: str, file_path: str, output: str, error: Optional[str] = None):
        self.tool_name = tool_name
        self.file_path = file_path
        self.output = output
        self.error = error
        self.has_issues = bool(output.strip())

class CppAnalyzer:
    """Main C++ static analysis coordinator."""
    
    def __init__(self, compile_commands_dir: str, project_root: str, parallel_jobs: Optional[int] = None):
        self.project_root = project_root
        self.compile_commands_dir = compile_commands_dir
        self.results_lock = threading.Lock()
        self.all_results: List[AnalysisResult] = []
        
        # Check tool availability
        self.available_tools = self._check_tool_availability()
        
        if parallel_jobs is None:
            self.parallel_jobs = os.cpu_count() or 1
            logging.info(f"Using default parallel jobs: {self.parallel_jobs}")
        else:
            self.parallel_jobs = parallel_jobs

        self.multi_threaded_tools = {'clangd'}
        self.single_threaded_tools = {'clang-static-analyzer', 'flawfinder', 'scan-build'}

        self.compile_commands = self._load_compile_commands()
        self._calculate_thread_distribution()

    def _calculate_thread_distribution(self):
        """Calculate thread distribution based on available tools and CPU cores."""
        available_multi_threaded = [t for t in self.multi_threaded_tools if self.available_tools.get(t)]
        available_single_threaded = [t for t in self.single_threaded_tools if self.available_tools.get(t)]

        num_multi = len(available_multi_threaded)
        num_single = len(available_single_threaded)
        
        if num_multi > 0:
            self.single_tool_threads = (self.parallel_jobs - num_single) // num_multi
            if self.single_tool_threads < 1:
                self.single_tool_threads = 1
        else:
            self.single_tool_threads = 1 # No multi-threaded tools available

        logging.info(f"Total parallel jobs: {self.parallel_jobs}")
        logging.info(f"Threads per multi-threaded tool: {self.single_tool_threads}")


    def _load_compile_commands(self) -> Dict[str, Dict]:
        """Load and cache compile_commands.json."""
        compile_commands_path = Path(self.compile_commands_dir) / "compile_commands.json"
        if not compile_commands_path.exists():
            raise FileNotFoundError(f"compile_commands.json not found in {self.compile_commands_dir}")
        try:
            with open(compile_commands_path, "r") as f:
                commands = json.load(f)
            # Create a mapping from file path to compile command entry for quick lookup
            return {os.path.abspath(os.path.join(entry["directory"], entry["file"])): entry for entry in commands}
        except (json.JSONDecodeError, KeyError) as e:
            raise ValueError(f"Failed to parse compile_commands.json: {e}")

    def _get_compile_args(self, file_path: str, for_xunused: bool = False) -> List[str]:
        """Get compile arguments for a file from the compilation database."""
        abs_file_path = os.path.abspath(file_path)
        entry = self.compile_commands.get(abs_file_path)
        if not entry:
            logging.warning(f"No compile command found for {file_path}")
            return []

        args = []
        if "arguments" in entry:
            args = entry["arguments"]
        elif "command" in entry:
            args = shlex.split(entry["command"])

        # Filter out compiler, output file, and -c flag
        filtered_args = []
        skip_next = False
        for i, arg in enumerate(args):
            if skip_next:
                skip_next = False
                continue
            if i == 0: # skip compiler
                continue
            if arg == '-o':
                skip_next = True
                continue
            if arg == '-c':
                continue
            if arg == file_path or os.path.abspath(arg) == abs_file_path:
                continue
            if for_xunused and arg == '-fno-pch':
                continue
            
            # Make paths absolute
            if arg == '-I' or arg == '-isystem':
                if i + 1 < len(args):
                    path = args[i+1]
                    if not os.path.isabs(path):
                        path = os.path.abspath(os.path.join(entry.get("directory", "."), path))
                    filtered_args.append(arg)
                    filtered_args.append(path)
                    skip_next = True
                else:
                    filtered_args.append(arg)
            elif arg.startswith('-I'):
                path = arg[2:]
                if not os.path.isabs(path):
                    path = os.path.abspath(os.path.join(entry.get("directory", "."), path))
                filtered_args.append('-I' + path)
            elif arg.startswith('-isystem'):
                path = arg[len('-isystem'):].lstrip()
                if not os.path.isabs(path):
                    path = os.path.abspath(os.path.join(entry.get("directory", "."), path))
                filtered_args.append('-isystem' + path)
            else:
                filtered_args.append(arg)
        
        if for_xunused:
            filtered_args.append("-fno-pch")

        return filtered_args
        
    def _check_tool_availability(self) -> Dict[str, bool]:
        """Check which analysis tools are available in PATH."""
        tools = {
            'clangd': ['clangd', '--version'],
            'clang-static-analyzer': ['clang', '--analyze', '--help'],
            'cppcheck': ['cppcheck', '--version'],
            'ikos': ['ikos', '--version'],
            'flawfinder': ['flawfinder', '--version'],
            'xunused': ['xunused', '--version'],
            'scan-build': ['scan-build', '--help']
        }
        
        available = {}
        for tool, cmd in tools.items():
            try:
                result = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
                available[tool] = result.returncode == 0
                if available[tool]:
                    logging.info(f"✓ {tool} is available")
                else:
                    logging.error(f"✗ {tool} not working properly. Skipping.")
            except (subprocess.TimeoutExpired, FileNotFoundError):
                available[tool] = False
                logging.error(f"✗ {tool} not found in PATH. Skipping.")
                
        return available

    def run_clangd_check_on_file(self, file_path: str) -> AnalysisResult:
        """Run clangd --check on a single file."""
        if not self.available_tools.get('clangd', False):
            return AnalysisResult('clangd', file_path, '', 'clangd not available')
        
        try:
            result = subprocess.run(
                ["clangd", f"--compile-commands-dir={self.compile_commands_dir}", "--clang-tidy", f"--check={file_path}", f"-j={self.single_tool_threads}"],
                capture_output=True,
                text=True,
                timeout=120,
                check=False,
            )
            output = result.stdout + result.stderr
            return AnalysisResult('clangd', file_path, output)
        except subprocess.TimeoutExpired:
            return AnalysisResult('clangd', file_path, '', 'Timeout expired')
        except Exception as e:
            return AnalysisResult('clangd', file_path, '', str(e))

    def run_clang_static_analyzer_on_file(self, file_path: str) -> AnalysisResult:
        """Run Clang Static Analyzer on a single file."""
        if not self.available_tools.get('clang-static-analyzer', False):
            return AnalysisResult('clang-static-analyzer', file_path, '', 'clang static analyzer not available')
        
        try:
            temp_dir = Path("/tmp/clang_analysis")
            temp_dir.mkdir(exist_ok=True)
            compile_args = self._get_compile_args(file_path)
            
            result = subprocess.run(
                ["clang", "--analyze"] + compile_args + [file_path, 
                 "-o", str(temp_dir), "-Xanalyzer", "-analyzer-output=text"],
                capture_output=True,
                text=True,
                timeout=300,
                check=False,
            )
            output = result.stdout + result.stderr
            return AnalysisResult('clang-static-analyzer', file_path, output)
        except subprocess.TimeoutExpired:
            return AnalysisResult('clang-static-analyzer', file_path, '', 'Timeout expired')
        except Exception as e:
            return AnalysisResult('clang-static-analyzer', file_path, '', str(e))

    def _create_sanitized_compile_commands(self, tool_name: str) -> Path:
        """Create a temporary compile_commands.json with absolute paths for a specific tool."""
        original_compile_db_path = Path(self.compile_commands_dir) / 'compile_commands.json'
        
        with open(original_compile_db_path, "r") as f:
            commands = json.load(f)
        
        sanitized_commands = []
        for cmd in commands:
            directory_path = Path(cmd['directory'])
            
            # Ensure the file exists
            file_path = Path(cmd['file'])
            if not file_path.is_absolute():
                absolute_path = directory_path / file_path
            else:
                absolute_path = file_path
            
            normalized_path = Path(os.path.normpath(str(absolute_path)))
            if not normalized_path.exists():
                continue

            cmd['file'] = str(normalized_path)

            # Make all include paths absolute
            new_arguments = []
            args = cmd.get('arguments', shlex.split(cmd.get('command', '')))
            
            skip_next = False
            for i, arg in enumerate(args):
                if skip_next:
                    skip_next = False
                    continue

                if arg in ('-I', '-isystem') and i + 1 < len(args):
                    path = Path(args[i+1])
                    if not path.is_absolute():
                        path = directory_path / path
                    new_arguments.extend([arg, str(path.resolve())])
                    skip_next = True
                elif arg.startswith('-I'):
                    path = Path(arg[2:])
                    if not path.is_absolute():
                        path = directory_path / path
                    new_arguments.append(f'-I{path.resolve()}')
                elif arg.startswith('-isystem'):
                    path = Path(arg[len('-isystem'):].lstrip())
                    if not path.is_absolute():
                        path = directory_path / path
                    new_arguments.append(f'-isystem{path.resolve()}')
                else:
                    new_arguments.append(arg)
            
            if tool_name == 'xunused':
                if '-fno-pch' not in new_arguments:
                    new_arguments.append('-fno-pch')

            cmd['arguments'] = new_arguments
            if 'command' in cmd:
                cmd['command'] = ' '.join(new_arguments)

            sanitized_commands.append(cmd)
        
        temp_compile_db_path = Path(self.compile_commands_dir) / f'compile_commands.{tool_name}.json'
        with open(temp_compile_db_path, "w") as f:
            json.dump(sanitized_commands, f, indent=2)
            
        return temp_compile_db_path

    def run_cppcheck_on_project(self) -> AnalysisResult:
        """Run cppcheck on the entire project."""
        if not self.available_tools.get('cppcheck', False):
            return AnalysisResult('cppcheck', self.project_root, '', 'cppcheck not available')
            
        try:
            temp_compile_db_path = self._create_sanitized_compile_commands('cppcheck')

            command = [
                "cppcheck",
                f"--project={temp_compile_db_path}",
                "--enable=all",
                "--inconclusive",
                "--xml",
                f"-j{self.parallel_jobs}",
                "--verbose",
                "--suppress=missingIncludeSystem",
                "--suppress=unmatchedSuppression"
            ]
            
            result = subprocess.run(
                command,
                capture_output=True,
                text=True,
                timeout=600,
                check=False,
            )
            
            os.remove(temp_compile_db_path)

            output = result.stdout + result.stderr
            return AnalysisResult('cppcheck', self.project_root, output)
        except subprocess.TimeoutExpired:
            return AnalysisResult('cppcheck', self.project_root, '', 'Timeout expired')
        except Exception as e:
            return AnalysisResult('cppcheck', self.project_root, '', str(e))

    def run_ikos_on_project(self) -> AnalysisResult:
        """Run IKOS static analyzer on the entire project."""
        if not self.available_tools.get('ikos', False):
            return AnalysisResult('ikos', self.project_root, '', 'IKOS not available')

        try:
            temp_compile_db_path = self._create_sanitized_compile_commands('ikos')
            # ikos-scan does not take an output directory argument directly.
            # It creates output.db in the current working directory.
            result = subprocess.run(
                ["ikos-scan", str(temp_compile_db_path)],
                capture_output=True,
                text=True,
                timeout=1800,
                check=False,
            )
            os.remove(temp_compile_db_path)
            output = result.stdout + result.stderr
            return AnalysisResult('ikos', self.project_root, output)
        except subprocess.TimeoutExpired:
            return AnalysisResult('ikos', self.project_root, '', 'Timeout expired')
        except Exception as e:
            return AnalysisResult('ikos', self.project_root, '', str(e))

    def run_flawfinder_on_file(self, file_path: str) -> AnalysisResult:
        """Run Flawfinder on a single file."""
        if not self.available_tools.get('flawfinder', False):
            return AnalysisResult('flawfinder', file_path, '', 'Flawfinder not available')
        
        try:
            result = subprocess.run(
                ["flawfinder", "--columns", "--context", file_path],
                capture_output=True,
                text=True,
                timeout=60,
                check=False,
            )
            output = result.stdout + result.stderr
            return AnalysisResult('flawfinder', file_path, output)
        except subprocess.TimeoutExpired:
            return AnalysisResult('flawfinder', file_path, '', 'Timeout expired')
        except Exception as e:
            return AnalysisResult('flawfinder', file_path, '', str(e))

    def run_xunused_on_project(self) -> AnalysisResult:
        """Run xunused on the entire project."""
        if not self.available_tools.get('xunused', False):
            return AnalysisResult('xunused', self.project_root, '', 'xunused not available')
            
        try:
            temp_compile_db_path = self._create_sanitized_compile_commands('xunused')
            
            result = subprocess.run(
                ["xunused", "-p", str(temp_compile_db_path), f"--threads={self.single_tool_threads}"],
                capture_output=True,
                text=True,
                timeout=600,
                check=False,
            )
            
            os.remove(temp_compile_db_path)

            output = result.stdout + result.stderr
            return AnalysisResult('xunused', self.project_root, output)
        except subprocess.TimeoutExpired:
            return AnalysisResult('xunused', self.project_root, '', 'Timeout expired')
        except Exception as e:
            return AnalysisResult('xunused', self.project_root, '', str(e))

    

    def run_scan_build_on_project(self) -> AnalysisResult:
        """Run scan-build on the entire project."""
        if not self.available_tools.get('scan-build', False):
            return AnalysisResult('scan-build', self.project_root, '', 'scan-build not available')
            
        try:
            # The build directory is where compile_commands.json is located.
            # We should run the build command from there.
            build_dir = self.compile_commands_dir
            
            # We assume 'make' is the build tool. This is a common case for CMake-generated build systems.
            # We pass -k to keep going on errors, and -j to parallelize the build.
            build_command = ["make", "-k", f"-j{self.parallel_jobs}"]

            # The output directory for scan-build reports.
            output_dir = Path("/tmp/scan-build-report")
            
            # Clean up previous reports if any
            if output_dir.exists():
                shutil.rmtree(output_dir)
            output_dir.mkdir(parents=True, exist_ok=True)

            result = subprocess.run(
                ["scan-build", "--status-bugs", "-o", str(output_dir)] + build_command,
                capture_output=True,
                text=True,
                timeout=1800,  # Increased timeout for a full build
                check=False,
                cwd=build_dir
            )
            
            output = result.stdout + result.stderr
            
            # Check for report files in the output directory
            report_files = list(output_dir.glob('**/*.html'))
            if not report_files:
                output += "\nscan-build: No report files generated. The build might have failed or produced no output."

            return AnalysisResult('scan-build', self.project_root, output)
        except subprocess.TimeoutExpired:
            return AnalysisResult('scan-build', self.project_root, '', 'Timeout expired')
        except Exception as e:
            return AnalysisResult('scan-build', self.project_root, '', str(e))

    def is_file_in_project_root(self, file_path: str) -> bool:
        """Check if file_path is within project_root or its subdirectories."""
        try:
            file_path = Path(file_path).resolve()
            project_root = Path(self.project_root).resolve()
            file_path.relative_to(project_root)
            return True
        except ValueError:
            return False

    def get_source_files(self) -> List[str]:
        """Get list of C++ source files from compile_commands.json."""
        cpp_extensions = {'.cpp', '.cxx', '.cc', '.c++', '.C', '.c', '.h', '.hpp', '.hxx', '.h++'}
        
        filtered_files = []
        for file_path, entry in self.compile_commands.items():
            abs_path = os.path.abspath(os.path.join(entry['directory'], entry['file']))
            if (os.path.exists(abs_path) and
                Path(abs_path).suffix in cpp_extensions and
                self.is_file_in_project_root(abs_path)):
                filtered_files.append(abs_path)

        logging.info(f"Found {len(self.compile_commands)} files in compile_commands.json")
        logging.info(f"Filtered to {len(filtered_files)} C++ files within {self.project_root}")
        
        return list(set(filtered_files))

    def analyze_all_files(self, output_file: str = "cpp_analysis_report.txt") -> str:
        """Analyze all files and generate consolidated report."""
        output_file_path = Path(output_file).resolve()
        logging.info(f"Starting comprehensive C++ analysis")
        logging.info(f"Output report will be saved to: {output_file_path}")
        
        source_files = self.get_source_files()
        if not source_files:
            logging.warning("No C++ source files found to analyze")
            return str(output_file_path)

        all_results = []
        
        # Define per-file and project-wide tools
        per_file_tools = {
            'clangd': self.run_clangd_check_on_file,
            'clang-static-analyzer': self.run_clang_static_analyzer_on_file,
            'flawfinder': self.run_flawfinder_on_file
        }
        
        project_tools = {
            'cppcheck': self.run_cppcheck_on_project,
            'ikos': self.run_ikos_on_project,
            'xunused': self.run_xunused_on_project,
            'scan-build': self.run_scan_build_on_project
        }

        with concurrent.futures.ThreadPoolExecutor(max_workers=self.parallel_jobs) as executor:
            futures = []

            # Submit project-wide tasks
            for name, tool_func in project_tools.items():
                if self.available_tools.get(name):
                    futures.append(executor.submit(tool_func))

            # Submit per-file tasks
            for name, tool_func in per_file_tools.items():
                if self.available_tools.get(name):
                    for source_file in source_files:
                        futures.append(executor.submit(tool_func, source_file))

            for future in concurrent.futures.as_completed(futures):
                try:
                    result = future.result()
                    if isinstance(result, list):
                        all_results.extend(result)
                    else:
                        all_results.append(result)
                except Exception as e:
                    logging.error(f"Analysis task failed: {e}")

        self._generate_report(all_results, output_file_path, source_files)
        
        logging.info(f"Comprehensive analysis completed successfully")
        return str(output_file_path)

    def _generate_report(self, results: List[AnalysisResult], output_path: Path, source_files: List[str]):
        """Generate the consolidated analysis report."""
        with open(output_path, "w") as report:
            report.write("# Comprehensive C++ Static Analysis Report\n\n")
            report.write(f"**Generated:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
            report.write(f"**Project Root:** {self.project_root}\n")
            report.write(f"**Compile Commands:** {self.compile_commands_dir}\n")
            report.write(f"**Files Analyzed:** {len(source_files)}\n")
            report.write(f"**Parallel Jobs:** {self.parallel_jobs}\n\n")

            report.write("## Tool Availability\n\n")
            for tool, available in self.available_tools.items():
                status = "✓ Available" if available else "✗ Not Available"
                report.write(f"- **{tool}**: {status}\n")
            report.write("\n")

            tool_stats = {}
            files_with_issues = set()
            
            for result in results:
                if result.tool_name not in tool_stats:
                    tool_stats[result.tool_name] = {'total': 0, 'with_issues': 0}
                
                tool_stats[result.tool_name]['total'] += 1
                if result.has_issues or result.error:
                    tool_stats[result.tool_name]['with_issues'] += 1
                    files_with_issues.add(result.file_path)

            report.write("## Summary Statistics\n\n")
            report.write(f"- **Total Files:** {len(source_files)}\n")
            report.write(f"- **Files with Issues:** {len(files_with_issues)}\n")
            report.write(f"- **Clean Files:** {len(source_files) - len(files_with_issues)}\n\n")

            report.write("### Issues by Tool\n\n")
            for tool, stats in sorted(tool_stats.items()):
                if stats['total'] > 0:
                    percentage = (stats['with_issues'] / stats['total']) * 100 if stats['total'] > 0 else 0
                    report.write(f"- **{tool}**: {stats['with_issues']}/{stats['total']} files ({percentage:.1f}%)\n")
            report.write("\n")

            results_by_file = {}
            for result in results:
                if result.file_path not in results_by_file:
                    results_by_file[result.file_path] = []
                results_by_file[result.file_path].append(result)

            report.write("## Detailed Analysis Results\n\n")
            
            for file_path in sorted(results_by_file.keys()):
                file_results = results_by_file[file_path]
                has_any_issues = any(r.has_issues or r.error for r in file_results)
                
                if has_any_issues:
                    report.write(f"### 🔍 {file_path}\n\n")
                    
                    for result in sorted(file_results, key=lambda r: r.tool_name):
                        if result.has_issues or result.error:
                            report.write(f"#### {result.tool_name}\n\n")
                            if result.error:
                                report.write(f"**Error:** {result.error}\n\n")
                            else:
                                report.write("```\n")
                                report.write(result.output.strip())
                                report.write("\n```\n\n")
                    
                    report.write("---\n\n")

            clean_files = [f for f in source_files if f not in files_with_issues]
            if clean_files:
                report.write("## Clean Files (No Issues Found)\n\n")
                for file_path in sorted(clean_files):
                    report.write(f"- {file_path}\n")
                report.write("\n")

def main():
    """Parse command-line arguments and run the analysis."""
    parser = argparse.ArgumentParser(
        description="Comprehensive C++ static analysis using multiple tools",
        epilog="""
Tools included:
- clangd: Language server diagnostics
- clang-tidy: Clang-based linter
- Clang Static Analyzer: Static analysis
- cppcheck: Static analysis tool
- IKOS: Inferencing Kernel for Open Static Analysis
- Flawfinder: Security-focused static analysis
- xunused: Finds unused code
- scan-build: Clang static analyzer wrapper

Example usage:
  ./cpp_analyze.py [options] /path/to/src /path/to/build

Positional Arguments:
  /path/to/src              Path to the project's source root directory.
  /path/to/build            Path to the build directory containing compile_commands.json.

Optional Arguments:
  -h, --help                Show this help message and exit.
  -o, --output FILE         Output file for the consolidated report.
  -j, --parallel N          Number of parallel analysis jobs (default: number of available CPU cores).
  -v, --verbose             Enable verbose logging.
        """,
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    
    parser.add_argument(
        "project_root",
        help="Path to project root directory"
    )
    parser.add_argument(
        "build_dir",
        help="Path to the directory containing compile_commands.json"
    )
    parser.add_argument(
        "--output", "-o",
        default="cpp_analysis_report.txt",
        help="Output file for the consolidated report (default: cpp_analysis_report.txt)"
    )
    parser.add_argument(
        "--parallel", "-j",
        type=int,
        default=None,
        help="Number of parallel analysis jobs (default: number of available CPU cores)."
    )
    parser.add_argument(
        "--verbose", "-v",
        action="store_true",
        help="Enable verbose logging"
    )

    args = parser.parse_args()
    
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)

    try:
        analyzer = CppAnalyzer(args.build_dir, args.project_root, args.parallel)
        output_file = analyzer.analyze_all_files(args.output)
        print(f"\n✅ Comprehensive C++ analysis completed successfully!")
        print(f"📊 Report saved to: {output_file}")
        
    except FileNotFoundError as e:
        logging.error(f"File not found: {e}")
        print(f"❌ Error: {e}")
        return 1
    except ValueError as e:
        logging.error(f"Invalid input: {e}")
        print(f"❌ Error: {e}")
        return 1
    except Exception as e:
        logging.error(f"Unexpected error: {e}", exc_info=True)
        print(f"❌ Unexpected error: {e}")
        return 1
        
    return 0

if __name__ == "__main__":
    exit(main())