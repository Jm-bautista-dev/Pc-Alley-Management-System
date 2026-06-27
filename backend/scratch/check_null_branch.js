const { RestockRequest } = require('../src/models');

async function checkNullBranch() {
  try {
    const requests = await RestockRequest.findAll({
      where: { branch_id: null }
    });
    console.log(`Found ${requests.length} requests with NULL branch_id.`);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

checkNullBranch();
