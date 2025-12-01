from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
from decimal import Decimal
from email_service import email_service


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Platform Configuration
PLATFORM_CONFIG = {
    "lender_interest_rate": 5.0,  # Lenders earn 5%
    "borrower_interest_rate": 12.0,  # Borrowers pay 12%
    "platform_spread": 7.0,  # Platform keeps 7%
    "deposit_fee_percent": 0.5,
    "borrow_fee_percent": 1.0,
    "repay_fee_percent": 0.3,
    "withdraw_fee_percent": 1.5,  # 1.5% withdrawal fee - AUTOMATED
    "liquidation_fee_percent": 10.0,
    "liquidation_penalty_percent": 5.0,
    "min_collateral_ratio": 150,  # 150% collateralization required
    "liquidation_threshold": 120,  # Liquidate if below 120%
    # Admin/Platform wallet for fee collection
    "admin_wallet_id": "admin_platform_wallet_001",
    "admin_email": "admin@coinhubx.com"
}

# Define Models
class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    wallet_address: str
    total_deposited: float = 0.0
    total_borrowed: float = 0.0
    total_earned: float = 0.0
    available_balance: float = 0.0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Crypto Bank Models
class CryptoBalance(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    balance_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str  # References UserAccount.user_id
    currency: str  # BTC, ETH, USDT
    balance: float = 0.0
    locked_balance: float = 0.0  # For pending withdrawals
    last_updated: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CryptoTransaction(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    transaction_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    currency: str  # BTC, ETH, USDT
    transaction_type: str  # deposit, withdrawal, transfer
    amount: float
    status: str = "pending"  # pending, completed, failed
    reference: Optional[str] = None  # External transaction reference
    fee: float = 0.0
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    completed_at: Optional[datetime] = None

class OnboardingStatus(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    user_id: str
    account_created: bool = True
    wallet_setup: bool = False
    first_deposit: bool = False
    completed_at: Optional[datetime] = None

class LoanOffer(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    offer_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    lender_address: str
    amount: float
    interest_rate: float  # APR
    duration_days: int
    status: str = "available"  # available, matched, completed, cancelled
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Loan(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    loan_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    offer_id: Optional[str] = None
    lender_address: str
    borrower_address: str
    loan_amount: float
    collateral_amount: float
    interest_rate: float
    duration_days: int
    collateral_ratio: float
    status: str = "active"  # active, repaid, liquidated, defaulted
    borrow_fee: float = 0.0
    repay_fee: float = 0.0
    total_interest: float = 0.0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    due_date: datetime
    repaid_at: Optional[datetime] = None

class Transaction(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    tx_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_address: str
    tx_type: str  # deposit, withdraw, lend, borrow, repay, liquidate, buy_crypto, sell_crypto
    amount: float
    fee: float = 0.0
    loan_id: Optional[str] = None
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    status: str = "completed"

class BankAccount(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    account_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    wallet_address: str
    bank_name: str
    account_number: str
    account_holder_name: str
    routing_number: Optional[str] = None
    verified: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CryptoSellOrder(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    order_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    seller_address: str
    crypto_amount: float
    price_per_unit: float  # USD per ETH
    min_purchase: float = 0.01
    max_purchase: float = 10.0
    payment_methods: List[str] = ["bank_transfer"]
    status: str = "active"  # active, matched, completed, cancelled
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CryptoBuyOrder(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    order_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    buyer_address: str
    seller_address: str
    sell_order_id: str
    crypto_amount: float
    total_price: float
    status: str = "pending_payment"  # pending_payment, marked_as_paid, payment_submitted, completed, cancelled, disputed, resolved
    payment_reference: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    payment_deadline: datetime
    completed_at: Optional[datetime] = None
    marked_paid_at: Optional[datetime] = None
    disputed_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None

class Dispute(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    dispute_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    order_id: str
    initiated_by: str  # buyer or seller wallet address
    reason: str
    status: str = "open"  # open, under_review, resolved, closed
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    resolved_at: Optional[datetime] = None
    resolved_by: Optional[str] = None  # admin address
    resolution: Optional[str] = None

class DisputeEvidence(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    evidence_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    dispute_id: str
    uploaded_by: str  # wallet address
    evidence_type: str  # screenshot, bank_statement, message
    file_url: Optional[str] = None
    description: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class DisputeMessage(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    message_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    dispute_id: str
    sender_address: str
    sender_role: str  # buyer, seller, admin
    message: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Notification(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    notification_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_address: str
    order_id: str
    notification_type: str  # marked_paid, dispute_started, crypto_released, message_received
    message: str
    read: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserAccount(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    user_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    password_hash: str
    full_name: str
    wallet_address: Optional[str] = None
    role: str = "user"  # user, admin
    email_verified: bool = False
    kyc_verified: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    last_login: Optional[datetime] = None
    reset_token: Optional[str] = None
    reset_token_expires: Optional[datetime] = None


# Phase 2: Enhanced Features Models
class PaymentMethod(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    method_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    method_type: str  # bank_transfer, paypal, revolut, wise, cashapp
    details: dict  # Account info, varies by method
    is_verified: bool = False
    is_primary: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class KYCVerification(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    verification_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    tier: int = 1  # 1=basic (£500/day), 2=intermediate (£5000/day), 3=advanced (unlimited)
    status: str = "pending"  # pending, approved, rejected
    documents_submitted: list = []
    verified_at: Optional[datetime] = None
    daily_limit: float = 500.0
    monthly_limit: float = 10000.0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TwoFactorAuth(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    user_id: str
    enabled: bool = False
    method: str = "none"  # none, totp, sms, email
    secret: Optional[str] = None
    backup_codes: list = []
    last_verified: Optional[datetime] = None

# Request/Response Models
class ConnectWalletRequest(BaseModel):
    wallet_address: str

class DepositRequest(BaseModel):
    wallet_address: str
    amount: float

class WithdrawRequest(BaseModel):
    wallet_address: str
    amount: float

class CreateLoanOfferRequest(BaseModel):
    lender_address: str
    amount: float
    duration_days: int

class BorrowRequest(BaseModel):
    borrower_address: str
    offer_id: str
    collateral_amount: float

class RepayLoanRequest(BaseModel):
    borrower_address: str
    loan_id: str

class LiquidateRequest(BaseModel):
    liquidator_address: str
    loan_id: str

class AddBankAccountRequest(BaseModel):
    wallet_address: str
    bank_name: str
    account_number: str
    account_holder_name: str
    routing_number: Optional[str] = None

class CreateSellOrderRequest(BaseModel):
    seller_address: str
    crypto_amount: float
    price_per_unit: float
    min_purchase: float = 0.01
    max_purchase: float = 10.0

class CreateBuyOrderRequest(BaseModel):
    buyer_address: str
    sell_order_id: str
    crypto_amount: float

class ConfirmPaymentRequest(BaseModel):
    buyer_address: str
    order_id: str
    payment_reference: str

class ReleaseCryptoRequest(BaseModel):
    seller_address: str
    order_id: str

class MarkAsPaidRequest(BaseModel):
    buyer_address: str
    order_id: str
    payment_reference: str

class InitiateDisputeRequest(BaseModel):
    user_address: str
    order_id: str
    reason: str

class UploadEvidenceRequest(BaseModel):
    dispute_id: str
    uploaded_by: str
    evidence_type: str
    description: str
    file_url: Optional[str] = None

class SendDisputeMessageRequest(BaseModel):
    dispute_id: str
    sender_address: str
    sender_role: str
    message: str

class AdminResolveDisputeRequest(BaseModel):
    admin_address: str
    dispute_id: str
    order_id: str
    resolution: str  # release_to_buyer, release_to_seller, cancel_order
    admin_notes: str

class RegisterRequest(BaseModel):
    email: str
    password: str
    full_name: str
    wallet_address: Optional[str] = None

class LoginRequest(BaseModel):
    email: str
    password: str

class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    reset_token: str
    new_password: str

class AdminLoginRequest(BaseModel):
    email: str
    password: str
    admin_code: str

# Crypto Bank Request Models
class InitiateDepositRequest(BaseModel):
    user_id: str
    currency: str  # BTC, ETH, USDT
    amount: float

class InitiateWithdrawalRequest(BaseModel):
    user_id: str
    currency: str
    amount: float
    wallet_address: str

# Helper Functions
def calculate_interest(principal: float, rate: float, days: int) -> float:
    """Calculate simple interest"""
    return (principal * rate * days) / (365 * 100)

def calculate_collateral_ratio(collateral: float, loan: float) -> float:
    """Calculate collateral ratio as percentage"""
    if loan == 0:
        return 0
    return (collateral / loan) * 100

# API Routes
@api_router.get("/")
async def root():
    return {"message": "Crypto P2P Lending Platform API"}

@api_router.post("/auth/connect-wallet")
async def connect_wallet(request: ConnectWalletRequest):
    """Connect wallet and create/get user"""
    existing_user = await db.users.find_one({"wallet_address": request.wallet_address}, {"_id": 0})
    
    if existing_user:
        return {
            "success": True,
            "user": existing_user,
            "message": "Wallet connected"
        }
    
    # Create new user
    new_user = User(wallet_address=request.wallet_address)
    user_dict = new_user.model_dump()
    user_dict['created_at'] = user_dict['created_at'].isoformat()
    
    await db.users.insert_one(user_dict)
    
    return {
        "success": True,
        "user": new_user.model_dump(),
        "message": "New wallet registered"
    }

@api_router.post("/user/deposit")
async def deposit(request: DepositRequest):
    """Deposit crypto to platform"""
    if request.amount <= 0:
        raise HTTPException(status_code=400, detail="Invalid deposit amount")
    
    # Calculate deposit fee
    fee = request.amount * (PLATFORM_CONFIG["deposit_fee_percent"] / 100)
    net_amount = request.amount - fee
    
    # Update user balance
    result = await db.users.update_one(
        {"wallet_address": request.wallet_address},
        {
            "$inc": {
                "available_balance": net_amount,
                "total_deposited": request.amount
            }
        }
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Record transaction
    tx = Transaction(
        user_address=request.wallet_address,
        tx_type="deposit",
        amount=request.amount,
        fee=fee
    )
    tx_dict = tx.model_dump()
    tx_dict['timestamp'] = tx_dict['timestamp'].isoformat()
    await db.transactions.insert_one(tx_dict)
    
    return {
        "success": True,
        "amount": request.amount,
        "fee": fee,
        "net_amount": net_amount,
        "message": "Deposit successful"
    }

@api_router.post("/user/withdraw")
async def withdraw(request: WithdrawRequest):
    """Withdraw crypto from platform"""
    if request.amount <= 0:
        raise HTTPException(status_code=400, detail="Invalid withdrawal amount")
    
    # Get user
    user = await db.users.find_one({"wallet_address": request.wallet_address}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Calculate withdrawal fee
    fee = request.amount * (PLATFORM_CONFIG["withdraw_fee_percent"] / 100)
    total_needed = request.amount + fee
    
    if user["available_balance"] < total_needed:
        raise HTTPException(status_code=400, detail="Insufficient balance")
    
    # Update user balance
    await db.users.update_one(
        {"wallet_address": request.wallet_address},
        {"$inc": {"available_balance": -total_needed}}
    )
    
    # Record transaction
    tx = Transaction(
        user_address=request.wallet_address,
        tx_type="withdraw",
        amount=request.amount,
        fee=fee
    )
    tx_dict = tx.model_dump()
    tx_dict['timestamp'] = tx_dict['timestamp'].isoformat()
    await db.transactions.insert_one(tx_dict)
    
    return {
        "success": True,
        "amount": request.amount,
        "fee": fee,
        "message": "Withdrawal successful"
    }

@api_router.post("/loans/create-offer")
async def create_loan_offer(request: CreateLoanOfferRequest):
    """Create a loan offer (lend crypto)"""
    if request.amount <= 0:
        raise HTTPException(status_code=400, detail="Invalid loan amount")
    
    # Get user
    user = await db.users.find_one({"wallet_address": request.lender_address}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user["available_balance"] < request.amount:
        raise HTTPException(status_code=400, detail="Insufficient balance")
    
    # Lock the funds
    await db.users.update_one(
        {"wallet_address": request.lender_address},
        {"$inc": {"available_balance": -request.amount}}
    )
    
    # Create loan offer
    offer = LoanOffer(
        lender_address=request.lender_address,
        amount=request.amount,
        interest_rate=PLATFORM_CONFIG["lender_interest_rate"],
        duration_days=request.duration_days
    )
    
    offer_dict = offer.model_dump()
    offer_dict['created_at'] = offer_dict['created_at'].isoformat()
    await db.loan_offers.insert_one(offer_dict)
    
    return {
        "success": True,
        "offer": offer.model_dump(),
        "message": "Loan offer created"
    }

@api_router.get("/loans/offers")
async def get_loan_offers():
    """Get all available loan offers"""
    offers = await db.loan_offers.find({"status": "available"}, {"_id": 0}).to_list(1000)
    return {"success": True, "offers": offers}

@api_router.post("/loans/borrow")
async def borrow(request: BorrowRequest):
    """Accept a loan offer and borrow"""
    # Get offer
    offer = await db.loan_offers.find_one({"offer_id": request.offer_id}, {"_id": 0})
    if not offer or offer["status"] != "available":
        raise HTTPException(status_code=404, detail="Loan offer not available")
    
    loan_amount = offer["amount"]
    
    # Calculate required collateral
    required_collateral = (loan_amount * PLATFORM_CONFIG["min_collateral_ratio"]) / 100
    
    if request.collateral_amount < required_collateral:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient collateral. Required: {required_collateral}"
        )
    
    # Calculate fees and interest
    borrow_fee = loan_amount * (PLATFORM_CONFIG["borrow_fee_percent"] / 100)
    total_interest = calculate_interest(
        loan_amount,
        PLATFORM_CONFIG["borrower_interest_rate"],
        offer["duration_days"]
    )
    repay_fee = loan_amount * (PLATFORM_CONFIG["repay_fee_percent"] / 100)
    
    collateral_ratio = calculate_collateral_ratio(request.collateral_amount, loan_amount)
    
    # Create loan
    loan = Loan(
        offer_id=request.offer_id,
        lender_address=offer["lender_address"],
        borrower_address=request.borrower_address,
        loan_amount=loan_amount,
        collateral_amount=request.collateral_amount,
        interest_rate=PLATFORM_CONFIG["borrower_interest_rate"],
        duration_days=offer["duration_days"],
        collateral_ratio=collateral_ratio,
        borrow_fee=borrow_fee,
        repay_fee=repay_fee,
        total_interest=total_interest,
        due_date=datetime.now(timezone.utc) + timedelta(days=offer["duration_days"])
    )
    
    loan_dict = loan.model_dump()
    loan_dict['created_at'] = loan_dict['created_at'].isoformat()
    loan_dict['due_date'] = loan_dict['due_date'].isoformat()
    await db.loans.insert_one(loan_dict)
    
    # Update offer status
    await db.loan_offers.update_one(
        {"offer_id": request.offer_id},
        {"$set": {"status": "matched"}}
    )
    
    # Update borrower balance (receive loan - borrow fee)
    net_amount = loan_amount - borrow_fee
    await db.users.update_one(
        {"wallet_address": request.borrower_address},
        {
            "$inc": {
                "available_balance": net_amount,
                "total_borrowed": loan_amount
            }
        }
    )
    
    # Record transaction
    tx = Transaction(
        user_address=request.borrower_address,
        tx_type="borrow",
        amount=loan_amount,
        fee=borrow_fee,
        loan_id=loan.loan_id
    )
    tx_dict = tx.model_dump()
    tx_dict['timestamp'] = tx_dict['timestamp'].isoformat()
    await db.transactions.insert_one(tx_dict)
    
    return {
        "success": True,
        "loan": loan.model_dump(),
        "net_received": net_amount,
        "total_to_repay": loan_amount + total_interest + repay_fee,
        "message": "Loan borrowed successfully"
    }

@api_router.post("/loans/repay")
async def repay_loan(request: RepayLoanRequest):
    """Repay a loan"""
    # Get loan
    loan = await db.loans.find_one({"loan_id": request.loan_id}, {"_id": 0})
    if not loan or loan["status"] != "active":
        raise HTTPException(status_code=404, detail="Active loan not found")
    
    if loan["borrower_address"] != request.borrower_address:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Calculate total repayment
    total_repayment = loan["loan_amount"] + loan["total_interest"] + loan["repay_fee"]
    
    # Get borrower
    user = await db.users.find_one({"wallet_address": request.borrower_address}, {"_id": 0})
    if not user or user["available_balance"] < total_repayment:
        raise HTTPException(status_code=400, detail="Insufficient balance to repay")
    
    # Calculate lender earnings (principal + lender interest)
    lender_interest = calculate_interest(
        loan["loan_amount"],
        PLATFORM_CONFIG["lender_interest_rate"],
        loan["duration_days"]
    )
    lender_total = loan["loan_amount"] + lender_interest
    
    # Update borrower (deduct repayment, return collateral)
    await db.users.update_one(
        {"wallet_address": request.borrower_address},
        {
            "$inc": {
                "available_balance": -total_repayment + loan["collateral_amount"],
                "total_borrowed": -loan["loan_amount"]
            }
        }
    )
    
    # Update lender (return principal + interest)
    await db.users.update_one(
        {"wallet_address": loan["lender_address"]},
        {
            "$inc": {
                "available_balance": lender_total,
                "total_earned": lender_interest
            }
        }
    )
    
    # Update loan status
    await db.loans.update_one(
        {"loan_id": request.loan_id},
        {
            "$set": {
                "status": "repaid",
                "repaid_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    # Record transaction
    tx = Transaction(
        user_address=request.borrower_address,
        tx_type="repay",
        amount=total_repayment,
        fee=loan["repay_fee"],
        loan_id=request.loan_id
    )
    tx_dict = tx.model_dump()
    tx_dict['timestamp'] = tx_dict['timestamp'].isoformat()
    await db.transactions.insert_one(tx_dict)
    
    return {
        "success": True,
        "total_repaid": total_repayment,
        "collateral_returned": loan["collateral_amount"],
        "message": "Loan repaid successfully"
    }

@api_router.post("/loans/liquidate")
async def liquidate_loan(request: LiquidateRequest):
    """Liquidate an under-collateralized loan"""
    # Get loan
    loan = await db.loans.find_one({"loan_id": request.loan_id}, {"_id": 0})
    if not loan or loan["status"] != "active":
        raise HTTPException(status_code=404, detail="Active loan not found")
    
    # Check if eligible for liquidation
    if loan["collateral_ratio"] >= PLATFORM_CONFIG["liquidation_threshold"]:
        raise HTTPException(
            status_code=400,
            detail=f"Loan is not eligible for liquidation. Current ratio: {loan['collateral_ratio']}%"
        )
    
    # Calculate liquidation amounts
    liquidation_fee = loan["loan_amount"] * (PLATFORM_CONFIG["liquidation_fee_percent"] / 100)
    liquidation_penalty = loan["collateral_amount"] * (PLATFORM_CONFIG["liquidation_penalty_percent"] / 100)
    
    liquidator_reward = liquidation_fee
    collateral_to_lender = min(loan["collateral_amount"] - liquidation_penalty, loan["loan_amount"])
    remaining_collateral = loan["collateral_amount"] - liquidation_penalty - collateral_to_lender
    
    # Update lender (gets collateral up to loan amount)
    await db.users.update_one(
        {"wallet_address": loan["lender_address"]},
        {"$inc": {"available_balance": collateral_to_lender}}
    )
    
    # Reward liquidator
    await db.users.update_one(
        {"wallet_address": request.liquidator_address},
        {"$inc": {"available_balance": liquidator_reward}}
    )
    
    # Return remaining collateral to borrower (if any)
    if remaining_collateral > 0:
        await db.users.update_one(
            {"wallet_address": loan["borrower_address"]},
            {"$inc": {"available_balance": remaining_collateral}}
        )
    
    # Update loan status
    await db.loans.update_one(
        {"loan_id": request.loan_id},
        {"$set": {"status": "liquidated"}}
    )
    
    # Record transaction
    tx = Transaction(
        user_address=request.liquidator_address,
        tx_type="liquidate",
        amount=collateral_to_lender,
        fee=liquidation_fee,
        loan_id=request.loan_id
    )
    tx_dict = tx.model_dump()
    tx_dict['timestamp'] = tx_dict['timestamp'].isoformat()
    await db.transactions.insert_one(tx_dict)
    
    return {
        "success": True,
        "liquidation_fee": liquidation_fee,
        "liquidation_penalty": liquidation_penalty,
        "collateral_to_lender": collateral_to_lender,
        "remaining_to_borrower": remaining_collateral,
        "message": "Loan liquidated successfully"
    }

@api_router.get("/user/profile/{wallet_address}")
async def get_user_profile(wallet_address: str):
    """Get user profile and stats"""
    user = await db.users.find_one({"wallet_address": wallet_address}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get active loans as borrower
    active_borrows = await db.loans.find(
        {"borrower_address": wallet_address, "status": "active"},
        {"_id": 0}
    ).to_list(100)
    
    # Get active loans as lender
    active_lends = await db.loans.find(
        {"lender_address": wallet_address, "status": "active"},
        {"_id": 0}
    ).to_list(100)
    
    # Get pending offers
    pending_offers = await db.loan_offers.find(
        {"lender_address": wallet_address, "status": "available"},
        {"_id": 0}
    ).to_list(100)
    
    return {
        "success": True,
        "user": user,
        "active_borrows": active_borrows,
        "active_lends": active_lends,
        "pending_offers": pending_offers
    }

@api_router.get("/user/loans/{wallet_address}")
async def get_user_loans(wallet_address: str):
    """Get all user loans (as borrower or lender)"""
    # Get all loans
    borrows = await db.loans.find(
        {"borrower_address": wallet_address},
        {"_id": 0}
    ).to_list(1000)
    
    lends = await db.loans.find(
        {"lender_address": wallet_address},
        {"_id": 0}
    ).to_list(1000)
    
    return {
        "success": True,
        "borrows": borrows,
        "lends": lends
    }

@api_router.get("/user/transactions/{wallet_address}")
async def get_user_transactions(wallet_address: str):
    """Get user transaction history"""
    transactions = await db.transactions.find(
        {"user_address": wallet_address},
        {"_id": 0}
    ).sort("timestamp", -1).to_list(100)
    
    return {
        "success": True,
        "transactions": transactions
    }

@api_router.post("/bank/add")
async def add_bank_account(request: AddBankAccountRequest):
    """Add bank account for fiat transactions"""
    # Check if user exists
    user = await db.users.find_one({"wallet_address": request.wallet_address}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Create bank account
    bank_account = BankAccount(
        wallet_address=request.wallet_address,
        bank_name=request.bank_name,
        account_number=request.account_number,
        account_holder_name=request.account_holder_name,
        routing_number=request.routing_number,
        verified=True  # In production, this would require verification
    )
    
    account_dict = bank_account.model_dump()
    account_dict['created_at'] = account_dict['created_at'].isoformat()
    await db.bank_accounts.insert_one(account_dict)
    
    return {
        "success": True,
        "bank_account": bank_account.model_dump(),
        "message": "Bank account added successfully"
    }

@api_router.get("/bank/accounts/{wallet_address}")
async def get_bank_accounts(wallet_address: str):
    """Get user's bank accounts"""
    accounts = await db.bank_accounts.find(
        {"wallet_address": wallet_address},
        {"_id": 0}
    ).to_list(100)
    
    return {"success": True, "accounts": accounts}

@api_router.post("/crypto-market/sell/create")
async def create_sell_order(request: CreateSellOrderRequest):
    """Create a sell order to sell crypto for fiat"""
    # Check user balance
    user = await db.users.find_one({"wallet_address": request.seller_address}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user["available_balance"] < request.crypto_amount:
        raise HTTPException(status_code=400, detail="Insufficient balance")
    
    # Check if user has bank account
    bank_account = await db.bank_accounts.find_one({"wallet_address": request.seller_address}, {"_id": 0})
    if not bank_account:
        raise HTTPException(status_code=400, detail="Please add a bank account first")
    
    # Lock the crypto
    await db.users.update_one(
        {"wallet_address": request.seller_address},
        {"$inc": {"available_balance": -request.crypto_amount}}
    )
    
    # Create sell order
    sell_order = CryptoSellOrder(
        seller_address=request.seller_address,
        crypto_amount=request.crypto_amount,
        price_per_unit=request.price_per_unit,
        min_purchase=request.min_purchase,
        max_purchase=min(request.max_purchase, request.crypto_amount)
    )
    
    order_dict = sell_order.model_dump()
    order_dict['created_at'] = order_dict['created_at'].isoformat()
    await db.crypto_sell_orders.insert_one(order_dict)
    
    return {
        "success": True,
        "order": sell_order.model_dump(),
        "message": "Sell order created successfully"
    }

@api_router.get("/crypto-market/sell/orders")
async def get_sell_orders():
    """Get all active sell orders"""
    orders = await db.crypto_sell_orders.find(
        {"status": "active"},
        {"_id": 0}
    ).to_list(1000)
    
    return {"success": True, "orders": orders}

@api_router.post("/crypto-market/buy/create")
async def create_buy_order(request: CreateBuyOrderRequest):
    """Create a buy order (buyer wants to purchase crypto)"""
    # Get sell order
    sell_order = await db.crypto_sell_orders.find_one({"order_id": request.sell_order_id}, {"_id": 0})
    if not sell_order or sell_order["status"] != "active":
        raise HTTPException(status_code=404, detail="Sell order not available")
    
    # Validate amount
    if request.crypto_amount < sell_order["min_purchase"] or request.crypto_amount > sell_order["max_purchase"]:
        raise HTTPException(
            status_code=400,
            detail=f"Amount must be between {sell_order['min_purchase']} and {sell_order['max_purchase']} ETH"
        )
    
    if request.crypto_amount > sell_order["crypto_amount"]:
        raise HTTPException(status_code=400, detail="Not enough crypto available")
    
    # Check if buyer has bank account
    bank_account = await db.bank_accounts.find_one({"wallet_address": request.buyer_address}, {"_id": 0})
    if not bank_account:
        raise HTTPException(status_code=400, detail="Please add a bank account first")
    
    # Calculate total price
    total_price = request.crypto_amount * sell_order["price_per_unit"]
    
    # Create buy order
    buy_order = CryptoBuyOrder(
        buyer_address=request.buyer_address,
        seller_address=sell_order["seller_address"],
        sell_order_id=request.sell_order_id,
        crypto_amount=request.crypto_amount,
        total_price=total_price,
        payment_deadline=datetime.now(timezone.utc) + timedelta(minutes=30)
    )
    
    order_dict = buy_order.model_dump()
    order_dict['created_at'] = order_dict['created_at'].isoformat()
    order_dict['payment_deadline'] = order_dict['payment_deadline'].isoformat()
    await db.crypto_buy_orders.insert_one(order_dict)
    
    # Update sell order
    new_amount = sell_order["crypto_amount"] - request.crypto_amount
    if new_amount <= 0:
        await db.crypto_sell_orders.update_one(
            {"order_id": request.sell_order_id},
            {"$set": {"status": "matched", "crypto_amount": 0}}
        )
    else:
        await db.crypto_sell_orders.update_one(
            {"order_id": request.sell_order_id},
            {"$set": {"crypto_amount": new_amount}}
        )
    
    # Get seller's bank details
    seller_bank = await db.bank_accounts.find_one({"wallet_address": sell_order["seller_address"]}, {"_id": 0})
    
    return {
        "success": True,
        "order": buy_order.model_dump(),
        "seller_bank_details": {
            "bank_name": seller_bank["bank_name"],
            "account_holder": seller_bank["account_holder_name"],
            "account_number": seller_bank["account_number"],
            "routing_number": seller_bank.get("routing_number")
        },
        "payment_deadline": buy_order.payment_deadline.isoformat(),
        "message": "Buy order created. Please make bank transfer within 30 minutes"
    }

@api_router.post("/crypto-market/payment/mark-paid")
async def mark_as_paid(request: MarkAsPaidRequest):
    """Buyer marks payment as completed"""
    buy_order = await db.crypto_buy_orders.find_one({"order_id": request.order_id}, {"_id": 0})
    if not buy_order:
        raise HTTPException(status_code=404, detail="Buy order not found")
    
    if buy_order["buyer_address"] != request.buyer_address:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    if buy_order["status"] != "pending_payment":
        raise HTTPException(status_code=400, detail="Order is not pending payment")
    
    # Update order status to marked_as_paid
    await db.crypto_buy_orders.update_one(
        {"order_id": request.order_id},
        {
            "$set": {
                "status": "marked_as_paid",
                "payment_reference": request.payment_reference,
                "marked_paid_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    # Create notification for seller
    notification = Notification(
        user_address=buy_order["seller_address"],
        order_id=request.order_id,
        notification_type="marked_paid",
        message=f"Buyer has marked order {request.order_id[:8]} as paid. Please verify payment and release crypto."
    )
    notif_dict = notification.model_dump()
    notif_dict['created_at'] = notif_dict['created_at'].isoformat()
    await db.notifications.insert_one(notif_dict)
    
    return {
        "success": True,
        "message": "Payment marked as completed. Seller will be notified to release crypto."
    }

@api_router.post("/crypto-market/release")
async def release_crypto(request: ReleaseCryptoRequest):
    """Seller releases crypto from escrow after verifying payment"""
    buy_order = await db.crypto_buy_orders.find_one({"order_id": request.order_id}, {"_id": 0})
    if not buy_order:
        raise HTTPException(status_code=404, detail="Buy order not found")
    
    if buy_order["seller_address"] != request.seller_address:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    if buy_order["status"] not in ["marked_as_paid", "payment_submitted"]:
        raise HTTPException(status_code=400, detail="Payment not marked as paid")
    
    if buy_order["status"] == "disputed":
        raise HTTPException(status_code=400, detail="Order is under dispute. Only admin can release crypto.")
    
    # Transfer crypto from escrow to buyer
    await db.users.update_one(
        {"wallet_address": buy_order["buyer_address"]},
        {"$inc": {"available_balance": buy_order["crypto_amount"]}}
    )
    
    # Update order status
    await db.crypto_buy_orders.update_one(
        {"order_id": request.order_id},
        {
            "$set": {
                "status": "completed",
                "completed_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    # Create notification for buyer
    notification = Notification(
        user_address=buy_order["buyer_address"],
        order_id=request.order_id,
        notification_type="crypto_released",
        message=f"Crypto has been released! {buy_order['crypto_amount']} ETH added to your balance."
    )
    notif_dict = notification.model_dump()
    notif_dict['created_at'] = notif_dict['created_at'].isoformat()
    await db.notifications.insert_one(notif_dict)
    
    # Record transactions
    tx_sell = Transaction(
        user_address=buy_order["seller_address"],
        tx_type="sell_crypto",
        amount=buy_order["crypto_amount"],
        fee=0
    )
    tx_sell_dict = tx_sell.model_dump()
    tx_sell_dict['timestamp'] = tx_sell_dict['timestamp'].isoformat()
    await db.transactions.insert_one(tx_sell_dict)
    
    tx_buy = Transaction(
        user_address=buy_order["buyer_address"],
        tx_type="buy_crypto",
        amount=buy_order["crypto_amount"],
        fee=0
    )
    tx_buy_dict = tx_buy.model_dump()
    tx_buy_dict['timestamp'] = tx_buy_dict['timestamp'].isoformat()
    await db.transactions.insert_one(tx_buy_dict)
    
    return {
        "success": True,
        "message": "Crypto released from escrow successfully"
    }

@api_router.get("/crypto-market/orders/{wallet_address}")
async def get_user_crypto_orders(wallet_address: str):
    """Get user's buy and sell orders"""
    sell_orders = await db.crypto_sell_orders.find(
        {"seller_address": wallet_address},
        {"_id": 0}
    ).to_list(1000)
    
    buy_orders = await db.crypto_buy_orders.find(
        {"buyer_address": wallet_address},
        {"_id": 0}
    ).to_list(1000)
    
    return {
        "success": True,
        "sell_orders": sell_orders,
        "buy_orders": buy_orders
    }

@api_router.post("/disputes/initiate")
async def initiate_dispute(request: InitiateDisputeRequest):
    """Initiate a dispute on an order"""
    buy_order = await db.crypto_buy_orders.find_one({"order_id": request.order_id}, {"_id": 0})
    if not buy_order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Verify user is part of the order
    if request.user_address not in [buy_order["buyer_address"], buy_order["seller_address"]]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    if buy_order["status"] in ["completed", "cancelled"]:
        raise HTTPException(status_code=400, detail="Cannot dispute completed or cancelled orders")
    
    # Check if dispute already exists
    existing_dispute = await db.disputes.find_one({"order_id": request.order_id, "status": {"$in": ["open", "under_review"]}}, {"_id": 0})
    if existing_dispute:
        raise HTTPException(status_code=400, detail="Dispute already exists for this order")
    
    # Create dispute
    dispute = Dispute(
        order_id=request.order_id,
        initiated_by=request.user_address,
        reason=request.reason
    )
    dispute_dict = dispute.model_dump()
    dispute_dict['created_at'] = dispute_dict['created_at'].isoformat()
    await db.disputes.insert_one(dispute_dict)
    
    # Update order status
    await db.crypto_buy_orders.update_one(
        {"order_id": request.order_id},
        {
            "$set": {
                "status": "disputed",
                "disputed_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    # Notify both parties
    other_party = buy_order["seller_address"] if request.user_address == buy_order["buyer_address"] else buy_order["buyer_address"]
    
    notification = Notification(
        user_address=other_party,
        order_id=request.order_id,
        notification_type="dispute_started",
        message=f"A dispute has been opened for order {request.order_id[:8]}. Please provide evidence."
    )
    notif_dict = notification.model_dump()
    notif_dict['created_at'] = notif_dict['created_at'].isoformat()
    await db.notifications.insert_one(notif_dict)
    
    return {
        "success": True,
        "dispute": dispute.model_dump(),
        "message": "Dispute initiated. Crypto is now locked in escrow until resolution."
    }

@api_router.post("/disputes/evidence")
async def upload_evidence(request: UploadEvidenceRequest):
    """Upload evidence for a dispute"""
    dispute = await db.disputes.find_one({"dispute_id": request.dispute_id}, {"_id": 0})
    if not dispute:
        raise HTTPException(status_code=404, detail="Dispute not found")
    
    # Create evidence record
    evidence = DisputeEvidence(
        dispute_id=request.dispute_id,
        uploaded_by=request.uploaded_by,
        evidence_type=request.evidence_type,
        file_url=request.file_url,
        description=request.description
    )
    evidence_dict = evidence.model_dump()
    evidence_dict['created_at'] = evidence_dict['created_at'].isoformat()
    await db.dispute_evidence.insert_one(evidence_dict)
    
    return {
        "success": True,
        "evidence": evidence.model_dump(),
        "message": "Evidence uploaded successfully"
    }

@api_router.get("/disputes/{dispute_id}")
async def get_dispute(dispute_id: str):
    """Get dispute details with evidence and messages"""
    dispute = await db.disputes.find_one({"dispute_id": dispute_id}, {"_id": 0})
    if not dispute:
        raise HTTPException(status_code=404, detail="Dispute not found")
    
    # Get evidence
    evidence = await db.dispute_evidence.find(
        {"dispute_id": dispute_id},
        {"_id": 0}
    ).to_list(100)
    
    # Get messages
    messages = await db.dispute_messages.find(
        {"dispute_id": dispute_id},
        {"_id": 0}
    ).sort("created_at", 1).to_list(1000)
    
    return {
        "success": True,
        "dispute": dispute,
        "evidence": evidence,
        "messages": messages
    }

@api_router.post("/disputes/message")
async def send_dispute_message(request: SendDisputeMessageRequest):
    """Send a message in dispute chat"""
    dispute = await db.disputes.find_one({"dispute_id": request.dispute_id}, {"_id": 0})
    if not dispute:
        raise HTTPException(status_code=404, detail="Dispute not found")
    
    # Create message
    message = DisputeMessage(
        dispute_id=request.dispute_id,
        sender_address=request.sender_address,
        sender_role=request.sender_role,
        message=request.message
    )
    message_dict = message.model_dump()
    message_dict['created_at'] = message_dict['created_at'].isoformat()
    await db.dispute_messages.insert_one(message_dict)
    
    return {
        "success": True,
        "message": message.model_dump()
    }

@api_router.post("/admin/resolve-dispute")
async def admin_resolve_dispute(request: AdminResolveDisputeRequest):
    """Admin resolves a dispute and releases crypto from escrow"""
    # In production, verify admin credentials here
    # For now, we'll use a simple check
    
    dispute = await db.disputes.find_one({"dispute_id": request.dispute_id}, {"_id": 0})
    if not dispute:
        raise HTTPException(status_code=404, detail="Dispute not found")
    
    buy_order = await db.crypto_buy_orders.find_one({"order_id": request.order_id}, {"_id": 0})
    if not buy_order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if buy_order["status"] != "disputed":
        raise HTTPException(status_code=400, detail="Order is not disputed")
    
    # Handle resolution based on admin decision
    if request.resolution == "release_to_buyer":
        # Transfer crypto to buyer
        await db.users.update_one(
            {"wallet_address": buy_order["buyer_address"]},
            {"$inc": {"available_balance": buy_order["crypto_amount"]}}
        )
        
        # Update order
        await db.crypto_buy_orders.update_one(
            {"order_id": request.order_id},
            {
                "$set": {
                    "status": "resolved",
                    "resolved_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        
        # Notify buyer
        notification = Notification(
            user_address=buy_order["buyer_address"],
            order_id=request.order_id,
            notification_type="crypto_released",
            message=f"Dispute resolved in your favor. {buy_order['crypto_amount']} ETH released to your account."
        )
        notif_dict = notification.model_dump()
        notif_dict['created_at'] = notif_dict['created_at'].isoformat()
        await db.notifications.insert_one(notif_dict)
        
    elif request.resolution == "release_to_seller":
        # Return crypto to seller
        await db.users.update_one(
            {"wallet_address": buy_order["seller_address"]},
            {"$inc": {"available_balance": buy_order["crypto_amount"]}}
        )
        
        # Update order
        await db.crypto_buy_orders.update_one(
            {"order_id": request.order_id},
            {"$set": {"status": "cancelled"}}
        )
        
        # Notify seller
        notification = Notification(
            user_address=buy_order["seller_address"],
            order_id=request.order_id,
            notification_type="crypto_released",
            message=f"Dispute resolved in your favor. {buy_order['crypto_amount']} ETH returned to your account."
        )
        notif_dict = notification.model_dump()
        notif_dict['created_at'] = notif_dict['created_at'].isoformat()
        await db.notifications.insert_one(notif_dict)
    
    # Update dispute status
    await db.disputes.update_one(
        {"dispute_id": request.dispute_id},
        {
            "$set": {
                "status": "resolved",
                "resolved_at": datetime.now(timezone.utc).isoformat(),
                "resolved_by": request.admin_address,
                "resolution": request.admin_notes
            }
        }
    )
    
    return {
        "success": True,
        "message": f"Dispute resolved. Crypto {request.resolution.replace('_', ' ')}."
    }

@api_router.get("/notifications/{wallet_address}")
async def get_notifications(wallet_address: str):
    """Get user notifications"""
    notifications = await db.notifications.find(
        {"user_address": wallet_address},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    return {
        "success": True,
        "notifications": notifications
    }

@api_router.post("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str):
    """Mark notification as read"""
    await db.notifications.update_one(
        {"notification_id": notification_id},
        {"$set": {"read": True}}
    )
    
    return {"success": True}

@api_router.post("/auth/register")
async def register_user(request: RegisterRequest):
    """Register new user with email/password"""
    import hashlib
    
    # Check if email already exists
    existing = await db.user_accounts.find_one({"email": request.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Hash password (in production, use bcrypt or similar)
    password_hash = hashlib.sha256(request.password.encode()).hexdigest()
    
    # Create user account
    user_account = UserAccount(
        email=request.email,
        password_hash=password_hash,
        full_name=request.full_name,
        wallet_address=request.wallet_address
    )
    
    account_dict = user_account.model_dump()
    account_dict['created_at'] = account_dict['created_at'].isoformat()
    await db.user_accounts.insert_one(account_dict)
    
    # Create initial onboarding status
    onboarding = OnboardingStatus(user_id=user_account.user_id)
    onboarding_dict = onboarding.model_dump()
    await db.onboarding_status.insert_one(onboarding_dict)
    
    # Send welcome email
    try:
        await email_service.send_welcome_email(user_account.email, user_account.full_name)
    except Exception as e:
        logger.error(f"Failed to send welcome email: {str(e)}")
    
    return {
        "success": True,
        "user_id": user_account.user_id,
        "email": user_account.email,
        "message": "Registration successful"
    }

@api_router.post("/auth/login")
async def login_user(request: LoginRequest):
    """Login with email/password"""
    import hashlib
    
    # Find user
    user = await db.user_accounts.find_one({"email": request.email}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Verify password
    password_hash = hashlib.sha256(request.password.encode()).hexdigest()
    if user["password_hash"] != password_hash:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Update last login
    await db.user_accounts.update_one(
        {"email": request.email},
        {"$set": {"last_login": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {
        "success": True,
        "user": {
            "user_id": user["user_id"],
            "email": user["email"],
            "full_name": user["full_name"],
            "wallet_address": user.get("wallet_address"),
            "role": user.get("role", "user")
        },
        "message": "Login successful"
    }

@api_router.post("/auth/forgot-password")
async def forgot_password(request: ForgotPasswordRequest):
    """Send password reset token"""
    import secrets
    
    user = await db.user_accounts.find_one({"email": request.email}, {"_id": 0})
    if not user:
        # Don't reveal if email exists
        return {"success": True, "message": "If email exists, reset link will be sent"}
    
    # Generate reset token
    reset_token = secrets.token_urlsafe(32)
    reset_expires = datetime.now(timezone.utc) + timedelta(hours=1)
    
    await db.user_accounts.update_one(
        {"email": request.email},
        {
            "$set": {
                "reset_token": reset_token,
                "reset_token_expires": reset_expires.isoformat()
            }
        }
    )
    
    # In production: Send email with reset link
    # For demo: Return token
    return {
        "success": True,
        "message": "Password reset link sent to email",
        "reset_token": reset_token  # Remove in production
    }

@api_router.post("/auth/reset-password")
async def reset_password(request: ResetPasswordRequest):
    """Reset password with token"""
    import hashlib
    
    user = await db.user_accounts.find_one({"reset_token": request.reset_token}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    
    # Check if token expired
    if user.get("reset_token_expires"):
        expires = datetime.fromisoformat(user["reset_token_expires"])
        if datetime.now(timezone.utc) > expires:
            raise HTTPException(status_code=400, detail="Reset token expired")
    
    # Hash new password
    password_hash = hashlib.sha256(request.new_password.encode()).hexdigest()
    
    # Update password and clear reset token
    await db.user_accounts.update_one(
        {"reset_token": request.reset_token},
        {
            "$set": {"password_hash": password_hash},
            "$unset": {"reset_token": "", "reset_token_expires": ""}
        }
    )
    
    return {
        "success": True,
        "message": "Password reset successful"
    }

@api_router.post("/admin/login")
async def admin_login(request: AdminLoginRequest):
    """Admin login with special code"""
    import hashlib
    
    # Verify admin code (in production, use environment variable)
    ADMIN_CODE = "CRYPTOLEND_ADMIN_2025"
    if request.admin_code != ADMIN_CODE:
        raise HTTPException(status_code=403, detail="Invalid admin code")
    
    # Find user and verify password
    user = await db.user_accounts.find_one({"email": request.email}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    password_hash = hashlib.sha256(request.password.encode()).hexdigest()
    if user["password_hash"] != password_hash:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Update role to admin if not already
    if user.get("role") != "admin":
        await db.user_accounts.update_one(
            {"email": request.email},
            {"$set": {"role": "admin"}}
        )
    
    return {
        "success": True,
        "admin": {
            "user_id": user["user_id"],
            "email": user["email"],
            "full_name": user["full_name"],
            "role": "admin"
        },
        "message": "Admin login successful"
    }

@api_router.get("/admin/customers")
async def get_all_customers():
    """Get all registered customers (buyers and lenders)"""
    # Get all user accounts
    accounts = await db.user_accounts.find(
        {"role": {"$ne": "admin"}},
        {"_id": 0, "password_hash": 0, "reset_token": 0}
    ).to_list(10000)
    
    # Get wallet users
    wallet_users = await db.users.find({}, {"_id": 0}).to_list(10000)
    
    # Combine and enrich data
    customers = []
    
    for account in accounts:
        # Get associated wallet data if exists
        wallet_data = None
        if account.get("wallet_address"):
            wallet_data = next((w for w in wallet_users if w.get("wallet_address") == account["wallet_address"]), None)
        
        # Get transaction count
        tx_count = await db.transactions.count_documents({"user_address": account.get("wallet_address", "")})
        
        # Get active orders
        buy_orders = await db.crypto_buy_orders.count_documents({
            "buyer_address": account.get("wallet_address", ""),
            "status": {"$in": ["pending_payment", "marked_as_paid", "disputed"]}
        })
        
        sell_orders = await db.crypto_sell_orders.count_documents({
            "seller_address": account.get("wallet_address", ""),
            "status": "active"
        })
        
        customers.append({
            **account,
            "wallet_balance": wallet_data.get("available_balance", 0) if wallet_data else 0,
            "total_deposited": wallet_data.get("total_deposited", 0) if wallet_data else 0,
            "total_borrowed": wallet_data.get("total_borrowed", 0) if wallet_data else 0,
            "total_earned": wallet_data.get("total_earned", 0) if wallet_data else 0,
            "transaction_count": tx_count,
            "active_buy_orders": buy_orders,
            "active_sell_orders": sell_orders
        })
    
    # Add wallet-only users (no email account)
    email_wallets = [a.get("wallet_address") for a in accounts if a.get("wallet_address")]
    for wallet in wallet_users:
        if wallet["wallet_address"] not in email_wallets:
            tx_count = await db.transactions.count_documents({"user_address": wallet["wallet_address"]})
            
            buy_orders = await db.crypto_buy_orders.count_documents({
                "buyer_address": wallet["wallet_address"],
                "status": {"$in": ["pending_payment", "marked_as_paid", "disputed"]}
            })
            
            sell_orders = await db.crypto_sell_orders.count_documents({
                "seller_address": wallet["wallet_address"],
                "status": "active"
            })
            
            customers.append({
                "user_id": wallet["wallet_address"],
                "email": "N/A (Wallet Only)",
                "full_name": "Wallet User",
                "wallet_address": wallet["wallet_address"],
                "role": "user",
                "wallet_balance": wallet.get("available_balance", 0),
                "total_deposited": wallet.get("total_deposited", 0),
                "total_borrowed": wallet.get("total_borrowed", 0),
                "total_earned": wallet.get("total_earned", 0),
                "transaction_count": tx_count,
                "active_buy_orders": buy_orders,
                "active_sell_orders": sell_orders,
                "created_at": wallet.get("created_at")
            })
    
    return {
        "success": True,
        "total_customers": len(customers),
        "customers": customers
    }

@api_router.get("/admin/dashboard-stats")
async def get_admin_dashboard_stats():
    """Get comprehensive platform statistics for admin"""
    # User stats
    total_users = await db.user_accounts.count_documents({"role": "user"})
    wallet_users = await db.users.count_documents({})
    
    # Transaction stats
    total_transactions = await db.transactions.count_documents({})
    total_volume = await db.transactions.aggregate([
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ]).to_list(1)
    
    # Order stats
    total_buy_orders = await db.crypto_buy_orders.count_documents({})
    active_buy_orders = await db.crypto_buy_orders.count_documents({
        "status": {"$in": ["pending_payment", "marked_as_paid"]}
    })
    completed_orders = await db.crypto_buy_orders.count_documents({"status": "completed"})
    
    # Dispute stats
    total_disputes = await db.disputes.count_documents({})
    open_disputes = await db.disputes.count_documents({"status": {"$in": ["open", "under_review"]}})
    
    # Revenue stats
    platform_fees = await db.transactions.aggregate([
        {"$group": {"_id": None, "total": {"$sum": "$fee"}}}
    ]).to_list(1)
    
    return {
        "success": True,
        "stats": {
            "users": {
                "total_registered": total_users,
                "wallet_only": wallet_users,
                "total_users": total_users + wallet_users
            },
            "transactions": {
                "total_count": total_transactions,
                "total_volume": total_volume[0]["total"] if total_volume else 0
            },
            "orders": {
                "total_buy_orders": total_buy_orders,
                "active_orders": active_buy_orders,
                "completed_orders": completed_orders
            },
            "disputes": {
                "total_disputes": total_disputes,
                "open_disputes": open_disputes
            },
            "revenue": {
                "platform_fees": platform_fees[0]["total"] if platform_fees else 0
            }
        }
    }

@api_router.get("/platform/stats")
async def get_platform_stats():
    """Get platform statistics"""
    total_users = await db.users.count_documents({})
    active_loans = await db.loans.count_documents({"status": "active"})
    total_volume = await db.transactions.aggregate([
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ]).to_list(1)
    
    platform_fees = await db.transactions.aggregate([
        {"$group": {"_id": None, "total": {"$sum": "$fee"}}}
    ]).to_list(1)
    
    return {
        "success": True,
        "stats": {
            "total_users": total_users,
            "active_loans": active_loans,
            "total_volume": total_volume[0]["total"] if total_volume else 0,
            "platform_fees": platform_fees[0]["total"] if platform_fees else 0,
            "config": PLATFORM_CONFIG
        }
    }

# ===========================
# LIVE CRYPTO PRICES
# ===========================

@api_router.get("/crypto/prices")
async def get_crypto_prices():
    """Get live crypto prices from CoinGecko API"""
    try:
        import httpx
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://api.coingecko.com/api/v3/simple/price",
                params={
                    "ids": "bitcoin,ethereum,tether",
                    "vs_currencies": "gbp,usd",
                    "include_24hr_change": "true"
                }
            )
            data = response.json()
            
            return {
                "success": True,
                "prices": {
                    "BTC": {
                        "gbp": data["bitcoin"]["gbp"],
                        "usd": data["bitcoin"]["usd"],
                        "change_24h": data["bitcoin"].get("gbp_24h_change", 0)
                    },
                    "ETH": {
                        "gbp": data["ethereum"]["gbp"],
                        "usd": data["ethereum"]["usd"],
                        "change_24h": data["ethereum"].get("gbp_24h_change", 0)
                    },
                    "USDT": {
                        "gbp": data["tether"]["gbp"],
                        "usd": data["tether"]["usd"],
                        "change_24h": data["tether"].get("gbp_24h_change", 0)
                    }
                },
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
    except Exception as e:
        # Fallback prices if API fails
        return {
            "success": True,
            "prices": {
                "BTC": {"gbp": 35000, "usd": 45000, "change_24h": 0},
                "ETH": {"gbp": 1950, "usd": 2500, "change_24h": 0},
                "USDT": {"gbp": 0.79, "usd": 1.0, "change_24h": 0}
            },
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "fallback": True
        }

# ===========================
# ADMIN COMMISSION & CONFIG
# ===========================

class CommissionUpdateRequest(BaseModel):
    setting_key: str
    new_value: float

@api_router.get("/admin/platform-config")
async def get_platform_config():
    """Get current platform commission and fee settings"""
    return {
        "success": True,
        "config": PLATFORM_CONFIG,
        "editable_settings": [
            {"key": "deposit_fee_percent", "label": "Deposit Fee (%)", "value": PLATFORM_CONFIG["deposit_fee_percent"]},
            {"key": "withdraw_fee_percent", "label": "Withdrawal Fee (%)", "value": PLATFORM_CONFIG["withdraw_fee_percent"]},
            {"key": "borrow_fee_percent", "label": "Borrow Fee (%)", "value": PLATFORM_CONFIG["borrow_fee_percent"]},
            {"key": "repay_fee_percent", "label": "Repayment Fee (%)", "value": PLATFORM_CONFIG["repay_fee_percent"]},
            {"key": "platform_spread", "label": "Platform Spread (%)", "value": PLATFORM_CONFIG["platform_spread"]},
            {"key": "lender_interest_rate", "label": "Lender Interest Rate (%)", "value": PLATFORM_CONFIG["lender_interest_rate"]},
            {"key": "borrower_interest_rate", "label": "Borrower Interest Rate (%)", "value": PLATFORM_CONFIG["borrower_interest_rate"]},
            {"key": "liquidation_fee_percent", "label": "Liquidation Fee (%)", "value": PLATFORM_CONFIG["liquidation_fee_percent"]},
            {"key": "liquidation_penalty_percent", "label": "Liquidation Penalty (%)", "value": PLATFORM_CONFIG["liquidation_penalty_percent"]},
            {"key": "min_collateral_ratio", "label": "Min Collateral Ratio (%)", "value": PLATFORM_CONFIG["min_collateral_ratio"]},
            {"key": "liquidation_threshold", "label": "Liquidation Threshold (%)", "value": PLATFORM_CONFIG["liquidation_threshold"]},
        ]
    }

@api_router.post("/admin/update-commission")
async def update_platform_commission(request: CommissionUpdateRequest):
    """Update platform commission/fee settings"""
    if request.setting_key not in PLATFORM_CONFIG:
        raise HTTPException(status_code=400, detail="Invalid setting key")
    
    # Validate value
    if request.new_value < 0:
        raise HTTPException(status_code=400, detail="Value cannot be negative")
    
    # Update in-memory config
    old_value = PLATFORM_CONFIG[request.setting_key]
    PLATFORM_CONFIG[request.setting_key] = request.new_value
    
    # Store in database for persistence
    await db.platform_settings.update_one(
        {"setting_key": request.setting_key},
        {"$set": {
            "value": request.new_value,
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "previous_value": old_value
        }},
        upsert=True
    )
    
    return {
        "success": True,
        "message": f"Updated {request.setting_key} from {old_value} to {request.new_value}",
        "config": PLATFORM_CONFIG
    }

@api_router.get("/loans/all")
async def get_all_loans():
    """Get all loans for marketplace"""
    loans = await db.loans.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return {"success": True, "loans": loans}

# ===========================
# CRYPTO BANK ENDPOINTS
# ===========================

@api_router.get("/crypto-bank/balances/{user_id}")
async def get_crypto_balances(user_id: str):
    """Get all crypto balances for a user"""
    balances = await db.crypto_balances.find({"user_id": user_id}, {"_id": 0}).to_list(10)
    
    # Initialize balances for BTC, ETH, USDT if they don't exist
    supported_currencies = ["BTC", "ETH", "USDT"]
    existing_currencies = [b["currency"] for b in balances]
    
    for currency in supported_currencies:
        if currency not in existing_currencies:
            new_balance = CryptoBalance(
                user_id=user_id,
                currency=currency,
                balance=0.0,
                locked_balance=0.0
            )
            balance_dict = new_balance.model_dump()
            balance_dict['last_updated'] = balance_dict['last_updated'].isoformat()
            await db.crypto_balances.insert_one(balance_dict)
            balances.append(balance_dict)
    
    return {
        "success": True,
        "balances": balances
    }

@api_router.post("/crypto-bank/deposit")
async def initiate_deposit(request: InitiateDepositRequest):
    """Initiate a deposit (simulated for MVP)"""
    # Validate currency
    if request.currency not in ["BTC", "ETH", "USDT"]:
        raise HTTPException(status_code=400, detail="Unsupported currency")
    
    if request.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be greater than 0")
    
    # Get user info for email
    user = await db.user_accounts.find_one({"user_id": request.user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get or create balance record
    balance = await db.crypto_balances.find_one({
        "user_id": request.user_id,
        "currency": request.currency
    }, {"_id": 0})
    
    if not balance:
        # Create new balance
        new_balance = CryptoBalance(
            user_id=request.user_id,
            currency=request.currency,
            balance=0.0
        )
        balance_dict = new_balance.model_dump()
        balance_dict['last_updated'] = balance_dict['last_updated'].isoformat()
        await db.crypto_balances.insert_one(balance_dict)
    
    # Create transaction
    transaction = CryptoTransaction(
        user_id=request.user_id,
        currency=request.currency,
        transaction_type="deposit",
        amount=request.amount,
        status="completed",  # Simulated - instant completion
        notes="Simulated deposit for MVP",
        completed_at=datetime.now(timezone.utc)
    )
    
    tx_dict = transaction.model_dump()
    tx_dict['created_at'] = tx_dict['created_at'].isoformat()
    tx_dict['completed_at'] = tx_dict['completed_at'].isoformat()
    await db.crypto_transactions.insert_one(tx_dict)
    
    # Update balance
    await db.crypto_balances.update_one(
        {"user_id": request.user_id, "currency": request.currency},
        {
            "$inc": {"balance": request.amount},
            "$set": {"last_updated": datetime.now(timezone.utc).isoformat()}
        }
    )
    
    # Update onboarding status
    await db.onboarding_status.update_one(
        {"user_id": request.user_id},
        {"$set": {"first_deposit": True}},
        upsert=True
    )
    
    # Send email notification
    try:
        await email_service.send_deposit_notification(
            user["email"],
            user["full_name"],
            request.amount,
            request.currency,
            transaction.transaction_id
        )
    except Exception as e:
        logger.error(f"Failed to send deposit email: {str(e)}")
    
    return {
        "success": True,
        "transaction": transaction.model_dump(),
        "message": f"Deposit of {request.amount} {request.currency} completed successfully"
    }

@api_router.post("/crypto-bank/withdraw")
async def initiate_withdrawal(request: InitiateWithdrawalRequest):
    """
    Initiate a withdrawal with AUTOMATED fee deduction and routing
    - Calculates withdrawal fee (default 1.5%)
    - Deducts fee from user balance
    - Sends net amount to user
    - Routes fee to admin wallet automatically
    """
    # Validate currency
    if request.currency not in ["BTC", "ETH", "USDT"]:
        raise HTTPException(status_code=400, detail="Unsupported currency")
    
    if request.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be greater than 0")
    
    # Get user info for email
    user = await db.user_accounts.find_one({"user_id": request.user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get balance
    balance = await db.crypto_balances.find_one({
        "user_id": request.user_id,
        "currency": request.currency
    }, {"_id": 0})
    
    if not balance:
        raise HTTPException(status_code=404, detail="Balance not found")
    
    # AUTOMATED FEE CALCULATION
    withdrawal_fee_percent = PLATFORM_CONFIG["withdraw_fee_percent"]
    withdrawal_fee = float(request.amount) * (withdrawal_fee_percent / 100.0)
    net_amount = float(request.amount) - withdrawal_fee
    
    # Check sufficient balance (user must have full amount + fee)
    if balance["balance"] < request.amount:
        # Send failed transaction email
        try:
            await email_service.send_failed_transaction_notification(
                user["email"],
                user["full_name"],
                "withdrawal",
                f"Insufficient balance. Available: {balance['balance']} {request.currency}"
            )
        except Exception as e:
            logger.error(f"Failed to send error email: {str(e)}")
        
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient balance. Available: {balance['balance']} {request.currency}"
        )
    
    # Create user withdrawal transaction (net amount they receive)
    transaction = CryptoTransaction(
        user_id=request.user_id,
        currency=request.currency,
        transaction_type="withdrawal",
        amount=net_amount,  # Net amount after fee
        status="completed",
        reference=request.wallet_address,
        notes=f"Withdrawal processed. Fee: {withdrawal_fee} {request.currency} ({withdrawal_fee_percent}%)",
        completed_at=datetime.now(timezone.utc)
    )
    
    tx_dict = transaction.model_dump()
    tx_dict['created_at'] = tx_dict['created_at'].isoformat()
    tx_dict['completed_at'] = tx_dict['completed_at'].isoformat()
    tx_dict['withdrawal_fee'] = withdrawal_fee
    tx_dict['withdrawal_fee_percent'] = withdrawal_fee_percent
    tx_dict['gross_amount'] = float(request.amount)
    await db.crypto_transactions.insert_one(tx_dict)
    
    # AUTOMATED: Create fee transaction to admin wallet
    fee_transaction = CryptoTransaction(
        user_id=PLATFORM_CONFIG["admin_wallet_id"],
        currency=request.currency,
        transaction_type="platform_fee",
        amount=withdrawal_fee,
        status="completed",
        reference=f"Withdrawal fee from {request.user_id}",
        notes=f"Automated withdrawal fee collection ({withdrawal_fee_percent}%) from user {request.user_id}",
        completed_at=datetime.now(timezone.utc)
    )
    
    fee_dict = fee_transaction.model_dump()
    fee_dict['created_at'] = fee_dict['created_at'].isoformat()
    fee_dict['completed_at'] = fee_dict['completed_at'].isoformat()
    fee_dict['source_user_id'] = request.user_id
    fee_dict['fee_type'] = 'withdrawal_fee'
    await db.crypto_transactions.insert_one(fee_dict)
    
    # Update user balance (deduct full amount)
    await db.crypto_balances.update_one(
        {"user_id": request.user_id, "currency": request.currency},
        {
            "$inc": {"balance": -float(request.amount)},
            "$set": {"last_updated": datetime.now(timezone.utc).isoformat()}
        }
    )
    
    # AUTOMATED: Add fee to admin wallet balance
    admin_balance = await db.crypto_balances.find_one({
        "user_id": PLATFORM_CONFIG["admin_wallet_id"],
        "currency": request.currency
    })
    
    if not admin_balance:
        # Create admin wallet balance if doesn't exist
        await db.crypto_balances.insert_one({
            "user_id": PLATFORM_CONFIG["admin_wallet_id"],
            "currency": request.currency,
            "balance": withdrawal_fee,
            "locked_balance": 0.0,
            "last_updated": datetime.now(timezone.utc).isoformat()
        })
    else:
        # Increment existing admin balance
        await db.crypto_balances.update_one(
            {"user_id": PLATFORM_CONFIG["admin_wallet_id"], "currency": request.currency},
            {
                "$inc": {"balance": withdrawal_fee},
                "$set": {"last_updated": datetime.now(timezone.utc).isoformat()}
            }
        )
    
    # Send email notification
    try:
        await email_service.send_withdrawal_notification(
            user["email"],
            user["full_name"],
            request.amount,
            request.currency,
            transaction.transaction_id,
            request.wallet_address
        )
    except Exception as e:
        logger.error(f"Failed to send withdrawal email: {str(e)}")
    
    return {
        "success": True,
        "transaction": transaction.model_dump(),
        "message": f"Withdrawal completed successfully",
        "fee_details": {
            "gross_amount": float(request.amount),
            "withdrawal_fee": withdrawal_fee,
            "withdrawal_fee_percent": withdrawal_fee_percent,
            "net_amount": net_amount,
            "currency": request.currency
        }
    }

@api_router.get("/crypto-bank/withdrawal-fee")
async def get_withdrawal_fee_config():
    """Get current withdrawal fee configuration"""
    return {
        "success": True,
        "withdrawal_fee_percent": PLATFORM_CONFIG["withdraw_fee_percent"],
        "description": "Automated withdrawal fee - deducted from withdrawal amount"
    }

@api_router.get("/crypto-bank/transactions/{user_id}")
async def get_user_crypto_transactions(user_id: str, limit: int = 50):
    """Get transaction history for a user"""
    transactions = await db.crypto_transactions.find(
        {"user_id": user_id},
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    return {
        "success": True,
        "transactions": transactions,
        "count": len(transactions)
    }

@api_router.get("/crypto-bank/onboarding/{user_id}")
async def get_onboarding_status(user_id: str):
    """Get onboarding status for a user"""
    status = await db.onboarding_status.find_one({"user_id": user_id}, {"_id": 0})
    
    if not status:
        # Create initial status
        new_status = OnboardingStatus(user_id=user_id)
        status_dict = new_status.model_dump()
        await db.onboarding_status.insert_one(status_dict)
        return {"success": True, "status": status_dict}
    
    return {"success": True, "status": status}

@api_router.post("/crypto-bank/onboarding/{user_id}/complete-wallet-setup")
async def complete_wallet_setup(user_id: str):
    """Mark wallet setup as complete"""
    await db.onboarding_status.update_one(
        {"user_id": user_id},
        {"$set": {"wallet_setup": True}},
        upsert=True
    )
    
    return {"success": True, "message": "Wallet setup completed"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()