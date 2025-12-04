# 🤖 CoinHubX Telegram Bot

## Complete Community Management, Security & Notifications System

---

## 🎯 FEATURES

### 👥 Community Management
- **User Verification**: New members must link Telegram to CoinHubX account
- **Auto-Kick**: Unverified users removed after 24 hours
- **Anti-Spam**: Automatic detection and deletion of spam messages
- **Fake Admin Detection**: Blocks impersonators
- **Group Rules Enforcement**: Automated warnings and bans

### 🔔 Notifications
- **P2P Orders**: Buyer/seller notifications for order creation, payment, release
- **Disputes**: Instant admin alerts when disputes are opened
- **Referral Earnings**: Real-time commission notifications
- **Golden Referrer**: Welcome messages and VIP group invites

### 🔧 User Commands
- `/start` - Welcome message
- `/help` - Show all commands
- `/balance` - Check wallet balance
- `/referrals` - View referral stats
- `/mydeals` - See P2P orders
- `/verifyme` - Link Telegram account

### 🔐 Admin Commands
- `/ban [user_id] [reason]` - Ban a user
- `/userinfo [user_id]` - Get user details
- `/order [order_id]` - View order details
- `/resolve [dispute_id] [resolution]` - Resolve dispute
- `/openorders` - List open P2P orders
- `/revenue [timeframe]` - View platform revenue

### 👑 VIP Management
- **Auto-Add**: Golden Referrers automatically added to VIP group
- **Auto-Remove**: Golden status revoked → removed from VIP group
- **Welcome Messages**: Personalized Golden referrer onboarding
- **Exclusive Links**: Send 50% commission link instantly

---

## 🛠️ SETUP INSTRUCTIONS

### Step 1: Create Telegram Bot

1. Open Telegram and search for `@BotFather`
2. Send `/newbot`
3. Choose a name: `CoinHubX Bot`
4. Choose a username: `@CoinHubXBot`
5. Copy the **API token** you receive

### Step 2: Create Telegram Groups/Channels

Create the following groups:

1. **Main Community Group**: Public group for all users
2. **Announcements Channel**: Broadcast channel for updates
3. **Support Group**: For customer support
4. **P2P Alerts Group**: Real-time P2P order updates
5. **Golden VIP Group**: Exclusive for Golden Referrers
6. **Admin Operations Group**: Private admin-only group

### Step 3: Get Group IDs

1. Add your bot to each group as admin
2. Send a message in each group
3. Visit: `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`
4. Find the `chat_id` for each group
5. Save these IDs

### Step 4: Configure Environment

Create `/app/telegram_bot/.env`:

```bash
# Bot Token
TELEGRAM_BOT_TOKEN=your_bot_token_here

# Backend
BACKEND_URL=http://localhost:8001/api
MONGO_URL=mongodb://localhost:27017

# Group IDs
MAIN_GROUP_ID=-1001234567890
ANNOUNCEMENTS_CHANNEL_ID=-1001234567891
SUPPORT_GROUP_ID=-1001234567892
P2P_ALERTS_GROUP_ID=-1001234567893
GOLDEN_VIP_GROUP_ID=-1001234567894
ADMIN_GROUP_ID=-1001234567895

# Admin Telegram IDs (comma-separated)
ADMIN_TELEGRAM_IDS=123456789,987654321
```

### Step 5: Install Dependencies

```bash
cd /app/telegram_bot
pip3 install -r requirements.txt
```

### Step 6: Run the Bot

```bash
python3 bot.py
```

Or run as a service:

```bash
sudo nano /etc/systemd/system/coinhubx-bot.service
```

Add:
```ini
[Unit]
Description=CoinHubX Telegram Bot
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/app/telegram_bot
ExecStart=/usr/bin/python3 /app/telegram_bot/bot.py
Restart=always
EnvironmentFile=/app/telegram_bot/.env

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl enable coinhubx-bot
sudo systemctl start coinhubx-bot
sudo systemctl status coinhubx-bot
```

---

## 🔗 BACKEND INTEGRATION

### Add Telegram ID Field to Users

Update `/app/backend/server.py` to allow users to link their Telegram:

```python
@api_router.post("/user/link-telegram")
async def link_telegram_account(request: dict):
    user_id = request.get('user_id')
    telegram_id = request.get('telegram_id')
    
    await db.user_accounts.update_one(
        {"user_id": user_id},
        {"$set": {"telegram_id": str(telegram_id)}}
    )
    
    return {"success": True}
```

### Trigger Notifications from Backend

When P2P order is created:
```python
from telegram_bot.notifications import notifier

# After order creation
await notifier.send_p2p_order_notification({
    'order_id': order_id,
    'buyer_telegram_id': buyer['telegram_id'],
    'seller_telegram_id': seller['telegram_id'],
    'amount': amount,
    'crypto_amount': crypto_amount,
    'currency': currency,
    'crypto': crypto
})
```

When payment is marked:
```python
await notifier.send_payment_marked_notification(order_data)
```

When crypto is released:
```python
await notifier.send_crypto_released_notification(order_data)
```

When dispute is opened:
```python
await notifier.send_dispute_opened_notification(dispute_data)
```

When referral commission is earned:
```python
await notifier.send_referral_earnings_notification(user_telegram_id, earning_data)
```

When user becomes Golden Referrer:
```python
await notifier.send_golden_referrer_welcome(user_telegram_id, golden_link)
```

---

## 👥 GROUP STRUCTURE

