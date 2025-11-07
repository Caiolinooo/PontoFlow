# JWT Migration Guide

## 📋 Overview

This guide documents the migration from base64 tokens to JWT (JSON Web Tokens) with HMAC-SHA256 signatures.

**Migration Type**: **Option B - Immediate Migration**
- All existing sessions will be invalidated
- All users will be logged out and need to sign in again
- No gradual migration period

## 🔒 Security Improvements

### Before (Base64 Tokens)
```
Token Format: base64(userId:timestamp)
Security: None - tokens can be forged
Validation: Only expiration check
Example: "MTIzNDU2Nzg5MDoxNjgwMDAwMDAwMDAw"
```

### After (JWT with HMAC-SHA256)
```
Token Format: header.payload.signature
Security: HMAC-SHA256 signature verification
Validation: Signature, expiration, issuer, UUID format
Example: "eyJhbGc...IkpXVCJ9.eyJzdWI...iOjE2ODB9.5j_E7...3vZGw"
```

## 🚀 Migration Steps

### 1. Generate JWT Secret

Generate a strong secret (minimum 32 characters):

```bash
# Using OpenSSL (recommended)
openssl rand -hex 32

# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Using Python
python3 -c "import secrets; print(secrets.token_hex(32))"
```

### 2. Add JWT_SECRET to Environment

Add to your `.env.local` or environment variables:

```bash
JWT_SECRET=your-generated-secret-here
```

**CRITICAL SECURITY NOTES:**
- Keep this secret secure
- Never commit to version control
- Use different secrets for dev/staging/production
- Minimum 32 characters (64+ recommended)
- Rotate periodically (e.g., every 90 days)

### 3. Deploy Code Changes

The following files were modified:

**New Files:**
- `src/lib/auth/jwt.ts` - JWT library with HMAC-SHA256

**Modified Files:**
- `src/lib/auth/custom-auth.ts` - Uses JWT instead of base64
  - Line 192: `generateToken(unifiedUser.id)` for users_unified
  - Line 288: `generateToken(userData.id)` for Supabase Auth
  - Line 320: `verifyToken(token)` in getUserFromToken
- `.env.example` - Added JWT_SECRET documentation

**No Database Changes Required** ✅
- Tokens are not stored in database
- All validation happens in application code

### 4. Communicate to Users

**Important:** All users will be logged out during this migration.

Recommended communication:
```
Subject: PontoFlow System Maintenance - Password Reset Not Required

We're implementing enhanced security measures for your account.

What to expect:
- You will be automatically logged out
- Simply sign in again with your existing credentials
- No password reset required
- Your data and settings remain unchanged

This is a one-time security upgrade. Thank you for your patience!
```

### 5. Deployment Checklist

- [ ] Generate JWT_SECRET
- [ ] Add JWT_SECRET to production environment
- [ ] Deploy code changes
- [ ] Verify login works with new JWT tokens
- [ ] Monitor logs for any JWT errors
- [ ] Communicate to users about logout

## 🔍 Verification

### Test JWT Generation

```bash
# In Node.js console
const { generateToken } = require('./src/lib/auth/jwt');
const testUserId = '123e4567-e89b-12d3-a456-426614174000';
const token = generateToken(testUserId);
console.log('Generated JWT:', token);
```

### Test JWT Verification

```bash
# In Node.js console
const { verifyToken } = require('./src/lib/auth/jwt');
const payload = verifyToken(token);
console.log('Verified Payload:', payload);
// Should output: { sub: '123e...', iat: ..., exp: ..., iss: 'pontoflow' }
```

### Check Logs

After deployment, check for:
```
[JWT] Generated token for user: <uuid>
[JWT] Token verified for user: <uuid>
```

If you see errors:
```
[JWT] CRITICAL: JWT_SECRET is not set!
[JWT] Invalid signature
[JWT] Token expired
```

## 📊 Token Comparison

| Feature | Base64 | JWT |
|---------|--------|-----|
| Security | ❌ None | ✅ HMAC-SHA256 |
| Tampering Protection | ❌ No | ✅ Yes |
| Expiration | ✅ 7 days | ✅ 7 days |
| Size | ~50 bytes | ~200 bytes |
| Validation | Decode only | Full cryptographic verification |

## 🐛 Troubleshooting

### Error: "JWT_SECRET is not set"
**Solution:** Add JWT_SECRET to your .env.local or environment variables

### Error: "JWT_SECRET must be at least 32 characters"
**Solution:** Generate a longer secret using the commands above

### Error: "Invalid signature"
**Possible Causes:**
1. JWT_SECRET mismatch between environments
2. Token generated with different secret
3. Token tampered with

**Solution:** Ensure JWT_SECRET is consistent across your deployment

### Error: "Token expired"
**Expected Behavior:** Tokens expire after 7 days
**Solution:** User needs to sign in again

## 🔄 Rollback Plan

If issues occur during migration:

1. **Revert Code Changes:**
   ```bash
   git revert <commit-hash>
   git push
   ```

2. **Remove JWT_SECRET** (optional):
   - Keep it for future re-attempt
   - Or remove from environment

3. **Users can sign in again:**
   - Old base64 tokens will work again
   - No data loss

## 📝 Technical Details

### JWT Structure

**Header:**
```json
{
  "alg": "HS256",
  "typ": "JWT"
}
```

**Payload:**
```json
{
  "sub": "user-uuid",
  "iat": 1680000000,
  "exp": 1680604800,
  "iss": "pontoflow"
}
```

**Signature:**
```
HMACSHA256(
  base64UrlEncode(header) + "." + base64UrlEncode(payload),
  JWT_SECRET
)
```

### Token Lifetime

- **Expiration:** 7 days from issuance
- **Validation:** Every request
- **Storage:** Cookie (`timesheet_session`)
- **Transmission:** HTTP-only cookie

### Security Features

1. **Cryptographic Signature:** HMAC-SHA256 prevents tampering
2. **Timing-Safe Comparison:** Prevents timing attacks
3. **UUID Validation:** Ensures valid user ID format
4. **Issuer Validation:** Only accepts tokens from 'pontoflow'
5. **Expiration Validation:** Rejects expired tokens

## 🎯 Benefits

1. **Security:** Tokens cannot be forged without JWT_SECRET
2. **Industry Standard:** JWT is widely adopted and battle-tested
3. **Future-Proof:** Easy to add claims (roles, permissions, etc.)
4. **Auditability:** Signature verification provides non-repudiation
5. **Compliance:** Better security posture for LGPD/GDPR

## 📚 References

- [JWT.io](https://jwt.io/) - JWT debugger and documentation
- [RFC 7519](https://tools.ietf.org/html/rfc7519) - JWT specification
- [RFC 2104](https://tools.ietf.org/html/rfc2104) - HMAC specification
- [OWASP JWT Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html)

## ✅ Post-Migration Checklist

- [ ] All users able to sign in
- [ ] No JWT errors in logs
- [ ] Session persistence working (7 days)
- [ ] Mobile/desktop clients working
- [ ] API authentication working
- [ ] Super admin functionality working
- [ ] No performance degradation

## 🔐 Security Recommendations

1. **Rotate JWT_SECRET** every 90 days
2. **Use different secrets** for dev/staging/prod
3. **Never log** JWT_SECRET in application logs
4. **Monitor** for unusual authentication patterns
5. **Implement rate limiting** on auth endpoints
6. **Consider adding** refresh tokens for longer sessions

---

**Migration Completed:** ✅ Option B - Immediate
**All Users Logged Out:** ✅ Expected behavior
**Security Level:** 🔒 Significantly improved
