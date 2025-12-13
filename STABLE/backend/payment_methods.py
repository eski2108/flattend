"""
Payment Methods System for P2P Trading
Supports multiple payment method types with custom fields per type
"""

from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, Dict, Any
from datetime import datetime, timezone
import uuid

class PaymentMethod(BaseModel):
    """Payment method for P2P trades"""
    model_config = ConfigDict(extra="ignore")
    
    payment_method_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    method_type: str  # "UK Bank Transfer", "SEPA", "Revolut", "Wise", "PayPal", "Cash", "Other"
    nickname: str  # User-friendly name (e.g., "Barclays GBP account")
    currency: str  # GBP, EUR, USD, etc.
    is_active: bool = True
    
    # Dynamic fields based on method_type
    details: Dict[str, Any] = Field(default_factory=dict)
    # Examples:
    # UK Bank: {"account_holder": "", "sort_code": "", "account_number": "", "bank_name": ""}
    # SEPA: {"account_holder": "", "iban": "", "bic": "", "bank_name": ""}
    # Revolut/Wise: {"account_holder": "", "username": ""}
    # PayPal: {"paypal_email": ""}
    # Cash: {"city": "", "instructions": ""}
    
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class SellOffer(BaseModel):
    """P2P Sell Offer with floating or fixed pricing"""
    model_config = ConfigDict(extra="ignore")
    
    offer_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    seller_id: str
    
    # Asset
    crypto_asset: str  # BTC, ETH, USDT, etc.
    
    # Pricing
    pricing_mode: str  # "floating" or "fixed"
    price_margin: Optional[float] = None  # For floating: % above/below market (e.g., -2.0, +3.5)
    fixed_price: Optional[float] = None  # For fixed: manual price in fiat per 1 crypto unit
    
    # Quantity & Limits
    total_amount: float  # Total crypto available to sell
    min_order_fiat: float  # Minimum order size in fiat
    max_order_fiat: float  # Maximum order size in fiat
    
    # Currency
    fiat_currency: str  # GBP, EUR, USD, etc.
    
    # Payment methods (list of payment_method_ids)
    accepted_payment_methods: list[str] = Field(default_factory=list)
    
    # Terms
    payment_time_limit: int = 30  # minutes
    seller_terms: str = ""  # Auto message / trade instructions
    
    # Status
    is_published: bool = False
    is_fast_payment: bool = False  # Fast Payment tag
    
    # Stats
    total_trades: int = 0
    completed_trades: int = 0
    
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# Payment method type configurations
PAYMENT_METHOD_TYPES = {
    "UK Bank Transfer": {
        "currencies": ["GBP"],
        "required_fields": ["account_holder", "sort_code", "account_number"],
        "optional_fields": ["bank_name"]
    },
    "SEPA Bank Transfer": {
        "currencies": ["EUR"],
        "required_fields": ["account_holder", "iban", "bic"],
        "optional_fields": ["bank_name"]
    },
    "Revolut": {
        "currencies": ["GBP", "EUR", "USD"],
        "required_fields": ["account_holder", "username"],
        "optional_fields": []
    },
    "Wise": {
        "currencies": ["GBP", "EUR", "USD"],
        "required_fields": ["account_holder", "email"],
        "optional_fields": []
    },
    "PayPal": {
        "currencies": ["GBP", "EUR", "USD"],
        "required_fields": ["paypal_email"],
        "optional_fields": []
    },
    "Cash in Person": {
        "currencies": ["GBP", "EUR", "USD"],
        "required_fields": ["city", "instructions"],
        "optional_fields": []
    },
    "Other": {
        "currencies": ["GBP", "EUR", "USD"],
        "required_fields": ["account_holder", "details"],
        "optional_fields": []
    }
}
