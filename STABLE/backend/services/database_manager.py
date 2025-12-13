"""
Database Connection Manager - Isolated Connection Pools
Each service gets its own connection to prevent cross-contamination
"""

import os
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from typing import Dict, Optional
import logging

logger = logging.getLogger(__name__)

class DatabaseManager:
    """
    Manages database connections with proper pooling and isolation
    """
    
    _instances: Dict[str, 'DatabaseManager'] = {}
    _client: Optional[AsyncIOMotorClient] = None
    
    def __init__(self, service_name: str):
        self.service_name = service_name
        self.db = None
        logger.info(f"✅ DatabaseManager initialized for service: {service_name}")
    
    @classmethod
    def get_instance(cls, service_name: str) -> 'DatabaseManager':
        """Get or create database manager instance for a service"""
        if service_name not in cls._instances:
            cls._instances[service_name] = cls(service_name)
        return cls._instances[service_name]
    
    @classmethod
    def initialize_client(cls):
        """Initialize shared MongoDB client (connection pool)"""
        if cls._client is None:
            mongo_url = os.getenv('MONGO_URL', 'mongodb://localhost:27017')
            cls._client = AsyncIOMotorClient(
                mongo_url,
                maxPoolSize=50,  # Larger pool to prevent exhaustion
                minPoolSize=10,
                maxIdleTimeMS=45000,
                serverSelectionTimeoutMS=5000
            )
            logger.info("✅ MongoDB client initialized with connection pooling")
    
    def get_database(self, db_name: Optional[str] = None) -> AsyncIOMotorDatabase:
        """
        Get database connection for this service
        Each service has isolated access through the shared pool
        """
        if self.db is None:
            self.initialize_client()
            
            if db_name is None:
                db_name = os.getenv('DB_NAME', 'test_database')
            
            self.db = self._client[db_name]
            logger.info(f"✅ Database connection established for {self.service_name} -> {db_name}")
        
        return self.db
    
    @classmethod
    async def close_all(cls):
        """Close all database connections"""
        if cls._client:
            cls._client.close()
            cls._client = None
            cls._instances.clear()
            logger.info("✅ All database connections closed")
