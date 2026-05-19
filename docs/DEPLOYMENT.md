# 🚀 Deployment Guide

## Prerequisites

1. **GitHub Secrets** - Add to repository settings:
   ```
   VITE_FIREBASE_API_KEY
   VITE_FIREBASE_AUTH_DOMAIN
   VITE_FIREBASE_PROJECT_ID
   VITE_FIREBASE_STORAGE_BUCKET
   VITE_FIREBASE_MESSAGING_SENDER_ID
   VITE_FIREBASE_APP_ID
   VITE_FCM_VAPID_KEY
   FIREBASE_TOKEN (for Firebase CLI)
   ```

2. **Firebase CLI** - Install and login:
   ```bash
   npm install -g firebase-tools
   firebase login
   ```

## Production Deployment

### 1. Deploy to Firebase (Recommended)

```bash
# Build and deploy everything
npm run deploy

# Deploy only hosting
firebase deploy --only hosting

# Deploy only functions
firebase deploy --only functions
```

### 2. Deploy Firestore Rules

```bash
firebase deploy --only firestore:rules
```

### 3. Deploy Storage Rules

```bash
firebase deploy --only storage
```

## Environment Setup

### Development
Create `.env` from `.env.example`:
```bash
cp .env.example .env
# Edit .env with your Firebase credentials
```

### Production
Set environment variables in:
- **Firebase Hosting**: firebase.json (rewrites)
- **GitHub Actions**: Repository secrets
- **Vercel**: Environment variables in dashboard

## Multi-tenancy Setup

### Create New Cafe

1. Add cafe configuration to Firestore:
```javascript
// In Firestore Console
Collection: cafes
Document ID: cafe1
Fields:
  {
    "id": "cafe1",
    "name": "My Coffee Shop",
    "slug": "my-coffee-shop",
    "logo": "https://...",
    "primaryColor": "#3B82F6",
    "enabled": true,
    "settings": {
      "currency": "KZT",
      "timezone": "Asia/Almaty",
      "language": "ru"
    }
  }
```

2. Update Firebase rules to include cafeId isolation

3. Configure subdomain or custom domain:
   - **Subdomain**: cafe1.yourdomain.com → cafeId = "cafe1"
   - **Custom domain**: cafe1.com → Add to customDomainMap

## CI/CD Pipeline

GitHub Actions automatically:
1. ✅ Runs TypeScript checks
2. ✅ Runs ESLint
3. ✅ Runs tests
4. ✅ Builds web + admin
5. ✅ Deploys to Firebase (on main branch)
6. ✅ Creates preview deployments (on PRs)

## Monitoring & Logging

### Production Logs
- **Firebase Functions**: `firebase functions:log`
- **Client errors**: Integrate Sentry (optional)
- **Custom logger**: Check `src/lib/logger.ts`

### Performance Monitoring
- Firebase Performance Monitoring
- Lighthouse CI (add to GitHub Actions)

## Security Checklist

✅ .env files not in Git  
✅ Firestore rules with role-based access  
✅ Storage rules with file size limits  
✅ CORS configured properly  
✅ API rate limiting (add if needed)  
✅ Admin emails in secure storage  

## Rollback

```bash
# View deployment history
firebase hosting:channel:list

# Rollback to previous version
firebase hosting:clone SOURCE_SITE_ID:SOURCE_CHANNEL_ID DEST_SITE_ID:live
```

## Support

For issues:
1. Check GitHub Actions logs
2. Check Firebase Console logs
3. Review error boundaries in React DevTools
4. Check browser console (dev mode only)
