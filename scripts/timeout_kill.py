import lldb
import time
import os
import threading

# Global flag to prevent duplicate crash reports
_crash_report_generated = False

def export_crash_info(debugger, process, output_file="crash_report.txt", show_backtrace=True):
    """Export detailed backtrace and crash information to a text file."""
    global _crash_report_generated
    
    if _crash_report_generated:
        return
    
    _crash_report_generated = True
    
    # Get the full path for the crash report
    full_path = os.path.abspath(output_file)
    print(f"Generating crash report: {full_path}")
    
    # First, execute backtrace command in lldb to show it in console (if process is still valid and requested)
    if show_backtrace and process and process.IsValid() and process.GetState() != lldb.eStateExited:
        print("=== BACKTRACE ===")
        debugger.HandleCommand("bt")
        print("=== END BACKTRACE ===")
    
    try:
        with open(output_file, "w") as f:
            # Write timestamp
            f.write(f"Crash Report Generated: {time.strftime('%Y-%m-%d %H:%M:%S')}\n")
            f.write("=" * 80 + "\n\n")
            
            # Process information
            target = debugger.GetSelectedTarget()
            f.write(f"Process ID: {process.GetProcessID()}\n")
            f.write(f"Process State: {process.GetState()}\n")
            f.write(f"Target Architecture: {target.GetTriple()}\n")
            f.write("-" * 80 + "\n\n")
            
            # Thread information and backtraces
            f.write("Thread Information:\n")
            for thread in process:
                f.write(f"\nThread {thread.GetIndexID()} (ID: {thread.GetThreadID()}):\n")
                f.write(f"  Stop Reason: {thread.GetStopReason()}\n")
                f.write(f"  Stop Description: {thread.GetStopDescription(256)}\n")
                
                # Frame information
                f.write("  Backtrace:\n")
                for frame in thread:
                    f.write(f"    Frame {frame.GetFrameID()}: {frame}\n")
                    f.write(f"      PC: {frame.GetPCAddress()}\n")
                    f.write(f"      Function: {frame.GetFunctionName() or 'Unknown'}\n")
                    if frame.GetLineEntry().IsValid():
                        f.write(f"      Source: {frame.GetLineEntry().GetFileSpec().GetFilename()}:{frame.GetLineEntry().GetLine()}\n")
                    f.write(f"      Module: {frame.GetModule().GetFileSpec().GetFilename() if frame.GetModule() else 'Unknown'}\n")
            
            f.write("=" * 80 + "\n")
            print(f"Crash report saved to: {full_path}")
            
    except Exception as e:
        print(f"ERROR: Failed to export crash info: {str(e)}")

def exit_lldb(debugger):
    """Exit the LLDB debugger."""
    try:
        # First try to kill any remaining processes to avoid confirmation prompt
        target = debugger.GetSelectedTarget()
        if target:
            process = target.GetProcess()
            if process and process.IsValid() and process.GetState() != lldb.eStateExited:
                process.Kill()
        
        # Use quit command without confirmation
        debugger.HandleCommand("settings set auto-confirm true")
        debugger.HandleCommand("quit")
    except Exception as e:
        print(f"ERROR: Failed to exit LLDB: {str(e)}")
        # Force exit by raising SystemExit
        import sys
        sys.exit(0)

def check_process_state(debugger, process):
    """Check if the process has already stopped or crashed."""
    process_state = process.GetState()
    
    if process_state == lldb.eStateStopped:
        # Check if any thread stopped due to a signal (crash)
        crashed = False
        for thread in process:
            stop_reason = thread.GetStopReason()
            
            if stop_reason == lldb.eStopReasonSignal:
                signal = thread.GetStopReasonDataAtIndex(0)
                print(f"Process crashed with signal: {signal}")
                crashed = True
                break
            elif stop_reason == lldb.eStopReasonException:
                print("Process stopped due to exception")
                crashed = True
                break
        
        if crashed:
            export_crash_info(debugger, process)
            # Schedule exit after a short delay to allow output to complete
            def delayed_exit():
                time.sleep(2)
                exit_lldb(debugger)
            
            exit_thread = threading.Thread(target=delayed_exit)
            exit_thread.daemon = True
            exit_thread.start()
            return True
    
    elif process_state == lldb.eStateExited:
        exit_lldb(debugger)
        return True
    
    return False

