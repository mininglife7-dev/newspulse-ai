# Troubleshooting Guide

**Purpose:** Quick reference for resolving common customer issues  
**Audience:** Support team, founder, developers  
**Updated:** 2026-07-11  

---

## Account & Authentication Issues

### Issue: "Invalid Email" Error During Signup

**Symptoms:**
- Signup form rejects email address
- Error message: "Please enter a valid email"

**Causes:**
- Email format invalid (missing @domain, spaces, etc.)
- Leading/trailing spaces in email field
- Email already used for another account

**Solutions:**
1. Check email format: `name@example.com`
2. Verify no leading/trailing spaces
3. If previously signed up, use password reset instead
4. Try adding `+tag` to email if rate-limited: `name+test@example.com`

**If still failing:**
- Contact support with exact email address
- May be a rate limit issue (try again in 1 hour)

---

### Issue: "Password Too Weak" Error

**Symptoms:**
- Password rejected during signup
- Error: "Password must be at least 8 characters with uppercase, numbers, and symbols"

**Causes:**
- Password too short (< 8 characters)
- Missing uppercase letters
- Missing numbers
- Missing special characters

**Solutions:**
1. Use at least 8 characters
2. Include: Uppercase (A-Z), lowercase (a-z), number (0-9), special (!@#$)
3. Example strong password: `MyCompany2024!`

**Security note:** Longer, more complex passwords are more secure.

---

### Issue: "Email Verification Failed" or Link Expired

**Symptoms:**
- Clicked verification link but got error
- Link doesn't work after 24 hours
- "Verification link expired" message

**Causes:**
- Link expired (24-hour validity)
- User already verified
- Invalid verification token

**Solutions:**
1. Check if already verified (try logging in)
2. Request new verification email on login page
3. Check spam/promotions folder for new email
4. Whitelist `noreply@[domain]` to prevent spam filtering

**If issue persists:**
- Contact support with email address
- We can manually verify account

---

### Issue: "Cannot Log In" After Verification

**Symptoms:**
- Email verified but login fails
- "Invalid email or password" error
- Account created but can't access

**Causes:**
- Wrong email address or password
- Account not fully created
- Session cookie issues
- Email provider blocking notification

**Solutions:**
1. Verify you're using correct email
2. Caps lock should be OFF
3. Try password reset link
4. Clear browser cookies: Settings → Privacy → Clear Cookies
5. Try different browser
6. Try incognito/private mode

**If still blocked:**
- Contact support — we can reset your account

---

## Workspace Issues

### Issue: "Workspace Creation Failed"

**Symptoms:**
- Form submits but error appears
- "Failed to create workspace" message
- No workspace appears in dashboard

**Causes:**
- Required field missing
- Invalid field format
- Company name too long (> 100 characters)
- Network error during submission
- Rate limit (10 workspaces per hour)

**Solutions:**

**Check required fields:**
- ✅ Company Name: 1-100 characters (required)
- ✅ Country: Required field
- ✅ Industry: Required field

**Check field formats:**
- Company Name: Letters, numbers, spaces only (no emoji or special chars)
- Website (optional): Must start with `https://`
- Country: Use country name or ISO code

**If fields look correct:**
1. Try shorter company name (< 50 characters)
2. Remove special characters from description
3. Wait 60 seconds and retry
4. Refresh page and try again

**Still failing?**
- Contact support with exact error message
- We can investigate database or rate limit issues

---

### Issue: "Company Name Already Exists" or "Slug Collision"

**Symptoms:**
- Created workspace but received "already exists" error
- Error mentions "unique constraint" or "slug"

**Causes:**
- Another user created workspace with similar name
- Server retry logic encountered collision
- Database uniqueness constraint

**Solutions:**
1. Retry once — our retry logic should handle this
2. If error persists, try slightly different company name
3. Add year, location, or identifier: "Acme Corp 2026", "Acme EU", "Acme HQ"
4. Use full legal name instead of short name

**Technical note:** System generates unique slug from company name with random suffix to prevent collisions. If collision occurs, try different name.

---

### Issue: "No Workspace" After Login

**Symptoms:**
- Successfully logged in
- Dashboard shows "No workspace found"
- Error: "You must create a workspace first"

**Causes:**
- Workspace creation didn't complete
- Using wrong account
- Workspace deleted
- Session sync delay

**Solutions:**
1. Refresh page (give system 10 seconds to sync)
2. Logout and login again
3. Check if you have multiple accounts
4. Try different email address if you created multiple
5. Clear browser cache: Ctrl+Shift+Delete (Windows) or Cmd+Shift+Delete (Mac)

**If issue persists:**
- Contact support with email address
- We can check if workspace exists and fix permissions

---

## AI System Registration Issues

### Issue: "System Name is Required" Error

**Symptoms:**
- Form won't submit
- "System name is required" error
- Can't add new AI system

**Causes:**
- Name field is empty
- Only spaces in name field
- Form not recognizing input

**Solutions:**
1. Click name field
2. Type system name (1-150 characters required)
3. Ensure at least one letter/number (not just spaces)
4. Examples: "ChatGPT-4 Support", "ML Recommendation Engine", "Image Recognition v2"

**Good naming examples:**
- "OpenAI GPT-4 Customer Support"
- "AWS Rekognition Image Analysis"
- "Internal ML Recommendation Engine"
- "Claude Integration v2.1"

---

### Issue: "Invalid System Type" Error

**Symptoms:**
- Form rejects system type selection
- Error: "Invalid system type"
- Dropdown not working

**Causes:**
- Selected type not in enum
- Form state corrupted
- Browser issue

**Solutions:**

**Valid system types:**
- Large Language Model (e.g., ChatGPT, Claude)
- Generative AI (e.g., DALL-E, Midjourney)
- Classification System (e.g., spam detection, sentiment analysis)
- Recommendation System (e.g., product recommendations)
- Computer Vision (e.g., image recognition, object detection)
- Biometric System (e.g., facial recognition, fingerprint)
- Decision Support (e.g., loan approval, medical diagnosis)
- Other (for systems not fitting above)

**If dropdown not responding:**
1. Refresh page
2. Try different browser
3. Proceed without selecting type (optional field)
4. Contact support if critical

---

### Issue: "Maximum Length Exceeded" Error

**Symptoms:**
- Field shows error about length
- "Description must be at most 500 characters"
- "Vendor must be at most 100 characters"

**Causes:**
- Text in field is too long
- Pasted text includes extra characters

**Solutions:**

**Character limits:**
- System Name: Max 150 characters
- Description: Max 500 characters
- Vendor: Max 100 characters
- Purpose: Max 300 characters

**Fix:**
1. Click on field
2. Count or select all text (Ctrl+A)
3. Delete excess characters
4. Keep most important information

**Tips for concise descriptions:**
- Focus on business value: "Handles X use case"
- Include scale: "Processes X requests/day"
- Avoid: Long explanations, redundancy, links

---

## Dashboard & Access Issues

### Issue: "Dashboard is Blank" or Not Loading

**Symptoms:**
- Dashboard page loads but shows nothing
- Spinner keeps spinning
- "Error loading data" message

**Causes:**
- Network connectivity issue
- Workspace data not syncing
- API endpoint slow/failing
- Browser cache issue

**Solutions:**
1. Check internet connection (try other website)
2. Refresh page: F5 or Cmd+R
3. Wait 10 seconds (first load can be slow)
4. Clear browser cache: Ctrl+Shift+Delete
5. Try different browser
6. Logout and login again

**If still blank:**
- Check `/api/health` endpoint
- Contact support with browser console error (F12 → Console)

---

### Issue: "Permission Denied" or "Access Forbidden"

**Symptoms:**
- See other workspaces but can't access one
- Error: "You don't have permission to access this workspace"

**Causes:**
- Not workspace owner or member
- Workspace deleted
- Permissions revoked
- Session expired

**Solutions:**
1. Logout and login again (refresh session)
2. Verify you're in correct account (multiple emails?)
3. Workspace owner can re-invite you
4. Contact founder if owner revoked access

**Note:** Each workspace is isolated. You can only see workspaces you created or were invited to.

---

### Issue: "No AI Systems" After Adding One

**Symptoms:**
- Just registered AI system
- Dashboard shows "0 systems"
- AI system doesn't appear in list

**Causes:**
- System not saved (form error)
- Data not synced yet
- Browser cache showing old data
- Different browser/window

**Solutions:**
1. Refresh page: F5
2. Wait 5 seconds for data sync
3. Check different browser window
4. Try logout/login to force sync
5. Clear browser cache

**If still missing:**
- Check browser console (F12 → Network) for 4xx/5xx errors
- Contact support with system name you tried to register

---

## Rate Limiting Issues

### Issue: "Rate Limit Exceeded" (429 Error)

**Symptoms:**
- Action fails with "Rate limit exceeded"
- "Too many requests" message
- Can't perform action again

**Causes:**
- Made too many requests too fast
- Multiple users from same IP
- Automated scripts hitting endpoint

**Limits:**
- Workspace creation: 10 per minute
- AI system creation: 30 per minute

**Solutions:**
1. Wait 60 seconds and try again
2. Space out requests (not rapid succession)
3. If multiple users: Use separate networks/VPNs
4. Contact support if legitimate high volume needed

**For API users:**
- Implement backoff: wait 2s → 4s → 8s on retry
- Batch operations: Don't create 100 systems individually
- Contact us for higher limits

---

## Email & Notification Issues

### Issue: "Verification Email Not Received"

**Symptoms:**
- Clicked "Send Verification Email" but nothing arrived
- Email not in inbox or spam
- Waited 5+ minutes

**Causes:**
- Email provider blocking (spam filter)
- Email address typo
- Email delivery failure
- Provider rate limited (unusual)

**Solutions:**
1. Check spam/promotions folders
2. Whitelist `noreply@[domain]` in email settings
3. Verify you entered correct email: `name@example.com`
4. Try from different email if available
5. Wait 5 minutes (email delivery can be slow)

**If not received:**
- Contact support with email address
- We can manually verify your account
- We can troubleshoot delivery issues

---

### Issue: "Password Reset Email Not Received"

**Symptoms:**
- Clicked "Forgot Password" but no email
- Reset link not in inbox

**Causes:**
- Same as verification email issues
- Email address doesn't exist in system
- Recent signup (verification required first)

**Solutions:**
1. Verify account was created (try login with email)
2. Check spam/promotions folder
3. Whitelist sender email
4. Ensure you're using correct email address

**If account doesn't exist:**
- Signup again with correct email

---

## Browser & Technical Issues

### Issue: "Page Keeps Refreshing" or "Infinite Loop"

**Symptoms:**
- Page constantly reloads
- Can't stay on dashboard
- Auth loop (redirect to login)

**Causes:**
- Session/cookie issue
- Authentication header problem
- Redirect loop in app
- Browser extension interfering

**Solutions:**
1. Clear all cookies for this domain
   - Settings → Privacy → Clear Cookies (specify domain)
2. Try incognito/private mode (no extensions)
3. Disable browser extensions temporarily
4. Try different browser
5. Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)

