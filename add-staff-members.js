// Script to add staff members via the Staff Roles API (table-based).
// The old key-value role map (/api/store, moon_light_discord_role_map_v1)
// is retired - run this while logged in as Management (or during the
// one-time bootstrap window if no Management user exists yet).

const usersToAdd = [
  { id: '558939870618189834', name: 'Ali Elnady', roleId: 'MANAGEMENT_ROLE_ID' },
  { id: '336665468888678400', name: 'XRD', roleId: 'MANAGEMENT_ROLE_ID' }
];

async function addStaffMembers() {
  for (const user of usersToAdd) {
    try {
      const response = await fetch('/api/staff/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          discordId: user.id,
          discordUsername: user.name,
          roleId: user.roleId
        })
      });

      const data = await response.json();
      if (response.ok && data.ok) {
        console.log(`✅ Added ${user.name} (ID: ${user.id}) as ${user.roleId}`);
      } else {
        console.error(`❌ Failed to add ${user.name}:`, data.error || `HTTP ${response.status}`);
      }
    } catch (error) {
      console.error(`❌ Error adding ${user.name}:`, error);
    }
  }
}

// Run the script
addStaffMembers();
