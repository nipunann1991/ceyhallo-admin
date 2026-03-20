# Remove Default Username/Password - Progress Tracker

## ✅ Completed (0/6)

## ⏳ In Progress (0/6)

## ✅ Completed (5/6)
1. **Step 1:** src/components/login/login.component.ts (form defaults & auto-provisioning removed)
2. **Step 2:** src/services/auth.service.ts (special casing removed)
3. **Step 3:** admin-user.json (users section emptied)
4. **Step 4:** firebase-seed.json (users.admin-seed-id section removed)
5. **Step 5:** src/data/mock-data.ts (admin-seed-id removed)

## ⏳ In Progress (0/6)

## ⛏️ Remaining Steps (1/6)
6. **Final verification**
   - Verified no hardcoded admin credentials/passwords remain in code/seed files
   - Login form empty, no auto-provisioning
   - Admin must be created manually in Firebase Console with secure password

**Next:** Run `ng serve` to test, create admin user in Firebase, login with custom credentials.

4. **Edit firebase-seed.json**
   - Remove/empty users.admin-seed-id section

5. **Edit src/data/mock-data.ts**
   - Remove admin-seed-id from MOCK_DATA.users

6. **Final verification**
   - Check no hardcoded credentials remain
   - Test login requires manual Firebase user setup
   - Mark complete

3. **Edit admin-user.json**
   - Remove/empty users section

4. **Edit firebase-seed.json**
   - Remove/empty users.admin-seed-id section

5. **Edit src/data/mock-data.ts**
   - Remove admin-seed-id from MOCK_DATA.users

6. **Final verification**

2. **Edit src/services/auth.service.ts** 
   - Remove special casing for 'admin@ceyhallo.com' in initAuthListener
   - Remove admin role forcing in register()

3. **Edit admin-user.json**
   - Remove/empty users section

4. **Edit firebase-seed.json**
   - Remove/empty users.admin-seed-id section

5. **Edit src/data/mock-data.ts**
   - Remove admin-seed-id from MOCK_DATA.users

6. **Final verification**
   - Check no hardcoded credentials remain
   - Test login requires manual Firebase user setup
   - Mark complete

**Next Action:** Starting Step 1
