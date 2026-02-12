
def calculate_level(total_xp: int) -> int:
    """Calculate level from total XP. Each level requires level * 100 XP."""
    level = 1
    xp_needed = 0
    
    while xp_needed <= total_xp:
        level += 1
        xp_needed += level * 100
    
    return level - 1


def get_level_threshold(level: int) -> int:
    """Get the XP threshold for a given level."""
    total = 0
    for i in range(2, level + 1):
        total += i * 100
    return total


def get_plant_stage(level: int) -> int:
    """Determine plant stage based on level."""
    if level <= 2:
        return 1
    elif level <= 4:
        return 2
    elif level <= 7:
        return 3
    elif level <= 10:
        return 4
    elif level <= 15:
        return 5
    elif level <= 20:
        return 6
    else:
        return 7


def calculate_xp(co2_saved_kg: float, category: str) -> int:
    """
    Calculate XP based on CO2 savings and category.
    """
    base_xp = 10
    co2_xp = min(int(co2_saved_kg * 5), 40)
    
    category_bonuses = {
        "transportation": 10,
        "food": 5,
        "energy": 5,
        "shopping": 5
    }
    
    total_xp = base_xp + co2_xp + category_bonuses.get(category, 0)
    return min(total_xp, 50)  # Cap at 50


def get_plant_stage_levels() -> dict:
    """Return level thresholds for plant stages."""
    return {
        1: 2,   # Stage 1 ends at level 2
        2: 4,   # Stage 2 ends at level 4
        3: 7,   # Stage 3 ends at level 7
        4: 10,  # Stage 4 ends at level 10
        5: 15,  # Stage 5 ends at level 15
        6: 20,  # Stage 6 ends at level 20
        7: 999  # Stage 7 is max
    }
