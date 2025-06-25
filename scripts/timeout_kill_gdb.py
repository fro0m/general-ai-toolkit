import gdb
import time
import threading
import signal
import os

class TimeoutKiller:
    """Class to handle timeout functionality for GDB processes."""
    
    def __init__(self, timeout=120):
        self.timeout = timeout
        self.start_time = None
        self.timer_thread = None
        self.process_running = False
        self.killed = False
        
    def start_timeout(self):
        """Start the timeout monitoring."""
        print(f"DEBUG: Starting timeout monitor with {self.timeout} seconds timeout")
        self.start_time = time.time()
        self.process_running = True
        self.killed = False
        
        # Start timer thread
        self.timer_thread = threading.Thread(target=self._timeout_monitor)
        self.timer_thread.daemon = True
        self.timer_thread.start()
        
    def stop_timeout(self):
        """Stop the timeout monitoring."""
        print("DEBUG: Stopping timeout monitor")
        self.process_running = False
        
    def _timeout_monitor(self):
        """Monitor the process and kill if timeout is reached."""
        while self.process_running and not self.killed:
            elapsed_time = time.time() - self.start_time
            
            if elapsed_time >= self.timeout:
                print(f"Process did not exit within {self.timeout} seconds. Killing...")
                self._kill_process()
                break
                
            time.sleep(1)  # Check every second
            
    def _kill_process(self):
        """Kill the current process being debugged."""
        try:
            # Try to get the inferior (process being debugged)
            inferior = gdb.selected_inferior()
            if inferior and inferior.pid:
                print(f"DEBUG: Killing process with PID {inferior.pid}")
                # Use GDB's kill command
                gdb.execute("kill", to_string=True)
                self.killed = True
                print("DEBUG: Process killed successfully")
            else:
                print("ERROR: No inferior process found to kill")
        except Exception as e:
            print(f"ERROR: Failed to kill process: {str(e)}")

# Global timeout killer instance
timeout_killer = TimeoutKiller()

class RunWithTimeoutCommand(gdb.Command):
    """GDB command to run program with timeout."""
    
    def __init__(self):
        super(RunWithTimeoutCommand, self).__init__("run-timeout", gdb.COMMAND_RUNNING)
        
    def invoke(self, argument, from_tty):
        """Execute the run command with timeout monitoring."""
        print("DEBUG: Starting run with timeout")
        
        # Start timeout monitoring
        timeout_killer.start_timeout()
        
        try:
            # Execute the run command
            print("DEBUG: Executing run command")
            gdb.execute("run " + argument)
            
        except gdb.error as e:
            print(f"GDB Error: {str(e)}")
        except Exception as e:
            print(f"ERROR: Exception during run: {str(e)}")
        finally:
            # Stop timeout monitoring
            timeout_killer.stop_timeout()
            
        print("DEBUG: Run with timeout completed")

class ContinueWithTimeoutCommand(gdb.Command):
    """GDB command to continue program with timeout."""
    
    def __init__(self):
        super(ContinueWithTimeoutCommand, self).__init__("continue-timeout", gdb.COMMAND_RUNNING)
        
    def invoke(self, argument, from_tty):
        """Execute the continue command with timeout monitoring."""
        print("DEBUG: Starting continue with timeout")
        
        # Start timeout monitoring
        timeout_killer.start_timeout()
        
        try:
            # Execute the continue command
            print("DEBUG: Executing continue command")
            gdb.execute("continue")
            
        except gdb.error as e:
            print(f"GDB Error: {str(e)}")
        except Exception as e:
            print(f"ERROR: Exception during continue: {str(e)}")
        finally:
            # Stop timeout monitoring
            timeout_killer.stop_timeout()
            
        print("DEBUG: Continue with timeout completed")

class SetTimeoutCommand(gdb.Command):
    """GDB command to set timeout value."""
    
    def __init__(self):
        super(SetTimeoutCommand, self).__init__("set-timeout", gdb.COMMAND_DATA)
        
    def invoke(self, argument, from_tty):
        """Set the timeout value."""
        try:
            timeout_value = int(argument.strip())
            timeout_killer.timeout = timeout_value
            print(f"Timeout set to {timeout_value} seconds")
        except ValueError:
            print("ERROR: Invalid timeout value. Please provide an integer.")

# Event handlers
def on_exited_event(event):
    """Handle process exit events."""
    print("DEBUG: Process exited event received")
    timeout_killer.stop_timeout()

def on_stop_event(event):
    """Handle process stop events."""
    print("DEBUG: Process stopped event received")
    # Don't stop timeout on breakpoints, only on exit

# Register event handlers
try:
    gdb.events.exited.connect(on_exited_event)
    gdb.events.stop.connect(on_stop_event)
except AttributeError:
    # Older GDB versions might not have these events
    print("WARNING: Event handling not available in this GDB version")

# Register commands
RunWithTimeoutCommand()
ContinueWithTimeoutCommand()
SetTimeoutCommand()

print("Timeout script for GDB loaded.")
print("Available commands:")
print("  run-timeout [args]     - Run program with timeout monitoring")
print("  continue-timeout       - Continue program with timeout monitoring") 
print("  set-timeout <seconds>  - Set timeout value (default: 120 seconds)")
