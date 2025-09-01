// Test WhatsApp API directly (run with: node test-whatsapp-direct.js)

async function testWhatsAppAPI() {
  const apiKey = '67d1129cb7401ffd9e886569';
  const apiSecret = '9c22bae06c1149af81fd1f8f59ebab80';
  const channelId = '67efa1e540e524987a8bfd90';
  const baseUrl = 'https://server.gallabox.com/devapi/messages/whatsapp';

  const message = {
    channelId: channelId,
    channelType: 'whatsapp',
    recipient: {
      name: 'Test User',
      phone: '916006324328'
    },
    whatsapp: {
      type: 'template',
      template: {
        templateName: 'ticket_generated_c1',
        bodyValues: {
          Name: 'Test User',
          ticket_id: 'TEST-001'
        }
      }
    }
  };

  try {
    console.log('Testing WhatsApp API directly...');
    console.log('Request payload:', JSON.stringify(message, null, 2));
    
    // Use built-in fetch (available in Node.js 18+)
    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'apiKey': apiKey,
        'apiSecret': apiSecret,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(message)
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    const responseText = await response.text();
    console.log('Response body:', responseText);

    if (response.ok) {
      console.log('✅ WhatsApp API test successful!');
    } else {
      console.log('❌ WhatsApp API test failed with status:', response.status);
    }

  } catch (error) {
    console.error('❌ Error testing WhatsApp API:', error.message);
  }
}

testWhatsAppAPI();
