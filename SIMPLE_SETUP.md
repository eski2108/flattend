# SIMPLE SETUP - 3 STEPS

## STEP 1: Create MongoDB Atlas Account

1. Go here: https://www.mongodb.com/cloud/atlas/register
2. Sign up (use your email)
3. Click "Create FREE cluster"
4. Wait 3 minutes

## STEP 2: Get Your Connection String

1. Click "Connect" button
2. Click "Connect your application"
3. Copy the string that looks like:
   ```
   mongodb+srv://username:password@cluster.mongodb.net
   ```
4. Save it somewhere

## STEP 3: Set in Emergent

1. Go to your Emergent project settings
2. Find "Production Environment Variables"
3. Add:
   ```
   MONGO_URL = paste your connection string here
   ```
4. Deploy

## DONE

Your production database is now protected.
Preview can reset. Production cannot.
