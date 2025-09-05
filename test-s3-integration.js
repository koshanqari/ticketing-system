// Test S3 integration with the actual submission form
const fs = require('fs');
const path = require('path');

// Create a test file
const testContent = 'This is a test file for S3 integration';
const testFilePath = path.join(__dirname, 'test-file.txt');
fs.writeFileSync(testFilePath, testContent);

console.log('✅ Test file created:', testFilePath);
console.log('📁 File size:', fs.statSync(testFilePath).size, 'bytes');
console.log('🔗 Now test the submission form at: http://localhost:3000');
console.log('📎 Upload this file: test-file.txt');
console.log('🎯 Check the admin panel to see if it appears in S3!');

// Clean up after 30 seconds
setTimeout(() => {
  fs.unlinkSync(testFilePath);
  console.log('🧹 Test file cleaned up');
}, 30000);
