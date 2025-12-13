"""
Pydantic Validation Models for CoinHubX API
All request/response models with strict validation
"""

from pydantic import BaseModel, Field, validator, EmailStr
from typing import Optional, List, Dict
from decimal import Decimal
from datetime import datetime

# ==================== AUTH MODELS ====================

class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=100)
    
class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=100)
    phone: str = Field(..., pattern=r'^\+?[1-9]\d{1,14}$')  # E.164 format
    referral_code: Optional[str] = Field(None, max_length=50)

# ==================== PAYMENT MODELS ====================

class DepositRequest(BaseModel):
    user_id: str = Field(..., min_length=1, max_length=100)
    currency: str = Field(..., pattern=r'^[A-Z]{2,10}$')  # BTC, ETH, etc
    amount: Decimal = Field(..., gt=0, max_digits=18, decimal_places=8)
    
    @validator('amount')
    def validate_amount(cls, v):
        if v <= 0:
            raise ValueError('Amount must be positive')
        if v > Decimal('1000000'):  # Max deposit limit
            raise ValueError('Amount exceeds maximum limit')
        return v

class WithdrawRequest(BaseModel):
    user_id: str = Field(..., min_length=1, max_length=100)
    currency: str = Field(..., pattern=r'^[A-Z]{2,10}$')
    amount: Decimal = Field(..., gt=0, max_digits=18, decimal_places=8)
    address: str = Field(..., min_length=10, max_length=200)
    otp_code: Optional[str] = Field(None, pattern=r'^\d{6}$')
    
    @validator('amount')
    def validate_amount(cls, v):
        if v <= 0:
            raise ValueError('Amount must be positive')
        return v

class SwapRequest(BaseModel):
    user_id: str = Field(..., min_length=1, max_length=100)
    from_currency: str = Field(..., pattern=r'^[A-Z]{2,10}$')
    to_currency: str = Field(..., pattern=r'^[A-Z]{2,10}$')
    from_amount: Decimal = Field(..., gt=0, max_digits=18, decimal_places=8)
    
    @validator('from_amount')
    def validate_amount(cls, v):
        if v <= 0:
            raise ValueError('Amount must be positive')
        return v
    
    @validator('to_currency')
    def validate_different_currencies(cls, v, values):
        if 'from_currency' in values and v == values['from_currency']:
            raise ValueError('Cannot swap to the same currency')
        return v

class AdminLiquidityQuoteRequest(BaseModel):
    user_id: str = Field(..., min_length=1, max_length=100)
    type: str = Field(..., pattern=r'^(buy|sell)$')
    crypto: str = Field(..., pattern=r'^[A-Z]{2,10}$')
    amount: Decimal = Field(..., gt=0, max_digits=18, decimal_places=8)

class AdminLiquidityExecuteRequest(BaseModel):
    user_id: str = Field(..., min_length=1, max_length=100)
    quote_id: str = Field(..., min_length=1, max_length=100)

# ==================== P2P MODELS ====================

class P2POrderRequest(BaseModel):
    user_id: str = Field(..., min_length=1, max_length=100)
    crypto: str = Field(..., pattern=r'^[A-Z]{2,10}$')
    amount: Decimal = Field(..., gt=0, max_digits=18, decimal_places=8)
    fiat_amount: Decimal = Field(..., gt=0, max_digits=18, decimal_places=2)
    payment_method: str = Field(..., min_length=1, max_length=50)

class P2PMarkPaidRequest(BaseModel):
    trade_id: str = Field(..., min_length=1, max_length=100)
    user_id: str = Field(..., min_length=1, max_length=100)

class P2PReleaseRequest(BaseModel):
    trade_id: str = Field(..., min_length=1, max_length=100)
    seller_id: str = Field(..., min_length=1, max_length=100)

# ==================== WALLET MODELS ====================

class WalletCreditRequest(BaseModel):
    user_id: str = Field(..., min_length=1, max_length=100)
    currency: str = Field(..., pattern=r'^[A-Z]{2,10}$')
    amount: Decimal = Field(..., gt=0, max_digits=18, decimal_places=8)
    transaction_type: str = Field(..., max_length=50)
    reference: Optional[str] = Field(None, max_length=200)

class WalletValidationRequest(BaseModel):
    user_id: str = Field(..., min_length=1, max_length=100)
    currency: str = Field(..., pattern=r'^[A-Z]{2,10}$')
    amount: Decimal = Field(..., gt=0)

# ==================== TRADING MODELS ====================

class SpotTradeRequest(BaseModel):
    user_id: str = Field(..., min_length=1, max_length=100)
    pair: str = Field(..., pattern=r'^[A-Z]+/[A-Z]+$')  # BTC/GBP
    side: str = Field(..., pattern=r'^(buy|sell)$')
    amount: Decimal = Field(..., gt=0, max_digits=18, decimal_places=8)
    order_type: str = Field(..., pattern=r'^(market|limit)$')
    limit_price: Optional[Decimal] = Field(None, gt=0)

# ==================== ADMIN MODELS ====================

class AdminLiquidityAddRequest(BaseModel):
    currency: str = Field(..., pattern=r'^[A-Z]{2,10}$')
    amount: Decimal = Field(..., gt=0, max_digits=18, decimal_places=8)
    admin_id: str = Field(..., min_length=1, max_length=100)

class AdminWithdrawalReviewRequest(BaseModel):
    withdrawal_id: str = Field(..., min_length=1, max_length=100)
    status: str = Field(..., pattern=r'^(approved|rejected)$')
    admin_id: str = Field(..., min_length=1, max_length=100)
    notes: Optional[str] = Field(None, max_length=500)

# ==================== RESPONSE MODELS ====================

class SuccessResponse(BaseModel):
    success: bool = True
    message: str
    data: Optional[Dict] = None

class ErrorResponse(BaseModel):
    success: bool = False
    message: str
    error_code: Optional[str] = None
