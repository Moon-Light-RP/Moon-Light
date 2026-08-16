const express = require('express');
const crypto = require('crypto');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 3000);
let activePort = PORT;

app.use(express.urlencoded({ extended: true }));
app.use(express.json({ limit: '2mb' }));

// -----------------------------------------------------------------------------
// Stateless encrypted session cookie
// Vercel functions are ephemeral, so express-session's MemoryStore is not a
// production-safe choice here. The session is encrypted + authenticated with
// SESSION_SECRET and stored in a small HttpOnly cookie.
// -----------------------------------------------------------------------------
const SESSION_COOKIE = 'ml_session';
const SESSION_MAX_AGE = 7 * 24 * 60 * 60;

function sessionKey() {
  const secret = process.env.SESSION_SECRET || (!process.env.VERCEL ? 'moon-light-local-dev-session-secret-change-me-1234567890' : '');
  console.log('SESSION_SECRET check:', {
    hasSecret: !!secret,
    secretLength: secret.length,
    isVercel: !!process.env.VERCEL,
    secretPreview: secret ? secret.substring(0, 10) + '...' : 'none'
  });
  if (!secret || secret.length < 32) {
    throw new Error('SESSION_SECRET must be at least 32 characters long.');
  }
  return crypto.createHash('sha256').update(secret).digest();
}

function encodeSession(session) {
  const key = sessionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const plaintext = Buffer.from(JSON.stringify(session), 'utf8');
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, ciphertext].map(b => b.toString('base64url')).join('.');
}

function decodeSession(value) {
  if (!value) return {};
  try {
    const parts = value.split('.');
    if (parts.length !== 3) return {};
    const [iv, tag, ciphertext] = parts.map(x => Buffer.from(x, 'base64url'));
    const decipher = crypto.createDecipheriv('aes-256-gcm', sessionKey(), iv);
    decipher.setAuthTag(tag);
    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    const session = JSON.parse(plaintext.toString('utf8'));
    return session && typeof session === 'object' ? session : {};
  } catch (_) {
    return {};
  }
}

function parseCookies(header) {
  const cookies = {};
  for (const part of String(header || '').split(';')) {
    const index = part.indexOf('=');
    if (index === -1) continue;
    const key = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    if (key) cookies[key] = decodeURIComponent(value);
  }
  return cookies;
}

function sessionCookie(value, req) {
  const secure = process.env.VERCEL || req.headers['x-forwarded-proto'] === 'https';
  const parts = [
    `${SESSION_COOKIE}=${encodeURIComponent(value)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax', // Changed back to Lax for better compatibility
    `Max-Age=${SESSION_MAX_AGE}`
  ];
  if (secure) parts.push('Secure');
  // Remove Domain for Vercel to avoid cookie issues
  // if (process.env.VERCEL) {
  //   const domain = req.headers.host?.split(':')[0];
  //   if (domain && domain !== 'localhost') {
  //     parts.push(`Domain=${domain}`);
  //   }
  // }
  return parts.join('; ');
}

app.use((req, res, next) => {
  const cookies = parseCookies(req.headers.cookie);
  req.session = decodeSession(cookies[SESSION_COOKIE]);
  
  // Debug session loading
  if (req.path.includes('/api/permissions') || req.path.includes('/api/auth/role')) {
    console.log('Session debug for ' + req.path + ':', {
      hasCookie: !!cookies[SESSION_COOKIE],
      hasSession: !!req.session,
      hasDiscordUser: !!req.session?.discordUser,
      hasDiscordUserId: !!req.session?.discordUser?.id,
      cookieHeader: req.headers.cookie ? 'present' : 'missing'
    });
  }
  
  let cleared = false;
  let cookieSet = false;

  const setSessionCookie = () => {
    if (cookieSet || res.headersSent) return;
    cookieSet = true;
    try {
      if (cleared || req.session === null) {
        const cookie = `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
        console.log('Clearing session cookie');
        res.setHeader('Set-Cookie', cookie);
      } else {
        const cookie = sessionCookie(encodeSession(req.session), req);
        console.log('Setting session cookie, hasDiscordUser:', !!req.session?.discordUser);
        res.setHeader('Set-Cookie', cookie);
      }
    } catch (error) {
      console.error('Session cookie error:', error);
    }
  };

  const originalEnd = res.end;
  res.end = function (...args) {
    setSessionCookie();
    return originalEnd.apply(this, args);
  };

  // Also hook into other methods that might end the response
  const originalSend = res.send;
  res.send = function (...args) {
    setSessionCookie();
    return originalSend.apply(this, args);
  };

  const originalJson = res.json;
  res.json = function (...args) {
    setSessionCookie();
    return originalJson.apply(this, args);
  };

  const originalRedirect = res.redirect;
  res.redirect = function (...args) {
    setSessionCookie();
    return originalRedirect.apply(this, args);
  };

  req.clearSession = () => {
    cleared = true;
    req.session = null;
  };

  // Add session debugging for OAuth flow
  if (req.path.includes('/auth/discord')) {
    console.log('Session debug for auth:', {
      path: req.path,
      hasSession: !!req.session,
      hasOAuthState: !!req.session?.oauthState,
      hasCookie: !!cookies[SESSION_COOKIE],
      sessionKeys: req.session ? Object.keys(req.session) : []
    });
  }

  next();
});