**If still looping:**
- Contact support
- Provide browser console errors (F12 → Console)
- Provide browser type and version

---

### Issue: "Slow Loading" or "Page Takes 10+ Seconds"

**Symptoms:**
- Dashboard takes long time to appear
- Workspace creation delayed
- API responses slow

**Causes:**
- Network connectivity slow
- First-time data load (normal)
- High server load
- Large data set (many systems)

**Solutions:**

**Normal first-time load:** 2-5 seconds (acceptable)

**If consistently slow:**
1. Check internet speed (speedtest.net)
2. Try different network (WiFi vs mobile)
3. Check Vercel status: https://www.vercel.com/status
4. Monitor `/api/production-health` for server issues

**If server is slow:**
- Contact support
- Provide timing information
- We can optimize queries

---

### Issue: "403 Forbidden" or "401 Unauthorized"

**Symptoms:**
- API returns 403/401 error
- "Not authorized" or "Forbidden" message
- Can't access endpoint

**Causes:**
- Session expired
- Token invalid
- User not authenticated
- Workspace permissions issue

**Solutions:**
1. Logout and login again
2. Clear browser cookies
3. Verify account has workspace
4. Check user has correct permissions

**For API/technical users:**
- Verify JWT token in Authorization header
- Check token expiration: `exp` claim
- Refresh token if expired
- Contact support for credential issues

