import sys
import os

# Add the parent directory to sys.path to import app
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.game_mechanics import calculate_level, get_level_threshold

def verify():
    print("--- Verification ---")
    
    # Check Level 2 Threshold
    l2_threshold = get_level_threshold(2)
    print(f"Level 2 Threshold: {l2_threshold} (Expected: 120 with new multiplier, was 200)")

    # Check Level 3 Threshold (Plant Upgrade)
    l3_threshold = get_level_threshold(3)
    print(f"Level 3 Threshold: {l3_threshold} (Expected: 300 with new multiplier, was 500)")

    # Check Specific Point 299 XP
    level_299 = calculate_level(299)
    print(f"Level at 299 XP: {level_299} (Expected: 2)")

    # Check Specific Point 300 XP
    level_300 = calculate_level(300)
    print(f"Level at 300 XP: {level_300} (Expected: 3)")

if __name__ == "__main__":
    verify()