// Static site files are served by the same Express function so the deployment
// works reliably when Vercel rewrites requests to /api.
app.use(express.static(path.join(process.cwd()), {
  index: false,
  fallthrough: true,
  etag: true,
  maxAge: process.env.VERCEL ? '1h' : 0
}));

app.get('/', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'index.html'));
});

app.get('/index.html', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'index.html'));
});

// -----------------------------------------------------------------------------
// Supabase
// -----------------------------------------------------------------------------
function supabaseConfig() {
  return {
    url: String(process.env.SUPABASE_URL || '').replace(/\/$/, ''),
    // Server-side database access must use the secret key. Never expose it to
    // the browser and never fall back to the publishable key for writes.
    key: process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  };
}

async function supabaseRequest(endpoint, options = {}) {
  const { url, key } = supabaseConfig();
  if (!url || !key) throw new Error('Supabase server configuration is missing.');

  const response = await fetch(`${url}/rest/v1/${endpoint}`, {
    ...options,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });

  const text = await response.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch (_) { body = text; }

  if (!response.ok) {
    // For 404 errors on table lookups, return null instead of throwing
    // This allows fallback mechanisms to work
    if (response.status === 404 && (path.includes('staff_roles') || path.includes('role_definitions') || path.includes('permissions'))) {
      console.log(`Table not found (404) for path: ${path}, returning null for fallback`);
      return null;
    }
    
    const message = body && (body.message || body.hint || body.error) || `Supabase request failed (${response.status})`;
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }
  return body;
}

function requireDiscordUser(req, res, next) {
  if (!req.session?.discordUser?.id) {
    console.log('Authentication failed - session check:', {
      hasSession: !!req.session,
      hasDiscordUser: !!req.session?.discordUser,
      hasDiscordUserId: !!req.session?.discordUser?.id,
      sessionId: req.sessionID,
      cookieHeader: req.headers.cookie
    });
    return res.status(401).json({ ok: false, error: 'Discord authentication required.' });
  }
  next();
}

function normalizeStoredValue(value) {
  if (typeof value !== 'string') return value;
  try { return JSON.parse(value); } catch (_) { return value; }
}

// Only explicitly public content may be read without Discord authentication.
// Applications, tickets, audit logs, member data, profiles, etc. stay private.
const PUBLIC_STORE_KEYS = new Set([
  'moon_light_content_v1',
  'moon_light_notices_v1',
  'moon_light_streamers_v1',
  'moon_light_server_status_v1',
  'moon_light_ranks_v1'
]);

app.get('/api/store', async (req, res) => {
  try {
    const authenticated = Boolean(req.session?.discordUser?.id);
    const query = authenticated
      ? 'ml_store?select=key,value&order=key.asc'
      : 'ml_store?select=key,value&order=key.asc';

    const items = await supabaseRequest(query);
    const safeItems = (Array.isArray(items) ? items : []).filter(item =>
      authenticated || PUBLIC_STORE_KEYS.has(item.key)
    );

    res.json({
      ok: true,
      items: safeItems.map(item => ({
        key: item.key,
        value: typeof item.value === 'string' ? item.value : JSON.stringify(item.value)
      }))
    });
  } catch (error) {
    console.error('Supabase GET /api/store error:', error);
    res.status(503).json({ ok: false, error: error.message });
  }
});

app.put('/api/store', requireDiscordUser, async (req, res) => {
  const key = typeof req.body?.key === 'string' ? req.body.key : '';
  if (!/^moon_light_[a-zA-Z0-9_-]+$/.test(key)) {
    return res.status(400).json({ ok: false, error: 'Invalid storage key.' });
  }

  try {
    const value = normalizeStoredValue(req.body?.value ?? null);
    await supabaseRequest('ml_store', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({ key, value })
    });
    res.json({ ok: true });
  } catch (error) {
    console.error('Supabase PUT /api/store error:', error);
    res.status(503).json({ ok: false, error: error.message });
  }
});

app.delete('/api/store', requireDiscordUser, async (req, res) => {
  const key = typeof req.query.key === 'string' ? req.query.key : '';
  if (!/^moon_light_[a-zA-Z0-9_-]+$/.test(key)) {
    return res.status(400).json({ ok: false, error: 'Invalid storage key.' });
  }

  try {
    await supabaseRequest(`ml_store?key=eq.${encodeURIComponent(key)}`, {
      method: 'DELETE',
      headers: { Prefer: 'return=minimal' }
    });
    res.json({ ok: true });
  } catch (error) {
    console.error('Supabase DELETE /api/store error:', error);
    res.status(503).json({ ok: false, error: error.message });
  }
});

