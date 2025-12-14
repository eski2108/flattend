# LAYOUT LOCK - DO NOT MODIFY

**Date Locked:** 2024-12-14
**Status:** APPROVED AND LOCKED

## Footer Spacing Rules - PERMANENT

### ✅ APPROVED LAYOUT
- Footer sits immediately after content
- No extra vertical spacing
- Mobile: 60px top padding, 0px bottom padding
- Desktop: 24px padding, 0px bottom padding

### 🔒 LOCKED FILES
These files control footer positioning. **DO NOT MODIFY** without explicit approval:

1. `/app/frontend/src/App.css` - Lines 1169-1177 (.main-content)
2. `/app/frontend/src/App.css` - Lines 4035-4040 (mobile .main-content)
3. `/app/frontend/src/index.css` - Bottom section (mobile overrides)
4. `/app/frontend/src/pages/Dashboard.js` - Line 210 (paddingBottom: 0)
5. `/app/frontend/src/pages/WalletPage.js` - Line 187 (paddingBottom: 0)

### 📏 EXACT SPACING VALUES (DO NOT CHANGE)
```css
/* Desktop */
.main-content {
  padding: 24px;
  padding-bottom: 0;
}

/* Mobile */
@media (max-width: 768px) {
  .main-content {
    padding-top: 60px;
    padding-bottom: 0;
  }
}
```

### ❌ FORBIDDEN CHANGES
- DO NOT add `min-height: 100vh` anywhere
- DO NOT add extra `padding-bottom` or `margin-bottom`
- DO NOT add flex centering that forces viewport height
- DO NOT create duplicate footer components

### 🔄 IF IT BREAKS AGAIN
1. Check git diff against this document
2. Revert ALL layout changes
3. Restore exact values documented here

---

**If you need to modify layout, ask first. This is locked for a reason.**