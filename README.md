# MOON LIGHT RolePlay Website

Official website and management panel for MOON LIGHT RolePlay community.

## Features

- **Discord OAuth Authentication** - Secure login with Discord integration
- **Role-Based Access Control** - Staff roles automatically detected from Discord
- **Application System** - Civilian, Police, and EMS application management
- **Staff Panel** - Central management interface for all staff functions
- **Department Portals** - Separate Police and EMS management interfaces
- **Real-time Server Status** - Live player count and server status display

## Tech Stack

- **Backend:** Node.js with Express
- **Frontend:** HTML, CSS, JavaScript (vanilla)
- **Database:** Supabase (PostgreSQL)
- **Authentication:** Discord OAuth2
- **Hosting:** Vercel
- **Version Control:** GitHub

## Environment Variables

Required environment variables in Vercel:

```
SESSION_SECRET=your_random_32_char_secret
DISCORD_CLIENT_ID=your_discord_client_id
DISCORD_CLIENT_SECRET=your_discord_client_secret
DISCORD_REDIRECT_URI=https://moon-light-eosin.vercel.app/auth/discord/callback
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
SUPABASE_URL=your_supabase_project_url
```

## Local Development

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file:
```bash
SESSION_SECRET=your_local_secret
DISCORD_CLIENT_ID=your_discord_client_id
DISCORD_CLIENT_SECRET=your_discord_client_secret
DISCORD_REDIRECT_URI=http://localhost:3000/auth/discord/callback
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
SUPABASE_URL=your_supabase_project_url
```

3. Start the server:
```bash
npm start
```

4. Open browser:
```
http://localhost:3000
```

## Project Structure

```
├── server.js              # Main Express server
├── package.json          # Dependencies and scripts
├── vercel.json          # Vercel configuration
├── index.html            # Homepage
├── login.html            # Discord OAuth login
├── staff-panel.html      # Staff management panel
├── assets/               # Frontend assets
│   ├── ml-complete.css  # Main stylesheet
│   ├── portal.js        # Shared JavaScript functions
│   └── responsive.css  # Mobile responsiveness
├── api/                  # API endpoints
├── staff/                # Staff-specific pages
└── *.html                # Various pages (application, police, ems, etc.)
```

## Authentication Flow

1. User clicks "Continue with Discord" on login page
2. Redirected to Discord OAuth authorization
3. User authorizes the application
4. Discord redirects back to `/auth/discord/callback`
5. Server retrieves user data from Discord
6. Session is created with encrypted cookie
7. User is redirected to login page with session active
8. Discord user info is automatically detected and role is assigned

## Staff Roles

- **Management** - Full access to all features
- **Streamer Manager** - Streamer management and Discord configuration
- **Staff** - Application review and interview scheduling
- **Police Cmd** - Police department management
- **EMS Cmd** - EMS department management
- **Player** - Basic player access

## Deployment

The site is automatically deployed to Vercel from GitHub repository:

- **Repository:** https://github.com/Moon-Light-RP/Moon-Light
- **Production URL:** https://moon-light-eosin.vercel.app
- **Branch:** main
- **Root Directory:** wepsite/moonlight-main
- **Build System:** Vercel automatic builds

Any push to the `main` branch triggers an automatic deployment.

## Vercel Configuration

**Important:** Vercel must be configured to use the correct root directory:
- Root Directory: `wepsite/moonlight-main`
- Branch: `main`
- Build Command: Default (Vercel auto-detects)
- Output Directory: Default (root)

## Troubleshooting

### Session Issues

If users cannot stay logged in:

1. Check `SESSION_SECRET` environment variable in Vercel
2. Verify Discord OAuth configuration
3. Check server logs for session errors
4. Ensure session cookie is being set correctly

### Discord OAuth Not Working

1. Verify `DISCORD_CLIENT_ID` and `DISCORD_CLIENT_SECRET` are correct
2. Ensure `DISCORD_REDIRECT_URI` matches Vercel deployment URL
3. Check Discord Developer Portal for any restrictions
4. Verify OAuth redirect URL in Discord application settings

### Database Connection Issues

1. Verify `SUPABASE_SERVICE_ROLE_KEY` is correct
2. Check Supabase project is active
3. Review Supabase logs for connection errors
4. Ensure Supabase URL is correct

### 404 Errors

If you encounter 404 errors:

1. Verify Vercel Root Directory is set to `wepsite/moonlight-main`
2. Check GitHub repository has files in correct location
3. Ensure Git branch is `main`
4. Trigger manual deployment from Vercel Dashboard

## Recent Changes

- Updated Node.js engine to 24.x for Vercel compatibility
- Improved session security with encrypted stateless cookies
- Enhanced Discord OAuth integration
- Added comprehensive role-based access control
- Modernized UI with card-based layouts

## License

Copyright © 2026 MOON LIGHT RolePlay. All rights reserved.
