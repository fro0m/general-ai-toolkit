#!/usr/bin/env python3
"""
Auto Inserter - Automated keyboard task execution at regular intervals
"""
import time
import schedule
from pynput.keyboard import Key, Controller
from loguru import logger

# Define constants
MAX_ITERATIONS = 40  # Maximum number of iterations to perform
TIMEOUT = 5*60 #seconds
# Configure logger
logger.add("auto_inserter.log", rotation="10 MB", level="INFO")


class KeyboardAutomation:
    """Class to handle keyboard automation tasks"""
    
    def __init__(self):
        """Initialize keyboard controller"""
        self.keyboard = Controller()
        logger.info("Keyboard automation initialized")
        
    def press_key(self, key):
        """Press a single key"""
        self.keyboard.press(key)
        self.keyboard.release(key)
        logger.debug(f"Pressed key: {key}")
        time.sleep(0.1)  # Small delay for stability
        
    def press_combination(self, *keys):
        """Press a combination of keys"""
        for key in keys:
            self.keyboard.press(key)
            
        for key in reversed(keys):
            self.keyboard.release(key)
            
        logger.debug(f"Pressed key combination: {keys}")
        time.sleep(0.1)  # Small delay for stability
        
    def type_text(self, text):
        """Type a text string"""
        self.keyboard.type(text)
        logger.debug(f"Typed text: {text}")
        
    def execute_task_sequence(self):
        """Execute the defined sequence of keyboard actions"""
        try:
            logger.info("Starting task sequence execution")
            
            # vs code
            #
            self.press_combination(Key.ctrl, 'a') # select text
            time.sleep(1)  # 1 second delay

            text = "Continue executing the current task if it exists or do tasks on the dartboard AutoPrompter/HardTasks iteratively until no uncompleted tasks left. Use build_run_rules.instructions.md , general.instructions.md and product_requirements_design.instructions.md files."
            logger.info(f"Typing text: {text}")
            self.type_text(text)
            time.sleep(1)  # 1 second delay

            logger.info("Pressing Enter")
            self.press_key(Key.enter)
            time.sleep(1)  # 1 second delay


            # cursor

            # logger.info("Pressing Escape")
            # self.press_key(Key.esc)
            # time.sleep(3)  # 1 second delay
            #
            # # logger.info("Pressing Alt+Ctrl+i")
            # self.press_combination(Key.ctrl, 'l')
            # time.sleep(5)  # 1 second delay
            #
            #
            # self.press_combination(Key.shift, Key.home) # select text
            # time.sleep(1)
            #
            # # Type the specified text
            # text = "Continue executing the current task if it exists or do tasks on the dartboard recursively until no uncompleted tasks left. Use all crsor rules files"
            # logger.info(f"Typing text: {text}")
            # self.type_text(text)
            # time.sleep(5)  # 1 second delay
            # # Press Escape again
            # logger.info("Pressing Enter")
            # self.press_key(Key.enter)
            # time.sleep(1)  # 1 second delay
            #
            #
            # # Press Escape again
            # logger.info("Pressing Escape")
            # self.press_key(Key.esc)
# #
#             logger.info("Task sequence completed successfully")
            
        except Exception as e:
            logger.error(f"Error executing task sequence: {e}")


def main():
    """Main function to run the automated task scheduler"""
    logger.info("Auto Inserter started")
    
    try:
        automation = KeyboardAutomation()
    
        logger.info(f"Waiting {10} sec before initial sequence")
        time.sleep(10)
    
        # Counter for iterations
        iterations = 0
        
        # Execute the task sequence MAX_ITERATIONS times
        while iterations < MAX_ITERATIONS:
            # Run the task
            iterations += 1
            logger.info(f"Starting iteration {iterations}/{MAX_ITERATIONS}")
            automation.execute_task_sequence()
            logger.info(f"Iteration {iterations}/{MAX_ITERATIONS} completed")
            
            # Check if we've reached the maximum iterations
            if iterations >= MAX_ITERATIONS:
                logger.info(f"Maximum iterations ({MAX_ITERATIONS}) reached. Exiting.")
                break
                
            # Wait for minutes before the next iteration
            if iterations < MAX_ITERATIONS:
                logger.info(f"Waiting {TIMEOUT/60} minutes before next iteration")
                time.sleep(TIMEOUT)
                
    except KeyboardInterrupt:
        logger.info("Auto Inserter stopped by user")
    except Exception as e:
        logger.error(f"Error in main loop: {e}")
    finally:
        logger.info("Auto Inserter stopped")
    
if __name__ == "__main__":
    main()
