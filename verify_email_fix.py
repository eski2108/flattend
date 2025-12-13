#!/usr/bin/env python3
"""
Verify Email URL Fix
====================
This script verifies that the email template now has the correct HashRouter URLs
"""
import re

print("🔍 Verifying Email URL Fix\n")
print("=" * 70)

# Read the email_service.py file
with open('/app/backend/email_service.py', 'r') as f:
    content = f.read()

# Find all dispute URLs in the email template
urls_in_template = re.findall(r'https://[^\s"<>]+/admin/disputes/\{dispute_id\}', content)

print("\n📧 URLs found in dispute email template:\n")
for i, url in enumerate(urls_in_template, 1):
    has_hash = '#/' in url
    status = "✅ CORRECT" if has_hash else "❌ WRONG"
    print(f"{i}. {url}")
    print(f"   Status: {status} (HashRouter format: {'YES' if has_hash else 'NO'})\n")

# Count correct and incorrect URLs
correct_count = sum(1 for url in urls_in_template if '#/' in url)
total_count = len(urls_in_template)

print("=" * 70)
print(f"\n📊 Summary:")
print(f"   Total URLs found: {total_count}")
print(f"   Correct (with #/): {correct_count}")
print(f"   Incorrect (without #/): {total_count - correct_count}")

if correct_count == total_count and total_count > 0:
    print("\n✅ ALL URLS ARE CORRECTLY FORMATTED FOR HASHROUTER!")
    print("   The email button will now navigate correctly to the admin dispute page.")
elif total_count == 0:
    print("\n⚠️  WARNING: No dispute URLs found in email template!")
else:
    print(f"\n❌ ISSUE: {total_count - correct_count} URL(s) still need to be fixed!")

print("\n" + "=" * 70)
