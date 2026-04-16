#!/usr/bin/env node

const https = require('https');

const API_BASE = 'https://textilesbackend.vercel.app';

const endpoints = [
  '/api/health',
  '/api/hdfc-order-status?order_id=TEST123',
  '/api/razorpay-status'
];

async function testEndpoint(path) {
  return new Promise((resolve) => {
    const url = `${API_BASE}${path}`;
    console.log(`\n🔍 Testing: ${url}`);
    
    https.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        const status = res.statusCode;
        const success = status >= 200 && status < 300;
        
        console.log(`${success ? '✅' : '❌'} Status: ${status}`);
        
        try {
          const json = JSON.parse(data);
          console.log(`📄 Response: ${JSON.stringify(json, null, 2)}`);
        } catch (e) {
          console.log(`📄 Response: ${data.substring(0, 200)}${data.length > 200 ? '...' : ''}`);
        }
        
        resolve({ success, status, data });
      });
    }).on('error', (err) => {
      console.log(`❌ Error: ${err.message}`);
      resolve({ success: false, error: err.message });
    });
  });
}

async function runTests() {
  console.log('🧪 Testing HDFC Payment API Endpoints\n');
  console.log('=' .repeat(50));
  
  const results = [];
  
  for (const endpoint of endpoints) {
    const result = await testEndpoint(endpoint);
    results.push({ endpoint, ...result });
    
    // Wait a bit between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n' + '=' .repeat(50));
  console.log('📊 Test Summary:');
  
  results.forEach(({ endpoint, success, status, error }) => {
    const icon = success ? '✅' : '❌';
    const statusText = error ? `Error: ${error}` : `Status: ${status}`;
    console.log(`${icon} ${endpoint} - ${statusText}`);
  });
  
  const allSuccess = results.every(r => r.success);
  console.log(`\n🎯 Overall Result: ${allSuccess ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
}

runTests().catch(console.error);