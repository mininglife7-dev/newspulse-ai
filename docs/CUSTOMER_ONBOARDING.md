# Customer Onboarding Guide

**Version:** 1.0  
**Audience:** New customers signing up for EURO AI  
**Purpose:** Step-by-step guide to set up workspace and start tracking AI systems  

---

## Welcome to EURO AI

EURO AI is an AI governance platform designed to help organizations manage compliance with the EU AI Act. This guide walks you through setting up your workspace and registering your first AI system.

**Estimated time to complete:** 15 minutes

---

## Prerequisites

- Valid email address
- Company information (name, country, industry)
- (Optional) List of AI systems you want to track

---

## Step 1: Create Your Account

### Sign Up

1. Go to https://newspulse-ai.vercel.app
2. Click **"Sign Up"**
3. Enter your email address
4. Create a strong password (8+ characters, mix of letters, numbers, symbols)
5. Click **"Create Account"**

### Verify Your Email

1. Check your email inbox for verification message
2. Click the verification link
3. Your account is now active

**Troubleshooting:**
- **Email not received?** Check spam folder or wait 2 minutes
- **Verification link expired?** Request a new verification email on the login page

---

## Step 2: Create Your Workspace

Your workspace represents your organization within EURO AI. Each workspace is isolated and secure — your data is completely separated from other organizations.

### Workspace Setup

1. After email verification, you'll be prompted to create a workspace
2. Fill in the following required fields:

   | Field | Format | Example |
   |-------|--------|---------|
   | **Company Name** | 1-100 characters | "Acme Corporation" |
   | **Country** | ISO country code or name | "DE" or "Germany" |
   | **Industry** | Your industry sector | "Technology" |

3. (Optional) Add additional details:
   - **Legal Name** — Your official registered name (max 150 chars)
   - **Employees** — Approximate headcount (e.g., "50-100", "500+")
   - **Website** — Your company website (must be valid URL)
   - **Description** — Describe your organization's AI governance needs

4. Click **"Create Workspace"**

### What Happens Next

- Your workspace is created and activated
- You're automatically added as workspace owner
- You can now invite team members (feature coming soon)
- You can start registering AI systems

**Important:** You can only create one workspace per account. If you need multiple workspaces, create additional accounts.

---

## Step 3: Register Your First AI System

An "AI System" in EURO AI is any AI-powered tool or model your organization uses. This includes:
- Large language models (GPT-4, Claude, Llama)
- Machine learning systems (recommendation engines, classifiers)
- Computer vision systems
- Biometric systems
- Any other AI technology in production or pilot

### Add an AI System

1. From your dashboard, click **"Register AI System"** or **"+ Add System"**
2. Fill in the required field:

   | Field | Requirements | Example |
   |-------|--------------|---------|
   | **System Name** | 1-150 characters, unique within workspace | "ChatGPT Integration for Support" |

3. (Optional) Add additional details:

   | Field | Options | Example |
   |-------|---------|---------|
   | **Description** | Max 500 characters | "GPT-4 powering our customer support chatbot" |
   | **System Type** | Choose one: | "large_language_model" |
   | | - Large Language Model | |
   | | - Generative AI | |
   | | - Classification System | |
   | | - Recommendation System | |
   | | - Computer Vision | |
   | | - Biometric System | |
   | | - Decision Support | |
   | | - Other | |
   | **Vendor** | Max 100 characters | "OpenAI" |
   | **Purpose** | Max 300 characters | "Automated customer support, reduced response time" |
   | **Status** | Choose one: | "active" |
   | | - Active (in production) | |
   | | - Pilot (testing phase) | |
   | | - Deprecated (no longer used) | |

4. Click **"Save System"**

### System Examples

#### Example 1: Large Language Model (Production)
```
Name: ChatGPT Integration for Support
Description: GPT-4 powering our customer support chatbot, handling 10K+ queries daily
System Type: Large Language Model
Vendor: OpenAI
Purpose: Reduce support team workload, faster customer response
Status: Active
```

#### Example 2: Recommendation Engine (Pilot)
```
Name: Product Recommendation ML Model v2
Description: Testing new recommendation algorithm with 5% of user traffic
System Type: Recommendation System
Vendor: Internal Development
Purpose: Personalized product recommendations to increase conversion
Status: Pilot
```

#### Example 3: Image Classification (Deprecated)
```
Name: Legacy Image Recognition (AWS Rekognition)
Description: AWS Rekognition for content moderation - replaced by internal system
System Type: Computer Vision
Vendor: Amazon Web Services
Purpose: Content moderation (no longer used)
Status: Deprecated
```

---

## Step 4: Review Your Dashboard

Your dashboard shows:

### Launch Readiness
- Completion percentage for EU AI Act compliance
- Suggested next steps for your organization

### Mission Progress
- Phases completed toward full governance implementation
- Current phase and remaining work

### System Health
- Overall system status
- Any alerts or issues requiring attention

### Your AI Systems
- Count of registered AI systems by status
- Quick access to add or edit systems

---

## Common Tasks

### Edit an AI System

1. From dashboard, click on the system name
2. Update any fields
3. Click **"Save Changes"**

### Delete an AI System

1. From dashboard, click on the system name
2. Click **"Delete System"** (confirm deletion)
3. System is permanently removed

