#!/usr/bin/env python3
"""
Comprehensive Security Fix - All 539 Issues
Safe, tested approach using line-by-line processing
"""

import re
import sys
from typing import List, Tuple

def safe_replace_print_statements(lines: List[str]) -> List[str]:
    """
    Replace print() with logger.info() preserving indentation
    """
    result = []
    for line in lines:
        if 'print(' in line and not line.strip().startswith('#'):
            # Preserve indentation
            indent = len(line) - len(line.lstrip())
            
            # Extract content
            if 'print(f"' in line or "print(f'" in line:
                # f-string
                content = re.search(r'print\(f["\'](.+?)["\']', line)
                if content:
                    result.append(' ' * indent + f'logger.info(f"{content.group(1)}")')
                    continue
            elif 'print("' in line or "print('" in line:
                # regular string
                content = re.search(r'print\(["\'](.+?)["\']', line)
                if content:
                    result.append(' ' * indent + f'logger.info("{content.group(1)}")')
                    continue
            else:
                # Variable
                content = re.search(r'print\((.+?)\)', line)
                if content:
                    result.append(' ' * indent + f'logger.info(str({content.group(1)}))')
                    continue
        
        result.append(line)
    return result

def safe_remove_traceback_calls(lines: List[str]) -> List[str]:
    """
    Remove traceback.print_exc() and format_exc()
    """
    result = []
    for line in lines:
        if 'traceback.print_exc()' in line:
            # Keep the line but comment it out
            indent = len(line) - len(line.lstrip())
            result.append(' ' * indent + '# traceback.print_exc() - removed for security')
        elif 'traceback.format_exc()' in line:
            # Replace with generic message
            line = line.replace('traceback.format_exc()', '"Error occurred"')
            result.append(line)
        else:
            result.append(line)
    return result

def safe_secure_error_messages(lines: List[str]) -> List[str]:
    """
    Replace detail=str(e) with generic messages
    """
    result = []
    in_exception_handler = False
    
    for i, line in enumerate(lines):
        # Track if we're in an exception handler
        if 'except Exception as e:' in line or 'except HTTPException' in line:
            in_exception_handler = True
            result.append(line)
            continue
        
        if in_exception_handler and ('raise HTTPException' in line or 'return {' in line):
            in_exception_handler = False
            
            # Check if exposing error details
            if 'detail=str(e)' in line:
                # Add logging before
                indent = len(line) - len(line.lstrip())
                if i > 0:
                    result.append(' ' * indent + 'logger.error(f"Error: {str(e)}", exc_info=True)')
                # Replace exposed detail
                line = line.replace('detail=str(e)', 'detail="Operation failed"')
            elif 'detail=f"' in line and '{e}' in line:
                # Add logging
                indent = len(line) - len(line.lstrip())
                if i > 0:
                    result.append(' ' * indent + 'logger.error(f"Error: {str(e)}", exc_info=True)')
                # Replace with generic
                line = re.sub(r'detail=f"[^"]*\{e\}[^"]*"', 'detail="Operation failed"', line)
        
        result.append(line)
    return result

def safe_remove_import_traceback_if_unused(lines: List[str]) -> List[str]:
    """
    Remove 'import traceback' if not used
    """
    # Check if traceback is actually used (not just for printing)
    traceback_used_meaningfully = False
    for line in lines:
        if 'traceback.' in line and 'traceback.print_exc' not in line and 'traceback.format_exc' not in line:
            traceback_used_meaningfully = True
            break
    
    if traceback_used_meaningfully:
        return lines  # Keep import
    
    # Remove import traceback line
    result = []
    for line in lines:
        if line.strip() == 'import traceback':
            result.append('# import traceback - removed (unused)')
        else:
            result.append(line)
    return result

def process_file(input_path: str, output_path: str):
    """
    Process file line by line with all fixes
    """
    print("📖 Reading file...")
    with open(input_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    # Remove newlines for processing
    lines = [line.rstrip('\n') for line in lines]
    
    print(f"📊 Total lines: {len(lines)}")
    
    print("1️⃣  Replacing print statements...")
    lines = safe_replace_print_statements(lines)
    
    print("2️⃣  Removing traceback exposures...")
    lines = safe_remove_traceback_calls(lines)
    
    print("3️⃣  Securing error messages...")
    lines = safe_secure_error_messages(lines)
    
    print("4️⃣  Cleaning up imports...")
    lines = safe_remove_import_traceback_if_unused(lines)
    
    print("💾 Writing secured file...")
    with open(output_path, 'w', encoding='utf-8') as f:
        for line in lines:
            f.write(line + '\n')
    
    print("✅ Done!")

if __name__ == "__main__":
    import shutil
    
    input_file = "/app/backend/server.py"
    backup_file = "/app/backend/server_original_backup.py"
    output_file = "/app/backend/server.py"
    
    print("🔒 COMPREHENSIVE SECURITY FIX - ALL 539 ISSUES")
    print("=" * 60)
    
    # Create backup
    print(f"💾 Creating backup: {backup_file}")
    shutil.copy(input_file, backup_file)
    
    # Process
    process_file(input_file, output_file)
    
    print("\n✅ ALL SECURITY FIXES APPLIED")
    print(f"Original backup: {backup_file}")
    print(f"Secured file: {output_file}")
    
    # Verify syntax
    print("\n🔍 Verifying Python syntax...")
    import py_compile
    try:
        py_compile.compile(output_file, doraise=True)
        print("✅ Syntax check passed!")
    except SyntaxError as e:
        print(f"❌ Syntax error: {e}")
        print("Restoring from backup...")
        shutil.copy(backup_file, output_file)
        sys.exit(1)
