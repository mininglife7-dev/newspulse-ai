# EU AI Act Compliance Journey Guide

This guide walks customers through the complete compliance assessment and management workflow for EU AI Act requirements.

## Overview

The NewsPulse AI Compliance Platform enables organizations to:
1. **Assess** AI systems for EU AI Act compliance risk
2. **Track** compliance obligations and their status
3. **Submit** evidence documentation for audit
4. **Analyze** compliance gaps and gaps
5. **Plan** remediation actions
6. **Export** audit packages for regulatory reporting

## Phase 1: Initial Setup

### Create AI Systems

First, register all AI systems that will be assessed for compliance.

**API Endpoint:** `POST /api/ai-systems`

**Request:**
```json
{
  "workspace_id": "ws-123",
  "name": "Customer Recommendation Engine",
  "description": "ML model for personalized product recommendations",
  "use_case": "automated_decision_making",
  "integration_points": "Customer-facing product suggestions"
}
```

**Response:**
```json
{
  "ok": true,
  "system": {
    "id": "sys-456",
    "name": "Customer Recommendation Engine",
    "created_at": "2026-07-12T12:00:00Z"
  }
}
```

### Run Risk Assessment

For each AI system, perform a risk assessment to determine EU AI Act compliance requirements.

**API Endpoint:** `POST /api/risk-assessment`

**Request:**
```json
{
  "company_id": "co-123",
  "ai_system_id": "sys-456",
  "use_case_name": "Personalized Recommendations",
  "use_case_description": "ML model recommends products based on customer behavior",
  "mitigation_measures": [
    "Human review of high-impact recommendations",
    "Explainability dashboard for end users",
    "Audit logging of all recommendations"
  ]
}
```

**Response:**
```json
{
  "ok": true,
  "assessment": {
    "id": "ra-789",
    "ai_system_id": "sys-456",
    "risk_level": "high",
    "risk_score": 72,
    "recommendations": [
      "Implement human oversight mechanisms",
      "Document training data and model performance",
      "Establish monitoring for bias and drift"
    ]
  }
}
```

## Phase 2: Obligation Management

### Identify Obligations

Based on risk assessment results, the system identifies applicable EU AI Act obligations. These are automatically created and pre-populated based on risk level.

**View Obligations:** `GET /api/obligations?company_id=co-123`

**Response:**
```json
{
  "ok": true,
  "obligations": [
    {
      "id": "obl-001",
      "title": "Document AI System Model Card",
      "source": "EU AI Act Article 13",
      "priority": "critical",
      "status": "identified",
      "due_date": "2026-12-31",
      "description": "Create and maintain a model card documenting training data, performance metrics, and limitations"
    },
    {
      "id": "obl-002",
      "title": "Implement Human Oversight Process",
      "source": "EU AI Act Article 14",
      "priority": "high",
      "status": "identified",
      "due_date": "2026-12-31"
    }
  ],
  "count": 2
}
```

### Track Obligation Progress

Update obligation status as your organization works through compliance requirements.

**Update Obligation:** `PATCH /api/obligations/{id}`

**Request:**
```json
{
  "status": "in_progress",
  "priority": "critical",
  "title": "Document AI System Model Card (In Progress)"
}
```

**Status Transitions:**
- `identified` → Work has not started
- `in_progress` → Work has begun
- `completed` → All requirements met
- `not_applicable` → Requirement doesn't apply to this system

## Phase 3: Evidence Submission

### Submit Documentation

Upload evidence documents that demonstrate compliance with each obligation.

**Upload Evidence:** `POST /api/evidence`

**Request:**
```json
{
  "company_id": "co-123",
  "obligation_id": "obl-001",
  "title": "AI System Model Card - Customer Recommendation Engine",
  "file_type": "pdf",
  "file_size": 245000,
  "description": "Complete model card documenting training approach, performance metrics, and known limitations"
}
```

**Response:**
```json
{
  "ok": true,
  "evidence": {
    "id": "ev-111",
    "obligation_id": "obl-001",
    "title": "AI System Model Card",
    "file_type": "pdf",
    "status": "submitted",
    "created_at": "2026-07-12T13:00:00Z"
  }
}
```

### Track Evidence Workflow

Evidence progresses through approval workflow:
- `submitted` → Initial submission
- `under_review` → Being reviewed by compliance team
- `approved` → Meets compliance requirements
- `rejected` → Needs revision (resubmit with updates)

**Update Evidence Status:** `PATCH /api/evidence/{id}`

```json
{
  "status": "approved"
}
```

## Phase 4: Gap Analysis

### Analyze Compliance Status

Get detailed gap analysis and compliance metrics.

**Fetch Gap Analysis:** `GET /api/gap-analysis?company_id=co-123`

**Response:**
```json
{
  "ok": true,
  "metrics": {
    "totalObligations": 8,
    "completedObligations": 3,
    "inProgressObligations": 4,
    "identifiedObligations": 1,
    "compliancePercentage": 37,
    "urgentObligations": 2,
    "overallStatus": "partial"
  },
  "complianceScore": 52,
  "gaps": [
    {
      "obligationId": "obl-002",
      "obligationTitle": "Implement Human Oversight Process",
      "priority": "critical",
      "gapDescription": "No evidence of human oversight workflow implementation",
      "requiredEvidence": [
        "Process documentation for human override mechanisms",
        "Training materials for oversight personnel",
        "Audit logs demonstrating human oversight in action"
      ],
      "recommendedActions": [
        "Design human oversight workflow",
        "Document the oversight process",
        "Train team members on their role"
      ]
    }
  ],
  "recommendations": [
    "Address 2 critical compliance gaps immediately",
    "1 critical obligation requires urgent attention",
    "Compliance score is low - develop remediation plan"
  ]
}
```

