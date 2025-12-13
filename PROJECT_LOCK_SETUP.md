# 🔒 PROJECT LOCK & BRANCH STRUCTURE

## CRITICAL RULES - READ CAREFULLY

### 🛡️ PROTECTED CODE
The current working version is now FROZEN and cannot be modified without explicit approval.

### 📋 STABLE BRANCH STRUCTURE

```
/app
├── STABLE/                    ← FROZEN - Current working version
│   ├── backend/              ← All working backend code
│   ├── frontend/             ← All working frontend code
│   └── STABLE_MANIFEST.json  ← List of all protected files
│
├── backend/                   ← ACTIVE - Development continues here
├── frontend/                  ← ACTIVE - Development continues here
│
└── DEVELOPMENT/               ← NEW FEATURES ONLY
    ├── new_features/
    ├── experiments/
    └── testing/
```

### 🚨 MANDATORY RULES

1. **NEVER MODIFY STABLE/** - These files are READ-ONLY backups
2. **ALWAYS WORK IN /app/backend and /app/frontend** - Active development
3. **NEW FEATURES** → Create in DEVELOPMENT/ first, then merge when approved
4. **NO DELETIONS** - Never delete existing routes, components, or pages
5. **NO RENAMES** - Keep all filenames exactly as they are
6. **ADD ONLY** - Add new files, don't modify existing ones unless approved

### ✅ SAFE OPERATIONS

✓ Add new components in frontend/src/components/NEW_FEATURE/
✓ Add new pages in frontend/src/pages/NewFeature.js  
✓ Add new backend endpoints in server.py (append only)
✓ Create new CSS files
✓ Add new utility functions

### ❌ FORBIDDEN OPERATIONS

✗ Delete any existing file
✗ Rename any existing file
✗ Modify working routes without approval
✗ Change App.js routes without approval
✗ Remove imports
✗ Overwrite existing components

---

## 🔄 WORKFLOW FOR NEW FEATURES

### Step 1: Create in DEVELOPMENT/
```bash
mkdir -p /app/DEVELOPMENT/feature_name
# Build and test feature here first
```

### Step 2: Test thoroughly
```bash
# Test without affecting stable code
```

### Step 3: Get approval
```
Ask user: "Ready to integrate [FEATURE]?"
```

### Step 4: Integrate safely
```bash
# Only after approval, carefully merge to main codebase
```

---

## 📸 SNAPSHOT TAKEN

Current stable version backed up to:
- `/app/STABLE/backend/` (Timestamp: 2025-12-11)
- `/app/STABLE/frontend/` (Timestamp: 2025-12-11)

---

## 🔧 RESTORE COMMAND (Emergency Only)

If anything breaks:
```bash
bash /app/RESTORE_STABLE.sh
```

This will restore the last known working version.

---

*Created: December 11, 2025*
*Status: ACTIVE PROTECTION*
