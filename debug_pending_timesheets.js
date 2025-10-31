// Test script to debug pending timesheets API
import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000';

// Test the specific endpoint we're now using
async function testPendingTimesheetsAPI() {
    console.log('🔍 Testing pending timesheets API fix...\n');
    
    // Test 1: Team overview (old endpoint - should be different)
    console.log('1️⃣ Testing team-timesheets endpoint (old):');
    try {
        const res1 = await fetch(`${BASE_URL}/api/manager/team-timesheets?month=2025-10`);
        const data1 = await res1.json();
        console.log(`   Status: ${res1.status}`);
        console.log(`   Total items: ${data1.total || 0}`);
        console.log(`   Sample data structure:`, JSON.stringify(data1.items?.[0], null, 2));
    } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
    }
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    // Test 2: Pending timesheets (new endpoint - should be the one we want)
    console.log('2️⃣ Testing pending-timesheets endpoint (new):');
    try {
        const res2 = await fetch(`${BASE_URL}/api/manager/pending-timesheets?month=2025-10&status=enviado`);
        const data2 = await res2.json();
        console.log(`   Status: ${res2.status}`);
        console.log(`   Total pending timesheets: ${data2.total || 0}`);
        console.log(`   Sample data structure:`, JSON.stringify(data2.pending_timesheets?.[0], null, 2));
        
        // Expected vs Actual comparison
        console.log('\n📊 ANALYSIS:');
        console.log(`   Team overview shows: ${data1.total || 0} total employees`);
        console.log(`   Pending timesheets show: ${data2.total || 0} submitted timesheets`);
        
        if (data2.total === 0 && data1.total > 0) {
            console.log('   ✅ CORRECT BEHAVIOR: No submitted timesheets for approval');
        } else if (data2.total > 0) {
            console.log('   ✅ CORRECT BEHAVIOR: Found submitted timesheets for approval');
        } else {
            console.log('   ⚠️  NO DATA: Neither endpoint returns data');
        }
    } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
    }
}

testPendingTimesheetsAPI();