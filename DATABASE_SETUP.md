# Database Setup Guide

This guide explains how to set up the database tables for MOON LIGHT RolePlay.

## Problem: "Could not find the table 'public.applications' in the schema cache"

This error occurs because the database tables haven't been created yet. You need to run the database schema.

## Solution: Run the Database Schema

### Step 1: Go to Supabase Dashboard

1. Log in to [Supabase](https://supabase.com)
2. Select your project
3. Go to **SQL Editor** (in the left sidebar)

### Step 2: Run the Schema

1. Click **New Query**
2. Copy the contents of `database-schema.sql` file
3. Paste it into the SQL Editor
4. Click **Run** (or press Ctrl+Enter)

The schema will create all required tables:
- ✅ users
- ✅ applications
- ✅ application_history
- ✅ tickets
- ✅ notifications
- ✅ audit_logs
- ✅ staff_roles
- ✅ role_definitions
- ✅ permissions
- ✅ police_members
- ✅ police_ranks
- ✅ police_promotions
- ✅ police_announcements
- ✅ ems_members
- ✅ ems_ranks
- ✅ ems_promotions
- ✅ ems_announcements
- ✅ streamers
- ✅ content_management
- ✅ department_notices
- ✅ server_status

### Step 3: Verify Tables Were Created

1. Go to **Table Editor** (in the left sidebar)
2. You should see all the tables listed on the left
3. Click on `applications` to verify it exists and has the correct columns

## Alternative: Using Supabase CLI

If you have the Supabase CLI installed:

```bash
supabase db push
```

Or to apply the schema directly:

```bash
supabase db execute --file database-schema.sql
```

## What If Tables Already Exist?

If you get an error saying tables already exist, that's fine. The schema uses `CREATE TABLE IF NOT EXISTS` so it won't break anything.

## Common Issues

### Issue: "Permission denied"
**Solution:** Make sure you're using the `SUPABASE_SERVICE_ROLE_KEY` in your `.env` file, not the publishable key.

### Issue: "Connection timeout"
**Solution:** Check your internet connection and verify Supabase is online.

### Issue: Tables exist but applications still fail
**Solution:** Check that the `users` table exists and has the correct structure. The application submission now creates users automatically if they don't exist.

## After Running the Schema

Once the schema is successfully applied:

1. ✅ Try submitting an application again
2. ✅ The application should be saved to the database
3. ✅ You should be able to view it in the Staff Panel
4. ✅ If webhook is configured, Discord notification will be sent

## Need Help?

If you encounter any issues:

1. Check the Supabase logs for errors
2. Verify your `.env` variables are correct
3. Make sure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set correctly
4. Try running the schema again - it's safe to run multiple times
