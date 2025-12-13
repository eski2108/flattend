"""Blockchain Simulator for Testing

Simulates blockchain deposits for testing the deposit system.
In production, replace this with real blockchain monitoring.
"""

import asyncio
import random
from datetime import datetime, timezone
import logging

logger = logging.getLogger(__name__)

class BlockchainSimulator:
    """
    Simulates blockchain deposits for testing.
    Allows admin to manually trigger test deposits via API.
    """
    
    def __init__(self, db):
        self.db = db
        self.pending_deposits = []
    
    async def simulate_deposit(self, currency: str, amount: float, from_address: str = None):
        """
        Simulate a blockchain deposit.
        """
        try:
            # Generate fake transaction hash
            import hashlib
            import secrets
            tx_hash = hashlib.sha256(secrets.token_bytes(32)).hexdigest()
            
            # Get deposit address for this currency
            addresses_doc = await self.db.admin_deposit_addresses.find_one(
                {"admin_id": "admin_liquidity"}
            )
            
            if not addresses_doc:
                logger.error("No deposit addresses found")
                return {
                    "success": False,
                    "message": "Deposit addresses not initialized"
                }
            
            to_address = addresses_doc.get("addresses", {}).get(currency)
            if not to_address:
                logger.error(f"No deposit address for {currency}")
                return {
                    "success": False,
                    "message": f"No deposit address configured for {currency}"
                }
            
            # Create pending deposit
            deposit = {
                "currency": currency,
                "amount": amount,
                "tx_hash": tx_hash,
                "from_address": from_address or "external_wallet",
                "to_address": to_address,
                "confirmations": 0,
                "required_confirmations": self._get_required_confirmations(currency),
                "status": "pending",
                "detected_at": datetime.now(timezone.utc).isoformat(),
                "confirmed_at": None,
                "credited_at": None
            }
            
            # Store in pending deposits
            await self.db.pending_deposits.insert_one(deposit)
            
            logger.info(f"\u26a1 Simulated deposit: {amount} {currency} (tx: {tx_hash[:16]}...)")
            
            # Auto-confirm after short delay (simulate blockchain confirmations)
            asyncio.create_task(self._confirm_deposit(tx_hash, currency))
            
            return {
                "success": True,
                "message": f"Deposit of {amount} {currency} initiated",
                "tx_hash": tx_hash,
                "confirmations": 0,
                "required_confirmations": deposit["required_confirmations"],
                "estimated_time": "30-60 seconds (simulated)"
            }
            
        except Exception as e:
            logger.error(f"Error simulating deposit: {str(e)}")
            return {
                "success": False,
                "message": str(e)
            }
    
    async def _confirm_deposit(self, tx_hash: str, currency: str):
        """
        Simulate blockchain confirmations and credit the deposit.
        """
        try:
            # Wait for simulated confirmation time
            await asyncio.sleep(5)  # 5 seconds per confirmation
            
            # Get deposit
            deposit = await self.db.pending_deposits.find_one({"tx_hash": tx_hash})
            if not deposit:
                return
            
            required = deposit["required_confirmations"]
            
            # Simulate confirmations
            for conf in range(1, required + 1):
                await asyncio.sleep(5)  # 5 seconds between confirmations
                
                await self.db.pending_deposits.update_one(
                    {"tx_hash": tx_hash},
                    {"$set": {"confirmations": conf}}
                )
                
                logger.info(f"\u23f3 {currency} deposit: {conf}/{required} confirmations (tx: {tx_hash[:16]}...)")
            
            # Mark as confirmed
            await self.db.pending_deposits.update_one(
                {"tx_hash": tx_hash},
                {
                    "$set": {
                        "status": "confirmed",
                        "confirmed_at": datetime.now(timezone.utc).isoformat()
                    }
                }
            )
            
            # Credit the deposit to admin liquidity
            await self._credit_deposit(tx_hash)
            
        except Exception as e:
            logger.error(f"Error confirming deposit: {str(e)}")
    
    async def _credit_deposit(self, tx_hash: str):
        """
        Credit a confirmed deposit to admin liquidity.
        """
        try:
            # Get confirmed deposit
            deposit = await self.db.pending_deposits.find_one({"tx_hash": tx_hash})
            if not deposit or deposit["status"] != "confirmed":
                return
            
            currency = deposit["currency"]
            amount = deposit["amount"]
            
            # Update admin liquidity
            await self.db.admin_liquidity_wallets.update_one(
                {"currency": currency},
                {
                    "$inc": {
                        "balance": amount,
                        "available": amount
                    },
                    "$set": {
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    },
                    "$setOnInsert": {
                        "reserved": 0,
                        "created_at": datetime.now(timezone.utc).isoformat()
                    }
                },
                upsert=True
            )
            
            # Mark as credited
            await self.db.pending_deposits.update_one(
                {"tx_hash": tx_hash},
                {
                    "$set": {
                        "status": "credited",
                        "credited_at": datetime.now(timezone.utc).isoformat()
                    }
                }
            )
            
            # Log in admin_deposits
            await self.db.admin_deposits.insert_one({
                "currency": currency,
                "amount": amount,
                "tx_hash": tx_hash,
                "status": "completed",
                "type": "crypto_deposit",
                "from_address": deposit.get("from_address"),
                "to_address": deposit.get("to_address"),
                "processed_at": datetime.now(timezone.utc).isoformat()
            })
            
            logger.info(f"\u2705 CREDITED: {amount} {currency} to admin liquidity (tx: {tx_hash[:16]}...)")
            
        except Exception as e:
            logger.error(f"Error crediting deposit: {str(e)}")
    
    def _get_required_confirmations(self, currency: str) -> int:
        """Get required confirmations for each currency."""
        confirmations = {
            "BTC": 2,
            "ETH": 3,
            "LTC": 2,
            "DOGE": 2,
            "XRP": 1,
            "ADA": 3,
            "SOL": 1,
            "MATIC": 3,
            "BNB": 2,
            "TRX": 2,
        }
        
        # Default for all ERC20/TRC20/BEP20 tokens
        if "_" in currency:  # e.g., USDT_ERC20
            base = currency.split("_")[1]
            if base == "ERC20":
                return 3
            elif base == "TRC20":
                return 2
            elif base == "BEP20":
                return 2
        
        return confirmations.get(currency, 3)
    
    async def get_pending_deposits(self):
        """Get all pending deposits."""
        try:
            deposits = await self.db.pending_deposits.find(
                {"status": {"$in": ["pending", "confirmed"]}}
            ).sort("detected_at", -1).to_list(50)
            
            return deposits
        except Exception as e:
            logger.error(f"Error getting pending deposits: {str(e)}")
            return []
