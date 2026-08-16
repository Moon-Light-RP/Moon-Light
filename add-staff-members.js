// Script to add staff members to the Staff Directory
// This script adds users to the role map in the database

const usersToAdd = [
  { id: '558939870618189834', name: 'Ali Elnady', role: 'Management' },
  { id: '336665468888678400', name: 'XRD', role: 'Management' }
];

async function addStaffMembers() {
  try {
    // Get current role map
    const response = await fetch('/api/store');
    if (!response.ok) {
      console.error('Failed to fetch current role map');
      return;
    }
    
    const data = await response.json();
    if (!data.ok) {
      console.error('API response not ok');
      return;
    }
    
    // Find existing role map
    const roleMapRecord = data.items.find(item => item.key === 'moon_light_discord_role_map_v1');
    let roleMap = {};
    
    if (roleMapRecord) {
      try {
        roleMap = typeof roleMapRecord.value === 'string' 
          ? JSON.parse(roleMapRecord.value) 
          : roleMapRecord.value;
      } catch (e) {
        console.error('Failed to parse existing role map:', e);
      }
    }
    
    // Add new users
    usersToAdd.forEach(user => {
      roleMap[user.id.toLowerCase()] = user.role;
      roleMap[user.name.toLowerCase()] = user.role;
      console.log(`Added ${user.name} (ID: ${user.id}) as ${user.role}`);
    });
    
    // Save updated role map
    const saveResponse = await fetch('/api/store', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        key: 'moon_light_discord_role_map_v1',
        value: roleMap
      })
    });
    
    if (saveResponse.ok) {
      const saveData = await saveResponse.json();
      if (saveData.ok) {
        console.log('✅ Staff members added successfully!');
        console.log('Updated role map:', roleMap);
      } else {
        console.error('Failed to save role map:', saveData.error);
      }
    } else {
      console.error('Failed to save role map - server error');
    }
    
  } catch (error) {
    console.error('Error adding staff members:', error);
  }
}

// Run the script
addStaffMembers();