**Note:** Deletion is immediate and cannot be undone. Export system details first if needed.

### View System Details

1. From dashboard, click on the system name
2. See full details including creation date and last updated
3. Review all metadata entered during registration

### Invite Team Members

*Coming soon:* Invite colleagues to collaborate on governance tasks.

---

## Data & Privacy

### Your Data is Secure
- All data encrypted in transit (HTTPS)
- Encrypted at rest in Supabase database
- Row-level security ensures workspace isolation
- No data shared between organizations
- SOC 2 compliance standards followed

### Your Data is Private
- Only you and your invited team members see your workspace data
- We don't sell or share your data
- You can request data export or deletion anytime
- Contact: mininglife7@gmail.com

---

## Getting Help

### Common Issues

**Q: Can't log in?**
- Verify you're using the correct email address
- Click "Forgot Password" to reset
- Check that caps lock is off

**Q: Workspace creation failed?**
- Company name must be 1-100 characters
- Country field is required
- Industry field is required
- Try removing special characters from company name

**Q: What's the difference between System Type options?**

| Type | Examples | Applies To |
|------|----------|-----------|
| Large Language Model | ChatGPT, Claude, Llama, Gemini | Text-based AI models |
| Generative AI | DALL-E, Midjourney, Stable Diffusion | Image/media generation |
| Classification System | Spam detection, fraud detection, sentiment analysis | Categorizing inputs |
| Recommendation System | Product recommendations, content feeds | Personalized suggestions |
| Computer Vision | Image recognition, object detection, facial recognition | Visual analysis |
| Biometric System | Facial recognition, fingerprint scanning | Identity verification |
| Decision Support | Loan approval, hiring tools, medical diagnosis aids | Business decisions |
| Other | Custom systems not fitting above | Unique use cases |

**Q: Can I have multiple workspaces?**
- No, one workspace per account
- Create additional accounts for separate organizations
- Contact support if you need special arrangements

**Q: How do I export my data?**
- Export feature coming soon
- Current: Screenshot dashboard or manual notes
- Contact: mininglife7@gmail.com for data export

### Contact Support

**Email:** mininglife7@gmail.com  
**Response Time:** 24 hours  
**Hours:** Monday-Friday, 9 AM - 5 PM CET  

**When contacting support, include:**
- Your email address
- Workspace name
- What you were trying to do
- Error message (if any)
- Steps you took before encountering issue

---

## Next Steps After Onboarding

### Immediate (Week 1)
1. ✅ Create workspace
2. ✅ Register your main AI systems
3. ✅ Review dashboard for compliance gaps
4. ⏳ Identify additional AI systems to register

### Short Term (Week 2-4)
- Invite team members to collaborate
- Review EU AI Act assessment
- Start documenting risk analyses
- Plan mitigation strategies

### Long Term (Month 2+)
- Establish governance processes
- Create AI system inventory
- Implement compliance controls
- Monitor and update systems regularly

---

## Best Practices

### Naming Conventions
- Use descriptive names: "GPT-4 Customer Support" not "ChatBot1"
- Include version if tracking multiple versions: "Recommendation Engine v2.3"
- Include vendor for clarity: "AWS Rekognition Image Analysis"

### Keeping Systems Current
- Update system details when status changes (Active → Deprecated)
- Add new systems as soon as they're deployed
- Review existing systems quarterly

### Compliance Tracking
- Use the Description field to explain business value and use cases
- Categorize systems correctly by type for accurate risk assessment
- Document any compliance-related concerns or mitigations

---

## FAQ

**Q: What happens if I close my account?**
A: Your workspace and all AI system records are deleted after 30 days. You can request immediate deletion.

**Q: Can I change my email address?**
A: Yes, email change feature available in account settings. Current: contact support.

**Q: Is there a limit to how many AI systems I can register?**
A: No limits. Register as many systems as you use.

**Q: Do I need technical knowledge to use EURO AI?**
A: No. Product is designed for non-technical users. Basic understanding of your organization's AI systems is helpful.

**Q: What does "Row-Level Security" mean?**
A: It means database-level enforcement of data isolation. Even if someone gained database access, they couldn't see other organizations' data.

**Q: Is there an API?**
A: API coming soon. Current: web UI only.

**Q: Can I export historical data?**
A: Export feature coming in next release. Contact support for current needs.

---

## Success Checklist

Before considering onboarding complete, verify:

- ✅ Account created and email verified
- ✅ Workspace created with company details
- ✅ At least one AI system registered
- ✅ Dashboard accessible and displaying data
- ✅ Understand system status indicators
- ✅ Know how to add new systems
- ✅ Know how to contact support

---

## What's Next?

After completing onboarding:

1. **Review Your Workspace** — Familiarize yourself with the dashboard layout and available features
2. **Register Remaining Systems** — Add all AI systems your organization uses
3. **Document Business Cases** — Use descriptions to explain each system's purpose and value
4. **Plan Governance** — Use EURO AI's compliance assessment to identify gaps and priorities
5. **Invite Team** — Add colleagues to collaborate once team features are available

---

**Questions?** Email mininglife7@gmail.com  
**Feedback?** We'd love to hear how we can improve  
**Last Updated:** 2026-07-11

