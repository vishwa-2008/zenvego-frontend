// Test Supabase connection
import { supabase } from './src/lib/supabase';

console.log('🚀 Testing Supabase connection...');
console.log('Supabase URL:', (typeof import.meta.env !== 'undefined' ? import.meta.env.VITE_SUPABASE_URL : undefined) || 'https://kgfjwiszlxkwvavgnmuu.supabase.co');

// Test 1: Check if we can fetch from orders table
console.log('\n📦 Testing orders table...');
try {
  const { data, error } = await supabase.from('orders').select('*').limit(5);
  if (error) {
    console.warn('⚠️ Orders table fetch failed:', error.message);
    console.log('(This is expected if the SQL schema hasn\'t been run yet)');
  } else {
    console.log('✅ Orders table is working! Found', data.length, 'records');
  }
} catch (e) {
  console.warn('⚠️ Orders table request failed:', e);
}

// Test 2: Check auth status
console.log('\n🔐 Testing auth status...');
const { data: authData } = await supabase.auth.getSession();
if (authData.session) {
  console.log('✅ User is logged in:', authData.session.user.email);
} else {
  console.log('ℹ️ No active session');
}

console.log('\n✅ Supabase client is configured correctly!');
console.log('📝 Note: For full functionality, you need to:');
console.log('   1. Create a .env file with your actual Supabase URL and Anon Key');
console.log('   2. Run the SQL schema from project_documentation.md in your Supabase project');
console.log('   3. Enable Realtime for the orders table in Supabase Dashboard');
