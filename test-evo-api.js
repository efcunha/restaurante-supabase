const companyId = 'f85bfdc2-982a-4cf7-b176-bce68426f861';
const EVO_API_URL = 'https://evolution-api-production-9ac1.up.railway.app';
const EVO_API_KEY = 'Lueed28@13546289b@P@ssw0rd';

async function testConnection() {
    try {
        console.log(`Fetching connection state for ${companyId}...`);
        const response = await fetch(`${EVO_API_URL}/instance/connectionState/${companyId}?b64=true`, {
            method: 'GET',
            headers: {
                'apikey': EVO_API_KEY,
            },
        });
        
        console.log(`GET Status: ${response.status} ${response.statusText}`);
        const text = await response.text();
        console.log(`GET Body: ${text}`);

        if (response.status === 404 || response.status === 403 || response.status === 401) {
            console.log('\nInstance not found or unauthorized. Testing POST /instance/create auth headers...');

            const headersToTry = [
                { 'apikey': EVO_API_KEY },
                { 'apikey': EVO_API_KEY, 'GlobalApiKey': EVO_API_KEY },
                { 'apiKey': EVO_API_KEY, 'globalApiKey': EVO_API_KEY },
                { 'Authorization': `Bearer ${EVO_API_KEY}` },
                { 'globalApiKey': EVO_API_KEY },
                { 'GlobalApiKey': EVO_API_KEY },
                { 'apikey': EVO_API_KEY, 'Authorization': `Bearer ${EVO_API_KEY}` }
            ];

            let success = false;
            for (const testHeaders of headersToTry) {
                console.log(`\nTesting POST headers:`, testHeaders);
                try {
                    const createResponse = await fetch(`${EVO_API_URL}/instance/create`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            ...testHeaders
                        },
                        body: JSON.stringify({
                            instanceName: companyId,
                            qrcode: true,
                            integration: 'WHATSAPP-BAILEYS',
                        }),
                    });
                    console.log(`POST Status: ${createResponse.status}`);
                    const body = await createResponse.text();
                    
                    if (createResponse.status === 200 || createResponse.status === 201) {
                        console.log('✅ SUCCESS with headers:', testHeaders);
                        console.log('Body:', body);
                        success = true;
                        break;
                    } else {
                        console.log('❌ Failed. Response code:', createResponse.status);
                    }
                } catch (err) {
                    console.log('Fetch error:', err.message);
                }
            }
            if (!success) {
                console.log('\n❌ ALL HEADER COMBINATIONS FAILED WITH 403/401.');
                console.log('This means the key "Lueed28@13546289b@P@ssw0rd" is NOT the correct Global API Key configured in your Railway variables, or the variable name in Railway is wrong (e.g., AUTHENTICATION_API_KEY vs AUTHENTICATION_GLOBAL_BUILDER).');
            }
        }
    } catch (e) {
        console.error('Error:', e);
    }
}

testConnection();
