"""Admin Liquidity Quote System - Price Lock & Profit Protection

This system handles all admin-to-user crypto trades (Instant Buy/Sell).
COMPLETELY SEPARATE from P2P trading.

Profit Guarantee:
- When user BUYS crypto: Admin sells ABOVE market (positive spread)
- When user SELLS crypto: Admin buys BELOW market (negative spread)

Price Lock:
- Price is locked at quote generation
- Settlement uses ONLY locked price
- Quote expires after 5 minutes
"""

import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, Optional
import uuid
from fastapi import HTTPException

logger = logging.getLogger(__name__)

# Import referral engine for commission processing
try:
    from referral_engine import get_referral_engine
except ImportError:
    get_referral_engine = None

# Minimum spreads to guarantee profit
MIN_SELL_SPREAD = 0.5  # Admin must sell at least 0.5% above market
MIN_BUY_SPREAD = -0.5  # Admin must buy at least 0.5% below market (negative)

class AdminLiquidityQuoteService:
    """Service for admin liquidity quotes with price locking"""
    
    def __init__(self, db):
        self.db = db
        self.quote_expiry_minutes = 5
    
    async def generate_quote(
        self,
        user_id: str,
        trade_type: str,
        crypto_currency: str,
        crypto_amount: float
    ) -> Dict:
        """
        Generate locked quote for admin liquidity trade
        
        Args:
            user_id: User requesting quote
            trade_type: "buy" (user buys) or "sell" (user sells)
            crypto_currency: BTC, ETH, USDT, etc.
            crypto_amount: Amount of crypto
        
        Returns:
            Quote dict with locked price
        """
        try:
            # Validate inputs
            if trade_type not in ["buy", "sell"]:
                raise HTTPException(status_code=400, detail="trade_type must be 'buy' or 'sell'")
            
            if crypto_amount <= 0:
                raise HTTPException(status_code=400, detail="Amount must be positive")
            
            # Get live market price
            market_price_gbp = await self._get_live_market_price(crypto_currency)
            
            if market_price_gbp <= 0:
                raise HTTPException(
                    status_code=400,
                    detail=f"Unable to fetch market price for {crypto_currency}"
                )
            
            # Get spread settings
            settings = await self.db.monetization_settings.find_one(
                {"setting_id": "default_monetization"},
                {"_id": 0}
            )
            
            if not settings:
                # Use safe defaults
                settings = {
                    "admin_sell_spread_percent": 3.0,
                    "admin_buy_spread_percent": -2.5,
                    "instant_sell_fee_percent": 1.0,
                    "buyer_express_fee_percent": 1.0
                }
            
            # Calculate locked price based on trade type
            if trade_type == "buy":
                # User BUYS crypto from admin
                # Admin SELLS at HIGHER than market
                spread_percent = settings.get("admin_sell_spread_percent", 3.0)
                fee_percent = settings.get("buyer_express_fee_percent", 1.0)
                
                # VALIDATE: Spread must be POSITIVE (admin sells above market)
                if spread_percent <= 0:
                    raise HTTPException(
                        status_code=500,
                        detail=f"CRITICAL: admin_sell_spread_percent is {spread_percent}%. "
                               f"Admin MUST sell ABOVE market (positive spread). "
                               f"Current setting would cause platform loss!"
                    )
                
                # VALIDATE: Minimum spread
                if spread_percent < MIN_SELL_SPREAD:
                    raise HTTPException(
                        status_code=500,
                        detail=f"Spread too small. Minimum: {MIN_SELL_SPREAD}%. Current: {spread_percent}%"
                    )
                
                # Calculate locked price with spread
                locked_price = market_price_gbp * (1 + spread_percent / 100)
                
                # Calculate total cost (price + fee)
                base_cost = crypto_amount * locked_price
                fee_amount = base_cost * (fee_percent / 100)
                total_cost = base_cost + fee_amount
                
                quote_data = {
                    "total_cost": round(total_cost, 2),
                    "base_cost": round(base_cost, 2),
                    "fee_amount": round(fee_amount, 2),
                    "fee_percent": fee_percent
                }
                
            else:  # sell
                # User SELLS crypto to admin
                # Admin BUYS at LOWER than market
                spread_percent = settings.get("admin_buy_spread_percent", -2.5)
                fee_percent = settings.get("instant_sell_fee_percent", 1.0)
                
                # VALIDATE: Spread must be NEGATIVE (admin buys below market)
                if spread_percent >= 0:
                    raise HTTPException(
                        status_code=500,
                        detail=f"CRITICAL: admin_buy_spread_percent is {spread_percent}%. "
                               f"Admin MUST buy BELOW market (negative spread). "
                               f"Current setting would cause platform loss!"
                    )
                
                # VALIDATE: Minimum spread (in absolute terms)
                if abs(spread_percent) < abs(MIN_BUY_SPREAD):
                    raise HTTPException(
                        status_code=500,
                        detail=f"Spread too small. Minimum: {MIN_BUY_SPREAD}%. Current: {spread_percent}%"
                    )
                
                # Calculate locked price with spread
                locked_price = market_price_gbp * (1 + spread_percent / 100)
                
                # Calculate total payout (after fee)
                gross_payout = crypto_amount * locked_price
                fee_amount = gross_payout * (fee_percent / 100)
                net_payout = gross_payout - fee_amount
                
                quote_data = {
                    "gross_payout": round(gross_payout, 2),
                    "fee_amount": round(fee_amount, 2),
                    "net_payout": round(net_payout, 2),
                    "fee_percent": fee_percent
                }
            
            # Create quote
            quote_id = str(uuid.uuid4())
            expires_at = datetime.now(timezone.utc) + timedelta(minutes=self.quote_expiry_minutes)
            
            quote = {
                "quote_id": quote_id,
                "user_id": user_id,
                "trade_type": trade_type,
                "crypto_currency": crypto_currency,
                "crypto_amount": crypto_amount,
                "market_price_at_quote": market_price_gbp,
                "locked_price": locked_price,
                "spread_percent": spread_percent,
                "status": "pending",
                "created_at": datetime.now(timezone.utc).isoformat(),
                "expires_at": expires_at.isoformat(),
                **quote_data
            }
            
            # Store in dedicated collection
            insert_result = await self.db.admin_liquidity_quotes.insert_one(quote)
            
            # Remove MongoDB _id before returning
            quote.pop("_id", None)
            
            logger.info(
                f"✅ Generated admin liquidity quote: {quote_id} | "
                f"{trade_type.upper()} {crypto_amount} {crypto_currency} | "
                f"Market: £{market_price_gbp:.2f} | Locked: £{locked_price:.2f} | "
                f"Spread: {spread_percent}%"
            )
            
            return {
                "success": True,
                "quote": quote,
                "valid_for_seconds": self.quote_expiry_minutes * 60,
                "expires_at": expires_at.isoformat()
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error generating quote: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
    
    async def execute_quote(self, quote_id: str, user_id: str) -> Dict:
        """
        Execute quote at LOCKED price
        
        Args:
            quote_id: Quote to execute
            user_id: User executing quote
        
        Returns:
            Execution result
        """
        try:
            # Fetch quote
            quote = await self.db.admin_liquidity_quotes.find_one(
                {"quote_id": quote_id},
                {"_id": 0}
            )
            
            if not quote:
                raise HTTPException(status_code=404, detail="Quote not found")
            
            # Verify ownership
            if quote["user_id"] != user_id:
                raise HTTPException(status_code=403, detail="Not your quote")
            
            # Check expiry
            expires_at = datetime.fromisoformat(quote["expires_at"])
            if datetime.now(timezone.utc) > expires_at:
                await self.db.admin_liquidity_quotes.update_one(
                    {"quote_id": quote_id},
                    {"$set": {"status": "expired"}}
                )
                raise HTTPException(
                    status_code=400,
                    detail="Quote expired. Please generate a new quote."
                )
            
            # Check status
            if quote["status"] != "pending":
                raise HTTPException(
                    status_code=400,
                    detail=f"Quote already {quote['status']}"
                )
            
            # Execute using LOCKED values
            locked_price = quote["locked_price"]
            crypto_amount = quote["crypto_amount"]
            crypto_currency = quote["crypto_currency"]
            trade_type = quote["trade_type"]
            
            logger.info(
                f"🔒 Executing quote {quote_id} at LOCKED price £{locked_price:.2f} | "
                f"{trade_type.upper()} {crypto_amount} {crypto_currency}"
            )
            
            # Execute settlement
            if trade_type == "buy":
                # User BUYS crypto from admin
                await self._execute_buy(user_id, quote)
            else:
                # User SELLS crypto to admin
                await self._execute_sell(user_id, quote)
            
            # Mark quote as executed
            await self.db.admin_liquidity_quotes.update_one(
                {"quote_id": quote_id},
                {
                    "$set": {
                        "status": "executed",
                        "executed_at": datetime.now(timezone.utc).isoformat()
                    }
                }
            )
            
            logger.info(f"✅ Quote {quote_id} executed successfully")
            
            return {
                "success": True,
                "message": "Trade executed at locked price",
                "quote_id": quote_id,
                "locked_price": locked_price,
                "crypto_amount": crypto_amount,
                "crypto_currency": crypto_currency,
                "trade_type": trade_type
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error executing quote: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
    
    async def _execute_buy(self, user_id: str, quote: Dict):
        """Execute user BUY (admin sells crypto)"""
        crypto_currency = quote["crypto_currency"]
        crypto_amount = quote["crypto_amount"]
        total_cost = quote["total_cost"]
        
        # Check user GBP balance
        user_balance = await self.db.internal_balances.find_one({
            "user_id": user_id,
            "currency": "GBP"
        })
        
        if not user_balance or user_balance.get("balance", 0) < total_cost:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient GBP balance. Need £{total_cost:.2f}"
            )
        
        # Check admin liquidity
        admin_wallet = await self.db.admin_liquidity_wallets.find_one(
            {"currency": crypto_currency}
        )
        
        if not admin_wallet or admin_wallet.get("available", 0) < crypto_amount:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient admin liquidity for {crypto_currency}"
            )
        
        # Deduct GBP from user
        await self.db.internal_balances.update_one(
            {"user_id": user_id, "currency": "GBP"},
            {"$inc": {"balance": -total_cost}}
        )
        
        # Credit crypto to user
        await self.db.internal_balances.update_one(
            {"user_id": user_id, "currency": crypto_currency},
            {"$inc": {"balance": crypto_amount}},
            upsert=True
        )
        
        # Deduct crypto from admin liquidity
        await self.db.admin_liquidity_wallets.update_one(
            {"currency": crypto_currency},
            {
                "$inc": {
                    "balance": -crypto_amount,
                    "available": -crypto_amount
                },
                "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
            }
        )
        
        # Credit GBP to admin liquidity
        await self.db.admin_liquidity_wallets.update_one(
            {"currency": "GBP"},
            {
                "$inc": {
                    "balance": total_cost,
                    "available": total_cost
                },
                "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
            },
            upsert=True
        )
        
        # Calculate profit breakdown
        market_price = quote["market_price_at_quote"]
        spread_percent = quote["spread_percent"]
        fee_amount = quote.get("fee_amount", 0)
        
        # Spread profit = difference between locked price and market price
        spread_profit_gbp = (quote["locked_price"] - market_price) * crypto_amount
        
        transaction_id = str(uuid.uuid4())
        
        # Log transaction
        await self.db.admin_liquidity_transactions.insert_one({
            "transaction_id": transaction_id,
            "quote_id": quote["quote_id"],
            "user_id": user_id,
            "type": "admin_sell",
            "crypto_currency": crypto_currency,
            "crypto_amount": crypto_amount,
            "locked_price": quote["locked_price"],
            "market_price_at_quote": market_price,
            "spread_percent": spread_percent,
            "spread_profit_gbp": spread_profit_gbp,
            "fee_amount_gbp": fee_amount,
            "total_gbp": total_cost,
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
        
        # ═══════════════════════════════════════════════════════════════════════
        # CREDIT SPREAD PROFIT TO ADMIN REVENUE (BUSINESS DASHBOARD)
        # ═══════════════════════════════════════════════════════════════════════
        await self.db.admin_revenue.insert_one({
            "revenue_id": str(uuid.uuid4()),
            "source": "instant_buy_spread",
            "revenue_type": "SPREAD_PROFIT",
            "currency": "GBP",
            "amount": spread_profit_gbp,
            "crypto_currency": crypto_currency,
            "crypto_amount": crypto_amount,
            "market_price": market_price,
            "locked_price": quote["locked_price"],
            "spread_percent": spread_percent,
            "user_id": user_id,
            "related_transaction_id": transaction_id,
            "quote_id": quote["quote_id"],
            "net_profit": spread_profit_gbp,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "description": f"Spread profit from Instant Buy: {spread_percent}% markup on {crypto_amount} {crypto_currency}"
        })
        
        # ═══════════════════════════════════════════════════════════════════════
        # CREDIT EXPRESS FEE TO ADMIN REVENUE
        # ═══════════════════════════════════════════════════════════════════════
        if fee_amount > 0:
            await self.db.admin_revenue.insert_one({
                "revenue_id": str(uuid.uuid4()),
                "source": "instant_buy_fee",
                "revenue_type": "FEE_REVENUE",
                "currency": "GBP",
                "amount": fee_amount,
                "fee_percent": quote.get("fee_percent", 1.0),
                "crypto_currency": crypto_currency,
                "user_id": user_id,
                "related_transaction_id": transaction_id,
                "quote_id": quote["quote_id"],
                "net_profit": fee_amount,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "description": f"Express fee from Instant Buy: {quote.get('fee_percent', 1.0)}% on {crypto_currency}"
            })
            
            # ═══════════════════════════════════════════════════════════════════
            # PROCESS REFERRAL COMMISSION ON THE FEE (NOT ON SPREAD)
            # ═══════════════════════════════════════════════════════════════════
            try:
                if get_referral_engine:
                    referral_engine = get_referral_engine()
                    if referral_engine:
                        await referral_engine.process_referral_commission(
                            user_id=user_id,
                            fee_amount=fee_amount,
                            fee_type="INSTANT_BUY",
                            currency="GBP",
                            related_transaction_id=transaction_id,
                            metadata={
                                "crypto_currency": crypto_currency,
                                "crypto_amount": crypto_amount,
                                "quote_id": quote["quote_id"]
                            }
                        )
                        logger.info(f"✅ Referral commission processed for Instant Buy fee £{fee_amount}")
            except Exception as ref_err:
                logger.warning(f"⚠️ Referral commission failed for Instant Buy: {ref_err}")
        
        logger.info(f"✅ Instant Buy revenue logged: Spread £{spread_profit_gbp:.2f} + Fee £{fee_amount:.2f} = Total £{spread_profit_gbp + fee_amount:.2f}")
    
    async def _execute_sell(self, user_id: str, quote: Dict):
        """Execute user SELL (admin buys crypto)"""
        crypto_currency = quote["crypto_currency"]
        crypto_amount = quote["crypto_amount"]
        net_payout = quote["net_payout"]
        
        # Check user crypto balance
        user_balance = await self.db.internal_balances.find_one({
            "user_id": user_id,
            "currency": crypto_currency
        })
        
        if not user_balance or user_balance.get("balance", 0) < crypto_amount:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient {crypto_currency} balance. Need {crypto_amount}"
            )
        
        # Check admin GBP liquidity
        admin_wallet = await self.db.admin_liquidity_wallets.find_one(
            {"currency": "GBP"}
        )
        
        if not admin_wallet or admin_wallet.get("available", 0) < net_payout:
            raise HTTPException(
                status_code=400,
                detail="Insufficient admin GBP liquidity"
            )
        
        # Deduct crypto from user
        await self.db.internal_balances.update_one(
            {"user_id": user_id, "currency": crypto_currency},
            {"$inc": {"balance": -crypto_amount}}
        )
        
        # Credit GBP to user
        await self.db.internal_balances.update_one(
            {"user_id": user_id, "currency": "GBP"},
            {"$inc": {"balance": net_payout}},
            upsert=True
        )
        
        # Credit crypto to admin liquidity
        await self.db.admin_liquidity_wallets.update_one(
            {"currency": crypto_currency},
            {
                "$inc": {
                    "balance": crypto_amount,
                    "available": crypto_amount
                },
                "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
            },
            upsert=True
        )
        
        # Deduct GBP from admin liquidity
        await self.db.admin_liquidity_wallets.update_one(
            {"currency": "GBP"},
            {
                "$inc": {
                    "balance": -net_payout,
                    "available": -net_payout
                },
                "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
            }
        )
        
        # Calculate profit breakdown for SELL
        # When user sells: Admin buys BELOW market = profit from spread
        market_price = quote["market_price_at_quote"]
        spread_percent = quote["spread_percent"]  # This is NEGATIVE for buys
        fee_amount = quote.get("fee_amount", 0)
        gross_payout = quote.get("gross_payout", net_payout + fee_amount)
        
        # Spread profit = market value - what admin pays = (market - locked) * amount
        # Since spread is negative, locked_price < market_price, so admin profits
        spread_profit_gbp = (market_price - quote["locked_price"]) * crypto_amount
        
        transaction_id = str(uuid.uuid4())
        
        # Log transaction
        await self.db.admin_liquidity_transactions.insert_one({
            "transaction_id": transaction_id,
            "quote_id": quote["quote_id"],
            "user_id": user_id,
            "type": "admin_buy",
            "crypto_currency": crypto_currency,
            "crypto_amount": crypto_amount,
            "locked_price": quote["locked_price"],
            "market_price_at_quote": market_price,
            "spread_percent": spread_percent,
            "spread_profit_gbp": spread_profit_gbp,
            "fee_amount_gbp": fee_amount,
            "total_gbp": net_payout,
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
        
        # ═══════════════════════════════════════════════════════════════════════
        # CREDIT SPREAD PROFIT TO ADMIN REVENUE (BUSINESS DASHBOARD)
        # ═══════════════════════════════════════════════════════════════════════
        await self.db.admin_revenue.insert_one({
            "revenue_id": str(uuid.uuid4()),
            "source": "instant_sell_spread",
            "revenue_type": "SPREAD_PROFIT",
            "currency": "GBP",
            "amount": spread_profit_gbp,
            "crypto_currency": crypto_currency,
            "crypto_amount": crypto_amount,
            "market_price": market_price,
            "locked_price": quote["locked_price"],
            "spread_percent": spread_percent,
            "user_id": user_id,
            "related_transaction_id": transaction_id,
            "quote_id": quote["quote_id"],
            "net_profit": spread_profit_gbp,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "description": f"Spread profit from Instant Sell: {abs(spread_percent)}% discount buying {crypto_amount} {crypto_currency}"
        })
        
        # ═══════════════════════════════════════════════════════════════════════
        # CREDIT INSTANT SELL FEE TO ADMIN REVENUE
        # ═══════════════════════════════════════════════════════════════════════
        if fee_amount > 0:
            await self.db.admin_revenue.insert_one({
                "revenue_id": str(uuid.uuid4()),
                "source": "instant_sell_fee",
                "revenue_type": "FEE_REVENUE",
                "currency": "GBP",
                "amount": fee_amount,
                "fee_percent": quote.get("fee_percent", 1.0),
                "crypto_currency": crypto_currency,
                "user_id": user_id,
                "related_transaction_id": transaction_id,
                "quote_id": quote["quote_id"],
                "net_profit": fee_amount,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "description": f"Fee from Instant Sell: {quote.get('fee_percent', 1.0)}% on {crypto_currency}"
            })
            
            # ═══════════════════════════════════════════════════════════════════
            # PROCESS REFERRAL COMMISSION ON THE FEE
            # ═══════════════════════════════════════════════════════════════════
            try:
                if get_referral_engine:
                    referral_engine = get_referral_engine()
                    if referral_engine:
                        await referral_engine.process_referral_commission(
                            user_id=user_id,
                            fee_amount=fee_amount,
                            fee_type="INSTANT_SELL",
                            currency="GBP",
                            related_transaction_id=transaction_id,
                            metadata={
                                "crypto_currency": crypto_currency,
                                "crypto_amount": crypto_amount,
                                "quote_id": quote["quote_id"]
                            }
                        )
                        logger.info(f"✅ Referral commission processed for Instant Sell fee £{fee_amount}")
            except Exception as ref_err:
                logger.warning(f"⚠️ Referral commission failed for Instant Sell: {ref_err}")
        
        logger.info(f"✅ Instant Sell revenue logged: Spread £{spread_profit_gbp:.2f} + Fee £{fee_amount:.2f} = Total £{spread_profit_gbp + fee_amount:.2f}")
    
    async def _get_live_market_price(self, crypto_currency: str) -> float:
        """
        Get live market price in GBP
        Uses same source as dashboard for consistency
        """
        # PRIORITY 1: Try database prices first (most reliable)
        try:
            currency_doc = await self.db.currencies.find_one(
                {"symbol": crypto_currency},
                {"_id": 0}
            )
            
            if currency_doc:
                gbp_price = currency_doc.get("gbp_price") or currency_doc.get("current_price", 0)
                if gbp_price > 0:
                    logger.info(f"📊 Price for {crypto_currency}: £{gbp_price} (from database)")
                    return gbp_price
        except Exception as db_err:
            logger.warning(f"Database price lookup failed: {db_err}")
        
        # PRIORITY 2: Try cached prices from price service
        try:
            from price_service import get_cached_prices
            
            prices = await get_cached_prices()
            crypto_price_usd = prices['crypto_prices'].get(crypto_currency, 0)
            
            if crypto_price_usd > 0:
                fx_rates = prices['fx_rates']
                gbp_rate = fx_rates.get('GBP', 0.79)
                gbp_price = crypto_price_usd * gbp_rate
                logger.info(f"📊 Price for {crypto_currency}: £{gbp_price} (from cache)")
                return gbp_price
        except Exception as cache_err:
            logger.warning(f"Cache price lookup failed: {cache_err}")
        
        # PRIORITY 3: Hardcoded fallback prices
        fallback_prices = {
            "BTC": 69000, "ETH": 2180, "USDT": 0.79, "SOL": 95,
            "XRP": 1.66, "ADA": 0.32, "DOGE": 0.10, "BNB": 490
        }
        
        if crypto_currency in fallback_prices:
            price = fallback_prices[crypto_currency]
            logger.warning(f"⚠️ Using fallback price for {crypto_currency}: £{price}")
            return price
        
        logger.error(f"❌ No price available for {crypto_currency}")
        return 0

# Singleton instance
_quote_service = None

def get_quote_service(db):
    """Get singleton quote service"""
    global _quote_service
    if _quote_service is None:
        _quote_service = AdminLiquidityQuoteService(db)
    return _quote_service
