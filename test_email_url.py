import sys
sys.path.append('/app/backend')
from email_service import EmailService
import asyncio

async def test():
    email_service = EmailService()
    
    # Check the email template
    dispute_id = "test-dispute-123"
    
    # This should generate the correct URL
    await email_service.send_dispute_alert_to_admin(
        trade_id="trade-456",
        dispute_id=dispute_id,
        buyer_id="buyer-789",
        seller_id="seller-012",
        amount=100.50,
        currency="GBP",
        reason="Payment not received",
        description="Test dispute",
        initiated_by="buyer"
    )
    
    print("✅ Email template generation completed")
    print(f"Expected URL: https://trading-perf-boost.preview.emergentagent.com/#/admin/disputes/{dispute_id}")

if __name__ == "__main__":
    asyncio.run(test())
