# CUSTOMER TROUBLESHOOTING GUIDE
## EURO AI Platform — Common Issues & Solutions

**Last Updated:** 2026-07-16  
**For:** Anne Catherine and future customers  
**Support Contact:** Governor Ω (respond within 4 business hours)

---

## QUICK REFERENCE

| Issue | Symptom | Solution | Severity |
|-------|---------|----------|----------|
| Login fails | "Invalid email or password" | Check caps lock, verify email address | 🔴 Critical |
| Session expires | Redirected to login unexpectedly | Log in again, session lasts 24 hours | 🟡 Medium |
| Workspace not found | "Not a workspace member" | Verify workspace exists, user has access | 🔴 Critical |
| Data not saving | Form submit succeeds but data missing | Check browser console for errors, refresh | 🟡 Medium |
| Report won't generate | PDF generation times out | Clear browser cache, try again | 🟠 High |
| RLS error in logs | "new row violates row-level security policy" | Contact support (likely permission issue) | 🟠 High |
| Slow response times | Pages take > 5 seconds to load | Check internet connection, clear cache | 🟡 Medium |
| Evidence upload fails | File upload error message | Try different file format, check file size | 🟡 Medium |

---

## AUTHENTICATION & LOGIN ISSUES

### Problem: "Invalid Email or Password"

**What's happening:** Login credentials not recognized

**Troubleshooting:**

1. **Check for typos in email:**
   - Verify email address is correct
   - Check for accidental spaces
   - Ensure @domain.com is correct

2. **Check for caps lock:**
   - Verify caps lock is OFF
   - Try password again carefully

3. **Verify account exists:**
   - Did you receive a welcome email?
   - If not, you may not have an account yet
   - Contact Governor to create account

4. **Reset password:**
   - Click "Forgot Password?" link
   - Check email for reset link
   - Create new password
   - Log in with new password

5. **If still failing:**
   - Open browser console (F12 → Console tab)
   - Try login again
   - Check for error messages
   - Email error message to Governor

**Error Example:**
```
POST /api/auth/login 401
{"error": "Invalid credentials"}
```

**Contact Support:** If error persists after reset

---

### Problem: Session Expires & Redirect to Login

**What's happening:** You're logged in, then suddenly redirected to login page

**Why it happens:**
- Session timeout (24-hour limit)
- Browser closed/refreshed
- Multiple logins in different tabs (last one wins)
- Network interruption during request

**How to prevent:**
- Log in fresh each morning
- Avoid logging in from multiple tabs
- Don't leave browser open for > 24 hours

**How to fix:**
- Log in again with your email and password
- Session lasts 24 hours from login time
- If using shared computer, log out when done

---

### Problem: "Session Cookie Not Set"

**What's happening:** Login succeeded but no cookie created

**Likely causes:**
- Browser's strict cookie settings
- Private/incognito mode blocking cookies
- Third-party cookie restrictions

**Solutions:**

1. **Enable cookies in browser:**
   - Chrome: Settings → Privacy → Cookies allowed
   - Firefox: Preferences → Privacy → Accept cookies
   - Safari: Preferences → Privacy → Allow all cookies

2. **Disable incognito/private mode:**
   - Open normal window instead
   - Private mode blocks persistent cookies

3. **Check third-party cookie settings:**
   - Some browsers block third-party cookies
   - This can prevent proper authentication
   - Whitelist euro-ai domain if possible

4. **Clear browser cache:**
   - Chrome: Ctrl+Shift+Delete → Clear all
   - Firefox: Ctrl+Shift+Delete → Clear all
   - Safari: Develop → Empty Web Storage

---

## WORKSPACE & DATA ACCESS ISSUES

### Problem: "Not a Workspace Member"

**What's happening:** You're logged in but can't access workspace

**Possible causes:**
- You weren't added to workspace as member
- Your access status is "inactive" or "removed"
- Wrong workspace selected

**Solutions:**

1. **Verify workspace exists:**
   - After login, check workspace list
   - Should show "Anne Catherine GmbH" or your workspace name
   - If workspace doesn't appear, contact Governor

2. **Verify access status:**
   - Check workspace settings → members
   - Your email should show "active" status
   - If status is "inactive" or "removed", contact Governor

