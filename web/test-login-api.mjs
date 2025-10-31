// Test the login API endpoint directly
const testLogin = async () => {
  try {
    console.log('🔵 Testing login API endpoint...');
    
    const response = await fetch('http://localhost:3000/api/auth/signin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'caio.correia@groupabz.com',
        password: 'Caio@2122@',
      }),
    });

    console.log('📊 Response status:', response.status);
    console.log('📊 Response headers:', Object.fromEntries(response.headers.entries()));
    
    const data = await response.json();
    console.log('📊 Response data:', data);
    
    if (response.ok) {
      console.log('✅ Login API test successful!');
      console.log('🍪 Session cookie should be set');
    } else {
      console.log('❌ Login API test failed');
    }
    
  } catch (error) {
    console.error('💥 Test error:', error);
  }
};

testLogin();