### 1. Main Community Group
- **Purpose**: Public discussion, trading tips, community
- **Access**: Verified users only
- **Bot Permissions**: Delete messages, ban users, pin messages
- **Features**: Anti-spam, verification gate, community rules

### 2. Announcements Channel
- **Purpose**: Official updates, news, maintenance alerts
- **Access**: All users (read-only)
- **Bot Permissions**: Post messages
- **Features**: Broadcast platform updates

### 3. Support Group
- **Purpose**: Customer support, help desk
- **Access**: Verified users
- **Bot Permissions**: Read messages, respond to queries
- **Features**: Ticket system, FAQs

### 4. P2P Alerts Group
- **Purpose**: Real-time P2P order updates
- **Access**: Active traders
- **Bot Permissions**: Post order updates
- **Features**: Order creation, payment, release notifications

### 5. Golden VIP Group
- **Purpose**: Exclusive chat for Golden Referrers (50% commission)
- **Access**: Admin-approved Golden Referrers only
- **Bot Permissions**: Manage members, post updates
- **Features**: Auto-add/remove based on Golden status

### 6. Admin Operations Group
- **Purpose**: Admin commands, dispute alerts, system notifications
- **Access**: Admins only
- **Bot Permissions**: Full admin rights
- **Features**: All admin commands, instant alerts

---

## 🔒 SECURITY FEATURES

### Anti-Spam System
- **Keyword Detection**: Blocks spam keywords (pump, guaranteed profit, etc.)
- **Link Filtering**: Auto-delete suspicious links
- **Flood Protection**: Rate limiting on messages
- **Auto-Delete**: Removes spam instantly
- **Warnings**: 3 warnings = auto-ban

### Fake Admin Prevention
- **Username Verification**: Checks for fake admin usernames
- **Role Verification**: Only real admins can use admin commands
- **Impersonation Detection**: Blocks similar usernames

### User Verification
- **Account Linking**: Must link Telegram to CoinHubX account
- **24-Hour Grace Period**: Unverified users kicked after 24 hours
- **KYC Integration**: Can require KYC for group access

---

## 📊 LOGGING & AUDIT

All bot actions are logged to MongoDB:

```javascript
{
  "action": "ban_user",
  "admin_id": 123456789,
  "target_user_id": "user_abc123",
  "reason": "Spamming",
  "timestamp": "2025-12-04T12:00:00Z"
}
```

Logged actions:
- User bans
- Warnings issued
- Spam detected
- Dispute notifications
- VIP assignments
- Admin commands executed

---

## 📧 NOTIFICATION EXAMPLES

### P2P Order Created (to Buyer)
```
🔔 P2P Order Created

🏛 Order ID: ORD-ABC123
💰 Amount: 1000 GBP
🪙 Crypto: 0.025 BTC

Please complete payment and mark as paid.
```

### Payment Marked (to Seller)
```
🔔 Payment Marked as Paid

🏛 Order ID: ORD-ABC123
Buyer has marked payment as completed.

⚠️ Please verify and release crypto.
```

### Dispute Opened (to Admin)
```
🚨 DISPUTE OPENED 🚨

🆔 Dispute ID: DIS-XYZ789
🏛 Order ID: ORD-ABC123
👤 Opened by: Buyer
📝 Reason: Payment not received

Use /resolve DIS-XYZ789 to manage this dispute.
```

### Referral Earnings
```
💰 Referral Earnings 🥇

🔗 Commission: 5.50 GBP
🎯 Rate: 50% (GOLDEN)
👤 From: John Doe
📊 Source: p2p_trade

Keep sharing your link! 🚀
```

### Golden Referrer Welcome
```
🎉 Congratulations! 🎉

🥇 You are now a GOLDEN REFERRER!

💰 Your commission rate: 50%

🔗 Your Golden VIP Link:
https://coinhubx.com/register?ref=GOLDEN123

Share this with VIP partners for 50% lifetime commission!

You've been added to the Golden VIP chat. 👑
```

---

## ✅ CHECKLIST

Before going live:

- [ ] Bot token obtained from @BotFather
- [ ] All 6 groups/channels created
- [ ] Group IDs collected
- [ ] Bot added as admin to all groups
- [ ] Environment variables configured
- [ ] Dependencies installed
- [ ] Bot started and running
- [ ] Telegram ID field added to user accounts
- [ ] Backend integration completed
- [ ] Notification triggers tested
- [ ] Admin commands tested
- [ ] Anti-spam tested
- [ ] User verification tested
- [ ] VIP group access tested

---

## 🐛 TROUBLESHOOTING

### Bot not responding
```bash
# Check if bot is running
sudo systemctl status coinhubx-bot

# Check logs
journalctl -u coinhubx-bot -f

# Restart bot
sudo systemctl restart coinhubx-bot
```

### Can't add bot to group
- Make sure bot privacy mode is OFF in @BotFather
- Use `/setprivacy` and select "Disable"

### Notifications not sending
- Verify TELEGRAM_BOT_TOKEN is correct
- Check user has `telegram_id` in database
- Check group IDs are correct
- Verify bot is admin in the group

---

## 🚀 NEXT STEPS

1. **Set up bot** following instructions above
2. **Test notifications** by creating a P2P order
3. **Configure admin commands** with your admin Telegram IDs
4. **Customize messages** in `notifications.py` if needed
5. **Monitor logs** for any issues
6. **Train admins** on available commands

---

**Bot Status: READY FOR DEPLOYMENT**
**Last Updated: December 4, 2025**
**Built for: CoinHubX Exchange**
