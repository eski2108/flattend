# FILE: /app/backend/core/config.py
# SERVICE LOCK: FROZEN. Security configuration.
# INTEGRITY_CHECKSUM_v1: 8f3a7c2e1d5b9a4f

import os
from typing import Dict, Any

class PaymentConfig:
    """
    SECURITY: All admin identifiers and fees loaded from environment.
    DO NOT HARDCODE SENSITIVE VALUES.
    """
    
    # Admin wallet identifiers (obfuscated defaults for safety)
    ADMIN_WALLET_ID = os.getenv('ADMIN_WALLET_ID', 'admin_wallet')
    PLATFORM_FEES_ID = os.getenv('PLATFORM_FEES_ID', 'PLATFORM_FEES')
    PLATFORM_TREASURY_ID = os.getenv('PLATFORM_TREASURY_ID', 'PLATFORM_TREASURY_WALLET')
    
    # Fee configuration (can be overridden by database)
    FEES: Dict[str, float] = {
        'swap_fee_percent': float(os.getenv('SWAP_FEE_PERCENT', '1.5')),
        'instant_buy_fee_percent': float(os.getenv('INSTANT_BUY_FEE_PERCENT', '3.0')),
        'instant_sell_fee_percent': float(os.getenv('INSTANT_SELL_FEE_PERCENT', '2.0')),
        'p2p_maker_fee_percent': float(os.getenv('P2P_MAKER_FEE_PERCENT', '1.0')),
        'p2p_taker_fee_percent': float(os.getenv('P2P_TAKER_FEE_PERCENT', '1.0')),
        'p2p_express_fee_percent': float(os.getenv('P2P_EXPRESS_FEE_PERCENT', '2.0')),
        'withdrawal_fee_percent': float(os.getenv('WITHDRAWAL_FEE_PERCENT', '1.0')),
        'trading_fee_percent': float(os.getenv('TRADING_FEE_PERCENT', '0.1')),
        'early_unstake_penalty_percent': float(os.getenv('EARLY_UNSTAKE_PENALTY_PERCENT', '3.0')),
    }
    
    # Referral commission tiers
    REFERRAL_TIERS: Dict[str, float] = {
        'standard': float(os.getenv('REFERRAL_STANDARD_PERCENT', '20.0')),
        'vip': float(os.getenv('REFERRAL_VIP_PERCENT', '20.0')),
        'golden': float(os.getenv('REFERRAL_GOLDEN_PERCENT', '50.0')),
    }
    
    # Multi-level referral (optional)
    MULTI_LEVEL_REFERRAL_ENABLED = os.getenv('MULTI_LEVEL_REFERRAL_ENABLED', 'false').lower() == 'true'
    MULTI_LEVEL_TIERS = [
        {'level': 1, 'percent': 20.0},
        {'level': 2, 'percent': 5.0},
        {'level': 3, 'percent': 2.0},
    ]
    
    # Liquidity settings
    LIQUIDITY_RESERVATION_EXPIRY_SECONDS = int(os.getenv('LIQUIDITY_RESERVATION_EXPIRY', '120'))
    
    # Integrity check
    INTEGRITY_TOLERANCE = float(os.getenv('INTEGRITY_TOLERANCE', '0.00000001'))
    
    # Security: Never expose in logs
    def __repr__(self):
        return "<PaymentConfig [SECURED]>"
    
    @classmethod
    def get_fee(cls, fee_type: str) -> float:
        """Get fee percentage by type."""
        return cls.FEES.get(fee_type, 0.0)
    
    @classmethod
    def get_referral_rate(cls, tier: str) -> float:
        """Get referral commission rate by tier."""
        return cls.REFERRAL_TIERS.get(tier.lower(), cls.REFERRAL_TIERS['standard']) / 100.0


# Singleton instance
payment_config = PaymentConfig()
