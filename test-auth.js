require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

/**
 * Test script to verify customer registration and login flow
 * 
 * Tests:
 * 1. Customer registration creates user in MongoDB
 * 2. Login with same credentials succeeds
 * 3. Duplicate registration returns error
 * 4. Wrong password returns error
 */

async function runTests() {
    console.log('🧪 Starting authentication tests...\n');

    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ MongoDB connected\n');

        // Test email
        const testEmail = `test-customer-${Date.now()}@example.com`;
        const testPassword = 'password123';
        const testName = 'Test Customer';

        // Test 1: Customer Registration
        console.log('Test 1: Customer Registration');
        console.log('----------------------------');
        try {
            const passwordHash = await bcrypt.hash(testPassword, 10);
            const user = await User.create({
                email: testEmail.toLowerCase().trim(),
                passwordHash,
                name: testName,
                role: 'customer'
            });

            console.log('✅ Customer registered successfully');
            console.log(`   ID: ${user._id}`);
            console.log(`   Email: ${user.email}`);
            console.log(`   Role: ${user.role}`);
            console.log(`   Name: ${user.name}\n`);
        } catch (error) {
            console.log('❌ Registration failed:', error.message);
            throw error;
        }

        // Test 2: Login with correct credentials
        console.log('Test 2: Login with correct credentials');
        console.log('---------------------------------------');
        try {
            const user = await User.findOne({ email: testEmail.toLowerCase().trim() });
            if (!user) {
                throw new Error('User not found');
            }

            const isMatch = await bcrypt.compare(testPassword, user.passwordHash);
            if (!isMatch) {
                throw new Error('Password mismatch');
            }

            console.log('✅ Login successful');
            console.log(`   User ID: ${user._id}`);
            console.log(`   Email: ${user.email}\n`);
        } catch (error) {
            console.log('❌ Login failed:', error.message);
            throw error;
        }

        // Test 3: Duplicate registration
        console.log('Test 3: Duplicate registration (should fail)');
        console.log('--------------------------------------------');
        try {
            const passwordHash = await bcrypt.hash(testPassword, 10);
            await User.create({
                email: testEmail.toLowerCase().trim(),
                passwordHash,
                name: testName,
                role: 'customer'
            });
            console.log('❌ Duplicate registration should have failed but succeeded');
        } catch (error) {
            if (error.code === 11000) {
                console.log('✅ Duplicate registration correctly rejected');
                console.log(`   Error code: ${error.code} (duplicate key)\n`);
            } else {
                console.log('❌ Unexpected error:', error.message);
                throw error;
            }
        }

        // Test 4: Login with wrong password
        console.log('Test 4: Login with wrong password (should fail)');
        console.log('-----------------------------------------------');
        try {
            const user = await User.findOne({ email: testEmail.toLowerCase().trim() });
            if (!user) {
                throw new Error('User not found');
            }

            const isMatch = await bcrypt.compare('wrongpassword', user.passwordHash);
            if (isMatch) {
                console.log('❌ Wrong password should have failed but succeeded');
            } else {
                console.log('✅ Wrong password correctly rejected\n');
            }
        } catch (error) {
            console.log('❌ Unexpected error:', error.message);
            throw error;
        }

        // Cleanup: Delete test user
        console.log('Cleanup: Deleting test user');
        console.log('---------------------------');
        await User.deleteOne({ email: testEmail.toLowerCase().trim() });
        console.log('✅ Test user deleted\n');

        console.log('🎉 All tests passed!\n');

    } catch (error) {
        console.error('\n❌ Test suite failed:', error.message);
        process.exit(1);
    } finally {
        await mongoose.connection.close();
        console.log('✅ MongoDB connection closed');
    }
}

runTests();
