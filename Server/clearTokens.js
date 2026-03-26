const clearClientTokens = `
// Clear all authentication tokens
localStorage.clear();
sessionStorage.clear();
document.cookie.split(";").forEach(function(c) { 
  document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
});
console.log('All tokens cleared. Please refresh and login again.');
`;

console.log('🔧 Token Clearing Instructions:');
console.log('1. Open browser console (F12)');
console.log('2. Paste and run this code:');
console.log(clearClientTokens);
console.log('3. Refresh the page');
console.log('4. Login with: admindatalogix@datalogix.com / Adminpayroll67');
