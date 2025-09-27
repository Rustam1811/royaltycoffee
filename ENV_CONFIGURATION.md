# Firebase Authentication Environment Configuration

This document describes the environment variables required for the new Firebase Bearer token authentication system.

## Required Environment Variables

### ADMIN_AUTH_ENABLED
Controls whether authentication is required for protected API routes.

**Values:**
- `true` - Authentication is required (production mode)
- `false` - Authentication is disabled (development/testing mode)

**Example:**
```
ADMIN_AUTH_ENABLED=false
```

**Usage:**
- Set to `false` during initial deployment to prevent breaking existing functionality
- Change to `true` after confirming the authentication system is working
- Use `false` for local development and testing

### ALLOWED_ORIGIN
Specifies which origins are allowed to make CORS requests to the API.

**Values:**
- `*` - Allow all origins (development only)
- `https://your-domain.com` - Specific domain (production)

**Example:**
```
ALLOWED_ORIGIN=https://coffee-admin-nine.vercel.app
```

**Usage:**
- Set to your production domain for security
- Use `*` only for development environments

### FIREBASE_SERVICE_ACCOUNT
Complete Firebase service account JSON as a string with escaped newlines.

**Format:**
JSON string with `\n` characters for newlines in the private key.

**Example:**
```
FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"your-project-id","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\nMIIEvQI...","client_email":"...@your-project-id.iam.gserviceaccount.com","client_id":"...","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"..."}
```

**Alternative Variables (if FIREBASE_SERVICE_ACCOUNT is not available):**
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`  
- `FIREBASE_PRIVATE_KEY`

## Deployment Instructions

### Step 1: Initial Deployment
Set the following variables in your hosting provider (Vercel, etc.):

```
ADMIN_AUTH_ENABLED=false
ALLOWED_ORIGIN=https://your-production-domain.com
FIREBASE_SERVICE_ACCOUNT={"type":"service_account",...}
```

### Step 2: Test Authentication
1. Deploy with `ADMIN_AUTH_ENABLED=false`
2. Test that the new API client works with Bearer tokens
3. Verify bonus page functionality in DevTools (Authorization header present)

### Step 3: Enable Authentication
1. Change `ADMIN_AUTH_ENABLED=true`
2. Redeploy
3. Verify protected routes return 401 without valid tokens

## Testing

### Local Development
For local testing, you can use:

```
ADMIN_AUTH_ENABLED=false
ALLOWED_ORIGIN=*
FIREBASE_SERVICE_ACCOUNT=...
```

### Production Testing
1. Use browser DevTools → Network tab
2. Navigate to Bonus page when logged in as admin
3. Look for `Authorization: Bearer ...` header in API requests
4. Verify API returns 200 status codes

## Troubleshooting

### Common Issues

**401 Unauthorized:**
- Check that user is logged in
- Verify Firebase ID token is valid
- Ensure custom claims include `role: "admin"`

**403 Forbidden:**
- User is authenticated but doesn't have admin role
- Check custom claims in Firebase Console
- Verify role assignment in Firebase Functions

**CORS Errors:**
- Check `ALLOWED_ORIGIN` matches your domain exactly
- Include protocol (https://) in origin
- Verify domain doesn't have trailing slash

**Token Expired:**
- Firebase ID tokens automatically refresh
- Check browser console for token refresh attempts
- Verify Firebase SDK configuration

### Debug Commands

Check current environment variables:
```bash
# In Vercel
vercel env ls

# In local development  
echo $ADMIN_AUTH_ENABLED
```

Test API endpoints:
```bash
# Test protected endpoint (should return 401 when auth enabled)
curl -X GET https://your-api.com/api/bonus?action=settings

# Test with valid token
curl -X GET https://your-api.com/api/bonus?action=settings \
  -H "Authorization: Bearer YOUR_FIREBASE_ID_TOKEN"
```

## Migration Timeline

1. **Deploy API client** - Frontend can send Bearer tokens
2. **Deploy auth guard with flag disabled** - Backend ready but not enforcing
3. **Test canary route** - Verify bonus page works with new client
4. **Enable auth flag** - Start enforcing authentication
5. **Migrate remaining routes** - Gradually protect other endpoints
6. **Clean up legacy code** - Remove old fetch calls and credentials

## Security Notes

- Never commit service account JSON to version control
- Use environment variables or secure secret storage
- Rotate service account keys periodically
- Monitor authentication logs for suspicious activity
- Keep Firebase SDK updated to latest version