#!/usr/bin/env python3
"""
Security Hardening Script for CoinHubX Backend
Removes all debug statements, adds proper error handling, and secures endpoints
"""

import re
import sys

def remove_print_statements(content):
    """Remove all print() statements except in specific debug contexts"""
    # Replace print statements with logger calls
    content = re.sub(r'\bprint\(f?["\'](.+?)["\']\)', r'logger.info("\1")', content)
    content = re.sub(r'\bprint\((.+?)\)', r'logger.info(str(\1))', content)
    return content

def remove_traceback_exposure(content):
    """Remove traceback.print_exc() and format_exc() from exception handlers"""
    # Remove traceback.print_exc()
    content = re.sub(r'traceback\.print_exc\(\)', 'logger.error("Exception occurred", exc_info=True)', content)
    
    # Replace format_exc() in error messages with generic message
    content = re.sub(
        r'traceback\.format_exc\(\)',
        '"Internal server error"',
        content
    )
    return content

def add_generic_error_responses(content):
    """Replace detailed error messages with generic ones in HTTP responses"""
    # Find patterns like: detail=str(e)
    content = re.sub(
        r'detail=str\(e\)',
        'detail="An error occurred processing your request"',
        content
    )
    
    # Find patterns like: detail=f"Error: {e}"
    content = re.sub(
        r'detail=f?["\'].*?\{e\}.*?["\']',
        'detail="Service temporarily unavailable"',
        content
    )
    
    return content

def secure_exception_handlers(content):
    """Ensure all exception handlers log properly without exposing details"""
    lines = content.split('\n')
    result = []
    in_except = False
    
    for i, line in enumerate(lines):
        if 'except Exception as e:' in line or 'except HTTPException' in line:
            in_except = True
            result.append(line)
            continue
        
        if in_except and ('raise HTTPException' in line or 'return ' in line):
            # Check if exposing error details
            if 'str(e)' in line or '{e}' in line:
                # Log the real error
                indent = len(line) - len(line.lstrip())
                result.append(' ' * indent + 'logger.error(f"Error: {str(e)}", exc_info=True)')
                # Return generic message
                line = re.sub(r'str\(e\)', '"Service error"', line)
                line = re.sub(r'\{e\}', 'service error', line)
            in_except = False
        
        result.append(line)
    
    return '\n'.join(result)

if __name__ == "__main__":
    input_file = "/app/backend/server.py"
    output_file = "/app/backend/server_secured.py"
    
    print("🔒 Starting security hardening...")
    
    with open(input_file, 'r') as f:
        content = f.read()
    
    print("✓ Removing print statements...")
    content = remove_print_statements(content)
    
    print("✓ Removing traceback exposures...")
    content = remove_traceback_exposure(content)
    
    print("✓ Adding generic error responses...")
    content = add_generic_error_responses(content)
    
    print("✓ Securing exception handlers...")
    content = secure_exception_handlers(content)
    
    with open(output_file, 'w') as f:
        f.write(content)
    
    print(f"✅ Security hardening complete! Output: {output_file}")
    print("\nNext: Review the secured file and replace server.py")
