# Trader System for Express Mode and Manual Mode P2P Trading
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict
from datetime import datetime, timezone
import uuid

class TraderProfile(BaseModel):
    """Trader profile for P2P marketplace"""
    user_id: str
    is_trader: bool = False
    is_online: bool = False
    completion_rate: float = 0.0  # Percentage (0-100)
    total_trades: int = 0
    successful_trades: int = 0
    rating: float = 0.0  # Average rating (0-5)
    total_ratings: int = 0
    average_response_time_minutes: float = 0.0
    max_daily_trades: int = 10
    available_payment_methods: List[str] = []
    verified_phone: bool = False
    verified_email: bool = False
    verified_id: bool = False
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    last_seen: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    
    model_config = ConfigDict(extra='forbid')


class TraderAdvert(BaseModel):
    """Active buy/sell advert created by a trader"""
    advert_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    trader_id: str
    advert_type: str  # 'buy' or 'sell'
    cryptocurrency: str  # 'BTC', 'ETH', 'USDT'
    fiat_currency: str  # 'USD', 'EUR', 'GBP'
    price_per_unit: float  # Price in fiat per 1 crypto unit
    min_order_amount: float  # Minimum trade amount in fiat
    max_order_amount: float  # Maximum trade amount in fiat
    available_amount_crypto: float  # How much crypto trader has available
    payment_methods: List[str]  # Accepted payment methods
    payment_time_limit_minutes: int = 30  # How long buyer has to pay
    terms_and_conditions: str = ""
    is_active: bool = True
    is_online: bool = True
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    
    model_config = ConfigDict(extra='forbid')


class ExpressMatchRequest(BaseModel):
    """Request for Express Mode auto-matching"""
    user_id: str
    action: str  # 'buy' or 'sell'
    cryptocurrency: str  # 'BTC', 'ETH', 'USDT'
    fiat_currency: str  # 'USD', 'EUR', 'GBP'
    amount_fiat: float  # Amount in fiat currency
    payment_method: Optional[str] = None  # Preferred payment method
    
    model_config = ConfigDict(extra='forbid')


class ExpressMatchResponse(BaseModel):
    """Response from Express Mode matching"""
    success: bool
    matched: bool
    advert: Optional[TraderAdvert] = None
    trader_profile: Optional[Dict] = None
    message: str = ""
    
    model_config = ConfigDict(extra='forbid')


def calculate_trader_score(
    trader_profile: Dict,
    price: float,
    amount_fiat: float,
    advert: Dict
) -> float:
    """
    Calculate a matching score for a trader based on multiple factors.
    Higher score = better match for Express Mode.
    
    Scoring factors:
    - Price competitiveness (40 points max)
    - Completion rate (25 points max)
    - Online status (15 points max)
    - Response time (10 points max)
    - Rating (10 points max)
    """
    score = 0.0
    
    # 1. Price score (40 points) - for buy orders, lower price is better
    # Assume we have a reference price (current market price)
    # For now, we'll use price directly - lower is better for buyers
    max_price_score = 40
    # Simplified: if price is reasonable, give full points
    # In production, compare to market price
    score += max_price_score
    
    # 2. Completion rate (25 points)
    completion_rate = trader_profile.get('completion_rate', 0)
    score += (completion_rate / 100) * 25
    
    # 3. Online status (15 points)
    is_online = trader_profile.get('is_online', False) or advert.get('is_online', False)
    if is_online:
        score += 15
    
    # 4. Response time (10 points)
    # Lower response time = better score
    avg_response_minutes = trader_profile.get('average_response_time_minutes', 999)
    if avg_response_minutes < 5:
        score += 10
    elif avg_response_minutes < 15:
        score += 7
    elif avg_response_minutes < 30:
        score += 4
    else:
        score += 1
    
    # 5. Rating (10 points)
    rating = trader_profile.get('rating', 0)
    score += (rating / 5) * 10
    
    return score


async def find_best_match_express(
    db,
    action: str,
    cryptocurrency: str,
    fiat_currency: str,
    amount_fiat: float,
    payment_method: Optional[str] = None
) -> Optional[Dict]:
    """
    Find the best matching trader for Express Mode.
    
    For 'buy' action: Find best seller
    For 'sell' action: Find best buyer
    
    CRITICAL: Only matches traders with sufficient available_balance
    """
    from escrow_balance_system import get_trader_balance
    
    # Determine what type of advert we're looking for
    advert_type = 'sell' if action == 'buy' else 'buy'
    
    # Build query
    query = {
        'advert_type': advert_type,
        'cryptocurrency': cryptocurrency,
        'fiat_currency': fiat_currency,
        'is_active': True,
        'is_online': True,  # MUST be online
        'min_order_amount': {'$lte': amount_fiat},
        'max_order_amount': {'$gte': amount_fiat}
    }
    
    # Filter by payment method if specified
    if payment_method:
        query['payment_methods'] = payment_method
    
    # Get all matching adverts
    adverts = await db.trader_adverts.find(query, {'_id': 0}).to_list(100)
    
    if not adverts:
        return None
    
    # Score each advert (with balance check)
    scored_adverts = []
    for advert in adverts:
        trader_id = advert['trader_id']
        
        # Get trader profile
        trader = await db.trader_profiles.find_one(
            {'user_id': trader_id},
            {'_id': 0}
        )
        
        if not trader:
            continue
        
        # CRITICAL: Check available balance
        # Calculate required crypto amount for this trade
        price_per_unit = advert['price_per_unit']
        required_crypto = amount_fiat / price_per_unit
        
        # Get trader's balance
        balance = await get_trader_balance(db, trader_id, cryptocurrency)
        
        if not balance:
            continue  # Skip traders with no balance record
        
        available = balance.get('available_balance', 0.0)
        
        if available < required_crypto:
            continue  # Skip traders without enough available balance
        
        # Calculate score
        score = calculate_trader_score(
            trader_profile=trader,
            price=advert['price_per_unit'],
            amount_fiat=amount_fiat,
            advert=advert
        )
        
        scored_adverts.append({
            'advert': advert,
            'trader': trader,
            'balance': balance,
            'required_crypto': required_crypto,
            'score': score
        })
    
    if not scored_adverts:
        return None
    
    # Sort by score (highest first) and price (for buy: lowest, for sell: highest)
    if action == 'buy':
        # For buyers, prioritize low price
        scored_adverts.sort(key=lambda x: (-x['score'], x['advert']['price_per_unit']))
    else:
        # For sellers, prioritize high price
        scored_adverts.sort(key=lambda x: (-x['score'], -x['advert']['price_per_unit']))
    
    # Return the best match
    best_match = scored_adverts[0]
    return {
        'advert': best_match['advert'],
        'trader': best_match['trader'],
        'balance': best_match['balance'],
        'required_crypto': best_match['required_crypto'],
        'match_score': best_match['score']
    }
