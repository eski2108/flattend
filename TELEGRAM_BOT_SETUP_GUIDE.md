# 🚀 TELEGRAM BOT - QUICK SETUP GUIDE

## 🎯 WHAT YOU NEED TO DO

### 1. Create the Bot (5 minutes)

1. Open Telegram
2. Search for `@BotFather`
3. Send `/newbot`
4. Name: `CoinHubX Bot`
5. Username: `@CoinHubXBot` (or your choice)
6. **Copy the API token** (looks like: `1234567890:ABCdefGHIjklMNOpqrsTUVwxyz`)

### 2. Create Groups (10 minutes)

Create 6 groups/channels:

1. **CoinHubX Community** (public group)
2. **CoinHubX Announcements** (channel)
3. **CoinHubX Support** (group)
4. **CoinHubX P2P Alerts** (group)
5. **CoinHubX Golden VIP** (private group)
6. **CoinHubX Admin** (private group)

### 3. Add Bot to Groups (2 minutes)

- Add `@CoinHubXBot` to all 6 groups
- Make it **admin** in each group
- Give it permissions: Delete messages, Ban users, Pin messages

### 4. Get Group IDs (3 minutes)

1. Send a message in each group
2. Visit: `https://api.telegram.org/bot<YOUR_TOKEN>/getUpdates`
3. Find `chat_id` for each group (looks like: `-1001234567890`)
4. Save all 6 IDs

### 5. Configure Bot (2 minutes)

Edit `/app/telegram_bot/.env`:

```bash
TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz
BACKEND_URL=http://localhost:8001/api
MONGO_URL=mongodb://localhost:27017

MAIN_GROUP_ID=-1001234567890
ANNOUNCEMENTS_CHANNEL_ID=-1001234567891
SUPPORT_GROUP_ID=-1001234567892
P2P_ALERTS_GROUP_ID=-1001234567893
GOLDEN_VIP_GROUP_ID=-1001234567894
ADMIN_GROUP_ID=-1001234567895

ADMIN_TELEGRAM_IDS=your_telegram_user_id
```

### 6. Start Bot (1 minute)

```bash
cd /app/telegram_bot
python3 bot.py
```

**THAT'S IT!** Your bot is now running.

---

## ✅ WHAT THE BOT DOES AUTOMATICALLY

### For Users:
- ✅ Sends P2P order notifications
- ✅ Sends payment confirmations
- ✅ Sends crypto release confirmations
- ✅ Sends referral earning notifications
- ✅ Welcomes Golden Referrers with VIP link
- ✅ Adds Golden Referrers to VIP group
- ✅ Responds to `/balance`, `/referrals` commands

### For Admins:
- ✅ Sends instant dispute alerts
- ✅ Shows order details via commands
- ✅ Shows revenue stats via commands
- ✅ Allows banning users via commands
- ✅ Shows user info via commands

### For Security:
- ✅ Verifies new members (must link account)
- ✅ Kicks unverified users after 24 hours
- ✅ Blocks spam messages
- ✅ Logs all admin actions

---

## 📝 TESTING CHECKLIST

After setup, test these:

1. **User Commands:**
   - Send `/start` to bot
   - Send `/help` to see commands
   - Send `/balance` (after linking account)

2. **P2P Notifications:**
   - Create a P2P order on website
   - Check if buyer & seller get Telegram message
   - Check if P2P Alerts group gets update

3. **Admin Commands:**
   - Send `/userinfo [user_id]` in admin group
   - Send `/revenue all` to see revenue stats
   - Send `/openorders` to see active orders

4. **Anti-Spam:**
   - Send a spam message in main group
   - Bot should delete it instantly

5. **Golden VIP:**
   - Activate Golden status for a user
   - Check if they get welcome message
   - Check if they're added to VIP group

---

## 🐛 COMMON ISSUES

### "Bot doesn't respond"
- Check bot is running: `ps aux | grep bot.py`
- Check token is correct in `.env`
- Restart bot: `pkill -f bot.py && python3 /app/telegram_bot/bot.py &`

### "Can't add bot to group"
- Go to @BotFather
- Send `/setprivacy`
- Select your bot
- Choose "Disable" (this allows bot to read all messages)

### "Notifications not sending"
- Check user has `telegram_id` field in database
- Check group IDs are correct
- Check bot is admin in the group

### "Bot kicks everyone"
- Users must link Telegram in website Settings
- Add `telegram_id` field to user accounts
- Users have 24 hours to link before kick

---

## 🔗 HOW TO LINK TELEGRAM ACCOUNT

### Option 1: Website Settings Page

Add this to your frontend Settings page:

```javascript
const linkTelegram = async () => {
  const telegramId = prompt('Enter your Telegram User ID');
  
  await axios.post(`${BACKEND_URL}/api/user/link-telegram`, {
    user_id: currentUser.user_id,
    telegram_id: telegramId
  });
  
  alert('Telegram linked successfully!');
};
```

### Option 2: Bot Command (Easier)

User sends `/verifyme` to bot, bot replies with:
```
🔗 Link Your Account

1. Go to https://coinhubx.com/settings
2. Click "Link Telegram"
3. Enter this code: ABC123
```

---

## 📦 FILES CREATED

- `/app/telegram_bot/bot.py` - Main bot code
- `/app/telegram_bot/notifications.py` - Notification system
- `/app/telegram_bot/admin_commands.py` - Admin commands
- `/app/telegram_bot/requirements.txt` - Dependencies
- `/app/telegram_bot/.env.example` - Config template
- `/app/telegram_bot/README.md` - Full documentation

---

## 🚀 READY TO GO!

Your Telegram bot is **FULLY BUILT** and ready to deploy.

Just:
1. Get bot token from @BotFather
2. Create 6 groups
3. Get group IDs
4. Update `.env` file
5. Run `python3 bot.py`

**The bot will handle everything else automatically!**

---

**Need Help?** Check `/app/telegram_bot/README.md` for detailed docs.
