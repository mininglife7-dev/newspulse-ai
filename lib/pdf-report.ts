import jsPDF from 'jspdf';

interface WorkspaceReport {
  workspaceName: string;
  generatedDate: string;
  systems: Array<{
    name: string;
    type?: string;
    vendor?: string;
    status: string;
  }>;
  assessments: Array<{
    systemName: string;
    riskLevel: string;
    riskScore: number;
    completedDate: string;
  }>;
  obligations: Array<{
    title: string;
    description: string;
    priority: string;
    status: string;
    dueDate?: string;
  }>;
  obligationStats: {
    total: number;
    completed: number;
    inProgress: number;
    critical: number;
    criticalCompleted: number;
  };
  summary: {
    completePercent: number;
    systemsAssessed: number;
    totalSystems: number;
  };
}

const COLORS = {
  primary: [41, 128, 185] as [number, number, number],
  success: [46, 204, 113] as [number, number, number],
  warning: [241, 196, 15] as [number, number, number],
  danger: [231, 76, 60] as [number, number, number],
  dark: [52, 73, 94] as [number, number, number],
  light: [236, 240, 241] as [number, number, number],
};

const RISK_COLORS: Record<string, [number, number, number]> = {
  low: [46, 204, 113],
  medium: [241, 196, 15],
  high: [230, 126, 34],
  unacceptable: [231, 76, 60],
};

