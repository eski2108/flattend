"""Admin Deposit Wallet Generator

Generates unique deposit addresses for admin to top up liquidity.
Addresses are generated once and stored in database.
"""

import secrets
import hashlib
from typing import Dict
import logging

logger = logging.getLogger(__name__)

class AdminWalletGenerator:
    """
    Generates deposit addresses for admin liquidity top-ups.
    
    NOTE: These are DEMO addresses for testing.
    In production, integrate with:
    - NOWPayments API for real deposit addresses
    - Or use proper HD wallet generation with secure key storage
    """
    
    @staticmethod
    def generate_btc_address(seed: str) -> str:
        """Generate a BTC-style address (testnet format for demo)"""
        hash_obj = hashlib.sha256(seed.encode()).hexdigest()
        # P2PKH address format (starts with 1)
        return f"1{hash_obj[:33]}"
    
    @staticmethod
    def generate_eth_address(seed: str) -> str:
        """Generate an ETH-style address"""
        hash_obj = hashlib.sha256(seed.encode()).hexdigest()
        # Ethereum address format (0x + 40 hex chars)
        return f"0x{hash_obj[:40]}"
    
    @staticmethod
    def generate_trc20_address(seed: str) -> str:
        """Generate a TRC20 (Tron) address"""
        hash_obj = hashlib.sha256(seed.encode()).hexdigest()
        # Tron address format (starts with T)
        return f"T{hash_obj[:33]}"
    
    @staticmethod
    def generate_bep20_address(seed: str) -> str:
        """Generate a BEP20 (BSC) address - same format as ETH"""
        hash_obj = hashlib.sha256(seed.encode()).hexdigest()
        return f"0x{hash_obj[:40]}"
    
    @classmethod
    def generate_all_addresses(cls, admin_id: str = "admin_liquidity") -> Dict[str, str]:
        """Generate deposit addresses for all supported currencies"""
        
        # Use admin_id + random seed for address generation
        seed = f"{admin_id}_{secrets.token_hex(16)}"
        
        addresses = {
            # Bitcoin
            "BTC": cls.generate_btc_address(f"{seed}_BTC"),
            
            # Ethereum & ERC20 tokens (same address for all)
            "ETH": cls.generate_eth_address(f"{seed}_ETH"),
            "USDT_ERC20": cls.generate_eth_address(f"{seed}_ETH"),  # USDT on Ethereum
            "USDC_ERC20": cls.generate_eth_address(f"{seed}_ETH"),  # USDC on Ethereum
            "DAI": cls.generate_eth_address(f"{seed}_ETH"),
            
            # Tron & TRC20 tokens (same address for all)
            "TRX": cls.generate_trc20_address(f"{seed}_TRX"),
            "USDT_TRC20": cls.generate_trc20_address(f"{seed}_TRX"),  # USDT on Tron
            
            # Binance Smart Chain & BEP20 tokens (same address for all)
            "BNB": cls.generate_bep20_address(f"{seed}_BNB"),
            "USDT_BEP20": cls.generate_bep20_address(f"{seed}_BNB"),  # USDT on BSC
            "BUSD": cls.generate_bep20_address(f"{seed}_BNB"),
            
            # Other native coins
            "LTC": cls.generate_btc_address(f"{seed}_LTC"),  # Litecoin (similar to BTC)
            "DOGE": cls.generate_btc_address(f"{seed}_DOGE"),  # Dogecoin
            "XRP": f"r{hashlib.sha256(f'{seed}_XRP'.encode()).hexdigest()[:33]}",  # Ripple
            "ADA": f"addr1{hashlib.sha256(f'{seed}_ADA'.encode()).hexdigest()[:54]}",  # Cardano
            "SOL": hashlib.sha256(f"{seed}_SOL".encode()).hexdigest()[:44],  # Solana
            "MATIC": cls.generate_eth_address(f"{seed}_MATIC"),  # Polygon (EVM compatible)
        }
        
        logger.info(f"Generated {len(addresses)} admin deposit addresses")
        return addresses


async def initialize_admin_deposit_addresses(db):
    """
    Initialize admin deposit addresses in database.
    Only creates if they don't exist.
    """
    try:
        # Check if addresses already exist
        existing = await db.admin_deposit_addresses.find_one({"admin_id": "admin_liquidity"})
        
        if existing:
            logger.info("Admin deposit addresses already exist")
            return existing
        
        # Generate new addresses
        addresses = AdminWalletGenerator.generate_all_addresses()
        
        # Store in database
        doc = {
            "admin_id": "admin_liquidity",
            "addresses": addresses,
            "created_at": "2025-12-03T00:00:00Z",
            "last_checked": None,
            "total_deposits_received": 0,
            "notes": "Admin liquidity deposit addresses - DEMO MODE"
        }
        
        await db.admin_deposit_addresses.insert_one(doc)
        logger.info("✅ Admin deposit addresses initialized")
        
        return doc
        
    except Exception as e:
        logger.error(f"Error initializing admin deposit addresses: {str(e)}")
        return None
