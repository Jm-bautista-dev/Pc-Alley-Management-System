async function testFetch() {
  const credentials = {
    username: 'admin@pcalley.com',
    password: 'admin123'
  };

  try {
    const loginRes = await fetch('http://localhost:5001/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    });
    
    if (!loginRes.ok) {
      console.log('Login failed', await loginRes.text());
      return;
    }
    
    const loginData = await loginRes.json();
    const token = loginData.token;
    
    console.log('Login successful');

    const invRes = await fetch('http://localhost:5001/api/inventory', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (!invRes.ok) {
      console.log('Inventory Fetch failed', await invRes.text());
      return;
    }
    
    const invData = await invRes.json();
    console.log('Inventory Data length:', invData.length);
  } catch (error) {
    console.log('Error Message:', error.message);
  }
}

testFetch();
