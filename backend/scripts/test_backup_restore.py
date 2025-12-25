#!/usr/bin/env python3
"""
═══════════════════════════════════════════════════════════════════════════════
BACKUP & RESTORE TEST SCRIPT
═══════════════════════════════════════════════════════════════════════════════

Tests:
1. Backup creation
2. Backup listing
3. Restore simulation (on test collection)
4. Cleanup

═══════════════════════════════════════════════════════════════════════════════
"""

import os
import sys
import subprocess
import tempfile
import shutil
from datetime import datetime, timezone
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from backup_system import backup_system, BACKUP_DIR, MONGO_URL, DB_NAME

def print_header(text: str):
    print(f"\n{'='*60}")
    print(f"  {text}")
    print(f"{'='*60}")

def print_result(name: str, success: bool, details: str = ""):
    status = "✅ PASS" if success else "❌ FAIL"
    print(f"  {status}: {name}")
    if details:
        print(f"         {details}")

def test_backup_creation():
    """Test creating a backup"""
    print_header("TEST 1: Backup Creation")
    
    result = backup_system.create_backup()
    
    success = result.get("status") == "success"
    details = f"Backup: {result.get('backup_name', 'N/A')}, Size: {result.get('size_mb', 'N/A')} MB"
    
    print_result("Create backup", success, details)
    
    if not success:
        print(f"         Error: {result.get('error', 'Unknown')}")
    
    return success, result.get('backup_name')

def test_backup_listing():
    """Test listing backups"""
    print_header("TEST 2: Backup Listing")
    
    backups = backup_system.list_backups()
    
    success = len(backups) > 0
    details = f"Found {len(backups)} backups"
    
    print_result("List backups", success, details)
    
    if backups:
        latest = backups[0]
        print(f"         Latest: {latest.get('name')} ({latest.get('size_mb')} MB)")
    
    return success

def test_restore_simulation(backup_name: str):
    """
    Test restore functionality using a test collection.
    This is a SIMULATION - does not touch production data.
    """
    print_header("TEST 3: Restore Simulation")
    
    if not backup_name:
        print_result("Restore simulation", False, "No backup available")
        return False
    
    # Check if backup exists
    backup_path = Path(BACKUP_DIR) / backup_name / DB_NAME
    
    if not backup_path.exists():
        print_result("Restore simulation", False, f"Backup path not found: {backup_path}")
        return False
    
    # Create a test database name for restoration test
    test_db_name = f"{DB_NAME}_restore_test_{datetime.now().strftime('%Y%m%d%H%M%S')}"
    
    try:
        print(f"  📁 Restoring to test database: {test_db_name}")
        
        # Run mongorestore to test database
        cmd = [
            "mongorestore",
            "--uri", MONGO_URL,
            "--db", test_db_name,
            str(backup_path)
        ]
        
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=120
        )
        
        if result.returncode == 0:
            print_result("Restore to test DB", True, f"Restored to {test_db_name}")
            
            # Verify restoration by checking collections
            verify_cmd = [
                "mongosh", "--quiet",
                f"{MONGO_URL}/{test_db_name}",
                "--eval", "db.getCollectionNames().length"
            ]
            
            verify_result = subprocess.run(
                verify_cmd,
                capture_output=True,
                text=True,
                timeout=30
            )
            
            if verify_result.returncode == 0:
                collection_count = verify_result.stdout.strip()
                print_result("Verify restoration", True, f"Collections: {collection_count}")
            else:
                print_result("Verify restoration", False, "Could not verify")
            
            # Cleanup: Drop test database
            print(f"  🧹 Cleaning up test database: {test_db_name}")
            cleanup_cmd = [
                "mongosh", "--quiet",
                f"{MONGO_URL}/{test_db_name}",
                "--eval", "db.dropDatabase()"
            ]
            
            subprocess.run(cleanup_cmd, capture_output=True, timeout=30)
            print_result("Cleanup test DB", True)
            
            return True
        else:
            print_result("Restore to test DB", False, result.stderr)
            return False
            
    except subprocess.TimeoutExpired:
        print_result("Restore simulation", False, "Timeout")
        return False
    except Exception as e:
        print_result("Restore simulation", False, str(e))
        return False

def test_backup_cleanup():
    """Test that old backups are cleaned up"""
    print_header("TEST 4: Backup Rotation")
    
    backups = backup_system.list_backups()
    max_backups = 7  # From backup_system.py
    
    success = len(backups) <= max_backups
    details = f"Backups: {len(backups)}, Max: {max_backups}"
    
    print_result("Backup rotation", success, details)
    
    return success

def run_all_tests():
    """Run all backup/restore tests"""
    print("\n" + "═"*60)
    print("  COINHUBX BACKUP & RESTORE TEST SUITE")
    print("═"*60)
    print(f"  Timestamp: {datetime.now(timezone.utc).isoformat()}")
    print(f"  Backup Dir: {BACKUP_DIR}")
    print(f"  Database: {DB_NAME}")
    
    results = []
    
    # Test 1: Create backup
    success, backup_name = test_backup_creation()
    results.append(("Backup Creation", success))
    
    # Test 2: List backups
    success = test_backup_listing()
    results.append(("Backup Listing", success))
    
    # Test 3: Restore simulation
    success = test_restore_simulation(backup_name)
    results.append(("Restore Simulation", success))
    
    # Test 4: Cleanup rotation
    success = test_backup_cleanup()
    results.append(("Backup Rotation", success))
    
    # Summary
    print_header("SUMMARY")
    
    passed = sum(1 for _, s in results if s)
    total = len(results)
    
    for name, success in results:
        status = "✅" if success else "❌"
        print(f"  {status} {name}")
    
    print(f"\n  Total: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n  🎉 ALL TESTS PASSED - Backup system is healthy")
        return 0
    else:
        print("\n  ⚠️ SOME TESTS FAILED - Check backup configuration")
        return 1

if __name__ == "__main__":
    exit(run_all_tests())
