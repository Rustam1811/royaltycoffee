/**
 * Role Management API
 * 
 * Endpoints for managing user roles via Firebase Custom Claims.
 * Only superowners can modify roles.
 * 
 * @module functions/roles
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import cors from 'cors';

const corsHandler = cors({ origin: true });

// ============================================================================
// Types
// ============================================================================

type Role = 'superowner' | 'owner' | 'admin' | 'barista' | 'courier' | 'workshop_owner' | 'workshop_admin' | 'workshop_client' | 'user';

interface UserClaims {
  role: Role;
  locationId?: string;
  workshopId?: string;
}

interface SetRoleRequest {
  targetUid?: string;
  targetEmail?: string;
  role: Role;
  locationId?: string;
  workshopId?: string;
}

interface BulkSetRolesRequest {
  users: SetRoleRequest[];
}

// ============================================================================
// Constants
// ============================================================================

const VALID_ROLES: Role[] = [
  'superowner',
  'owner', 
  'admin',
  'barista',
  'courier',
  'workshop_owner',
  'workshop_admin',
  'workshop_client',
  'user'
];

const STAFF_ROLES: Role[] = ['superowner', 'owner', 'admin', 'barista', 'courier'];
const WORKSHOP_ROLES: Role[] = ['workshop_owner', 'workshop_admin', 'workshop_client'];

// ============================================================================
// Helpers
// ============================================================================

/**
 * Verify that the caller is a superowner
 */
async function verifySuperowner(authHeader: string | undefined): Promise<{ valid: boolean; uid?: string; error?: string }> {
  if (!authHeader?.startsWith('Bearer ')) {
    return { valid: false, error: 'Missing or invalid Authorization header' };
  }

  const token = authHeader.substring(7);
  
  try {
    const decoded = await admin.auth().verifyIdToken(token);
    const user = await admin.auth().getUser(decoded.uid);
    const claims = user.customClaims as UserClaims | undefined;
    
    if (claims?.role !== 'superowner') {
      return { valid: false, error: 'Insufficient permissions. Superowner role required.' };
    }
    
    return { valid: true, uid: decoded.uid };
  } catch (error) {
    console.error('Token verification failed:', error);
    return { valid: false, error: 'Invalid or expired token' };
  }
}

/**
 * Get user by UID or email
 */
