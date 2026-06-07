const { Notification, User } = require('../src/models');

async function testGetNotifications() {
  try {
    const admin = await User.findOne({ where: { role: 'super_admin' } });
    if (!admin) {
      console.log('No super_admin found');
      return;
    }
    
    console.log(`Checking notifications for Admin: ${admin.username} (ID: ${admin.id})`);
    
    const notes = await Notification.findAll({
      where: { user_id: admin.id },
      include: [{ model: User, attributes: ['username'] }]
    });
    
    console.log(`Found ${notes.length} notifications.`);
    notes.forEach(n => console.log(`- ${n.title}: ${n.message}`));
    
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

testGetNotifications();