3. **Switch workspaces if multiple exist:**
   - Some users might access multiple workspaces
   - Use workspace selector to switch
   - Verify you're in correct workspace

4. **Contact Governor:**
   - Provide email address
   - Provide workspace name
   - Governor will verify membership and restore access

---

### Problem: "Cannot Query Workspace Data"

**What's happening:** Page loads but no data appears (empty list)

**Possible causes:**
- Data not yet created (intentional)
- RLS policy blocking query (permission issue)
- Database temporarily unavailable
- Browser cache showing old empty state

**Solutions:**

1. **Verify data exists:**
   - Did you previously add AI systems / assessments?
   - If not, this is expected (start with inventory)
   - Create first system if list is empty

2. **Refresh browser:**
   - Press Ctrl+Shift+R (hard refresh)
   - Clears cache and refetches data
   - Retry after refresh

3. **Check browser console:**
   - Press F12 → Console tab
   - Look for error messages
   - Common: "401 Unauthorized" (session expired) or "403 Forbidden" (RLS policy)

4. **If "401 Unauthorized":**
   - Session has expired
   - Log in again
   - Retry data query

5. **If "403 Forbidden":**
   - RLS policy blocked the query
   - This shouldn't happen in normal use
   - Contact Governor with error details

---

## FORM SUBMISSION & DATA ENTRY ISSUES

### Problem: Form Doesn't Save / "Error Saving"

**What's happening:** You fill out form, click submit, but error appears

**Possible causes:**
- Missing required fields
- Invalid data format
- Server temporarily unavailable
- Network error during submission

**Solutions:**

1. **Check required fields:**
   - Look for fields marked with * (required)
   - Ensure all required fields have values
   - Red error messages might appear below field

2. **Verify data format:**
   - Email addresses: must include @
   - Numbers: only numbers, no letters
   - Dates: use correct format (YYYY-MM-DD)

3. **Check for network error:**
   - Look at network tab in browser console (F12 → Network)
   - Find the failed POST request
   - Check for red error or timeout

4. **Retry submission:**
   - Fix any validation errors
   - Ensure all required fields filled
   - Click submit again

5. **Contact Governor if persistent:**
   - Describe what you tried to save
   - Provide error message text
   - Governor will investigate

**Example Error:**
```
POST /api/workspace 400 Bad Request
{"error": "Validation failed", "field": "workspace_name", "reason": "Required field"}
```

---

### Problem: Duplicate Data Created

**What's happening:** You submit form once, but data appears twice

**Causes:**
- Double-click on submit button
- Network slow, you clicked submit twice
- Page appears frozen but request processing

**Prevention:**
- Click submit button once
- Wait for success message or redirect
- Don't click again if page seems slow

**If happens:**
- Contact Governor with which data duplicated
- Governor will remove duplicate
- Verify only one version remains

---

## COMPLIANCE FEATURES ISSUES

### Problem: Risk Assessment Form Disappears

**What's happening:** You click "Create Assessment", form appears, then disappears

**Likely cause:**
- Browser navigation (back button clicked accidentally)
- Session timeout during long assessment
- Tab closed accidentally

**Solution:**
- Navigate back to AI system
- Click "Create Assessment" again
- Assessment data should not have been saved if incomplete

**To prevent:**
- Don't use back button while filling form
- Complete assessment in one sitting (< 30 min typically)

---

### Problem: Cannot Finalize Assessment

**What's happening:** "Finalize" button is grayed out or shows error

**Possible causes:**
- Assessment in wrong status (already finalized)
- Required fields not completed
- Permission issue (not assessment owner)

**Solutions:**

1. **Check assessment status:**
   - Draft → can transition to in_review
   - In_review → can transition to finalized
   - Finalized → cannot change

2. **Verify all fields completed:**
   - Risk level selected?
   - Assessment data entered?
   - Any validation errors shown?

3. **Verify permissions:**
   - Are you the assessment owner?
   - Do you have "assessor" or "admin" role in workspace?
   - Contact Governor if permission issue

---

### Problem: Obligations Not Showing

**What's happening:** You go to Obligations section but list is empty

**Possible cause:**
- No AI systems have been assessed yet
- Obligations are generated from risk assessments
- This is expected until assessments created

