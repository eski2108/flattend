"""
Production-Grade Performance Logging and Error Tracking
"""

import time
import logging
import traceback
from functools import wraps
from datetime import datetime

# Configure production logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/var/log/supervisor/api_errors.log'),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger('coin_hub_x')

def log_performance(func):
    """Decorator to log API endpoint performance"""
    @wraps(func)
    async def wrapper(*args, **kwargs):
        start_time = time.time()
        endpoint_name = func.__name__
        
        try:
            result = await func(*args, **kwargs)
            execution_time = (time.time() - start_time) * 1000  # ms
            
            # Log slow endpoints (> 500ms)
            if execution_time > 500:
                logger.warning(f"⚠️ SLOW ENDPOINT: {endpoint_name} took {execution_time:.2f}ms")
            else:
                logger.info(f"✅ {endpoint_name}: {execution_time:.2f}ms")
            
            return result
            
        except Exception as e:
            execution_time = (time.time() - start_time) * 1000
            logger.error(f"❌ ERROR in {endpoint_name} after {execution_time:.2f}ms")
            logger.error(f"Error type: {type(e).__name__}")
            logger.error(f"Error message: {str(e)}")
            logger.error(f"Traceback:\n{traceback.format_exc()}")
            raise
    
    return wrapper

def log_error(context: str, error: Exception, extra_data: dict = None):
    """Centralized error logging"""
    logger.error(f"🔴 ERROR in {context}")
    logger.error(f"Type: {type(error).__name__}")
    logger.error(f"Message: {str(error)}")
    if extra_data:
        logger.error(f"Extra data: {extra_data}")
    logger.error(f"Traceback:\n{traceback.format_exc()}")

def log_info(message: str, data: dict = None):
    """Structured info logging"""
    if data:
        logger.info(f"ℹ️ {message} | Data: {data}")
    else:
        logger.info(f"ℹ️ {message}")

def log_warning(message: str, data: dict = None):
    """Structured warning logging"""
    if data:
        logger.warning(f"⚠️ {message} | Data: {data}")
    else:
        logger.warning(f"⚠️ {message}")