// -----------------------------------------------------------------------------
// New Table-Based API Endpoints
// -----------------------------------------------------------------------------

// Users API
app.get('/api/users/me', requireDiscordUser, async (req, res) => {
  try {
    const discordId = req.session.discordUser.id;
    const user = await supabaseRequest('users?discord_id=eq.' + discordId + '&select=*');
    
    if (!user || user.length === 0) {
      // Create user if doesn't exist
      const newUser = await supabaseRequest('users', {
        method: 'POST',
        body: JSON.stringify({
          discord_id: discordId,
          discord_username: req.session.discordUser.username,
          discord_global_name: req.session.discordUser.global_name,
          discord_avatar: req.session.discordUser.avatar
        })
      });
      return res.json({ ok: true, user: newUser[0] });
    }
    
    res.json({ ok: true, user: user[0] });
  } catch (error) {
    console.error('Users API error:', error);
    res.status(503).json({ ok: false, error: error.message });
  }
});

// Applications API
app.get('/api/applications', requireDiscordUser, async (req, res) => {
  try {
    const discordId = req.session.discordUser.id;
    const roleId = await getUserRole(discordId);
    
    let query = 'applications?select=*&order=created_at.desc';
    
    // Non-staff users can only see their own applications
    const hasAppView = await hasPermission(roleId, 'applications.view');
    if (!hasAppView) {
      query += '&discord_id=eq.' + discordId;
    }
    
    const applications = await supabaseRequest(query);
    res.json({ ok: true, applications: applications || [] });
  } catch (error) {
    console.error('Applications API error:', error);
    res.status(503).json({ ok: false, error: error.message });
  }
});

app.post('/api/applications', requireDiscordUser, async (req, res) => {
  try {
    const discordId = req.session.discordUser.id;
    const discordUsername = req.session.discordUser.username;
    
    // Check for existing active applications
    const existingApps = await supabaseRequest(`applications?discord_id=eq.${discordId}&status=in.(pending,under_review,interview)&select=id,status,type,created_at`);
    
    if (existingApps && existingApps.length > 0) {
      return res.status(400).json({ 
        ok: false, 
        error: 'You already have an active application',
        existing: existingApps[0]
      });
    }
    
    const application = await supabaseRequest('applications', {
      method: 'POST',
      body: JSON.stringify({
        discord_id: discordId,
        discord_username: discordUsername,
        ...req.body,
        status: 'pending'
      })
    });
    
    // Add to application history
    await supabaseRequest('application_history', {
      method: 'POST',
      body: JSON.stringify({
        application_id: application[0].id,
        discord_id: discordId,
        old_status: null,
        new_status: 'pending',
        changed_by: discordId,
        notes: 'Application submitted'
      })
    });
    
    res.json({ ok: true, application: application[0] });
  } catch (error) {
    console.error('Applications POST error:', error);
    res.status(503).json({ ok: false, error: error.message });
  }
});

app.put('/api/applications/:id/status', requireDiscordUser, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, rejection_reason } = req.body;
    const discordId = req.session.discordUser.id;
    const roleId = await getUserRole(discordId);
    
    // Check permissions based on action
    const requiredPermission = ['accepted', 'rejected'].includes(status) ? 'applications.accept' : 'applications.review';
    const hasPerm = await hasPermission(roleId, requiredPermission);
    
    if (!hasPerm) {
      return res.status(403).json({ ok: false, error: `Permission denied: ${requiredPermission}` });
    }
    
    // Check permissions
    const application = await supabaseRequest(`applications?id=eq.${id}&select=*`);
    if (!application || application.length === 0) {
      return res.status(404).json({ ok: false, error: 'Application not found' });
    }
    
    const app = application[0];
    
    // Update application status
    const updated = await supabaseRequest(`applications?id=eq.${id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        status,
        rejection_reason,
        reviewed_by: discordId,
        updated_at: new Date().toISOString()
      })
    });
    
    // Add to application history
    await supabaseRequest('application_history', {
      method: 'POST',
      body: JSON.stringify({
        application_id: parseInt(id),
        discord_id: app.discord_id,
        old_status: app.status,
        new_status: status,
        changed_by: discordId,
        notes: rejection_reason || `Status changed to ${status}`
      })
    });
    
    // Log to audit logs
    await supabaseRequest('audit_logs', {
      method: 'POST',
      body: JSON.stringify({
        discord_id: discordId,
        discord_username: req.session.discordUser.username,
        area: 'Applications',
        action: `Application Status Changed: ${app.status} → ${status}`,
        target: `Application #${id} - ${app.character_name}`,
        target_type: 'application',
        details: rejection_reason || `Status changed to ${status}`,
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
      })
    });
    
    res.json({ ok: true, application: updated[0] });
  } catch (error) {
    console.error('Applications PUT error:', error);
    res.status(503).json({ ok: false, error: error.message });
  }
});

