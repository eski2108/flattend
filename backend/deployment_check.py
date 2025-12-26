"""
Quick check to verify deployment has latest fixes
Run: python deployment_check.py
"""
import sys

def check():
    errors = []
    
    # Check 1: /health endpoint exists
    with open('server.py', 'r') as f:
        content = f.read()
        if '@app.get("/health")' not in content:
            errors.append("MISSING: Root /health endpoint")
        else:
            print("✅ Root /health endpoint exists")
    
    # Check 2: subscription_renewal uses DB_NAME from env
    with open('subscription_renewal.py', 'r') as f:
        content = f.read()
        if "coinhubx_db" in content:
            errors.append("BROKEN: subscription_renewal.py has hardcoded coinhubx_db")
        elif "DB_NAME = os.environ.get" in content:
            print("✅ subscription_renewal.py uses DB_NAME from env")
        else:
            errors.append("MISSING: DB_NAME not properly configured")
    
    # Check 3: backup_system graceful fallback
    with open('backup_system.py', 'r') as f:
        content = f.read()
        if 'which", "mongodump' in content:
            print("✅ backup_system.py has mongodump check")
        else:
            errors.append("MISSING: mongodump graceful fallback")
    
    if errors:
        print("\n❌ DEPLOYMENT ISSUES:")
        for e in errors:
            print(f"  - {e}")
        sys.exit(1)
    else:
        print("\n✅ ALL CHECKS PASSED - Ready for deployment")
        sys.exit(0)

if __name__ == "__main__":
    check()
