"""
FAQ / Help Center System
Provides FAQ management with categories, search, and admin editing
"""
from datetime import datetime, timezone
from typing import Optional, List, Dict
from pydantic import BaseModel, Field
import uuid

class FAQItem(BaseModel):
    faq_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    category: str
    question: str
    answer: str
    order: int = 0
    is_published: bool = True
    views: int = 0
    helpful_count: int = 0
    not_helpful_count: int = 0
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    
class FAQCategory(BaseModel):
    category_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: Optional[str] = None
    icon: Optional[str] = None
    order: int = 0
    faq_count: int = 0

# Default FAQ Categories
DEFAULT_CATEGORIES = [
    {"name": "P2P Trading", "description": "Peer-to-peer trading questions", "icon": "🤝", "order": 1},
    {"name": "Express Buy", "description": "Quick crypto purchase questions", "icon": "⚡", "order": 2},
    {"name": "Spot Trading", "description": "Trading pairs and orders", "icon": "📈", "order": 3},
    {"name": "Swap", "description": "Cryptocurrency swapping", "icon": "🔄", "order": 4},
    {"name": "Deposit & Withdrawals", "description": "Moving funds in and out", "icon": "💰", "order": 5},
    {"name": "Disputes", "description": "Dispute resolution process", "icon": "⚖️", "order": 6},
    {"name": "Fees", "description": "Platform fees and pricing", "icon": "💵", "order": 7},
    {"name": "Security", "description": "Account and fund security", "icon": "🔒", "order": 8},
    {"name": "Staking", "description": "Staking rewards and process", "icon": "🎯", "order": 9},
]

# Default FAQ Items
DEFAULT_FAQS = [
    # P2P Trading
    {
        "category": "P2P Trading",
        "question": "How does P2P trading work?",
        "answer": "P2P trading connects buyers and sellers directly. You can create offers or respond to existing offers. Funds are held in escrow until both parties confirm the transaction.",
        "order": 1
    },
    {
        "category": "P2P Trading",
        "question": "Is P2P trading safe?",
        "answer": "Yes. All transactions use escrow protection. Funds are held securely until both parties confirm completion. We also have a dispute resolution system for any issues.",
        "order": 2
    },
    {
        "category": "P2P Trading",
        "question": "What payment methods are supported?",
        "answer": "We support various payment methods including Bank Transfer, PayPal, Wise, Revolut, and many local payment options. Available methods depend on your region.",
        "order": 3
    },
    
    # Express Buy
    {
        "category": "Express Buy",
        "question": "What is Express Buy?",
        "answer": "Express Buy allows you to purchase crypto instantly at current market rates. It's the fastest way to buy crypto without creating trades or waiting for sellers.",
        "order": 1
    },
    {
        "category": "Express Buy",
        "question": "How long does Express Buy take?",
        "answer": "Express Buy transactions are processed instantly. Your crypto will be credited to your wallet within seconds of payment confirmation.",
        "order": 2
    },
    
    # Spot Trading
    {
        "category": "Spot Trading",
        "question": "What is Spot Trading?",
        "answer": "Spot trading allows you to buy and sell cryptocurrencies at current market prices. You can place market orders for instant execution or limit orders at your desired price.",
        "order": 1
    },
    {
        "category": "Spot Trading",
        "question": "What trading pairs are available?",
        "answer": "We support multiple trading pairs including BTC/GBP, ETH/GBP, USDT/GBP, BNB/GBP, SOL/GBP, and more. New pairs are added regularly based on demand.",
        "order": 2
    },
    
    # Swap
    {
        "category": "Swap",
        "question": "How does crypto swapping work?",
        "answer": "Swapping allows you to exchange one cryptocurrency for another instantly. Enter the amount you want to swap, review the exchange rate, and confirm the transaction.",
        "order": 1
    },
    {
        "category": "Swap",
        "question": "Are there fees for swapping?",
        "answer": "Yes, there is a small service fee for swaps. The fee is included in the exchange rate shown, so you always see exactly what you'll receive.",
        "order": 2
    },
    
    # Deposits & Withdrawals
    {
        "category": "Deposit & Withdrawals",
        "question": "How do I deposit crypto?",
        "answer": "Navigate to Wallet > Deposit, select your cryptocurrency, and you'll receive a unique deposit address. Send your crypto to this address from any wallet or exchange.",
        "order": 1
    },
    {
        "category": "Deposit & Withdrawals",
        "question": "How long do withdrawals take?",
        "answer": "Crypto withdrawals are processed within 30 minutes during business hours. Blockchain confirmation times vary by network, typically 10-60 minutes.",
        "order": 2
    },
    {
        "category": "Deposit & Withdrawals",
        "question": "Are there withdrawal fees?",
        "answer": "Yes, there is a small network fee to cover blockchain transaction costs. The fee varies by cryptocurrency and network congestion.",
        "order": 3
    },
    
    # Disputes
    {
        "category": "Disputes",
        "question": "When should I open a dispute?",
        "answer": "Open a dispute if the seller hasn't released your crypto after you've paid, or if there's any issue with the P2P transaction that you can't resolve directly with the other party.",
        "order": 1
    },
    {
        "category": "Disputes",
        "question": "How long does dispute resolution take?",
        "answer": "Most disputes are resolved within 24-48 hours. Complex cases may take up to 5 business days. Our support team reviews all evidence and makes a fair decision.",
        "order": 2
    },
    
    # Fees
    {
        "category": "Fees",
        "question": "What are the trading fees?",
        "answer": "Our platform uses competitive fees for all services. Fees are automatically calculated and included in your transaction preview before you confirm.",
        "order": 1
    },
    {
        "category": "Fees",
        "question": "Are fees the same for all users?",
        "answer": "Fees may vary based on transaction volume and payment method. Higher volume traders may qualify for reduced fees.",
        "order": 2
    },
    
    # Security
    {
        "category": "Security",
        "question": "How is my account protected?",
        "answer": "We use industry-standard security including encryption, 2FA (two-factor authentication), and cold storage for crypto assets. You can enable additional security features in your account settings.",
        "order": 1
    },
    {
        "category": "Security",
        "question": "What is 2FA and should I enable it?",
        "answer": "2FA (two-factor authentication) adds an extra layer of security by requiring a code from your phone when logging in. We strongly recommend enabling it for all users.",
        "order": 2
    },
    
    # Staking
    {
        "category": "Staking",
        "question": "What is crypto staking?",
        "answer": "Staking allows you to earn rewards by holding and 'staking' your cryptocurrencies. Your coins help secure the blockchain network, and you earn passive income in return.",
        "order": 1
    },
    {
        "category": "Staking",
        "question": "Which coins can I stake?",
        "answer": "We support staking for ETH, BNB, SOL, MATIC, and other proof-of-stake cryptocurrencies. Staking rewards and lock-up periods vary by coin.",
        "order": 2
    },
]