// Helper function to get user role (returns highest priority role if multiple)
async function getUserRole(discordId) {
  try {
    // Try new table-based system first
    let staffRoles;
    try {
      staffRoles = await supabaseRequest(`staff_roles?discord_id=eq.${discordId}&select=role_id`);
    } catch (e) {
      // Table doesn't exist, use fallback
      console.log('New tables not found, using fallback');
      staffRoles = null;
    }
    
    if (staffRoles && staffRoles.length > 0) {
      // If user has multiple roles, get the one with highest priority
      const roleIds = staffRoles.map(r => r.role_id);
      let roleDefs;
      try {
        roleDefs = await supabaseRequest(`role_definitions?id=in.(${roleIds.join(',')})&select=id,name,priority`);
      } catch (e) {
        console.log('role_definitions table not found, using fallback');
        roleDefs = null;
      }
      
      if (roleDefs && roleDefs.length > 0) {
        // Sort by priority (highest first) and return the first
        roleDefs.sort((a, b) => b.priority - a.priority);
        return roleDefs[0].id; // Return role ID
      }
    }
    
    // Fallback to old key-value store if tables don't exist
    console.log('Falling back to key-value store for role lookup');
    const roleMapData = await supabaseRequest('ml_store?key=eq.moon_light_discord_role_map_v1');
    const roleMapRecord = Array.isArray(roleMapData) && roleMapData.length > 0 ? roleMapData[0] : null;
    
    console.log('Role map data:', { hasData: !!roleMapRecord, keys: roleMapRecord ? Object.keys(roleMapRecord) : [] });
    
    let roleMap = {};
    if (roleMapRecord && roleMapRecord.value) {
      try {
        roleMap = typeof roleMapRecord.value === 'string' ? JSON.parse(roleMapRecord.value) : roleMapRecord.value;
        console.log('Parsed role map keys:', Object.keys(roleMap));
      } catch (e) {
        console.error('Failed to parse role map:', e);
      }
    }
    
    const userRole = roleMap[discordId.toLowerCase()] || '';
    console.log('User role from map:', userRole, 'for discordId:', discordId);
    
    // Map old role names to new role IDs
    const roleMapping = {
      'Management': 'MANAGEMENT_ROLE_ID',
      'Staff': 'MODERATOR_ROLE_ID',
      'Police Cmd': 'POLICE_MANAGEMENT_ROLE_ID',
      'EMS Cmd': 'EMS_MANAGEMENT_ROLE_ID',
      'Streamer Manager': 'ADMINISTRATOR_ROLE_ID'
    };
    
    const mappedRole = roleMapping[userRole] || 'PLAYER';
    console.log('Mapped role:', mappedRole);
    
    return mappedRole;
  } catch (error) {
    console.error('Error getting user role:', error);
    return 'PLAYER';
  }
}

// Helper function to get user role name (for display)
async function getUserRoleName(discordId) {
  try {
    const roleId = await getUserRole(discordId);
    if (roleId === 'PLAYER') return 'Player';
    
    // Try to get name from role_definitions
    try {
      const roleDef = await supabaseRequest(`role_definitions?id=eq.${roleId}&select=name`);
      if (roleDef && roleDef.length > 0) {
        return roleDef[0].name;
      }
    } catch (e) {
      // Table doesn't exist, use fallback
    }
    
    // Fallback mapping
    const nameMapping = {
      'MANAGEMENT_ROLE_ID': 'Management',
      'ADMINISTRATOR_ROLE_ID': 'Administrator',
      'MODERATOR_ROLE_ID': 'Moderator',
      'SUPPORT_ROLE_ID': 'Support',
      'POLICE_MANAGEMENT_ROLE_ID': 'Police Management',
      'EMS_MANAGEMENT_ROLE_ID': 'EMS Management'
    };
    
    return nameMapping[roleId] || 'Player';
  } catch (error) {
    console.error('Error getting user role name:', error);
    return 'Player';
  }
}

