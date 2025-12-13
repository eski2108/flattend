"""
Automated Database Backup System for Coin Hub X
Handles MongoDB backup, rotation, and restoration
"""

import os
import subprocess
import logging
from datetime import datetime, timezone
from pathlib import Path
import asyncio

logger = logging.getLogger(__name__)

# Configuration
BACKUP_DIR = "/app/backups"
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "test_database")
MAX_BACKUPS = 7  # Keep last 7 daily backups
BACKUP_INTERVAL_HOURS = 24  # Backup every 24 hours

class BackupSystem:
    """MongoDB backup and restoration system"""
    
    def __init__(self):
        self.backup_dir = Path(BACKUP_DIR)
        self.backup_dir.mkdir(parents=True, exist_ok=True)
        logger.info(f"Backup system initialized. Backup directory: {self.backup_dir}")
    
    def create_backup(self) -> dict:
        """
        Create a MongoDB backup using mongodump
        Returns: dict with backup info
        """
        try:
            timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
            backup_name = f"backup_{timestamp}"
            backup_path = self.backup_dir / backup_name
            
            logger.info(f"Starting database backup: {backup_name}")
            
            # Run mongodump command
            cmd = [
                "mongodump",
                "--uri", MONGO_URL,
                "--db", DB_NAME,
                "--out", str(backup_path)
            ]
            
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=300  # 5 minute timeout
            )
            
            if result.returncode == 0:
                # Get backup size
                backup_size = sum(
                    f.stat().st_size for f in backup_path.rglob('*') if f.is_file()
                )
                backup_size_mb = backup_size / (1024 * 1024)
                
                backup_info = {
                    "backup_name": backup_name,
                    "backup_path": str(backup_path),
                    "timestamp": timestamp,
                    "size_mb": round(backup_size_mb, 2),
                    "status": "success"
                }
                
                logger.info(f"✅ Backup successful: {backup_name} ({backup_size_mb:.2f} MB)")
                
                # Cleanup old backups
                self.cleanup_old_backups()
                
                return backup_info
            else:
                error_msg = f"Backup failed: {result.stderr}"
                logger.error(f"❌ {error_msg}")
                return {
                    "backup_name": backup_name,
                    "status": "failed",
                    "error": error_msg
                }
                
        except subprocess.TimeoutExpired:
            error_msg = "Backup timeout after 5 minutes"
            logger.error(f"❌ {error_msg}")
            return {"status": "failed", "error": error_msg}
        except Exception as e:
            error_msg = f"Backup exception: {str(e)}"
            logger.error(f"❌ {error_msg}")
            return {"status": "failed", "error": error_msg}
    
    def cleanup_old_backups(self):
        """Remove old backups, keeping only MAX_BACKUPS most recent"""
        try:
            # Get all backup directories
            backups = sorted([
                d for d in self.backup_dir.iterdir() 
                if d.is_dir() and d.name.startswith("backup_")
            ])
            
            # Remove old backups if we have more than MAX_BACKUPS
            if len(backups) > MAX_BACKUPS:
                backups_to_remove = backups[:-MAX_BACKUPS]
                for backup in backups_to_remove:
                    logger.info(f"Removing old backup: {backup.name}")
                    subprocess.run(["rm", "-rf", str(backup)])
                    
        except Exception as e:
            logger.error(f"Cleanup error: {e}")
    
    def restore_backup(self, backup_name: str) -> dict:
        """
        Restore database from a backup
        WARNING: This will overwrite current database
        """
        try:
            backup_path = self.backup_dir / backup_name / DB_NAME
            
            if not backup_path.exists():
                return {
                    "status": "failed",
                    "error": f"Backup not found: {backup_name}"
                }
            
            logger.warning(f"⚠️ Starting database restoration from: {backup_name}")
            
            # Run mongorestore command
            cmd = [
                "mongorestore",
                "--uri", MONGO_URL,
                "--db", DB_NAME,
                "--drop",  # Drop existing collections first
                str(backup_path)
            ]
            
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=300
            )
            
            if result.returncode == 0:
                logger.info(f"✅ Restoration successful from: {backup_name}")
                return {
                    "status": "success",
                    "backup_name": backup_name,
                    "message": "Database restored successfully"
                }
            else:
                error_msg = f"Restoration failed: {result.stderr}"
                logger.error(f"❌ {error_msg}")
                return {"status": "failed", "error": error_msg}
                
        except Exception as e:
            error_msg = f"Restoration exception: {str(e)}"
            logger.error(f"❌ {error_msg}")
            return {"status": "failed", "error": error_msg}
    
    def list_backups(self) -> list:
        """List all available backups"""
        try:
            backups = []
            for backup_dir in sorted(self.backup_dir.iterdir(), reverse=True):
                if backup_dir.is_dir() and backup_dir.name.startswith("backup_"):
                    backup_size = sum(
                        f.stat().st_size for f in backup_dir.rglob('*') if f.is_file()
                    )
                    backups.append({
                        "name": backup_dir.name,
                        "created_at": backup_dir.stat().st_ctime,
                        "size_mb": round(backup_size / (1024 * 1024), 2)
                    })
            return backups
        except Exception as e:
            logger.error(f"List backups error: {e}")
            return []


# Background task for automated backups
async def automated_backup_loop():
    """Run backup every BACKUP_INTERVAL_HOURS"""
    backup_system = BackupSystem()
    logger.info(f"🚀 Starting automated backup system (every {BACKUP_INTERVAL_HOURS} hours)")
    
    while True:
        try:
            # Create backup
            result = backup_system.create_backup()
            
            if result.get("status") == "success":
                logger.info(f"✅ Automated backup completed: {result.get('backup_name')}")
            else:
                logger.error(f"❌ Automated backup failed: {result.get('error')}")
                
        except Exception as e:
            logger.error(f"❌ Backup loop error: {e}")
        
        # Wait for next backup interval
        await asyncio.sleep(BACKUP_INTERVAL_HOURS * 3600)


# Export instance
backup_system = BackupSystem()
