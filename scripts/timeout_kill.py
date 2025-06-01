import lldb
import time

def kill_if_timeout(debugger, process, timeout=30):
    """Monitor the process and kill it if it doesn't exit within the specified timeout."""
    print(f"DEBUG: Entering kill_if_timeout with timeout={timeout} seconds")

    # Create an event listener to monitor process state changes
    listener = debugger.GetListener()
    broadcaster = process.GetBroadcaster()

    # Start time for timeout tracking
    start_time = time.time()

    # Poll until timeout or process exits
    while True:
        elapsed_time = time.time() - start_time
        process_state = process.GetState()

        print(f"DEBUG: Process state={lldb.LLDBGetStateTypeString(process_state)}, elapsed_time={elapsed_time:.2f}s")

        if process_state == lldb.eStateExited:
            print("DEBUG: Process exited naturally")
            return
        elif elapsed_time >= timeout:
            print(f"Process did not exit within {timeout} seconds. Killing...")
            result = process.Kill()
            if result.Success():
                print("DEBUG: Process killed successfully")
            else:
                print(f"ERROR: Failed to kill process: {result.GetError()}")
            return

        # Wait for a process event (with a short timeout to allow checking elapsed time)
        event = lldb.SBEvent()
        if listener.WaitForEvent(1, event):  # Wait up to 1 second for an event
            if lldb.SBProcess.EventIsProcessEvent(event):
                new_state = lldb.SBProcess.GetStateFromEvent(event)
                print(f"DEBUG: Process event received, new state={lldb.LLDBGetStateTypeString(new_state)}")
                if new_state == lldb.eStateExited:
                    print("DEBUG: Process exited naturally via event")
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

    # Start the timeout mechanism
    print("DEBUG: Starting kill_if_timeout")
    kill_if_timeout(debugger, process)
    print(f"Timeout of 30 seconds set. Process will be killed if it doesn't exit.")

def __lldb_init_module(debugger, internal_dict):
    """Entry point for LLDB to load the script."""
    print("DEBUG: Entering __lldb_init_module")
    try:
        # Add the 'timeout' command
        print("DEBUG: Adding timeout command")
        debugger.HandleCommand('command script add -f lldb_timeout.setup_timeout timeout')
        print("Timeout script loaded. Use the 'timeout' command to activate the 30-second timeout.")
    except Exception as e:
        print(f"ERROR: Exception in __lldb_init_module: {str(e)}")
