const { Notification, User } = require('../src/models');

async function checkNotifications() {
  try {
    const admins = await User.findAll({ where: { role: 'super_admin' } });
    console.log(`FOUND ${admins.length} SUPER ADMINS:`, admins.map(a => a.username));

    const notifications = await Notification.findAll({
      order: [['createdAt', 'DESC']],
      limit: 10,
      include: [{ model: User, attributes: ['username', 'role'] }]
    });
    
    if (notifications.length === 0) {
      console.log('NO NOTIFICATIONS FOUND IN DATABASE.');
    } else {
      console.log('--- LATEST NOTIFICATIONS ---');
      notifications.forEach(n => {
        console.log(`[${n.createdAt}] To: ${n.User?.username || 'Unknown'} (${n.User?.role || 'N/A'})`);
        console.log(`Title: ${n.title}`);
        console.log(`Msg: ${n.message}`);
        console.log('---');
      });
    }
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

checkNotifications();
