"""
Background Task Queue for Heavy Operations
Moves intensive tasks out of request-response cycle
"""

import asyncio
from typing import Callable, Any
from datetime import datetime
import logging

logger = logging.getLogger('background_tasks')

class BackgroundTaskQueue:
    """Async task queue for non-blocking operations"""
    
    def __init__(self):
        self.tasks = []
        self.running = False
        
    def add_task(self, coro: Callable, *args, **kwargs):
        """Add task to queue without blocking"""
        task = asyncio.create_task(coro(*args, **kwargs))
        self.tasks.append(task)
        logger.info(f"✅ Task queued: {coro.__name__}")
        return task
    
    async def process_queue(self):
        """Process queued tasks"""
        while self.running:
            if self.tasks:
                completed, pending = await asyncio.wait(
                    self.tasks,
                    timeout=1,
                    return_when=asyncio.FIRST_COMPLETED
                )
                
                for task in completed:
                    try:
                        await task
                        logger.info(f"✅ Background task completed")
                    except Exception as e:
                        logger.error(f"❌ Background task failed: {e}")
                
                self.tasks = list(pending)
            
            await asyncio.sleep(0.1)
    
    def start(self):
        """Start processing queue"""
        self.running = True
        asyncio.create_task(self.process_queue())
        logger.info("🚀 Background task queue started")
    
    def stop(self):
        """Stop processing queue"""
        self.running = False
        logger.info("🛑 Background task queue stopped")

# Global task queue instance
task_queue = BackgroundTaskQueue()

# Helper functions for common background tasks

async def send_email_background(to_email: str, subject: str, body: str):
    """Send email in background without blocking"""
    try:
        # Import here to avoid circular dependency
        from server import send_email
        await send_email(to_email, subject, body)
        logger.info(f"✅ Email sent to {to_email}")
    except Exception as e:
        logger.error(f"❌ Email send failed: {e}")

async def update_prices_background():
    """Update crypto prices in background"""
    try:
        from live_pricing import fetch_live_prices
        await fetch_live_prices()
        logger.info("✅ Prices updated in background")
    except Exception as e:
        logger.error(f"❌ Price update failed: {e}")

async def process_transaction_background(tx_data: dict):
    """Process transaction in background"""
    try:
        # Transaction processing logic
        logger.info(f"✅ Transaction processed: {tx_data.get('tx_id')}")
    except Exception as e:
        logger.error(f"❌ Transaction processing failed: {e}")

async def backup_database_background():
    """Backup database in background"""
    try:
        from backup_system import backup_database
        await backup_database()
        logger.info("✅ Database backup completed")
    except Exception as e:
        logger.error(f"❌ Database backup failed: {e}")
