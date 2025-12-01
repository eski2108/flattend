# 🛡️ CoinHubX Protection System

## Quick Start

### Before Making ANY Changes:
```bash
# 1. Create backup
bash /app/.protection/backup-stable.sh

# 2. Unlock files (if needed)
bash /app/.protection/unlock-files.sh

# 3. Make your changes...

# 4. Run validation
bash /app/.protection/deploy-guard.sh

# 5. Lock files again
bash /app/.protection/lock-files.sh
```

---

## Available Commands

### Protection Scripts:

| Command | Purpose |
|---------|----------|
| `backup-stable.sh` | Create stable version backup |
| `restore-stable.sh` | Restore last stable version |
| `deploy-guard.sh` | Full deployment validation |
| `pre-build-check.sh` | Pre-build validation only |
| `validate-build.sh` | Validate build output |
| `icon-protection.sh` | Check icon imports |
| `lock-files.sh` | Lock critical files |
| `unlock-files.sh` | Unlock for editing |
| `error-monitor.sh` | Monitor logs for errors |

---

## Emergency Procedures

### If Site Goes Down:
```bash
# Immediate restore
bash /app/.protection/restore-stable.sh
```

### If Icons Break:
```bash
# Check icon issues
bash /app/.protection/icon-protection.sh

# If errors found, restore backup
bash /app/.protection/restore-stable.sh
```

### If Wallet Fails:
```bash
# Check error logs
tail -f /var/log/supervisor/backend.err.log

# Restore if needed
bash /app/.protection/restore-stable.sh
```

---

## File Locations

- **Protection Scripts**: `/app/.protection/`
- **Stable Backups**: `/app/.backups/stable/`
- **Emergency Backups**: `/app/.backups/emergency/`
- **Error Logs**: `/app/.protection/logs/`
- **Config**: `/app/.protection/PROTECTED_FILES.json`

---

## Code Freeze Areas

### ❌ NO CHANGES ALLOWED:
1. Wallet system
2. P2P Express purchase
3. Authentication
4. Icon system
5. Error boundary

### ✅ CHANGES ALLOWED (with validation):
1. UI styling
2. New features (non-critical)
3. Documentation
4. Testing code

---

## Monitoring

### Start Error Monitor:
```bash
bash /app/.protection/error-monitor.sh &
```

### Check Recent Errors:
```bash
tail -50 /app/.protection/logs/errors_$(date +%Y%m%d).log
```

---

## Best Practices

1. ✅ Always backup before changes
2. ✅ Test in staging first
3. ✅ Run validation before deploy
4. ✅ Monitor errors after deploy
5. ✅ Lock files when not editing
6. ✅ Document all changes
7. ✅ Keep backups for 30 days

---

## Support

For issues with protection system:
1. Check `/app/.protection/logs/`
2. Review `PROTECTION_STATUS.md`
3. Run `deploy-guard.sh` for diagnostics

---

**Version**: 1.0.0  
**Status**: ACTIVE ✅  
**Last Updated**: 2025-12-01