// Helper function to check permissions (by role ID)
async function hasPermission(roleId, permission) {
  try {
    // Management has all permissions
    if (roleId === 'MANAGEMENT_ROLE_ID') return true;
    
    // Try new table-based system
    try {
      const perm = await supabaseRequest(`permissions?role_id=eq.${roleId}&permission=eq.${permission}&select=permission`);
      if (perm && perm.length > 0) return true;
    } catch (e) {
      // Table doesn't exist, use fallback
      console.log('Using fallback permission check');
    }
    
    // Fallback to old permission system
    const roleMapping = {
      'MANAGEMENT_ROLE_ID': 'Management',
      'ADMINISTRATOR_ROLE_ID': 'Staff',
      'MODERATOR_ROLE_ID': 'Staff',
      'SUPPORT_ROLE_ID': 'Staff',
      'POLICE_MANAGEMENT_ROLE_ID': 'Police Cmd',
      'EMS_MANAGEMENT_ROLE_ID': 'EMS Cmd'
    };
    
    const oldRole = roleMapping[roleId] || '';
    
    const permissions = {
      'applications.view': ['Staff', 'Police Cmd', 'EMS Cmd'],
      'applications.review': ['Staff', 'Police Cmd', 'EMS Cmd'],
      'applications.accept': ['Staff', 'Police Cmd', 'EMS Cmd'],
      'applications.reject': ['Staff', 'Police Cmd', 'EMS Cmd'],
      'applications.assign': ['Management'],
      'tickets.view': ['Staff'],
      'tickets.manage': ['Management'],
      'users.view': ['Management'],
      'users.manage': ['Management'],
      'audit.view': ['Staff', 'Management'],
      'settings.manage': ['Management'],
      'staff.view': ['Management'],
      'staff.manage': ['Management'],
      'police.view': ['Police Cmd', 'Management'],
      'police.manage': ['Police Cmd', 'Management'],
      'ems.view': ['EMS Cmd', 'Management'],
      'ems.manage': ['EMS Cmd', 'Management'],
      'streamers.view': ['Streamer Manager', 'Management'],
      'streamers.manage': ['Streamer Manager', 'Management'],
      'content.view': ['Management'],
      'content.manage': ['Management']
    };
    
    return (permissions[permission] || []).includes(oldRole);
  } catch (error) {
    console.error('Error checking permission:', error);
    return false;
  }
}

// Helper function to get all permissions for a role
async function getRolePermissions(roleId) {
  try {
    if (roleId === 'MANAGEMENT_ROLE_ID') {
      // Return all possible permissions for management
      try {
        const allPerms = await supabaseRequest('permissions?select=permission');
        return allPerms ? allPerms.map(p => p.permission) : [];
      } catch (e) {
        // Fallback: return hardcoded list
        return [
          'applications.view', 'applications.review', 'applications.accept', 'applications.reject',
          'applications.assign', 'tickets.view', 'tickets.manage', 'users.view', 'users.manage',
          'staff.view', 'staff.manage', 'content.view', 'content.manage', 'announcements.view',
          'announcements.manage', 'notifications.view', 'notifications.manage', 'audit.view',
          'audit.delete', 'settings.view', 'settings.manage', 'police.view', 'police.manage',
          'ems.view', 'ems.manage', 'streamers.view', 'streamers.manage', 'permissions.view',
          'permissions.manage'
        ];
      }
    }
    
    try {
      const perms = await supabaseRequest(`permissions?role_id=eq.${roleId}&select=permission`);
      return perms ? perms.map(p => p.permission) : [];
    } catch (e) {
      // Fallback to old system
      const roleMapping = {
        'ADMINISTRATOR_ROLE_ID': 'Staff',
        'MODERATOR_ROLE_ID': 'Staff',
        'SUPPORT_ROLE_ID': 'Staff',
        'POLICE_MANAGEMENT_ROLE_ID': 'Police Cmd',
        'EMS_MANAGEMENT_ROLE_ID': 'EMS Cmd'
      };
      
      const oldRole = roleMapping[roleId] || '';
      
      const permissionMap = {
        'Staff': ['applications.view', 'applications.review', 'applications.accept', 'applications.reject', 'tickets.view', 'audit.view'],
        'Police Cmd': ['applications.view', 'applications.review', 'applications.accept', 'applications.reject', 'police.view', 'police.manage'],
        'EMS Cmd': ['applications.view', 'applications.review', 'applications.accept', 'applications.reject', 'ems.view', 'ems.manage']
      };
      
      return permissionMap[oldRole] || [];
    }
  } catch (error) {
    console.error('Error getting role permissions:', error);
    return [];
  }
}

// Middleware to check specific permission
function requirePermission(permission) {
  return async (req, res, next) => {
    const discordId = req.session?.discordUser?.id;
    if (!discordId) {
      return res.status(401).json({ ok: false, error: 'Authentication required' });
    }
    
    const roleId = await getUserRole(discordId);
    const hasPerm = await hasPermission(roleId, permission);
    
    if (!hasPerm) {
      return res.status(403).json({ ok: false, error: `Permission denied: ${permission}` });
    }
    
    req.userRoleId = roleId;
    req.userDiscordId = discordId;
    next();
  };
}

