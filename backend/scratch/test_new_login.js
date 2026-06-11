const axios = require('axios');

async function testLogin() {
  const credentials = {
    username: 'admin@pcalley.com',
    password: 'admin123'
  };

  try {
    console.log('Attempting login with:', credentials);
    const response = await axios.post('http://localhost:5000/api/auth/login', credentials);
    console.log('Login Result:', response.data);
  } catch (error) {
    if (error.response) {
      console.log('Login Failed (Status):', error.response.status);
      console.log('Login Failed (Data):', error.response.data);
    } else {
      console.log('Error Message:', error.message);
    }
  }
}

testLogin();
