const axios = require('axios');

async function testLogin() {
  try {
    const res = await axios.post('http://localhost:5000/api/auth/login', {
      username: 'admin@pcalley.com',
      password: 'password123'
    });
    console.log('Login successful!');
    console.log('Token:', res.data.token);
    console.log('User:', res.data.user);
    process.exit(0);
  } catch (err) {
    console.error('Login failed!');
    if (err.response) {
      console.error('Status:', err.response.status);
      console.error('Data:', err.response.data);
    } else {
      console.error('Error:', err.message);
    }
    process.exit(1);
  }
}

testLogin();