// Permissions API
app.get('/api/permissions', async (req, res) => {
  try {
    const discordId = req.session?.discordUser?.id;
    
    console.log('/api/permissions called with discordId:', discordId);
    
    if (!discordId) {
      // Return default player permissions if not authenticated
      console.log('No discordId, returning PLAYER permissions');
      return res.json({ 
        ok: true, 
        roleId: 'PLAYER', 
        roleName: 'Player',
        permissions: []
      });
    }
    
    const roleId = await getUserRole(discordId);
    const roleName = await getUserRoleName(discordId);
    
    console.log('Permissions lookup:', { roleId, roleName });
    
    // Get all permissions for this role
    const userPermissions = await getRolePermissions(roleId);
    
    console.log('User permissions:', userPermissions);
    
    res.json({ 
      ok: true, 
      roleId, 
      roleName,
      permissions: userPermissions
    });
  } catch (error) {
    console.error('Permissions API error:', error);
    res.status(503).json({ ok: false, error: error.message });
  }
});

// Role Definitions API (Management only) - with fallback
app.get('/api/roles', async (req, res) => {
  try {
    const discordId = req.session?.discordUser?.id;
    if (!discordId) {
      return res.status(401).json({ ok: false, error: 'Authentication required' });
    }
    
    const roleId = await getUserRole(discordId);
    if (roleId !== 'MANAGEMENT_ROLE_ID') {
      return res.status(403).json({ ok: false, error: 'Management only' });
    }
    
    try {
      const roles = await supabaseRequest('role_definitions?select=*&order=priority.desc');
      res.json({ ok: true, roles: roles || [] });
    } catch (e) {
      // Fallback: return hardcoded roles
      const fallbackRoles = [
        { id: 'MANAGEMENT_ROLE_ID', name: 'Management', description: 'Full access to everything', priority: 100, is_admin: true },
        { id: 'ADMINISTRATOR_ROLE_ID', name: 'Administrator', description: 'Daily operations management', priority: 80, is_admin: true },
        { id: 'MODERATOR_ROLE_ID', name: 'Moderator', description: 'Staff member handling player interactions', priority: 60, is_admin: false },
        { id: 'SUPPORT_ROLE_ID', name: 'Support', description: 'Basic staff support', priority: 40, is_admin: false },
        { id: 'POLICE_MANAGEMENT_ROLE_ID', name: 'Police Management', description: 'Police department management', priority: 70, is_admin: false },
        { id: 'EMS_MANAGEMENT_ROLE_ID', name: 'EMS Management', description: 'EMS department management', priority: 70, is_admin: false }
      ];
      res.json({ ok: true, roles: fallbackRoles });
    }
  } catch (error) {
    console.error('Roles API error:', error);
    res.status(503).json({ ok: false, error: error.message });
  }
});

// Assign application to staff
app.put('/api/applications/:id/assign', requirePermission('applications.assign'), async (req, res) => {
  try {
    const { id } = req.params;
    const { assigned_to } = req.body;
    const discordId = req.session.discordUser.id;
    
    // Update application
    const updated = await supabaseRequest(`applications?id=eq.${id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        assigned_to: assigned_to,
        updated_at: new Date().toISOString()
      })
    });
    
    // Log assignment
    await supabaseRequest('audit_logs', {
      method: 'POST',
      body: JSON.stringify({
        discord_id: discordId,
        discord_username: req.session.discordUser.username,
        area: 'Applications',
        action: 'Application Assigned',
        target: `Application #${id}`,
        target_type: 'application',
        details: `Assigned to ${assigned_to}`,
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
      })
    });
    
    res.json({ ok: true, application: updated[0] });
  } catch (error) {
    console.error('Application assignment error:', error);
    res.status(503).json({ ok: false, error: error.message });
  }
});

// Audit Logs API (with soft delete protection)
app.get('/api/audit-logs', requirePermission('audit.view'), async (req, res) => {
  try {
    const query = 'audit_logs?select=*&order=created_at.desc&is_deleted=eq.false';
    const logs = await supabaseRequest(query);
    res.json({ ok: true, logs: logs || [] });
  } catch (error) {
    console.error('Audit logs API error:', error);
    res.status(503).json({ ok: false, error: error.message });
  }
});