def kill_if_timeout(debugger, process, timeout=60):
    """Monitor the process and kill it if it doesn't exit within the specified timeout."""
    
    # First check if process has already stopped/crashed
    if check_process_state(debugger, process):
        return

    listener = debugger.GetListener()
    broadcaster = process.GetBroadcaster()
    listener.StartListeningForEvents(broadcaster, lldb.SBProcess.eBroadcastBitStateChanged)
    
    start_time = time.time()

    while True:
        elapsed_time = time.time() - start_time
        process_state = process.GetState()

        if process_state == lldb.eStateStopped:
            # Check if stopped due to a signal
            crashed = False
            for thread in process:
                stop_reason = thread.GetStopReason()
                if stop_reason == lldb.eStopReasonSignal:
                    signal = thread.GetStopReasonDataAtIndex(0)
                    print(f"Process crashed with signal: {signal}")
                    crashed = True
                    break
                elif stop_reason == lldb.eStopReasonException:
                    print("Process stopped due to exception")
                    crashed = True
                    break
            
            export_crash_info(debugger, process)
            exit_lldb(debugger)
            return
            
        elif process_state == lldb.eStateExited:
            exit_lldb(debugger)
            return
            
        elif elapsed_time >= timeout:
            print(f"Process timeout after {timeout} seconds. Terminating...")
            
            # First, try to interrupt the process to get a backtrace
            print("=== BACKTRACE ===")
            try:
                # Interrupt the running process
                result = process.Stop()
                if result.Success():
                    # Wait a moment for the stop to take effect
                    time.sleep(0.5)
                    # Now get the backtrace while process is stopped
                    debugger.HandleCommand("bt")
                else:
                    print("Could not interrupt process for backtrace")
            except Exception as e:
                print(f"Error getting backtrace: {str(e)}")
            print("=== END BACKTRACE ===")
            
            # Export crash info (without trying backtrace again since we already did it)
            export_crash_info(debugger, process, show_backtrace=False)
            
            # Now kill the process
            result = process.Kill()
            if result.Success():
                print("Process terminated successfully")
            else:
                print(f"ERROR: Failed to terminate process: {result.GetError()}")
            exit_lldb(debugger)
            return

        # Wait for events with a longer timeout for efficiency
        event = lldb.SBEvent()
        if listener.WaitForEvent(5, event):  # Wait up to 5 seconds for events
            if lldb.SBProcess.EventIsProcessEvent(event):
                new_state = lldb.SBProcess.GetStateFromEvent(event)
                
                if new_state == lldb.eStateStopped:
                    # Check if stopped due to a signal
                    crashed = False
                    for thread in process:
                        stop_reason = thread.GetStopReason()
                        if stop_reason == lldb.eStopReasonSignal:
                            signal = thread.GetStopReasonDataAtIndex(0)
                            print(f"Process crashed with signal: {signal}")
                            crashed = True
                            break
                        elif stop_reason == lldb.eStopReasonException:
                            print("Process stopped due to exception")
                            crashed = True
                            break
                    
                    export_crash_info(debugger, process)
                    exit_lldb(debugger)
                    return
                    
                elif new_state == lldb.eStateExited:
                    exit_lldb(debugger)
                    return

def setup_timeout(debugger, command, result, internal_dict):
    """Set up the timeout mechanism."""
    target = debugger.GetSelectedTarget()
    if not target:
        print("ERROR: No target selected.")
        if result:
            result.SetError("No target selected.")
        return

    process = target.GetProcess()
    if not process:
        print("ERROR: No process available.")
        if result:
            result.SetError("No process available.")
        return
    
    def monitor_process():
        try:
            kill_if_timeout(debugger, process)
        except Exception as e:
            print(f"ERROR: Exception in monitor_process: {str(e)}")
            exit_lldb(debugger)
    
    # Run monitoring in a background thread to avoid blocking lldb
    monitor_thread = threading.Thread(target=monitor_process)
    monitor_thread.daemon = True
    monitor_thread.start()
    
    print(f"Process monitoring active (timeout: 60 seconds)")

def auto_activate():
    """Automatically activate the timeout script when imported."""
    try:
        # Get the current debugger instance
        debugger = lldb.debugger
        if not debugger:
            return
        
        target = debugger.GetSelectedTarget()
        
        if target:
            process = target.GetProcess()
            if process and process.IsValid():
                setup_timeout(debugger, None, None, None)
                return
        
        # Set up monitoring that will activate when a process starts
        def delayed_monitor():
            max_wait = 30  # Wait up to 30 seconds for a process to start
            wait_interval = 0.5
            waited = 0
            
            while waited < max_wait:
                try:
                    target = debugger.GetSelectedTarget()
                    if target:
                        process = target.GetProcess()
                        if process and process.IsValid() and process.GetState() != lldb.eStateInvalid:
                            setup_timeout(debugger, None, None, None)
                            return
                except:
                    pass
                
                time.sleep(wait_interval)
                waited += wait_interval
        
        # Run delayed monitoring in background thread
        monitor_thread = threading.Thread(target=delayed_monitor)
        monitor_thread.daemon = True
        monitor_thread.start()
        
    except Exception as e:
        print(f"ERROR: Exception in auto_activate: {str(e)}")

def __lldb_init_module(debugger, internal_dict):
    """Entry point for LLDB to load the script."""
    try:
        debugger.HandleCommand('command script add -f timeout_kill.setup_timeout timeout')
        # Automatically invoke timeout command after script load
        debugger.HandleCommand('timeout')
        print("Timeout script loaded and activated. Monitoring process with 60-second timeout.")
    except Exception as e:
        print(f"ERROR: Exception in __lldb_init_module: {str(e)}")

# Auto-activate when imported directly (not as an lldb script)
if __name__ != '__main__':
    try:
        # Check if we're in an lldb context
        if 'lldb' in globals() and hasattr(lldb, 'debugger'):
            auto_activate()
    except:
        pass  # Silently fail if not in lldb context