export async function generateComplianceReport(data: WorkspaceReport): Promise<jsPDF> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - 2 * margin;
  let yPosition = margin;

  // Helper functions
  const addTitle = (text: string) => {
    doc.setFontSize(20);
    doc.setTextColor(...COLORS.dark);
    doc.text(text, margin, yPosition);
    yPosition += 12;
  };

  const addSectionTitle = (text: string) => {
    if (yPosition + 10 > pageHeight - margin) {
      doc.addPage();
      yPosition = margin;
    }
    doc.setFontSize(14);
    doc.setTextColor(...COLORS.primary);
    doc.text(text, margin, yPosition);
    yPosition += 8;
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 4;
  };

  const addText = (text: string, fontSize = 10, color: [number, number, number] = [0, 0, 0]) => {
    if (yPosition + 6 > pageHeight - margin) {
      doc.addPage();
      yPosition = margin;
    }
    doc.setFontSize(fontSize);
    doc.setTextColor(...color);
    const wrapped = doc.splitTextToSize(text, contentWidth - 2);
    doc.text(wrapped, margin + 1, yPosition);
    yPosition += wrapped.length * fontSize * 0.35 + 2;
  };

  const addStatBox = (label: string, value: string | number, color: [number, number, number]) => {
    if (yPosition + 15 > pageHeight - margin) {
      doc.addPage();
      yPosition = margin;
    }
    doc.setDrawColor(...color);
    doc.setFillColor(...color);
    doc.rect(margin, yPosition, contentWidth / 2 - 2, 12, 'FD');

    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text(label, margin + 2, yPosition + 4);

    doc.setFontSize(11);
    doc.setFont('', 'bold');
    doc.text(String(value), margin + 2, yPosition + 9);
    doc.setFont('', 'normal');

    return { x: margin + contentWidth / 2, y: yPosition };
  };

  // Title Page
  addTitle('🔒 AI Compliance Report');
  yPosition += 4;

  doc.setFontSize(11);
  doc.setTextColor(...COLORS.dark);
  doc.text(`Organization: ${data.workspaceName}`, margin, yPosition);
  yPosition += 6;
  doc.text(`Generated: ${data.generatedDate}`, margin, yPosition);
  yPosition += 6;
  doc.text(`EU AI Act Compliance Assessment`, margin, yPosition);
  yPosition += 12;

  // Executive Summary
  addSectionTitle('Executive Summary');

  const completionPercent = data.summary.completePercent;
  const statusColor =
    completionPercent === 100 ? COLORS.success : completionPercent >= 75 ? COLORS.warning : COLORS.danger;

  addText(
    `${data.summary.systemsAssessed} of ${data.summary.totalSystems} AI systems have been assessed for EU AI Act compliance.`
  );
  yPosition += 2;

  addText(`Overall compliance progress: ${completionPercent}%`, 11, statusColor);
  yPosition += 4;

  // Stats grid
  const boxes = [
    { label: 'Total Systems', value: data.summary.totalSystems, color: COLORS.primary },
    { label: 'Assessed', value: data.summary.systemsAssessed, color: COLORS.success },
    { label: 'Obligations', value: data.obligationStats.total, color: COLORS.primary },
    { label: 'Completed', value: data.obligationStats.completed, color: COLORS.success },
  ];

  let boxX = margin;
  let boxY = yPosition;
  let boxesPerRow = 2;
  boxes.forEach((box, idx) => {
    if (idx > 0 && idx % boxesPerRow === 0) {
      boxY += 16;
      boxX = margin;
    } else if (idx > 0) {
      boxX += contentWidth / 2;
    }

    doc.setDrawColor(...box.color);
    doc.setFillColor(...box.color);
    doc.rect(boxX, boxY, contentWidth / 2 - 2, 14, 'FD');

    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text(box.label, boxX + 2, boxY + 4);

    doc.setFontSize(12);
    doc.setFont('', 'bold');
    doc.text(String(box.value), boxX + 2, boxY + 10);
    doc.setFont('', 'normal');
  });

  yPosition = boxY + 18;

  // AI Systems Assessment
  if (data.assessments.length > 0) {
    addSectionTitle('AI Systems Assessment');

    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text('System', margin, yPosition + 6);
    doc.text('Risk Level', margin + 50, yPosition + 6);
    doc.text('Score', margin + 90, yPosition + 6);
    doc.text('Assessed Date', margin + 130, yPosition + 6);
    yPosition += 12;

    data.assessments.forEach((assessment) => {
      if (yPosition + 8 > pageHeight - margin) {
        doc.addPage();
        yPosition = margin;
      }

      const riskColor = RISK_COLORS[assessment.riskLevel.toLowerCase()] || COLORS.dark;

      doc.setFontSize(9);
      doc.setTextColor(0, 0, 0);
      doc.text(assessment.systemName.substring(0, 20), margin, yPosition);

      doc.setTextColor(...riskColor);
      doc.setFont('', 'bold');
      doc.text(assessment.riskLevel.toUpperCase(), margin + 50, yPosition);
      doc.setFont('', 'normal');

      doc.setTextColor(0, 0, 0);
      doc.text(String(assessment.riskScore), margin + 90, yPosition);
      doc.text(new Date(assessment.completedDate).toLocaleDateString(), margin + 130, yPosition);

      yPosition += 7;
    });

    yPosition += 4;
  }

  // Compliance Obligations
  if (data.obligations.length > 0) {
    addSectionTitle('Compliance Obligations');

    const progressPercent = data.obligationStats.total > 0
      ? Math.round((data.obligationStats.completed / data.obligationStats.total) * 100)
      : 0;

    addText(`${data.obligationStats.completed} of ${data.obligationStats.total} obligations completed (${progressPercent}%)`);

    if (data.obligationStats.critical > 0) {
      const criticalStatus = `${data.obligationStats.criticalCompleted} of ${data.obligationStats.critical} critical obligations completed`;
      addText(criticalStatus, 10, COLORS.danger);
    }

    yPosition += 4;

    // Group obligations by priority
    const byPriority = {
      critical: data.obligations.filter((o) => o.priority === 'critical'),
      high: data.obligations.filter((o) => o.priority === 'high'),
      medium: data.obligations.filter((o) => o.priority === 'medium'),
      low: data.obligations.filter((o) => o.priority === 'low'),
    };

    Object.entries(byPriority).forEach(([priority, obligations]) => {
      if (obligations.length === 0) return;

      if (yPosition + 12 > pageHeight - margin) {
        doc.addPage();
        yPosition = margin;
      }

      doc.setFontSize(10);
      doc.setTextColor(...COLORS.dark);
      doc.setFont('', 'bold');
      doc.text(`${priority.charAt(0).toUpperCase() + priority.slice(1)} Priority (${obligations.length})`, margin, yPosition);
      doc.setFont('', 'normal');
      yPosition += 6;

      obligations.slice(0, 3).forEach((obligation) => {
        if (yPosition + 10 > pageHeight - margin) {
          doc.addPage();
          yPosition = margin;
        }

        doc.setFontSize(9);
        doc.setTextColor(0, 0, 0);
        const statusIndicator = obligation.status === 'completed' ? '✓' : '○';
        doc.text(`${statusIndicator} ${obligation.title}`, margin + 2, yPosition);
        yPosition += 4;

        const desc = doc.splitTextToSize(obligation.description, contentWidth - 4);
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text(desc, margin + 4, yPosition);
        yPosition += desc.length * 3 + 2;
      });

      if (obligations.length > 3) {
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text(`... and ${obligations.length - 3} more`, margin + 2, yPosition);
        yPosition += 4;
      }

      yPosition += 2;
    });
  }

  // Footer
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin - 15, pageHeight - 10);
    doc.text('Confidential - EU AI Act Compliance', margin, pageHeight - 10);
  }

  return doc;
}