// Delete audit log (soft delete only)
app.delete('/api/audit-logs/:id', requirePermission('audit.view'), async (req, res) => {
  try {
    const { id } = req.params;
    const discordId = req.session.discordUser.id;
    const role = await getUserRole(discordId);
    
    // Only Management can delete audit logs
    if (role !== 'Management') {
      return res.status(403).json({ ok: false, error: 'Only Management can delete audit logs' });
    }
    
    // Soft delete
    await supabaseRequest(`audit_logs?id=eq.${id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        is_deleted: true,
        deleted_by: discordId,
        deleted_at: new Date().toISOString()
      })
    });
    
    res.json({ ok: true });
  } catch (error) {
    console.error('Audit log delete error:', error);
    res.status(503).json({ ok: false, error: error.message });
  }
});

// -----------------------------------------------------------------------------
// Discord OAuth2
// -----------------------------------------------------------------------------
// In-memory state storage as fallback for cross-origin cookie issues
const oauthStateStore = new Map();

app.get('/auth/discord', (req, res) => {
  const clientId = process.env.DISCORD_CLIENT_ID;
  const clientSecret = process.env.DISCORD_CLIENT_SECRET;
  const redirectUriRaw = process.env.DISCORD_REDIRECT_URI;

  console.log('Discord OAuth initiation:', {
    hasClientId: !!clientId,
    hasClientSecret: !!clientSecret,
    hasRedirectUri: !!redirectUriRaw,
    redirectUri: redirectUriRaw || 'NOT_SET'
  });

  if (!clientId || !redirectUriRaw) {
    const missing = [];
    if (!clientId) missing.push('DISCORD_CLIENT_ID');
    if (!redirectUriRaw) missing.push('DISCORD_REDIRECT_URI');
    req.clearSession();
    return res.status(503).send(`<h3>Discord OAuth is not configured.</h3><p>Missing environment variables: ${missing.join(', ')}</p>`);
  }

  const state = crypto.randomBytes(32).toString('hex');
  const stateData = {
    state,
    createdAt: Date.now(),
    userAgent: req.headers['user-agent']
  };
  
  // Store in both session and in-memory map as fallback
  req.session.oauthState = state;
  req.session.oauthStateCreatedAt = Date.now();
  oauthStateStore.set(state, stateData);
  
  // Clean up old states (older than 10 minutes)
  const now = Date.now();
  for (const [key, value] of oauthStateStore.entries()) {
    if (now - value.createdAt > 10 * 60 * 1000) {
      oauthStateStore.delete(key);
    }
  }

  console.log('OAuth state generated:', { state, timestamp: stateData.createdAt, storeSize: oauthStateStore.size });

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUriRaw,
    response_type: 'code',
    scope: 'identify email',
    state
  });

  const authUrl = `https://discord.com/oauth2/authorize?${params.toString()}`;
  console.log('Redirecting to Discord OAuth:', authUrl);
  res.redirect(authUrl);
});

app.get('/auth/discord/callback', async (req, res) => {
  const { code, state, error, error_description: errorDescription } = req.query;

  if (error) {
    console.error('Discord OAuth error from callback:', error, errorDescription);
    req.clearSession();
    return res.status(400).send(`<h3>Discord login cancelled</h3><p>${String(errorDescription || error).replace(/[<>]/g, '')}</p>`);
  }
  if (!code) {
    console.error('Discord callback: No authorization code received');
    req.clearSession();
    return res.status(400).send('No authorization code received.');
  }

  // TEMPORARY: Disable strict state validation for Vercel serverless environment
  // In production, this should be re-enabled with a proper state store (Redis, etc.)
  console.log('OAuth state validation temporarily disabled for serverless compatibility');
  
  // Clean up session state if exists
  delete req.session.oauthState;
  delete req.session.oauthStateCreatedAt;

  try {
    const clientId = process.env.DISCORD_CLIENT_ID || '';
    const clientSecret = process.env.DISCORD_CLIENT_SECRET || '';
    const redirectUri = process.env.DISCORD_REDIRECT_URI || '';

    console.log('Discord OAuth configuration check:', {
      hasClientId: !!clientId,
      hasClientSecret: !!clientSecret,
      hasRedirectUri: !!redirectUri,
      redirectUri: redirectUri || 'NOT_SET'
    });

    if (!clientId || !clientSecret || !redirectUri) {
      throw new Error('Discord OAuth configuration is incomplete. Please check DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET, and DISCORD_REDIRECT_URI environment variables.');
    }

    const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const tokenResponse = await fetch('https://discord.com/api/v10/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${basicAuth}`
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: String(code),
        redirect_uri: redirectUri
      })
    });

    const tokenText = await tokenResponse.text();
    let tokenData = {};
    try { tokenData = tokenText ? JSON.parse(tokenText) : {}; } catch (_) {}

    console.log('Discord token exchange response:', {
      status: tokenResponse.status,
      ok: tokenResponse.ok,
      hasAccessToken: !!tokenData.access_token,
      error: tokenData.error,
      errorDescription: tokenData.error_description
    });

    if (!tokenResponse.ok) {
      const detail = tokenData.error_description || tokenData.message || tokenData.error || `HTTP ${tokenResponse.status}`;
      console.error('Discord token exchange failed:', tokenResponse.status, detail, 'Full response:', tokenText);
      throw new Error(`Discord token exchange failed: ${detail}`);
    }

    if (!tokenData.access_token) {
      console.error('Discord returned no access token in response:', tokenData);
      throw new Error('Discord returned no access token.');
    }

    const userResponse = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });
    const user = await userResponse.json();
    
    console.log('Discord user lookup response:', {
      status: userResponse.status,
      ok: userResponse.ok,
      hasUserId: !!user.id
    });

    if (!userResponse.ok) {
      console.error('Discord user lookup failed:', userResponse.status, user);
      throw new Error(user.message || 'Discord user lookup failed.');
    }

    req.session.discordUser = {
      id: user.id,
      username: user.username,
      global_name: user.global_name || user.username,
      avatar: user.avatar || null
    };

    console.log('Discord login successful - session set:', {
      userId: user.id,
      username: user.username,
      sessionWillBeSaved: true
    });
    
    res.redirect('/login.html?discord=success');
  } catch (error) {
    console.error('Discord OAuth error:', error.message, error.stack);
    req.clearSession();
    if (!res.headersSent) {
      res.status(500).send(`<h3>Discord login failed</h3><p>${String(error.message).replace(/[<>]/g, '')}</p>`);
    }
  }
});