**Solution:**
- Create at least one risk assessment
- After assessment is saved, obligations should appear
- Obligations are linked to workspace (not individual systems)

---

### Problem: Evidence Upload Fails

**What's happening:** Click "Upload File", select file, but upload fails

**Possible causes:**
- File too large (max 50MB)
- File format not supported
- Network interrupted
- Upload endpoint temporarily unavailable

**Supported file formats:**
- PDF (.pdf)
- Word (.docx, .doc)
- Excel (.xlsx, .xls)
- Text (.txt)
- Images (.jpg, .png)

**Solutions:**

1. **Check file size:**
   - Right-click file → Properties
   - If > 50MB, file is too large
   - Try splitting large documents

2. **Check file format:**
   - Is file one of supported types above?
   - If exported from Word, use .docx format
   - If exported from Excel, use .xlsx format

3. **Try different file:**
   - If PDF: export Word document to PDF first
   - If spreadsheet: save as .xlsx format
   - Retry upload with correct format

4. **Retry from different network:**
   - Network interference can cause upload failures
   - Try from different WiFi or cellular
   - Wired connection more reliable than WiFi

5. **Contact Governor:**
   - Provide file name
   - Provide file format
   - Provide error message if shown
   - Governor can investigate

---

### Problem: Compliance Report Generation Fails

**What's happening:** Click "Generate Report" but PDF doesn't download

**Possible causes:**
- Report generation timeout (server-side)
- Browser blocking popup/download
- Insufficient data (no assessments)
- Temporary server issue

**Solutions:**

1. **Verify prerequisites:**
   - At least one risk assessment finalized?
   - At least one evidence artifact uploaded?
   - Dashboard shows readiness > 0%?

2. **Try again:**
   - Wait 30 seconds
   - Click "Generate Report" again
   - PDF should download

3. **Check browser download settings:**
   - Chrome/Firefox: PDF downloads automatically
   - Safari: May open PDF in browser instead
   - Look for download notification

4. **Check browser console:**
   - F12 → Console tab
   - Look for timeout errors
   - Note error message

5. **Clear cache and retry:**
   - Ctrl+Shift+Delete → Clear all
   - Reload page
   - Try report generation again

6. **Contact Governor:**
   - If fails after 3 attempts
   - Provide error message if shown
   - Governor will generate report manually

---

## PERFORMANCE & BROWSER ISSUES

### Problem: Pages Load Slowly (> 5 seconds)

**What's happening:** Clicking links or buttons causes long delays

**Possible causes:**
- Slow internet connection
- Browser cache bloated
- Database query taking too long
- Too many browser tabs open

**Solutions:**

1. **Check internet speed:**
   - Visit speedtest.net
   - Should have > 5 Mbps download
   - If slower, contact ISP or use different network

2. **Clear browser cache:**
   - Chrome: Ctrl+Shift+Delete
   - Firefox: Ctrl+Shift+Delete
   - Safari: Develop → Empty Web Storage

3. **Close unnecessary tabs:**
   - Each tab uses memory
   - Close other websites
   - Retry EURO AI

4. **Restart browser:**
   - Close all tabs
   - Completely exit browser
   - Reopen and log back in

5. **Try different browser:**
   - If Chrome slow, try Firefox
   - Rules out browser-specific issue
   - Report if specific browser has issue

6. **Check mobile network:**
   - If on mobile, try WiFi
   - WiFi typically more stable
   - Report if mobile consistently slow

---

### Problem: "Browser Not Supported"

**What's happening:** Platform won't load or shows compatibility warning

**Supported browsers:**
- Chrome (version 120+)
- Firefox (version 120+)
- Safari (version 17+)
- Edge (version 120+)

**Solutions:**

1. **Update browser:**
   - Chrome: ⋮ → Help → About Chrome
   - Firefox: ☰ → Help → About Firefox
   - Safari: Apple menu → App Store (updates)

2. **Try different browser:**
   - If Chrome not working, use Firefox
   - Rules out browser-specific issue
   - Report if specific browser fails

3. **Clear browser cache:**
   - After update, clear cache (Ctrl+Shift+Delete)
   - Retry platform

---