**Compliance Score Breakdown:**
- 40% - Obligation completion rate
- 30% - Evidence quality and approval rate
- 20% - Gap management (fewer/resolved gaps = higher score)
- 10% - Urgency management (fewer overdue items = higher score)

## Phase 5: Remediation Planning

### Create Remediation Plans

For identified gaps, create formal remediation plans with tracked actions.

**Create Plan:** `POST /api/remediation-plans`

**Request:**
```json
{
  "company_id": "co-123",
  "obligation_id": "obl-002",
  "title": "Implement Human Oversight for Recommendations",
  "description": "Design and implement human review workflow for high-impact recommendations",
  "priority": "critical",
  "target_completion_date": "2026-09-30"
}
```

**Response:**
```json
{
  "ok": true,
  "plan": {
    "id": "rp-333",
    "obligation_id": "obl-002",
    "title": "Implement Human Oversight for Recommendations",
    "status": "active",
    "priority": "critical",
    "actionProgress": {
      "completed": 0,
      "total": 0,
      "percentage": 0
    }
  }
}
```

### Track Remediation Actions

Add and track specific actions within each remediation plan.

**Create Action:** `POST /api/remediation-actions`

**Request:**
```json
{
  "remediation_plan_id": "rp-333",
  "title": "Design human oversight workflow",
  "due_date": "2026-08-15"
}
```

**Update Action Status:** `PATCH /api/remediation-actions/{id}`

```json
{
  "status": "completed"
}
```

### View Plan Progress

**Fetch Plan Details:** `GET /api/remediation-plans/{id}`

**Response:**
```json
{
  "ok": true,
  "plan": {
    "id": "rp-333",
    "title": "Implement Human Oversight for Recommendations",
    "status": "active",
    "actionProgress": {
      "completed": 2,
      "total": 5,
      "percentage": 40
    },
    "actions": [
      {
        "id": "ra-444",
        "title": "Design human oversight workflow",
        "status": "completed",
        "due_date": "2026-08-15"
      }
    ]
  }
}
```

## Phase 6: Audit Package Export

### Generate Compliance Report

Export a comprehensive audit package for regulatory submission.

**Create Audit Package:** `POST /api/audit-package`

**Request:**
```json
{
  "company_id": "co-123",
  "format": "json",
  "includeEvidence": true,
  "includeObligations": true,
  "includeTechnicalDetails": false
}
```

**Response:**
```json
{
  "ok": true,
  "format": "json",
  "companyId": "co-123",
  "companyName": "Acme Corp",
  "generatedAt": "2026-07-12T14:00:00Z",
  "content": {
    "summary": {
      "complianceScore": 52,
      "overallStatus": "partial",
      "totalObligations": 8,
      "completedObligations": 3,
      "evidenceSubmitted": 5,
      "evidenceApproved": 3
    },
    "executiveSummary": "Acme Corp is partially compliant with EU AI Act requirements...",
    "obligations": [
      {
        "id": "obl-001",
        "title": "Document AI System Model Card",
        "status": "completed",
        "evidence": [...]
      }
    ],
    "gaps": [...],
    "recommendations": [...]
  },
  "metadata": {
    "pageCount": 12,
    "sectionCount": 8,
    "evidenceCount": 5,
    "generationTime": "2026-07-12T14:00:00Z"
  }
}
```

## Complete Customer Journey

### Dashboard Access

Access the Compliance Dashboard to view all compliance activities in one place:

```
GET /dashboard/compliance/{company_id}
```

The dashboard shows:
- **Compliance Score** (0-100) with visual progress indicator
- **Obligation Status** breakdown (completed, in-progress, identified)
- **Compliance Gaps** with severity indicators
- **Remediation Plans** with action progress tracking
- **Key Metrics** summary
- **Export Audit Package** button for regulatory submission

### Key Workflows

**Workflow 1: New System Assessment**
1. Register AI system → Run risk assessment
2. Review identified obligations
3. Assign team members to obligations
4. Submit evidence for each obligation
5. Monitor gap analysis metrics

**Workflow 2: Gap Remediation**
1. Review critical gaps in dashboard
2. Create remediation plan
3. Add specific actions with due dates
4. Track progress on actions
5. Submit revised evidence when complete
6. Rerun gap analysis to verify closure

**Workflow 3: Regulatory Reporting**
1. Ensure all obligations marked complete/not_applicable
2. Verify evidence is approved
3. Generate audit package
4. Download JSON or prepare for PDF export
5. Submit to regulatory authority

## API Reference Summary

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/obligations` | GET/POST | List/create obligations |
| `/api/obligations/{id}` | GET/PATCH/DELETE | Manage individual obligation |
| `/api/evidence` | GET/POST | List/submit evidence |
| `/api/evidence/{id}` | GET/PATCH/DELETE | Manage evidence |
| `/api/gap-analysis` | GET | Analyze compliance gaps |
| `/api/remediation-plans` | GET/POST | List/create remediation plans |
| `/api/remediation-plans/{id}` | GET/PATCH/DELETE | Manage remediation plan |
| `/api/remediation-actions` | GET/POST | List/create actions |
| `/api/remediation-actions/{id}` | GET/PATCH/DELETE | Manage action status |
| `/api/audit-package` | GET/POST | Generate/list audit packages |

## Success Criteria

Your organization has completed the compliance journey when:

✅ All identified obligations have been addressed (completed or marked not_applicable)
✅ Evidence is submitted and approved for each obligation
✅ Compliance Score reaches 80+ (indicating strong compliance)
✅ No critical gaps remain identified
✅ Audit package can be generated and exported
✅ Remediation plans are tracked and progressing

## Support

For API questions, check the [API Documentation](./api-docs.md).

For technical issues, review the [Troubleshooting Guide](./troubleshooting.md).
