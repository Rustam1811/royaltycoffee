# 📋 Production Checklist

## Before First Deployment

### Security
- [ ] Remove all `.env` files from Git history
- [ ] Add all secrets to GitHub Secrets / Vercel / Firebase
- [ ] Update Firestore rules (no `allow write: if true`)
- [ ] Update Storage rules (file size limits, admin-only writes)
- [ ] Configure CORS properly
- [ ] Remove hardcoded admin emails from code

### Code Quality
- [ ] Run `npm run typecheck` - no errors
- [ ] Run `npm run lint` - no errors
- [ ] All `console.log` replaced with logger or removed
- [ ] Error boundaries in place
- [ ] Environment validation working

### Multi-tenancy
- [ ] Create default cafe configuration in Firestore
- [ ] Test subdomain routing
- [ ] Verify data isolation (cafeId in queries)

### Performance
- [ ] Bundle size < 500KB
- [ ] Lighthouse score > 90
- [ ] Images optimized (WebP, lazy loading)
- [ ] Code splitting implemented
- [ ] Service Worker configured

### Testing
- [ ] Unit tests passing (if any)
- [ ] E2E tests for critical paths
- [ ] Tested on iOS Safari
- [ ] Tested on Android Chrome
- [ ] Tested offline mode (PWA)

## Deployment Steps

1. **Build locally first**
   ```bash
   npm run build
   npm run preview
   ```

2. **Deploy Firestore rules**
   ```bash
   firebase deploy --only firestore:rules
   ```

3. **Deploy Storage rules**
   ```bash
   firebase deploy --only storage
   ```

4. **Deploy app**
   ```bash
   npm run deploy
   ```

5. **Verify deployment**
   - [ ] Check production URL loads
   - [ ] Login works
   - [ ] Menu loads
   - [ ] Orders can be created
   - [ ] Admin panel accessible

## Post-Deployment

- [ ] Monitor error rates (first 24h)
- [ ] Check Firebase usage quotas
- [ ] Verify push notifications
- [ ] Test payment flow (if implemented)
- [ ] Update documentation

## For Each Cafe Onboarding

1. **Create cafe config**
   - [ ] Add to Firestore `cafes/` collection
   - [ ] Upload logo to Storage
   - [ ] Set primary/secondary colors

2. **Setup domain**
   - [ ] Configure subdomain (e.g., cafe1.app.com)
   - [ ] Or map custom domain
   - [ ] Update DNS records

3. **Create admin user**
   - [ ] Add to Firestore `users/` with `role: 'admin'`
   - [ ] Send credentials

4. **Import data**
   - [ ] Menu items
   - [ ] Categories
   - [ ] Initial promotions

5. **Test end-to-end**
   - [ ] Customer can order
   - [ ] Admin can manage orders
   - [ ] Bonus system works
   - [ ] Push notifications sent

## Maintenance

### Weekly
- [ ] Check error logs
- [ ] Review Firebase quotas
- [ ] Monitor performance metrics

### Monthly
- [ ] Update dependencies
- [ ] Review security rules
- [ ] Backup Firestore data
- [ ] Check for breaking changes in Firebase SDK

### Quarterly
- [ ] Full security audit
- [ ] Performance optimization review
- [ ] User feedback analysis
- [ ] Plan new features
