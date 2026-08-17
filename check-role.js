// Script to check user role in the database
const supabaseUrl = process.env.SUPABASE_URL || 'https://YOUR_PROJECT.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'YOUR_SERVICE_ROLE_KEY';

if (supabaseUrl.includes('YOUR_PROJECT') || supabaseKey.includes('YOUR_SERVICE_ROLE_KEY')) {
  console.error('❌ Error: Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables');
  console.log('Or run this script with your credentials:');
  console.log('  SUPABASE_URL="https://your-project.supabase.co" SUPABASE_SERVICE_ROLE_KEY="your-key" node check-role.js DISCORD_ID');
  process.exit(1);
}

async function checkUserRole(discordId) {
  try {
    console.log(`🔍 Checking role for Discord ID: ${discordId}`);
    
    // Method 1: Check staff_roles table (new system)
    console.log('\n📋 Method 1: Checking staff_roles table...');
    const staffRolesResponse = await fetch(`${supabaseUrl}/rest/v1/staff_roles?discord_id=eq.${discordId}&select=*`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    const staffRoles = await staffRolesResponse.json();
    
    if (staffRoles && staffRoles.length > 0) {
      console.log('✅ Found staff role assignment:');
      console.log(staffRoles);
      
      // Get role definitions
      for (const role of staffRoles) {
        const roleDefResponse = await fetch(`${supabaseUrl}/rest/v1/role_definitions?id=eq.${role.role_id}&select=*`, {
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json'
          }
        });
        const roleDef = await roleDefResponse.json();
        if (roleDef && roleDef.length > 0) {
          console.log(`   Role: ${roleDef[0].name} (Priority: ${roleDef[0].priority})`);
        }
      }
    } else {
      console.log('❌ No role found in staff_roles table');
    }
    
    // Method 2: Check users table
    console.log('\n📋 Method 2: Checking users table...');
    const usersResponse = await fetch(`${supabaseUrl}/rest/v1/users?discord_id=eq.${discordId}&select=*`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    const users = await usersResponse.json();
    
    if (users && users.length > 0) {
      console.log('✅ Found user record:');
      console.log(`   Username: ${users[0].discord_username}`);
      console.log(`   Role: ${users[0].role}`);
      console.log(`   Created: ${users[0].created_at}`);
    } else {
      console.log('❌ No user record found');
    }
    
    // Method 3: Check key-value store (fallback)
    console.log('\n📋 Method 3: Checking key-value store (fallback)...');
    const kvResponse = await fetch(`${supabaseUrl}/rest/v1/ml_store?key=eq.moon_light_discord_role_map_v1&select=*`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    const kvData = await kvResponse.json();
    
    if (kvData && kvData.length > 0) {
      try {
        const roleMap = typeof kvData[0].value === 'string' ? JSON.parse(kvData[0].value) : kvData[0].value;
        const userRole = roleMap[discordId.toLowerCase()] || roleMap[discordId];
        
        if (userRole) {
          console.log('✅ Found role in key-value store:');
          console.log(`   Role: ${userRole}`);
        } else {
          console.log('❌ No role found in key-value store');
        }
      } catch (e) {
        console.log('❌ Error parsing key-value store:', e.message);
      }
    } else {
      console.log('❌ No key-value store data found');
    }
    
    console.log('\n📊 Summary:');
    if (staffRoles && staffRoles.length > 0) {
      console.log('✅ User has a staff role assigned (highest priority role will be used)');
    } else if (users && users.length > 0) {
      console.log(`ℹ️ User exists with role: ${users[0].role}`);
    } else {
      console.log('❌ User not found in any table - they will be treated as "Player"');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Get Discord ID from command line
const discordId = process.argv[2];

if (!discordId) {
  console.log('Usage: node check-role.js <DISCORD_ID>');
  console.log('Example: node check-role.js 123456789012345678');
  console.log('\nTo find your Discord ID:');
  console.log('1. Open Discord');
  console.log('2. Go to User Settings → Advanced');
  console.log('3. Enable "Developer Mode"');
  console.log('4. Right-click on your username → Copy User ID');
  process.exit(1);
}

checkUserRole(discordId);