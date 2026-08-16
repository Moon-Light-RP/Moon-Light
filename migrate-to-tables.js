// Migration script to move from key-value store to table-based database
// Run this in Node.js: node migrate-to-tables.js

const { createClient } = require('@supabase/supabase-js');

// Replace with your actual Supabase credentials
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function migrate() {
  console.log('Starting migration to table-based database...');
  
  try {
    // 1. Migrate Users
    console.log('Migrating users...');
    const apps = await supabase.from('ml_store').select('key, value').eq('key', 'moon_light_discord_identity_v1').single();
    
    if (apps.data && apps.data.value) {
      const identity = typeof apps.data.value === 'string' ? JSON.parse(apps.data.value) : apps.data.value;
      
      if (identity.discordId) {
        await supabase.from('users').upsert({
          discord_id: identity.discordId,
          discord_username: identity.username,
          discord_global_name: identity.username,
          role: 'Player'
        }, { onConflict: 'discord_id' });
        console.log('✓ User migrated:', identity.username);
      }
    }
    
    // 2. Migrate Applications
    console.log('Migrating applications...');
    const appsData = await supabase.from('ml_store').select('key, value').eq('key', 'moon_light_department_apps_v1').single();
    
    if (appsData.data && appsData.data.value) {
      const applications = typeof appsData.data.value === 'string' ? JSON.parse(appsData.data.value) : appsData.data.value;
      
      for (const app of applications) {
        await supabase.from('applications').upsert({
          discord_id: app.discord,
          discord_username: app.discord,
          type: app.type,
          character_name: app.characterName,
          age: app.age,
          steam_url: app.steam,
          experience: app.experience,
          backstory: app.backstory,
          why_join: app.why,
          department_experience: app.departmentExperience,
          availability: app.availability,
          status: app.status || 'pending',
          created_at: app.submitted ? new Date(app.submitted).toISOString() : new Date().toISOString()
        }, { onConflict: 'id' });
        console.log('✓ Application migrated:', app.characterName);
      }
    }
    
    // 3. Migrate Staff Roles (with role IDs)
    console.log('Migrating staff roles...');
    const staffData = await supabase.from('ml_store').select('key, value').eq('key', 'moon_light_discord_role_map_v1').single();
    
    if (staffData.data && staffData.data.value) {
      const staffRoles = typeof staffData.data.value === 'string' ? JSON.parse(staffData.data.value) : staffData.data.value;
      
      // Role name to role ID mapping
      const roleMapping = {
        'Management': 'MANAGEMENT_ROLE_ID',
        'Staff': 'MODERATOR_ROLE_ID',
        'Police Cmd': 'POLICE_MANAGEMENT_ROLE_ID',
        'EMS Cmd': 'EMS_MANAGEMENT_ROLE_ID',
        'Streamer Manager': 'ADMINISTRATOR_ROLE_ID'
      };
      
      for (const [discordId, roleName] of Object.entries(staffRoles)) {
        const roleId = roleMapping[roleName] || 'SUPPORT_ROLE_ID';
        
        await supabase.from('staff_roles').upsert({
          discord_id: discordId,
          discord_username: discordId, // Fallback
          role_id: roleId
        }, { onConflict: 'discord_id' });
        console.log('✓ Staff role migrated:', discordId, '→', roleName, '(', roleId, ')');
      }
    }
    
    // 4. Migrate Tickets
    console.log('Migrating tickets...');
    const ticketsData = await supabase.from('ml_store').select('key, value').eq('key', 'moon_light_tickets_v1').single();
    
    if (ticketsData.data && ticketsData.data.value) {
      const tickets = typeof ticketsData.data.value === 'string' ? JSON.parse(ticketsData.data.value) : ticketsData.data.value;
      
      for (const ticket of tickets) {
        await supabase.from('tickets').upsert({
          discord_id: ticket.discord,
          discord_username: ticket.discord,
          character_name: ticket.characterName,
          type: ticket.type,
          channel: ticket.channel,
          status: ticket.status || 'open',
          created_at: new Date().toISOString()
        }, { onConflict: 'id' });
        console.log('✓ Ticket migrated:', ticket.channel);
      }
    }
    
    // 5. Migrate Notifications
    console.log('Migrating notifications...');
    const notifData = await supabase.from('ml_store').select('key, value').eq('key', 'moon_light_notifications_v1').single();
    
    if (notifData.data && notifData.data.value) {
      const notifications = typeof notifData.data.value === 'string' ? JSON.parse(notifData.data.value) : notifData.data.value;
      
      for (const notif of notifications) {
        await supabase.from('notifications').upsert({
          discord_id: notif.toDiscord,
          type: notif.type,
          title: notif.title,
          body: notif.body,
          is_read: notif.read || false,
          created_at: notif.date ? new Date(notif.date).toISOString() : new Date().toISOString()
        }, { onConflict: 'id' });
        console.log('✓ Notification migrated:', notif.title);
      }
    }
    
    // 6. Migrate Audit Logs
    console.log('Migrating audit logs...');
    const auditData = await supabase.from('ml_store').select('key, value').eq('key', 'moon_light_audit_log_v1').single();
    
    if (auditData.data && auditData.data.value) {
      const auditLogs = typeof auditData.data.value === 'string' ? JSON.parse(auditData.data.value) : auditData.data.value;
      
      for (const log of auditLogs) {
        await supabase.from('audit_logs').upsert({
          discord_id: log.discordId || 'system',
          area: log.area,
          action: log.action,
          target: log.target,
          details: log.details,
          created_at: log.timestamp ? new Date(log.timestamp).toISOString() : new Date().toISOString()
        }, { onConflict: 'id' });
        console.log('✓ Audit log migrated:', log.action);
      }
    }
    
    console.log('✅ Migration completed successfully!');
    console.log('⚠️  Please verify the data in Supabase before deleting the old key-value store.');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrate();