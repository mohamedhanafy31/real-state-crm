import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001/api';

async function test() {
    try {
        // 1. Login
        console.log('Logging in...');
        const loginRes = await axios.post(`${API_BASE_URL}/auth/login`, {
            phone: '01040310458',
            password: 'Password123'
        });
        const token = loginRes.data.access_token;
        console.log('Login successful.');

        // 2. Fetch units
        console.log('Fetching units...');
        const unitsRes = await axios.get(`${API_BASE_URL}/units`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        console.log(`Received ${unitsRes.data.length} units.`);
        if (unitsRes.data.length > 0) {
            console.log('Sample unit keys:', Object.keys(unitsRes.data[0]));
            console.log('Sample unit data:', JSON.stringify(unitsRes.data[0], null, 2));
        }
    } catch (error) {
        console.error('Test failed:', error.response?.data || error.message);
    }
}

test();