---

## Data & Privacy Issues

### Issue: "Can't See My Data" or "Data Missing"

**Symptoms:**
- Workspace or systems previously visible are gone
- Data appears deleted unintentionally

**Causes:**
- Accidental deletion
- Data retention purge (unlikely)
- Wrong account/email
- Permission changed

**Solutions:**
1. Logout and verify correct account (check email)
2. Refresh page and check again
3. Check browser history to confirm workspace existed
4. If accidentally deleted, contact support

**If genuinely deleted:**
- Contact support IMMEDIATELY
- Provide workspace name and creation date
- We may be able to recover from backups
- **Note:** Backups have limited retention (typically 7-30 days)

---

### Issue: "Privacy Concern" or "Data Leak Suspected"

**Symptoms:**
- See another organization's data
- Unauthorized access to workspace
- Leaked or exposed information

**Causes:**
- RLS policy failure (very unlikely)
- User account compromise
- Platform security breach
- Misunderstanding (wrong account)

**Solutions:**
1. **Immediately logout** from all sessions
2. Contact support with exact details
   - What data did you see?
   - Which workspace?
   - When did you notice?
3. Change password immediately
4. Check account activity

**If confirmed breach:**
- We will investigate immediately
- We will notify you of findings
- We will provide remediation steps
- We will assist with recovery

