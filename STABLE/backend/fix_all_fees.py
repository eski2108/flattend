#!/usr/bin/env python3
"""
Fix all fee collection points to use PLATFORM_FEES instead of ADMIN
"""

import re

# Read the server.py file
with open('/app/backend/server.py', 'r') as f:
    content = f.read()

original_content = content

# Pattern 1: Fix instant_sell_fees going to ADMIN
pattern1 = r'\{"user_id": "ADMIN", "currency": "GBP"\},\s*\{"\$inc": \{"instant_sell_fees":'
content = re.sub(pattern1, '{"user_id": "PLATFORM_FEES", "currency": "GBP"},\n            {"$inc": {"instant_sell_fees":', content)

# Pattern 2: Fix instant_buy_fees going to ADMIN
pattern2 = r'\{"user_id": "ADMIN", "currency": "GBP"\},\s*\{"\$inc": \{"instant_buy_fees":'
content = re.sub(pattern2, '{"user_id": "PLATFORM_FEES", "currency": "GBP"},\n            {"$inc": {"instant_buy_fees":', content)

# Pattern 3: Fix express_buy_profit going to ADMIN
pattern3 = r'\{"user_id": "ADMIN", "currency": "GBP"\},\s*\{"\$inc": \{"express_buy_profit":'
content = re.sub(pattern3, '{"user_id": "PLATFORM_FEES", "currency": "GBP"},\n            {"$inc": {"express_buy_profit":', content)

# Pattern 4: Fix balance increments to ADMIN for fees
pattern4 = r'\{"user_id": "ADMIN", "currency": "GBP"\},\s*\{"\$inc": \{"balance":'
content = re.sub(pattern4, '{"user_id": "PLATFORM_FEES", "currency": "GBP"},\n            {"$inc": {"balance":', content)

if content != original_content:
    # Backup original
    with open('/app/backend/server.py.backup', 'w') as f:
        f.write(original_content)
    
    # Write fixed version
    with open('/app/backend/server.py', 'w') as f:
        f.write(content)
    
    print("✅ Fixed all fee collection points")
    print("   Changed ADMIN → PLATFORM_FEES")
    print("   Backup saved to server.py.backup")
else:
    print("No changes needed")