### Problem: "Mixed Content" or "Insecure Connection" Error

**What's happening:** Browser shows warning about insecure content

**Possible causes:**
- Accessing platform via HTTP instead of HTTPS
- Firewall blocking secure connection
- VPN or proxy interfering

**Solutions:**

1. **Use HTTPS (secure) URL:**
   - URL should start with `https://`
   - Not `http://`
   - Check address bar

2. **Check VPN/Proxy:**
   - If using VPN, temporarily disable
   - If using corporate proxy, whitelist euro-ai.example.com
   - Retry

3. **Contact Governor:**
   - If still seeing warning
   - Provide exact error message
   - Governor will investigate

---

## WHEN TO CONTACT GOVERNOR

**Contact immediately if:**
- Cannot log in (session/credentials)
- Cannot access your workspace (permission issue)
- Data appears to be lost
- System error (500 Internal Server Error)
- Security concern (unauthorized access)

**Contact for support if:**
- General questions about compliance requirements
- How to use specific feature
- Evidence upload issues
- Report generation not working
- Performance concerns
- Feedback or feature requests

**Contact information:**
- Email: [support email]
- Response time: < 4 hours business hours
- After-hours: Emergency contact only

---

## DIAGNOSTIC INFORMATION TO PROVIDE

**When contacting Governor, include:**

1. **What you were trying to do:**
   - "Creating a risk assessment for Invoice Classifier"
   - Be specific about the step

2. **What happened:**
   - "Form submitted successfully but data didn't save"
   - Include error message text (copy-paste)

3. **When it happened:**
   - Date and time (2026-07-16 14:30 UTC)
   - Timezone if different

4. **Browser and OS:**
   - Chrome 122 on Windows 10
   - Safari on macOS 13
   - Important for troubleshooting

5. **Browser console error (if applicable):**
   - F12 → Console → Copy error messages
   - Paste into support message

6. **Network tab screenshot (if applicable):**
   - F12 → Network → Take screenshot
   - Shows failed requests

**Example support message:**
```
Subject: Report generation timing out

Hi Governor,

I'm trying to generate a compliance report for Anne Catherine GmbH workspace.
When I click "Generate Report" button, the page shows loading spinner for 30 seconds
then shows this error:

"POST /api/reports/dashboard 504 Gateway Timeout"

This happened today at 14:30 CEST on my laptop (Chrome 122, Windows 10, home internet).

Can you help?

—Anne Catherine
```

---

## KNOWN LIMITATIONS

**These are expected behaviors, not bugs:**

1. **Assessments cannot be edited after finalization**
   - By design (audit trail protection)
   - To change: create new assessment version

2. **Evidence cannot be deleted**
   - By design (compliance audit trail)
   - To replace: mark old as rejected, upload new

3. **Workspace name cannot be changed**
   - By design (data stability)
   - Workaround: create new workspace if needed

4. **Users cannot be removed completely**
   - Status changes to "inactive" instead
   - Preserves audit history

5. **Reports always include all systems**
   - Cannot generate report for single system
   - By design (complete compliance picture)

---

## FREQUENTLY ASKED QUESTIONS

**Q: How long does session last?**
A: 24 hours from login. After that, you'll need to log in again.

**Q: Can I export my data?**
A: Yes, compliance report is downloadable PDF. Contact Governor for other export formats.

**Q: What happens to my data if I close my account?**
A: Data is retained for 90 days for compliance/audit purposes, then deleted.

**Q: Can multiple people edit the same assessment?**
A: Currently one person at a time. Feature for collaborative editing coming soon.

**Q: How often is data backed up?**
A: Continuous (managed by Supabase infrastructure). Latest version always available.

**Q: What if I find a security issue?**
A: Email Governor immediately with details. Don't post publicly.

---

## STILL NEED HELP?

**Document the issue:**
1. Note exact steps to reproduce
2. Include error messages
3. Provide screenshots if helpful
4. Share browser console errors

**Contact Governor:**
- Email with detailed description above
- Response within 4 business hours
- Governor will investigate and resolve

---

**Guide Version:** 1.0  
**Last Updated:** 2026-07-16  
**For Customers:** Anne Catherine and beyond  
**Maintained By:** Governor Ω
