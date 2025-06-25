import lldb
import time
import os

def export_crash_info(debugger, process, output_file="crash_report.txt"):
    """Export detailed backtrace and crash information to a text file."""
    print(f"DEBUG: Exporting crash information to {output_file}")
    
    try:
        with open(output_file, "w") as f:
            # Write timestamp
            f.write(f"Crash Report Generated: {time.strftime('%Y-%m-%d %H:%M:%S')}\n")
            f.write("=" * 80 + "\n\n")
            
            # Process information
            target = debugger.GetSelectedTarget()
            f.write(f"Process ID: {process.GetProcessID()}\n")
            f.write(f"Process State: {lldb.LLDBGetStateTypeString(process.GetState())}\n")
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
            print(f"Crash information exported to {output_file}")
            
    except Exception as e:
        print(f"ERROR: Failed to export crash info: {str(e)}")

def exit_lldb(debugger):
    """Exit the LLDB debugger."""
    print("DEBUG: Exiting LLDB")
    try:
        debugger.HandleCommand("quit")
    except Exception as e:
        print(f"ERROR: Failed to exit LLDB: {str(e)}")

def kill_if_timeout(debugger, process, timeout=120):
    """Monitor the process and kill it if it doesn't exit within the specified timeout."""
    print(f"DEBUG: Entering kill_if_timeout with timeout={timeout} seconds")

    listener = debugger.GetListener()
    broadcaster = process.GetBroadcaster()
    start_time = time.time()

    while True:
        elapsed_time = time.time() - start_time
        process_state = process.GetState()

        print(f"DEBUG: Process state={lldb.LLDBGetStateTypeString(process_state)}, elapsed_time={elapsed_time:.2f}s")

        if process_state == lldb.eStateStopped:
            print("DEBUG: Process stopped (possible crash)")
            export_crash_info(debugger, process)
            exit_lldb(debugger)
            return
        elif process_state == lldb.eStateExited:
            print("DEBUG: Process exited naturally")
            exit_lldb(debugger)
            return
        elif elapsed_time >= timeout:
            print(f"Process did not exit within {timeout} seconds. Killing...")
            export_crash_info(debugger, process)  # Export info before killing
            result = process.Kill()
            if result.Success():
                print("DEBUG: Process killed successfully")
            else:
                print(f"ERROR: Failed to kill process: {result.GetError()}")
            exit_lldb(debugger)
            return

        event = lldb.SBEvent()
        if listener.WaitForEvent(1, event):
            if lldb.SBProcess.EventIsProcessEvent(event):
                new_state = lldb.SBProcess.GetStateFromEvent(event)
                print(f"DEBUG: Process event received, new state={lldb.LLDBGetStateTypeString(new_state)}")
                if new_state == lldb.eStateStopped:
                    print("DEBUG: Process stopped (possible crash) via event")
                    export_crash_info(debugger, process)
                    exit_lldb(debugger)
                    return
                elif new_state == lldb.eStateExited:
                    print("DEBUG: Process exited naturally via event")
                    exit_lldb(debugger)
                    return

def setup_timeout(debugger, command, result, internal_dict):
    """Set up the timeout mechanism."""
    print("DEBUG: Entering setup_timeout")
    target = debugger.GetSelectedTarget()
    if not target:
        print("ERROR: No target selected.")
        result.SetError("No target selected.")
        return

    process = target.GetProcess()
    if not process:
        print("ERROR: No process available.")
        result.SetError("No process available.")
        return

    print("DEBUG: Starting kill_if_timeout")
    kill_if_timeout(debugger, process)
    print(f"Timeout of 120 seconds set. Process will be killed if it doesn't exit.")

def __lldb_init_module(debugger, internal_dict):
    """Entry point for LLDB to load the script."""
    print("DEBUG: Entering __lldb_init_module")
    try:
        print("DEBUG: Adding timeout command")
        debugger.HandleCommand('command script add -f lldb_timeout.setup_timeout timeout')
        print("Timeout script loaded. Use the 'timeout' command to activate the 120-second timeout.")
    except Exception as e:
        print(f"ERROR: Exception in __lldb_init_module: {str(e)}")