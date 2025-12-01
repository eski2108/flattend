# Enhanced P2P Marketplace Models and Utilities
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict
from datetime import datetime, timezone
import uuid

# Global Payment Methods Configuration
GLOBAL_PAYMENT_METHODS = {
    # UK & Europe
    "faster_payments": {
        "id": "faster_payments",
        "name": "Faster Payments",
        "region": "UK",
        "estimated_time_minutes": 30,
        "icon": "🏦"
    },
    "sepa": {
        "id": "sepa",
        "name": "SEPA",
        "region": "EU",
        "estimated_time_minutes": 60,
        "icon": "🇪🇺"
    },
    "sepa_instant": {
        "id": "sepa_instant",
        "name": "SEPA Instant",
        "region": "EU",
        "estimated_time_minutes": 10,
        "icon": "⚡"
    },
    
    # Global Wire Transfers
    "swift": {
        "id": "swift",
        "name": "SWIFT",
        "region": "Global",
        "estimated_time_minutes": 240,
        "icon": "🌍"
    },
    "wire_transfer": {
        "id": "wire_transfer",
        "name": "Wire Transfer",
        "region": "Global",
        "estimated_time_minutes": 120,
        "icon": "💳"
    },
    
    # US Payment Methods
    "ach": {
        "id": "ach",
        "name": "ACH Transfer",
        "region": "USA",
        "estimated_time_minutes": 180,
        "icon": "🇺🇸"
    },
    "zelle": {
        "id": "zelle",
        "name": "Zelle",
        "region": "USA",
        "estimated_time_minutes": 15,
        "icon": "⚡"
    },
    "venmo": {
        "id": "venmo",
        "name": "Venmo",
        "region": "USA",
        "estimated_time_minutes": 10,
        "icon": "💙"
    },
    "cash_app": {
        "id": "cash_app",
        "name": "Cash App",
        "region": "USA",
        "estimated_time_minutes": 10,
        "icon": "💵"
    },
    
    # Canada
    "interac": {
        "id": "interac",
        "name": "Interac e-Transfer",
        "region": "Canada",
        "estimated_time_minutes": 30,
        "icon": "🇨🇦"
    },
    
    # Digital Wallets & Neobanks
    "wise": {
        "id": "wise",
        "name": "Wise",
        "region": "Global",
        "estimated_time_minutes": 60,
        "icon": "💸"
    },
    "revolut": {
        "id": "revolut",
        "name": "Revolut",
        "region": "EU/UK/USA",
        "estimated_time_minutes": 15,
        "icon": "🔄"
    },
    "paypal": {
        "id": "paypal",
        "name": "PayPal",
        "region": "Global",
        "estimated_time_minutes": 30,
        "icon": "💰"
    },
    "skrill": {
        "id": "skrill",
        "name": "Skrill",
        "region": "Global",
        "estimated_time_minutes": 30,
        "icon": "💳"
    },
    "neteller": {
        "id": "neteller",
        "name": "Neteller",
        "region": "Global",
        "estimated_time_minutes": 30,
        "icon": "💼"
    },
    "payoneer": {
        "id": "payoneer",
        "name": "Payoneer",
        "region": "Global",
        "estimated_time_minutes": 60,
        "icon": "🌐"
    },
    
    # Latin America
    "pix": {
        "id": "pix",
        "name": "PIX",
        "region": "Brazil",
        "estimated_time_minutes": 5,
        "icon": "🇧🇷"
    },
    "mercado_pago": {
        "id": "mercado_pago",
        "name": "Mercado Pago",
        "region": "Latin America",
        "estimated_time_minutes": 15,
        "icon": "💙"
    },
    "nequi": {
        "id": "nequi",
        "name": "Nequi",
        "region": "Colombia",
        "estimated_time_minutes": 10,
        "icon": "🇨🇴"
    },
    
    # Asia
    "upi": {
        "id": "upi",
        "name": "UPI",
        "region": "India",
        "estimated_time_minutes": 10,
        "icon": "🇮🇳"
    },
    "paytm": {
        "id": "paytm",
        "name": "Paytm",
        "region": "India",
        "estimated_time_minutes": 15,
        "icon": "💳"
    },
    "imps": {
        "id": "imps",
        "name": "IMPS",
        "region": "India",
        "estimated_time_minutes": 10,
        "icon": "⚡"
    },
    "alipay": {
        "id": "alipay",
        "name": "Alipay",
        "region": "China",
        "estimated_time_minutes": 10,
        "icon": "🇨🇳"
    },
    "wechat_pay": {
        "id": "wechat_pay",
        "name": "WeChat Pay",
        "region": "China",
        "estimated_time_minutes": 10,
        "icon": "💚"
    },
    "gcash": {
        "id": "gcash",
        "name": "GCash",
        "region": "Philippines",
        "estimated_time_minutes": 10,
        "icon": "🇵🇭"
    },
    "paymaya": {
        "id": "paymaya",
        "name": "PayMaya",
        "region": "Philippines",
        "estimated_time_minutes": 10,
        "icon": "💳"
    },
    "grabpay": {
        "id": "grabpay",
        "name": "GrabPay",
        "region": "Southeast Asia",
        "estimated_time_minutes": 15,
        "icon": "🚗"
    },
    
    # Africa
    "m_pesa": {
        "id": "m_pesa",
        "name": "M-Pesa",
        "region": "Kenya/Africa",
        "estimated_time_minutes": 15,
        "icon": "🇰🇪"
    },
    "airtel_money": {
        "id": "airtel_money",
        "name": "Airtel Money",
        "region": "Africa",
        "estimated_time_minutes": 15,
        "icon": "📱"
    },
    "mtn_mobile_money": {
        "id": "mtn_mobile_money",
        "name": "MTN Mobile Money",
        "region": "Africa",
        "estimated_time_minutes": 15,
        "icon": "💛"
    },
    "chipper_cash": {
        "id": "chipper_cash",
        "name": "Chipper Cash",
        "region": "Africa",
        "estimated_time_minutes": 15,
        "icon": "🐿️"
    },
    
    # Australia & New Zealand
    "osko": {
        "id": "osko",
        "name": "Osko",
        "region": "Australia",
        "estimated_time_minutes": 10,
        "icon": "🇦🇺"
    },
    
    # Middle East
    "sadad": {
        "id": "sadad",
        "name": "Sadad",
        "region": "Saudi Arabia",
        "estimated_time_minutes": 30,
        "icon": "🇸🇦"
    },
    
    # Cash & Others
    "cash_in_person": {
        "id": "cash_in_person",
        "name": "Cash (In Person)",
        "region": "Local",
        "estimated_time_minutes": 60,
        "icon": "💵"
    },
    "gift_cards": {
        "id": "gift_cards",
        "name": "Gift Cards",
        "region": "Global",
        "estimated_time_minutes": 30,
        "icon": "🎁"
    },
    "western_union": {
        "id": "western_union",
        "name": "Western Union",
        "region": "Global",
        "estimated_time_minutes": 60,
        "icon": "🌎"
    },
    "moneygram": {
        "id": "moneygram",
        "name": "MoneyGram",
        "region": "Global",
        "estimated_time_minutes": 60,
        "icon": "💸"
    }
}

