#!/usr/bin/env python3
"""
Test script for the keyboard automation. Just executes the tasks sequence once.
"""
import time
from auto-inserter.main import KeyboardAutomation


def main():
    print("Starting keyboard automation test...")
    print("You have 5 seconds to focus on the right window...")
    time.sleep(5)
    
    automation = KeyboardAutomation()
    automation.execute_task_sequence()
    
    print("Test completed!")


if __name__ == "__main__":
    main()
