const http = require('http');
const sequelize = require('./src/db');
const { Role, UserRole, User } = require('./src/models');

const BASE_URL = 'http://localhost:5000';

function request(method, path, headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port || 5000,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch (e) {
          json = data;
        }
        resolve({ status: res.statusCode, data: json, headers: res.headers });
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

function assert(cond, msg) {
  if (!cond) {
    console.error(`FAILED: ${msg}`);
    throw new Error(`Assertion failed: ${msg}`);
  } else {
    console.log(`PASS: ${msg}`);
  }
}

async function runTests() {
  console.log('\n======================================================');
  console.log('   ROLE AND RELATIONSHIP MANAGEMENT TEST SUITE');
  console.log('======================================================\n');

  // ── TEST 1: Database Schema & Normalized Model Verification ─────────
  console.log('--- TEST 1: Database Schema & Normalized Model Verification ---');
  const roles = await Role.findAll({ order: [['id', 'ASC']] });
  assert(roles.length >= 3, `Expected at least 3 canonical roles in 'roles' table, found ${roles.length}`);

  const roleNames = roles.map(r => r.name);
  assert(roleNames.includes('super_admin'), "roles table contains 'super_admin'");
  assert(roleNames.includes('branch_admin'), "roles table contains 'branch_admin'");
  assert(roleNames.includes('employee'), "roles table contains 'employee'");

  const [tableInfo] = await sequelize.query("SHOW CREATE TABLE `user_roles`");
  const createSql = tableInfo[0]['Create Table'];
  assert(createSql.includes('FOREIGN KEY') && createSql.includes('ON DELETE CASCADE'), 'user_roles has FOREIGN KEY with ON DELETE CASCADE');
  assert(createSql.includes('unique_user_role') || createSql.includes('UNIQUE KEY'), 'user_roles has unique composite constraint on (user_id, role_id)');

  // ── TEST 2: Super Admin Authentication & Initial Role Retrieval ─────
  console.log('\n--- TEST 2: Super Admin Authentication & Initial Role Retrieval ---');
  const superLoginRes = await request('POST', '/api/auth/login', {}, {
    username: 'admin@pcalley.com',
    password: 'admin123'
  });
  assert(superLoginRes.status === 200, 'Super admin login succeeded (200)');
  assert(superLoginRes.data.token, 'Token returned for super admin');
  assert(superLoginRes.data.user.role === 'super_admin', 'Super admin role is super_admin');
  assert(Array.isArray(superLoginRes.data.user.roles), 'Super admin user object contains roles array');
  const superToken = superLoginRes.data.token;

  // GET /api/roles
  const getRolesRes = await request('GET', '/api/roles', { Authorization: `Bearer ${superToken}` });
  assert(getRolesRes.status === 200, 'GET /api/roles returns 200');
  assert(Array.isArray(getRolesRes.data.data), 'GET /api/roles returns data array');
  assert(getRolesRes.data.data.every(r => typeof r.user_count === 'number'), 'Every role has a computed user_count');

  // GET /api/auth/users
  const getUsersRes = await request('GET', '/api/auth/users', { Authorization: `Bearer ${superToken}` });
  assert(getUsersRes.status === 200, 'GET /api/auth/users returns 200');
  assert(Array.isArray(getUsersRes.data.data), 'Users list returned');
  const firstUser = getUsersRes.data.data[0];
  assert(Array.isArray(firstUser.roles) && firstUser.roles.length > 0, 'Users in response include associated normalized roles');

  // ── TEST 3: Super Admin Provisions Manager & Staff Accounts ─────────
  console.log('\n--- TEST 3: Super Admin Provisions Manager & Staff Accounts ---');
  const timestamp = Date.now();
  const testManagerUsername = `mgr_test_${timestamp}@pcalley.com`;
  const testStaffUsername = `stf_test_${timestamp}@pcalley.com`;

  // Clean up any leftovers if re-running
  await User.destroy({ where: { username: [testManagerUsername, testStaffUsername] } });

  const provManagerRes = await request('POST', '/api/auth/register', { Authorization: `Bearer ${superToken}` }, {
    username: testManagerUsername,
    first_name: 'Test',
    last_name: 'Manager',
    password: 'Password123!',
    role: 'branch_admin',
    branch_id: 1
  });
  assert(provManagerRes.status === 201, `Super Admin provisioned Branch Manager (201): ${provManagerRes.data.message}`);
  const createdManagerId = provManagerRes.data.userId;

  // Verify user_roles entry created for new manager
  const managerRoleRecord = await Role.findOne({ where: { name: 'branch_admin' } });
  const managerUserRole = await UserRole.findOne({ where: { user_id: createdManagerId, role_id: managerRoleRecord.id } });
  assert(managerUserRole !== null, 'Normalized user_roles entry exists for newly provisioned manager');

  const provStaffRes = await request('POST', '/api/auth/register', { Authorization: `Bearer ${superToken}` }, {
    username: testStaffUsername,
    first_name: 'Test',
    last_name: 'Staff',
    password: 'Password123!',
    role: 'employee',
    branch_id: 1
  });
  assert(provStaffRes.status === 201, `Super Admin provisioned Staff (201): ${provStaffRes.data.message}`);
  const createdStaffId = provStaffRes.data.userId;

  const staffRoleRecord = await Role.findOne({ where: { name: 'employee' } });
  const staffUserRole = await UserRole.findOne({ where: { user_id: createdStaffId, role_id: staffRoleRecord.id } });
  assert(staffUserRole !== null, 'Normalized user_roles entry exists for newly provisioned staff');

  // ── TEST 4: Server-Side Authorization & Privilege Escalation Defenses ──
  console.log('\n--- TEST 4: Server-Side Authorization & Privilege Escalation Defenses ---');
  // Login as the created manager
  const managerLoginRes = await request('POST', '/api/auth/login', {}, {
    username: testManagerUsername,
    password: 'Password123!'
  });
  assert(managerLoginRes.status === 200, 'Branch manager logged in successfully');
  const managerToken = managerLoginRes.data.token;

  // 4a. Manager attempts to provision a Super Admin -> MUST BE REJECTED 403
  const badSuperRes = await request('POST', '/api/auth/register', { Authorization: `Bearer ${managerToken}` }, {
    username: `bad_super_${timestamp}@pcalley.com`,
    first_name: 'Hacker',
    last_name: 'Attempt',
    password: 'Password123!',
    role: 'super_admin',
    branch_id: 1
  });
  assert(badSuperRes.status === 403, `Manager provisioning Super Admin rejected with 403 Forbidden (Actual: ${badSuperRes.status})`);

  // 4b. Manager attempts to provision a Branch Admin -> MUST BE REJECTED 403
  const badAdminRes = await request('POST', '/api/auth/register', { Authorization: `Bearer ${managerToken}` }, {
    username: `bad_admin_${timestamp}@pcalley.com`,
    first_name: 'Hacker',
    last_name: 'Attempt',
    password: 'Password123!',
    role: 'branch_admin',
    branch_id: 1
  });
  assert(badAdminRes.status === 403, `Manager provisioning Branch Admin rejected with 403 Forbidden (Actual: ${badAdminRes.status})`);

  // 4c. Manager attempts to provision Staff for a different branch -> MUST BE REJECTED 403
  const badBranchRes = await request('POST', '/api/auth/register', { Authorization: `Bearer ${managerToken}` }, {
    username: `bad_branch_${timestamp}@pcalley.com`,
    first_name: 'Outsider',
    last_name: 'Staff',
    password: 'Password123!',
    role: 'employee',
    branch_id: 2 // Manager belongs to branch 1
  });
  assert(badBranchRes.status === 403, `Manager provisioning account for another branch rejected with 403 (Actual: ${badBranchRes.status})`);

  // 4d. Manager attempts to promote themselves to super_admin -> MUST BE REJECTED 400
  const selfPromoteRes = await request('PUT', `/api/auth/users/${createdManagerId}/role`, { Authorization: `Bearer ${managerToken}` }, {
    role: 'super_admin'
  });
  assert(selfPromoteRes.status === 400, `Manager modifying own role rejected with 400 (Actual: ${selfPromoteRes.status})`);

  // 4e. Manager attempts to modify a Super Admin's role -> MUST BE REJECTED 403
  const editSuperRoleRes = await request('PUT', '/api/auth/users/1/role', { Authorization: `Bearer ${managerToken}` }, {
    role: 'employee'
  });
  assert(editSuperRoleRes.status === 403, `Manager modifying Super Admin role rejected with 403 (Actual: ${editSuperRoleRes.status})`);

  // 4f. Manager attempts to delete a Super Admin -> MUST BE REJECTED 403
  const deleteSuperRes = await request('DELETE', '/api/auth/users/1', { Authorization: `Bearer ${managerToken}` });
  assert(deleteSuperRes.status === 403, `Manager deleting Super Admin account rejected with 403 (Actual: ${deleteSuperRes.status})`);

  // 4g. Manager attempts to delete another Branch Admin -> MUST BE REJECTED 403
  const deleteAdminRes = await request('DELETE', '/api/auth/users/2', { Authorization: `Bearer ${managerToken}` });
  assert(deleteAdminRes.status === 403 || deleteAdminRes.status === 400, `Manager deleting another admin account rejected with 403/400 (Actual: ${deleteAdminRes.status})`);

  // 4h. Manager attempts to delete user from another branch -> MUST BE REJECTED 403
  const deleteOtherBranchRes = await request('DELETE', '/api/auth/users/3', { Authorization: `Bearer ${managerToken}` });
  assert(deleteOtherBranchRes.status === 403, `Manager deleting user from another branch rejected with 403 (Actual: ${deleteOtherBranchRes.status})`);

  // ── TEST 5: Legitimate Role Transition & Referential Integrity ─────
  console.log('\n--- TEST 5: Legitimate Role Transition & Referential Integrity ---');
  // Super Admin promotes Staff to Branch Admin
  const promoteRes = await request('PUT', `/api/auth/users/${createdStaffId}/role`, { Authorization: `Bearer ${superToken}` }, {
    role: 'branch_admin'
  });
  assert(promoteRes.status === 200, `Super Admin updated staff role to branch_admin (200): ${promoteRes.data.message}`);

  // Verify in database: users.role is branch_admin AND user_roles references branch_admin
  const promotedUser = await User.findByPk(createdStaffId);
  assert(promotedUser.role === 'branch_admin', 'promoted user role column updated to branch_admin');

  const updatedUserRole = await UserRole.findOne({ where: { user_id: createdStaffId } });
  assert(updatedUserRole.role_id === managerRoleRecord.id, 'promoted user_roles join record updated to branch_admin role ID');

  // Super Admin attempts to demote the last Super Admin -> MUST BE REJECTED 400
  // Find only super admin or count them
  const superCount = await User.count({ where: { role: 'super_admin' } });
  if (superCount === 1) {
    const demoteLastSuperRes = await request('PUT', '/api/auth/users/1/role', { Authorization: `Bearer ${superToken}` }, {
      role: 'employee'
    });
    assert(demoteLastSuperRes.status === 400, `Demoting last super admin rejected with 400 (Actual: ${demoteLastSuperRes.status})`);
  }

  // Super Admin attempts to delete themselves -> MUST BE REJECTED 400
  const selfDeleteRes = await request('DELETE', '/api/auth/users/1', { Authorization: `Bearer ${superToken}` });
  assert(selfDeleteRes.status === 400, `Self-deletion attempt rejected with 400 (Actual: ${selfDeleteRes.status})`);

  // ── TEST 6: Cascading Referential Integrity on User Deletion ────────
  console.log('\n--- TEST 6: Cascading Referential Integrity on User Deletion ---');
  // Delete the test staff/manager user
  const delTestUserRes = await request('DELETE', `/api/auth/users/${createdStaffId}`, { Authorization: `Bearer ${superToken}` });
  assert(delTestUserRes.status === 200, 'Super admin deleted test user (200)');

  // Verify user is gone from users table
  const checkUser = await User.findByPk(createdStaffId);
  assert(checkUser === null, 'User record deleted from users table');

  // Verify NO ORPHANED user_roles record remains (referential integrity check)
  const checkUserRoles = await UserRole.findAll({ where: { user_id: createdStaffId } });
  assert(checkUserRoles.length === 0, 'No orphaned user_roles records remain! Cascading delete verified.');

  // Clean up created manager user
  await request('DELETE', `/api/auth/users/${createdManagerId}`, { Authorization: `Bearer ${superToken}` });
  const checkManagerRoles = await UserRole.findAll({ where: { user_id: createdManagerId } });
  assert(checkManagerRoles.length === 0, 'No orphaned user_roles records remain for manager.');

  console.log('\n======================================================');
  console.log('   ALL ROLE & RELATIONSHIP TESTS PASSED PERFECTLY!');
  console.log('======================================================\n');
}

runTests().then(() => {
  process.exit(0);
}).catch((err) => {
  console.error('\nTEST SUITE FAILED WITH ERROR:', err);
  process.exit(1);
});