# Global Fiat Currencies Configuration
GLOBAL_CURRENCIES = {
    "GBP": {"symbol": "£", "name": "British Pound"},
    "USD": {"symbol": "$", "name": "US Dollar"},
    "EUR": {"symbol": "€", "name": "Euro"},
    "BRL": {"symbol": "R$", "name": "Brazilian Real"},
    "NGN": {"symbol": "₦", "name": "Nigerian Naira"},
    "INR": {"symbol": "₹", "name": "Indian Rupee"},
    "AED": {"symbol": "د.إ", "name": "UAE Dirham"},
    "CAD": {"symbol": "C$", "name": "Canadian Dollar"},
    "AUD": {"symbol": "A$", "name": "Australian Dollar"},
    "KES": {"symbol": "KSh", "name": "Kenyan Shilling"},
    "ZAR": {"symbol": "R", "name": "South African Rand"},
    "JPY": {"symbol": "¥", "name": "Japanese Yen"}
}

# Supported Cryptocurrencies
SUPPORTED_CRYPTOCURRENCIES = {
    "BTC": {"name": "Bitcoin", "icon": "₿", "decimals": 8},
    "ETH": {"name": "Ethereum", "icon": "Ξ", "decimals": 18},
    "USDT": {"name": "Tether", "icon": "₮", "decimals": 6},
    "BNB": {"name": "Binance Coin", "icon": "🔶", "decimals": 18},
    "SOL": {"name": "Solana", "icon": "◎", "decimals": 9},
    "XRP": {"name": "Ripple", "icon": "✕", "decimals": 6},
    "ADA": {"name": "Cardano", "icon": "₳", "decimals": 6},
    "DOGE": {"name": "Dogecoin", "icon": "Ð", "decimals": 8},
    "MATIC": {"name": "Polygon", "icon": "⬡", "decimals": 18},
    "LTC": {"name": "Litecoin", "icon": "Ł", "decimals": 8},
    "AVAX": {"name": "Avalanche", "icon": "🔺", "decimals": 18},
    "DOT": {"name": "Polkadot", "icon": "●", "decimals": 10}
}

