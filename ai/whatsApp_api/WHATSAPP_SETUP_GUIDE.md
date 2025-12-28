# WhatsApp Business API Setup Guide

Complete step-by-step guide to get your WhatsApp Cloud API credentials.

---

## Prerequisites

- A Facebook account
- A business to represent (can be your personal project)
- A phone number that's NOT already registered with WhatsApp

---

## Step 1: Create a Meta Developer Account

1. Go to [Meta for Developers](https://developers.facebook.com/)
2. Click **"Get Started"** or **"Log In"**
3. Log in with your Facebook account
4. Accept the Developer terms

---

## Step 2: Create a New App

1. Go to [Meta App Dashboard](https://developers.facebook.com/apps/)
2. Click **"Create App"**
3. Select **"Other"** for use case, then click **"Next"**
4. Select **"Business"** as the app type
5. Fill in:
   - **App Name**: e.g., "Real Estate CRM WhatsApp"
   - **Contact Email**: Your email
   - **Business Account**: Create one or select existing
6. Click **"Create App"**

---

## Step 3: Add WhatsApp Product to Your App

1. In the App Dashboard, find **"Add Products"** section
2. Find **"WhatsApp"** and click **"Set up"**
3. You'll be taken to the WhatsApp setup page

---

## Step 4: Get Your Access Token (WHATSAPP_ACCESS_TOKEN)

### Option A: Temporary Token (for testing - expires in 24 hours)

1. In WhatsApp setup, go to **"API Setup"**
2. Find the **"Temporary access token"** section
3. Click **"Copy"** to copy the token
4. This is your `WHATSAPP_ACCESS_TOKEN`

> ⚠️ **Note**: This token expires in 24 hours. For production, create a permanent token.

### Option B: Permanent Token (for production)

1. Go to [Business Settings](https://business.facebook.com/settings)
2. Navigate to **"Users"** → **"System Users"**
3. Click **"Add"** to create a new system user:
   - Name: "WhatsApp API User"
   - Role: Admin
4. Click **"Add Assets"**:
   - Select your App
   - Enable **"Full Control"**
5. Click **"Generate New Token"**:
   - Select your App
   - Enable these permissions:
     - `whatsapp_business_messaging`
     - `whatsapp_business_management`
   - Set token expiration (Never or custom)
6. **Copy and save this token immediately** - you won't see it again!

---

## Step 5: Get Your Phone Number ID (WHATSAPP_PHONE_NUMBER_ID)

### Detailed Navigation:

1. **Go to Meta App Dashboard**: https://developers.facebook.com/apps/
2. **Click on your WhatsApp app** (the one you created in Step 2)
3. In the left sidebar, find **"WhatsApp"** section and click on it
4. Click on **"API Setup"** (or "Getting Started")
5. You'll see a page titled **"Get started with the WhatsApp Business Platform"**

### Finding the Phone Number ID:

On the API Setup page, you'll see a section called **"Send and receive messages"** or **"Test phone number"**. Look for:

- **"From"** dropdown: This shows the test phone number provided by Meta
- Below or next to it, you'll see text that says **"Phone number ID:"**
- The ID is a long number like: `123456789012345` or `109876543210987`

### Visual Guide:

```
┌─────────────────────────────────────────┐
│ Send and receive messages               │
├─────────────────────────────────────────┤
│ From: +1 555 025 5678  [dropdown ▼]    │
│                                         │
│ Phone number ID: 123456789012345        │
│ [Copy to clipboard icon]               │
└─────────────────────────────────────────┘
```

### Steps to Copy:

1. **Locate** the "Phone number ID:" label
2. **Click the copy icon** next to the number (usually a clipboard icon)
3. **Save this number** - this is your `WHATSAPP_PHONE_NUMBER_ID`
4. **Paste it** into your `.env` file

### Alternative Method (if you don't see it on API Setup):

1. Go to **"WhatsApp"** → **"API Setup"**
2. Scroll down to **"Step 1: Select phone numbers"**
3. You'll see a table with your phone numbers
4. The **"Phone number ID"** column shows the ID for each number
5. Copy the ID from the number you want to use

### Important Notes:

- This is **NOT** the actual phone number (like +1-555-0123)
- It's a **unique identifier** that Meta assigns to each phone number
- It's always a **numeric string** (no dashes, no + sign)
- Typically **15 digits long**

---

## Step 6: Set Your Verify Token (WHATSAPP_VERIFY_TOKEN)

### What is the Verify Token?

The **Verify Token** is a **password you create yourself**. Meta uses it to verify that webhook requests are coming from YOUR server and not someone else trying to intercept messages.

### Important Rules:

- ✅ You create this yourself - it's NOT provided by Meta
- ✅ Can be any string (letters, numbers, special characters)
- ✅ Should be **secret and secure** (treat it like a password)
- ✅ Must be **identical** in two places:
  1. Your `.env` file
  2. Meta Developer Console (when setting up webhook)
- ❌ Don't use simple words like "password" or "test"

### Method 1: Generate Using Command Line (Recommended)

**On Linux/Mac:**

```bash
openssl rand -hex 16
```

This generates a random 32-character string like:
```
7a8f9d2e4b6c1a3f8e9d0c7b5a4f2e1d
```

**On Windows PowerShell:**

```powershell
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | % {[char]$_})
```

### Method 2: Create Your Own

Create a secure string using a pattern like:

```
myapp_webhook_verify_2024_xyz789
```

Or combine random words:

```
BlueSky_Tiger_Mountain_2024_abc
```

### Step-by-Step Process:

1. **Generate the token** using one of the methods above
   
   Example output:
   ```
   7a8f9d2e4b6c1a3f8e9d0c7b5a4f2e1d
   ```

2. **Copy this token** and save it temporarily (you'll use it twice)

3. **Add to your `.env` file**:
   ```env
   WHATSAPP_VERIFY_TOKEN=7a8f9d2e4b6c1a3f8e9d0c7b5a4f2e1d
   ```

4. **Keep this token saved** - you'll need it in Step 7 when configuring the webhook

### Security Tips:

- ✅ Make it **at least 16 characters** long
- ✅ Use a **mix of letters and numbers**
- ✅ Don't share it publicly
- ✅ Don't commit it to git (it should only be in `.env`, which is gitignored)
- ❌ Don't use your password or other sensitive info
- ❌ Don't use simple patterns like "123456" or "abcdef"

### Example Good Tokens:

```
webhook_secure_token_2024_abc123xyz
my-realstate-crm-webhook-verify-key
7a8f9d2e4b6c1a3f8e9d0c7b5a4f2e1d
```

### Example Bad Tokens:

```
test
password
12345
webhook
```

This token is created by YOU. It can be any string you choose.

1. Generate a secure random string, for example:
   ```
   my_secure_webhook_token_2024
   ```
   Or use a generator:
   ```bash
   openssl rand -hex 16
   ```
2. Save this as your `WHATSAPP_VERIFY_TOKEN`
3. You'll use this same token when configuring the webhook in Meta

---

## Step 7: Configure the Webhook

1. In WhatsApp setup, go to **"Configuration"**
2. Under **"Webhook"**, click **"Edit"**
3. Configure:
   - **Callback URL**: Your public URL + `/webhook`
     - Example: `https://your-domain.com/webhook`
     - For testing: Use ngrok → `https://abc123.ngrok.io/webhook`
   - **Verify Token**: The `WHATSAPP_VERIFY_TOKEN` you created
4. Click **"Verify and Save"**
5. Under **"Webhook fields"**, subscribe to:
   - ✅ `messages`

---

## Step 8: Configure Your .env File

Create/update your `.env` file in `ai/whatsApp_api/`:

```env
# WhatsApp Cloud API Credentials
WHATSAPP_VERIFY_TOKEN=your_token_from_step_6
WHATSAPP_ACCESS_TOKEN=your_token_from_step_4
WHATSAPP_PHONE_NUMBER_ID=your_id_from_step_5
WHATSAPP_API_VERSION=v18.0

# Customer Chatbot API
CHATBOT_API_URL=http://localhost:8000

# Server
PORT=8003
LOG_LEVEL=INFO
```

---

## Step 9: Test with ngrok (Local Development)

1. Install ngrok: https://ngrok.com/download
2. Start your orchestrator:
   ```bash
   ./run.sh
   ```
3. In another terminal, expose it publicly:
   ```bash
   ngrok http 8003
   ```
4. Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`)
5. Update the webhook URL in Meta to: `https://abc123.ngrok.io/webhook`
6. Send a test message to your WhatsApp Business number!

---

## Summary: Your Environment Variables

| Variable | Where to Find | Example |
|----------|---------------|---------|
| `WHATSAPP_VERIFY_TOKEN` | You create it (any secure string) | `my_secure_token_2024` |
| `WHATSAPP_ACCESS_TOKEN` | Meta App Dashboard → API Setup | `EAAG...` (long string) |
| `WHATSAPP_PHONE_NUMBER_ID` | Meta App Dashboard → API Setup | `123456789012345` |

---

## Troubleshooting

### "Webhook verification failed"
- Ensure your `WHATSAPP_VERIFY_TOKEN` matches exactly in both `.env` and Meta Console
- Check your orchestrator is running and publicly accessible

### "Message not delivered"
- Verify your `WHATSAPP_ACCESS_TOKEN` is valid (not expired)
- Check the Customer Chatbot service is running on port 8000

### "401 Unauthorized"
- Your access token is invalid or expired
- Generate a new token from Meta App Dashboard

---

## Useful Links

- [Meta for Developers](https://developers.facebook.com/)
- [WhatsApp Cloud API Docs](https://developers.facebook.com/docs/whatsapp/cloud-api)
- [Get Started with WhatsApp Cloud API](https://developers.facebook.com/docs/whatsapp/cloud-api/get-started)
- [Webhooks Documentation](https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks)
