# Discord Webhook Setup for Application Notifications

This guide explains how to set up Discord webhooks to receive application notifications in your Discord server.

## What This Does

When someone submits an application (Civilian, Police, or EMS) on the website, the system will:
1. ✅ Save the application to the website database (works without webhook)
2. 📤 Send a notification to Discord (if webhook is configured)

## Setup Instructions

### Step 1: Create a Discord Webhook

1. Go to your Discord server
2. Click on **Server Settings** (⚙️)
3. Navigate to **Integrations** → **Webhooks**
4. Click **New Webhook**
5. Select the channel where you want notifications (Channel ID: `1538448096072179772`)
6. Name it something like "Application Notifications"
7. Copy the **Webhook URL** (looks like: `https://discord.com/api/webhooks/123456789/abcdef...`)

### Step 2: Add Webhook URL to Environment Variables

Add the webhook URL to your `.env` file:

```env
DISCORD_WEBHOOK_1538448096072179772=https://discord.com/api/webhooks/YOUR_WEBHOOK_ID/YOUR_WEBHOOK_TOKEN
```

**Important:** Replace `YOUR_WEBHOOK_ID/YOUR_WEBHOOK_TOKEN` with your actual webhook URL.

### Step 3: Restart Your Server

After adding the webhook URL, restart your Node.js server for the changes to take effect.

## What the Discord Notification Looks Like

When an application is submitted, you'll receive an embed with:

- **Title:** "New [Type] Application" (Civilian/Police/EMS)
- **Color:** Purple for Civilian, Blue for Police, Red for EMS
- **Fields:**
  - Character Name
  - Discord User
  - Discord ID
  - Age
  - Experience Level
  - Steam Profile Link
  - Backstory (truncated if too long)
  - Why Join (truncated if too long)
- **Timestamp:** When the application was submitted

## What If Webhook Is Not Configured?

- ✅ Applications will still be saved to the website
- ✅ Staff can still review applications on the website
- ❌ No Discord notification will be sent
- ⚠️ The server will log: "No webhook URL configured for 1538448096072179772. Applications will still be saved to the website."

## Testing

To test if the webhook is working:

1. Submit a test application on the website
2. Check the specified Discord channel
3. You should see the application notification embed
4. Check your server logs for webhook success/failure messages

## Troubleshooting

**Problem:** No notification in Discord
- Check if the webhook URL is correct in `.env`
- Check if the webhook was created in the correct channel
- Check server logs for webhook errors
- Verify the channel ID matches `1538448096072179772`

**Problem:** Application not saving at all
- This is a separate issue from webhooks
- Check your Supabase connection
- Check server logs for database errors

## Security Notes

- ⚠️ **Never commit webhook URLs to public repositories**
- ⚠️ **Keep webhook URLs secret** - anyone with the URL can send messages
- ⚠️ **Rotate webhooks periodically** for better security
- ⚠️ **Use environment variables** - never hardcode URLs

## Customization

If you want to change the webhook notification format, edit the `createApplicationEmbed()` function in `server.js` (around line 900).

You can customize:
- Embed colors
- Field names and order
- Title format
- Footer text
- Add additional fields
