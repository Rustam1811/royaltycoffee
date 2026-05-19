# Creating Owner User

## Method 1: Firebase Console (EASIEST)

1. Go to [Firebase Console](https://console.firebase.google.com/project/royal-coffee-b1ce9/authentication/users)
2. Click "Add user"
3. Enter:
   - Email: `owner121@gmail.com`
   - Password: `ownerisyou`
4. Click "Add user"
5. Copy the UID
6. Run: `node scripts/set-owner-role.js <UID>`

## Method 2: Using Firebase CLI

Run this command to create user and set role:

```bash
# Create user in Firebase Console first, then:
node scripts/set-owner-role.js <USER_UID>
```

## Method 3: Manual via Firestore Rules (for testing)

1. Create user via Firebase Console
2. Login to admin panel once
3. Go to Firestore and manually add to `users/{uid}`:
   ```json
   {
     "role": "owner",
     "isOwner": true
   }
   ```

## Owner Credentials

- **Email**: owner121@gmail.com
- **Password**: ownerisyou
- **Login URL**: https://royal-coffee-b1ce9.web.app/admin

## After Creation

User needs to:
1. Login to admin panel
2. Refresh the page to get new claims
3. Navigate to "Dashboard" or "Locations Management"
