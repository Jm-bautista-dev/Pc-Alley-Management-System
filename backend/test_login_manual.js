const axios = require('axios');

const testLogin = async (username, password) => {
  try {
    const response = await axios.post('http://localhost:5000/api/auth/login', {
      username,
      password
    });
    console.log(`Login successful for ${username}:`, response.data);
  } catch (error) {
    console.error(`Login failed for ${username}:`, error.response ? error.response.data : error.message);
  }
};

testLogin('admin@pcalley.com', 'admin123');
testLogin('starosa_admin@pcalley.com', 'branch123');