async function getUserByIdOrEmail(uid?: string, email?: string): Promise<admin.auth.UserRecord | null> {
  try {
    if (uid) {
      return await admin.auth().getUser(uid);
    }
    if (email) {
      return await admin.auth().getUserByEmail(email);
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Set custom claims for a user
 */
async function setUserClaims(uid: string, claims: UserClaims): Promise<void> {
  await admin.auth().setCustomUserClaims(uid, claims);
  
  // Also update Firestore for easy querying
  const db = admin.firestore();
  await db.collection('users').doc(uid).set({
    role: claims.role,
    ...(claims.locationId && { locationId: claims.locationId }),
    ...(claims.workshopId && { workshopId: claims.workshopId }),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });
}

// ============================================================================
// HTTP Functions
// ============================================================================

/**
 * Set role for a single user
 * 
 * POST /api/roles/set
 * Authorization: Bearer <superowner-token>
 * Body: { targetUid?: string, targetEmail?: string, role: Role, locationId?: string, workshopId?: string }
 */
export const setRole = functions.https.onRequest((req, res) => {
  return corsHandler(req, res, async () => {
    // Only POST allowed
    if (req.method !== 'POST') {
      res.status(405).json({ success: false, error: 'Method not allowed' });
      return;
    }

    // Verify superowner
    const auth = await verifySuperowner(req.headers.authorization);
    if (!auth.valid) {
      res.status(403).json({ success: false, error: auth.error });
      return;
    }

    const { targetUid, targetEmail, role, locationId, workshopId } = req.body as SetRoleRequest;

    // Validate role
    if (!role || !VALID_ROLES.includes(role)) {
      res.status(400).json({ 
        success: false, 
        error: `Invalid role. Must be one of: ${VALID_ROLES.join(', ')}` 
      });
      return;
    }

    // Get target user
    const targetUser = await getUserByIdOrEmail(targetUid, targetEmail);
    if (!targetUser) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    // Validate locationId for staff roles
    if (STAFF_ROLES.includes(role) && role !== 'superowner' && !locationId) {
      res.status(400).json({ 
        success: false, 
        error: 'locationId is required for staff roles (owner, admin, barista, courier)' 
      });
      return;
    }

    // Validate workshopId for workshop roles (workshop_owner and workshop_admin need it)
    if ((role === 'workshop_owner' || role === 'workshop_admin') && !workshopId) {
      res.status(400).json({ 
        success: false, 
        error: 'workshopId is required for workshop_owner and workshop_admin roles' 
      });
      return;
    }

    // Build claims
    const claims: UserClaims = { role };
    if (locationId) claims.locationId = locationId;
    if (workshopId) claims.workshopId = workshopId;

    try {
      await setUserClaims(targetUser.uid, claims);

      console.log(`✅ Role set: ${targetUser.email} → ${role} (by ${auth.uid})`);

      res.json({
        success: true,
        data: {
          uid: targetUser.uid,
          email: targetUser.email,
          role,
          locationId,
          workshopId,
        }
      });
    } catch (error) {
      console.error('Failed to set role:', error);
      res.status(500).json({ success: false, error: 'Failed to set role' });
    }
  });
});

/**
 * Set roles for multiple users at once
 * 
 * POST /api/roles/bulk
 * Authorization: Bearer <superowner-token>
 * Body: { users: [{ targetEmail, role, locationId?, workshopId? }, ...] }
 */
export const bulkSetRoles = functions.https.onRequest((req, res) => {
  return corsHandler(req, res, async () => {
    if (req.method !== 'POST') {
      res.status(405).json({ success: false, error: 'Method not allowed' });
      return;
    }

    const auth = await verifySuperowner(req.headers.authorization);
    if (!auth.valid) {
      res.status(403).json({ success: false, error: auth.error });
      return;
    }

    const { users } = req.body as BulkSetRolesRequest;

    if (!Array.isArray(users) || users.length === 0) {
      res.status(400).json({ success: false, error: 'users array is required' });
      return;
    }

    const results: { email?: string; uid?: string; success: boolean; error?: string }[] = [];

    for (const userReq of users) {
      const { targetUid, targetEmail, role, locationId, workshopId } = userReq;

      if (!VALID_ROLES.includes(role)) {
        results.push({ email: targetEmail, uid: targetUid, success: false, error: 'Invalid role' });
        continue;
      }

      const targetUser = await getUserByIdOrEmail(targetUid, targetEmail);
      if (!targetUser) {
        results.push({ email: targetEmail, uid: targetUid, success: false, error: 'User not found' });
        continue;
      }

      const claims: UserClaims = { role };
      if (locationId) claims.locationId = locationId;
      if (workshopId) claims.workshopId = workshopId;

      try {
        await setUserClaims(targetUser.uid, claims);
        results.push({ email: targetUser.email ?? undefined, uid: targetUser.uid, success: true });
        console.log(`✅ Role set: ${targetUser.email} → ${role}`);
      } catch {
        results.push({ email: targetUser.email ?? undefined, uid: targetUser.uid, success: false, error: 'Failed to set claims' });
      }
    }

    res.json({
      success: true,
      data: {
        total: users.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        results,
      }
    });
  });
});

/**
 * Get role for a user
 * 
 * GET /api/roles/get?uid=xxx or ?email=xxx
 * Authorization: Bearer <superowner-token>
 */
export const getRole = functions.https.onRequest((req, res) => {
  return corsHandler(req, res, async () => {
    if (req.method !== 'GET') {
      res.status(405).json({ success: false, error: 'Method not allowed' });
      return;
    }

    const auth = await verifySuperowner(req.headers.authorization);
    if (!auth.valid) {
      res.status(403).json({ success: false, error: auth.error });
      return;
    }

    const { uid, email } = req.query;

    const targetUser = await getUserByIdOrEmail(uid as string, email as string);
    if (!targetUser) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    const claims = targetUser.customClaims as UserClaims | undefined;

    res.json({
      success: true,
      data: {
        uid: targetUser.uid,
        email: targetUser.email,
        role: claims?.role ?? 'user',
        locationId: claims?.locationId,
        workshopId: claims?.workshopId,
        displayName: targetUser.displayName,
        photoURL: targetUser.photoURL,
        createdAt: targetUser.metadata.creationTime,
      }
    });
  });
});

/**
 * List all users with staff roles
 * 
 * GET /api/roles/staff
 * Authorization: Bearer <superowner-token>
 */
export const listStaff = functions.https.onRequest((req, res) => {
  return corsHandler(req, res, async () => {
    if (req.method !== 'GET') {
      res.status(405).json({ success: false, error: 'Method not allowed' });
      return;
    }

    const auth = await verifySuperowner(req.headers.authorization);
    if (!auth.valid) {
      res.status(403).json({ success: false, error: auth.error });
      return;
    }

    try {
      const db = admin.firestore();
      const staffSnapshot = await db.collection('users')
        .where('role', 'in', [...STAFF_ROLES, ...WORKSHOP_ROLES])
        .get();

      const staff = staffSnapshot.docs.map(doc => ({
        uid: doc.id,
        ...doc.data(),
      }));

      res.json({
        success: true,
        data: staff,
      });
    } catch (error) {
      console.error('Failed to list staff:', error);
      res.status(500).json({ success: false, error: 'Failed to list staff' });
    }
  });
});

/**
 * Remove role (set to user)
 * 
 * POST /api/roles/remove
 * Authorization: Bearer <superowner-token>
 * Body: { targetUid?: string, targetEmail?: string }
 */
export const removeRole = functions.https.onRequest((req, res) => {
  return corsHandler(req, res, async () => {
    if (req.method !== 'POST') {
      res.status(405).json({ success: false, error: 'Method not allowed' });
      return;
    }

    const auth = await verifySuperowner(req.headers.authorization);
    if (!auth.valid) {
      res.status(403).json({ success: false, error: auth.error });
      return;
    }

    const { targetUid, targetEmail } = req.body;

    const targetUser = await getUserByIdOrEmail(targetUid, targetEmail);
    if (!targetUser) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    try {
      // Reset to user role
      await setUserClaims(targetUser.uid, { role: 'user' });

      console.log(`✅ Role removed: ${targetUser.email} → user (by ${auth.uid})`);

      res.json({
        success: true,
        data: {
          uid: targetUser.uid,
          email: targetUser.email,
          role: 'user',
        }
      });
    } catch (error) {
      console.error('Failed to remove role:', error);
      res.status(500).json({ success: false, error: 'Failed to remove role' });
    }
  });
});

/**
 * Create a new staff user (Firebase Auth account + role + location).
 * If the user already exists by email — just update their role/claims.
 * 
 * POST /api/roles/create-staff
 * Authorization: Bearer <superowner-token>
 * Body: { email, password, displayName, role, locationId?, workshopId? }
 */
export const createStaffUser = functions.https.onRequest((req, res) => {
  return corsHandler(req, res, async () => {
    if (req.method !== 'POST') {
      res.status(405).json({ success: false, error: 'Method not allowed' });
      return;
    }

    const authResult = await verifySuperowner(req.headers.authorization);
    if (!authResult.valid) {
      res.status(403).json({ success: false, error: authResult.error });
      return;
    }

    const { email, password, displayName, role, locationId, workshopId } = req.body as {
      email?: string;
      password?: string;
      displayName?: string;
      role?: Role;
      locationId?: string;
      workshopId?: string;
    };

    // Validate required fields
    if (!email || !email.includes('@')) {
      res.status(400).json({ success: false, error: 'Valid email is required' });
      return;
    }
    if (!role || !VALID_ROLES.includes(role)) {
      res.status(400).json({ success: false, error: `Invalid role. Must be one of: ${VALID_ROLES.join(', ')}` });
      return;
    }
    if (STAFF_ROLES.includes(role) && role !== 'superowner' && !locationId) {
      res.status(400).json({ success: false, error: 'locationId is required for staff roles' });
      return;
    }
    if ((role === 'workshop_owner' || role === 'workshop_admin') && !workshopId) {
      res.status(400).json({ success: false, error: 'workshopId is required for workshop roles' });
      return;
    }

    try {
      let userRecord: admin.auth.UserRecord;
      let isNewUser = false;

      // Check if user already exists
      try {
        userRecord = await admin.auth().getUserByEmail(email.trim().toLowerCase());
        console.log(`📋 User already exists: ${email} (${userRecord.uid})`);
      } catch {
        // User doesn't exist — create new one
        if (!password || password.length < 6) {
          res.status(400).json({ success: false, error: 'Password (min 6 chars) is required for new users' });
          return;
        }

        userRecord = await admin.auth().createUser({
          email: email.trim().toLowerCase(),
          password,
          displayName: displayName || email.split('@')[0],
        });
        isNewUser = true;
        console.log(`✅ New user created: ${email} (${userRecord.uid})`);
      }

      // Set claims
      const claims: UserClaims = { role };
      if (locationId) claims.locationId = locationId;
      if (workshopId) claims.workshopId = workshopId;
      await setUserClaims(userRecord.uid, claims);

      // Also save display name to Firestore for easy listing
      const db = admin.firestore();
      await db.collection('users').doc(userRecord.uid).set({
        email: email.trim().toLowerCase(),
        name: displayName || userRecord.displayName || email.split('@')[0],
        role,
        ...(locationId && { locationId }),
        ...(workshopId && { workshopId }),
        isStaff: true,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        ...(isNewUser && { createdAt: admin.firestore.FieldValue.serverTimestamp() }),
      }, { merge: true });

      console.log(`✅ Staff user ready: ${email} → ${role}@${locationId || 'all'} (by ${authResult.uid})`);

      res.json({
        success: true,
        data: {
          uid: userRecord.uid,
          email: userRecord.email,
          displayName: userRecord.displayName || displayName,
          role,
          locationId,
          workshopId,
          isNewUser,
        }
      });
    } catch (error: unknown) {
      console.error('Failed to create staff user:', error);
      
      // Firebase-specific error messages
      let errorMessage = 'Failed to create staff user';
      const fbErr = error as { code?: string; message?: string };
      if (fbErr?.code === 'auth/email-already-exists') {
        errorMessage = 'Email already in use';
      } else if (fbErr?.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email format';
      } else if (fbErr?.code === 'auth/weak-password') {
        errorMessage = 'Password is too weak (min 6 characters)';
      } else if (fbErr?.message) {
        errorMessage = fbErr.message;
      }
      
      res.status(500).json({ success: false, error: errorMessage });
    }
  });
});

/**
 * List all staff with their Firebase Auth data + custom claims.
 * Reads from Firebase Auth (not just Firestore) for accurate claim data.
 * 
 * GET /api/roles/staff-full
 * Authorization: Bearer <superowner-token>
 */
export const listStaffFull = functions.https.onRequest((req, res) => {
  return corsHandler(req, res, async () => {
    if (req.method !== 'GET') {
      res.status(405).json({ success: false, error: 'Method not allowed' });
      return;
    }

    const authResult = await verifySuperowner(req.headers.authorization);
    if (!authResult.valid) {
      res.status(403).json({ success: false, error: authResult.error });
      return;
    }

    try {
      // List all users from Firebase Auth (up to 1000)
      const listResult = await admin.auth().listUsers(1000);
      
      const staffUsers = listResult.users
        .filter(user => {
          const claims = user.customClaims as UserClaims | undefined;
          const role = claims?.role;
          return role && role !== 'user' && VALID_ROLES.includes(role);
        })
        .map(user => {
          const claims = user.customClaims as UserClaims | undefined;
          return {
            uid: user.uid,
            email: user.email ?? null,
            displayName: user.displayName ?? null,
            photoURL: user.photoURL ?? null,
            role: claims?.role ?? 'user',
            locationId: claims?.locationId ?? null,
            workshopId: claims?.workshopId ?? null,
            disabled: user.disabled,
            createdAt: user.metadata.creationTime,
            lastSignIn: user.metadata.lastSignInTime,
          };
        })
        .sort((a, b) => {
          // Sort by role priority
          const rolePriority: Record<string, number> = {
            superowner: 0, owner: 1, admin: 2, barista: 3, courier: 4,
            workshop_owner: 5, workshop_admin: 6, workshop_client: 7,
          };
          return (rolePriority[a.role] ?? 99) - (rolePriority[b.role] ?? 99);
        });

      res.json({
        success: true,
        data: staffUsers,
        total: staffUsers.length,
      });
    } catch (error) {
      console.error('Failed to list staff:', error);
      res.status(500).json({ success: false, error: 'Failed to list staff' });
    }
  });
});

/**
 * Update staff user's password.
 * 
 * POST /api/roles/update-password
 * Authorization: Bearer <superowner-token>
 * Body: { targetUid?: string, targetEmail?: string, newPassword: string }
 */
export const updateStaffPassword = functions.https.onRequest((req, res) => {
  return corsHandler(req, res, async () => {
    if (req.method !== 'POST') {
      res.status(405).json({ success: false, error: 'Method not allowed' });
      return;
    }

    const authResult = await verifySuperowner(req.headers.authorization);
    if (!authResult.valid) {
      res.status(403).json({ success: false, error: authResult.error });
      return;
    }

    const { targetUid, targetEmail, newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      res.status(400).json({ success: false, error: 'Password must be at least 6 characters' });
      return;
    }

    const targetUser = await getUserByIdOrEmail(targetUid, targetEmail);
    if (!targetUser) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    try {
      await admin.auth().updateUser(targetUser.uid, { password: newPassword });
      
      console.log(`✅ Password updated for ${targetUser.email} (by ${authResult.uid})`);

      res.json({
        success: true,
        data: {
          uid: targetUser.uid,
          email: targetUser.email,
        }
      });
    } catch (error) {
      console.error('Failed to update password:', error);
      res.status(500).json({ success: false, error: 'Failed to update password' });
    }
  });
});
