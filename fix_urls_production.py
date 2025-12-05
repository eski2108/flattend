#!/usr/bin/env python3
"""
Remove hardcoded URLs and ensure production-ready configuration
"""

import os
import re
from pathlib import Path

def fix_file(filepath):
    """Remove hardcoded URLs from a file"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original = content
        
        # Replace hardcoded backend URL fallbacks
        content = re.sub(
            r"process\.env\.REACT_APP_BACKEND_URL \|\| ['\"][^'\"]*['\"]" ,
            "process.env.REACT_APP_BACKEND_URL",
            content
        )
        
        # Replace window.open with hardcoded URLs
        content = re.sub(
            r"window\.open\(['\"]https://codehealer-31\.preview\.emergentagent\.com['\"], ['\"   ]_blank['\"]\)",
            "window.open(process.env.REACT_APP_FRONTEND_URL || window.location.origin, '_blank')",
            content
        )
        
        if content != original:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            return True
        return False
        
    except Exception as e:
        print(f"Error processing {filepath}: {e}")
        return False

def main():
    print("\n" + "="*60)
    print("🔧 REMOVING HARDCODED URLs FOR PRODUCTION")
    print("="*60 + "\n")
    
    frontend_src = Path("/app/frontend/src")
    fixed_count = 0
    
    # Process all .js and .jsx files
    for ext in ["*.js", "*.jsx"]:
        for filepath in frontend_src.rglob(ext):
            if "node_modules" in str(filepath):
                continue
                
            if fix_file(filepath):
                print(f"✅ Fixed: {filepath.relative_to(frontend_src)}")
                fixed_count += 1
    
    print(f"\n" + "="*60)
    print(f"✅ Fixed {fixed_count} files")
    print("="*60 + "\n")
    
    print("📋 Next Steps:")
    print("   1. Update /app/frontend/.env:")
    print("      REACT_APP_BACKEND_URL=https://api.yourdomain.com")
    print("      REACT_APP_FRONTEND_URL=https://yourdomain.com")
    print("")
    print("   2. Update /app/backend/.env:")
    print("      BACKEND_URL=https://api.yourdomain.com")
    print("")
    print("   3. Restart services:")
    print("      sudo supervisorctl restart all")
    print("\n")

if __name__ == "__main__":
    main()
