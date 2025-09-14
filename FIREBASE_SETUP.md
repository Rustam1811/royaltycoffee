# Firebase Stories Setup Guide

## Steps to Fix Firebase Permissions

### 1. Deploy Firestore Rules
```bash
firebase deploy --only firestore:rules
```

### 2. Deploy Storage Rules  
```bash
firebase deploy --only storage
```

### 3. Set Environment Variables
Copy `.env.example` to `.env.local` and fill with your Firebase project values from Firebase Console → Project Settings → General.

### 4. Enable Required Services
In Firebase Console:
- **Firestore**: Go to Firestore Database → Create database (start in test mode)
- **Storage**: Go to Storage → Get started (start in test mode)

### 5. Current Issues & Solutions

**Error: "Missing or insufficient permissions"**
- Deploy the firestore.rules file
- Ensure stories collection has read: true, write: true in dev mode

**Error: "CORS policy" on Storage**
- Deploy storage.rules file  
- Add /stories/ path with read/write permissions
- For localhost dev, Firebase automatically handles CORS for authenticated requests

### 6. Production Checklist
- [ ] Set up Firebase Auth with custom claims (admin role)
- [ ] Update rules to check `request.auth.token.admin == true`
- [ ] Set Storage/Firestore rules to require auth for writes
- [ ] Add proper error handling for auth failures

### 7. Quick Test
After setup:
1. Open admin panel: `/admin`
2. Go to Stories tab
3. Try "Создать Story" → StoryStudio → Export
4. Should upload to Firebase Storage and save to Firestore

### Commands Reference
```bash
# Deploy all rules
firebase deploy --only firestore:rules,storage

# Check current deployed rules
firebase firestore:rules get
firebase storage:rules get
```