# Seller Requirements/Tags
class SellerRequirement(BaseModel):
    """Advertiser requirements/tags"""
    model_config = ConfigDict(extra="ignore")
    
    requirement_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tag: str  # "kyc_required", "uk_banks_only", "verified_only", etc.
    label: str  # Display label
    description: Optional[str] = None

# Enhanced Sell Order with Requirements
class EnhancedSellOrder(BaseModel):
    """Enhanced sell order with global support"""
    model_config = ConfigDict(extra="ignore")
    
    order_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    seller_id: str  # User ID
    crypto_currency: str  # BTC, ETH, USDT
    crypto_amount: float
    fiat_currency: str  # GBP, USD, EUR, etc.
    price_per_unit: float
    min_purchase: float
    max_purchase: float
    payment_methods: List[str]  # List of payment method IDs
    seller_requirements: List[Dict] = []  # List of requirement tags
    status: str = "active"  # active, completed, cancelled
    escrow_locked: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    completed_at: Optional[datetime] = None

# Seller Profile/Stats
class SellerProfile(BaseModel):
    """Seller profile with stats"""
    model_config = ConfigDict(extra="ignore")
    
    user_id: str
    username: str
    is_verified: bool = False
    total_trades: int = 0
    completed_trades: int = 0
    completion_rate: float = 0.0  # Percentage
    average_release_time_minutes: int = 0  # Average time to release crypto
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    last_trade_at: Optional[datetime] = None

# Trade (Buy Order with Escrow)
class Trade(BaseModel):
    """Trade with full escrow support"""
    model_config = ConfigDict(extra="ignore")
    
    trade_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    sell_order_id: str
    buyer_id: str
    seller_id: str
    crypto_currency: str
    crypto_amount: float
    fiat_currency: str
    fiat_amount: float
    price_per_unit: float
    payment_method: str
    buyer_wallet_address: str  # NEW: Buyer's external wallet address for receiving crypto
    buyer_wallet_network: Optional[str] = None  # NEW: Network type (ERC20, TRC20, BEP20, etc.)
    status: str = "pending_payment"  # pending_payment, buyer_marked_paid, released, cancelled, disputed, expired
    escrow_locked: bool = False
    timer_minutes: int = 30  # Default 30 minutes
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    payment_deadline: datetime
    buyer_marked_paid_at: Optional[datetime] = None
    released_at: Optional[datetime] = None
    cancelled_at: Optional[datetime] = None
    expired_at: Optional[datetime] = None
    disputed_at: Optional[datetime] = None

# Trade Chat Message
class TradeMessage(BaseModel):
    """Chat messages within a trade"""
    model_config = ConfigDict(extra="ignore")
    
    message_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    trade_id: str
    sender_id: str
    sender_role: str  # buyer, seller
    message: str
    attachment_url: Optional[str] = None  # URL to download the attachment
    attachment_name: Optional[str] = None  # Original filename
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Request Models
class PreviewOrderRequest(BaseModel):
    """Request to preview an order before confirming"""
    sell_order_id: str
    buyer_id: str
    crypto_amount: float

class CreateTradeRequest(BaseModel):
    """Request to create a trade (after preview confirmation)"""
    sell_order_id: str
    buyer_id: str
    crypto_amount: float
    payment_method: str
    buyer_wallet_address: str  # NEW: External wallet address where buyer will receive crypto
    buyer_wallet_network: Optional[str] = None  # NEW: Network type (optional)
    is_express: bool = False  # NEW: Flag for express mode trades (auto-matched)

class MarkPaidRequest(BaseModel):
    """Request to mark trade as paid"""
    trade_id: str
    buyer_id: str
    payment_reference: Optional[str] = None

class ReleaseCryptoRequest(BaseModel):
    """Request to release crypto from escrow"""
    trade_id: str
    seller_id: str

class CancelTradeRequest(BaseModel):
    """Request to cancel a trade"""
    trade_id: str
    user_id: str
    reason: Optional[str] = None