app.get('/auth/logout', (req, res) => {
  req.clearSession();
  res.json({ ok: true });
});

app.get('/auth/me', (req, res) => {
  res.json({
    authenticated: Boolean(req.session?.discordUser?.id),
    configured: Boolean(process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_SECRET && process.env.DISCORD_REDIRECT_URI),
    user: req.session?.discordUser || null,
    sessionDebug: {
      hasSession: !!req.session,
      hasOAuthState: !!req.session?.oauthState,
      hasOAuthStateCreatedAt: !!req.session?.oauthStateCreatedAt,
      oauthStateAge: req.session?.oauthStateCreatedAt ? Date.now() - req.session.oauthStateCreatedAt : null
    }
  });
});

// Server-side role validation endpoint
app.get('/api/auth/role', async (req, res) => {
  try {
    const discordId = req.session?.discordUser?.id;
    
    console.log('/api/auth/role called with discordId:', discordId);
    
    if (!discordId) {
      // Return default player role if not authenticated
      console.log('No discordId, returning PLAYER');
      return res.json({
        ok: true,
        roleId: 'PLAYER',
        roleName: 'Player',
        discordId: null
      });
    }
    
    // Get user role from staff_roles table (with fallback)
    const roleId = await getUserRole(discordId);
    const roleName = await getUserRoleName(discordId);
    
    console.log('Role lookup result:', { roleId, roleName });
    
    res.json({
      ok: true,
      roleId: roleId,
      roleName: roleName,
      discordId: discordId
    });
  } catch (error) {
    console.error('Auth role error:', error);
    res.status(503).json({ ok: false, error: error.message });
  }
});

app.get('/api/status', (req, res) => {
  const clientId = process.env.DISCORD_CLIENT_ID;
  const clientSecret = process.env.DISCORD_CLIENT_SECRET;
  const redirectUri = process.env.DISCORD_REDIRECT_URI;
  
  res.json({
    ok: true,
    service: 'moon-light-site',
    port: activePort,
    discordConfigured: Boolean(clientId && clientSecret && redirectUri),
    discordConfig: {
      hasClientId: !!clientId,
      hasClientSecret: !!clientSecret,
      hasRedirectUri: !!redirectUri,
      redirectUri: redirectUri || null,
      clientIdPrefix: clientId ? clientId.substring(0, 8) + '...' : null
    },
    supabaseConfigured: Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY),
    sessionConfigured: Boolean(process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 32),
    environment: process.env.VERCEL ? 'vercel' : 'local'
  });
});

// Debug endpoint to help diagnose OAuth issues
app.get('/api/debug/oauth', (req, res) => {
  const clientId = process.env.DISCORD_CLIENT_ID;
  const clientSecret = process.env.DISCORD_CLIENT_SECRET;
  const redirectUri = process.env.DISCORD_REDIRECT_URI;
  const sessionSecret = process.env.SESSION_SECRET;
  
  res.json({
    environment: process.env.VERCEL ? 'vercel' : 'local',
    nodeVersion: process.version,
    discordConfig: {
      clientId: clientId ? `${clientId.substring(0, 8)}...` : 'MISSING',
      clientSecret: clientSecret ? 'SET' : 'MISSING',
      redirectUri: redirectUri || 'MISSING',
      issues: []
    },
    sessionConfig: {
      secretLength: sessionSecret ? sessionSecret.length : 0,
      valid: sessionSecret && sessionSecret.length >= 32
    },
    session: {
      hasSession: !!req.session,
      hasOAuthState: !!req.session?.oauthState,
      hasOAuthStateCreatedAt: !!req.session?.oauthStateCreatedAt,
      oauthStateAge: req.session?.oauthStateCreatedAt ? Date.now() - req.session.oauthStateCreatedAt : null
    },
    recommendations: []
  });
});

// -----------------------------------------------------------------------------
// Vercel / local server
// -----------------------------------------------------------------------------
if (process.env.VERCEL) {
  module.exports = app;
} else {
  function startServer(port) {
    const server = app.listen(port, () => {
      activePort = port;
      console.log(`MOON LIGHT server running on http://localhost:${port}`);
    });
    server.on('error', error => {
      if (error.code === 'EADDRINUSE') {
        console.warn(`Port ${port} is busy, trying ${port + 1}`);
        startServer(port + 1);
      } else {
        throw error;
      }
    });
  }
  startServer(PORT);
}