---

## Contacting Support

### When to Contact Support

**Contact us for:**
- Account/technical issues this guide doesn't cover
- Data loss or privacy concerns
- Persistent errors (tried solutions above)
- Feature requests or feedback
- Security issues

### How to Contact

**Email:** mininglife7@gmail.com  
**Response Time:** Within 24 hours  
**Hours:** Monday-Friday, 9 AM-5 PM CET  

### Information to Include

1. **Email address** — your account email
2. **Problem description** — what happened
3. **Steps to reproduce** — how to cause the issue
4. **Error message** — exact error text
5. **Screenshots** — if visual issue
6. **Browser info** — browser type and version (Chrome 126, Firefox 125, etc.)
7. **Workspace name** — if issue is workspace-specific

**Example support email:**
```
Subject: Can't create workspace

Hi,

I'm trying to create a workspace but getting an error.

Email: user@example.com
Company name: Acme Corporation
Country: US
Industry: Technology

Error: "Failed to create workspace"

Browser: Chrome 126 (Windows 10)
Workspace never created.

Can you help?

Thanks,
John
```

---

## FAQ

**Q: Is EURO AI down right now?**
A: Check `/api/health` endpoint. If it returns healthy, system is up.

**Q: How long does workspace creation take?**
A: Should be instant. If not, likely network issue.

**Q: Can I change my email address?**
A: Currently not supported. Create new account with new email.

**Q: What if I forget my password?**
A: Use "Forgot Password" link on login page.

**Q: Can I recover a deleted workspace?**
A: We can attempt recovery within 7 days. Contact support.

**Q: How do I export my data?**
A: Export feature coming soon. Contact support for manual export.

**Q: Is there an API?**
A: API available for enterprise customers. Contact support for details.

**Q: Why is my system showing as "deprecated"?**
A: You set it to deprecated status. Change status to "active" or "pilot" to restore.

---

## Still Need Help?

If this guide doesn't solve your issue:

1. Email support: mininglife7@gmail.com
2. Include all information from "Contacting Support" section above
3. We'll respond within 24 hours
4. We'll work with you to resolve the issue

**We're here to help!**

---

**Document Version:** 1.0  
**Last Updated:** 2026-07-11  
**Maintained by:** Governor, Support Team

