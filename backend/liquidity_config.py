"""
Liquidity Configuration - Core Coins and Helpers

CORE_LIQUIDITY_COINS: Only these coins are available for Instant Buy (pre-funded platform liquidity)
All other coins must use Express Buy (USDT → target coin via NowPayments)

RULES:
- Instant Buy = ONLY core coins (BTC, ETH, USDT, USDC)
- Express Buy = ALL other coins via USDT conversion
- NO P2P fallback anywhere
- If liquidity insufficient → return error (no auto-routing)
"""

from typing import Set, List

# ============================================================================
# CORE LIQUIDITY COINS - PLATFORM PRE-FUNDED INVENTORY
# ONLY these coins are available for Instant Buy (direct platform delivery)
# All other coins require Express Buy (conversion via NowPayments, 2-5 min)
# ============================================================================
CORE_LIQUIDITY_COINS: Set[str] = {"BTC", "ETH", "USDT", "USDC"}

# Conversion source for Express Buy (non-core coins)
EXPRESS_CONVERSION_SOURCE: str = "USDT"

# Delivery time estimates
DELIVERY_TIME_INSTANT: str = "Instant"
DELIVERY_TIME_EXPRESS: str = "2-5 minutes"

# Express order timeout (for polling/webhook)
EXPRESS_ORDER_TIMEOUT_MINUTES: int = 15


def is_core_coin(symbol: str) -> bool:
    """
    Check if a coin is a core liquidity coin (eligible for Instant Buy)
    
    Args:
        symbol: Cryptocurrency symbol (e.g., "BTC", "ETH")
    
    Returns:
        True if the coin is a core coin, False otherwise
    """
    return symbol.upper() in CORE_LIQUIDITY_COINS


def get_core_coins_list() -> List[str]:
    """
    Get list of core coins for API responses
    
    Returns:
        Sorted list of core coin symbols
    """
    return sorted(list(CORE_LIQUIDITY_COINS))


def validate_instant_buy_coin(symbol: str) -> tuple:
    """
    Validate if a coin is eligible for Instant Buy
    
    Args:
        symbol: Cryptocurrency symbol
    
    Returns:
        Tuple of (is_valid, error_dict or None)
    """
    if is_core_coin(symbol):
        return True, None
    else:
        return False, {
            "error": "coin_not_supported_for_instant",
            "message": f"{symbol} is not available for Instant Buy. Only core coins are supported.",
            "allowed": get_core_coins_list()
        }


def validate_express_buy_coin(symbol: str) -> tuple:
    """
    Validate if a coin should use Express Buy
    
    Core coins should NOT use Express Buy (they use Instant Buy)
    Non-core coins MUST use Express Buy
    
    Args:
        symbol: Cryptocurrency symbol
    
    Returns:
        Tuple of (is_valid, error_dict or None)
    """
    if is_core_coin(symbol):
        return False, {
            "error": "coin_uses_instant_buy",
            "message": f"{symbol} is a core coin and should use Instant Buy, not Express Buy.",
            "redirect_to": "instant_buy"
        }
    else:
        return True, None
