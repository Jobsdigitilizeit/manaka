import jsPDF from 'jspdf';
import { UserProfile, LaborMarketAnalytics, JobMatchResult } from '../types';
import { downloadSkillsGapPDF } from './reportPdf';

/** Kept for existing callers; the report itself now lives in reportPdf.ts and uses live data only. */
export function generateSkillsGapReportPDF(analytics: LaborMarketAnalytics, _topGaps?: unknown, _topDemanded?: unknown) {
  downloadSkillsGapPDF(analytics);
}

export function generateCandidateProfilePDF(user: UserProfile, topMatches: JobMatchResult[]) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header Banner
  doc.setFillColor(30, 41, 59);
  doc.rect(0, 0, pageWidth, 42, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(user.name.toUpperCase(), 14, 18);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225);
  doc.text(user.headline, 14, 26);
  doc.text(`Location: ${user.city}, ${user.province} | NQF Level: ${user.nqfLevel} | Exp: ${user.totalExperienceYears} Years`, 14, 34);

  // Skills Summary Box
  let y = 52;
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Verified Technical & Professional Competencies', 14, y);

  y += 8;
  const skillsText = user.skills.map(s => `${s.name} (${s.proficiency}${s.verifiedByQuiz ? ' - Verified' : ''})`).join('  •  ');
  const splitSkills = doc.splitTextToSize(skillsText, pageWidth - 28);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  doc.text(splitSkills, 14, y);

  y += (splitSkills.length * 5) + 10;

  // Education & Experience
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('Qualifications & Career History', 14, y);

  y += 8;
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.text('Education:', 14, y);
  doc.setFont('helvetica', 'normal');
  user.education.forEach(edu => {
    y += 5;
    doc.text(`• ${edu.degree} - ${edu.institution} (NQF Level ${edu.nqfLevel}, ${edu.yearCompleted})`, 18, y);
  });

  y += 8;
  doc.setFont('helvetica', 'bold');
  doc.text('Experience Summary:', 14, y);
  doc.setFont('helvetica', 'normal');
  user.experience.forEach(exp => {
    y += 5;
    doc.text(`• ${exp.role} at ${exp.company} (${exp.durationYears} yrs)`, 18, y);
  });

  // Top AI Job Matches
  y += 14;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('AI Compatibility & Job Recommendations', 14, y);

  y += 8;
  topMatches.slice(0, 3).forEach((item, idx) => {
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(14, y, pageWidth - 28, 28, 2, 2, 'FD');

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(`${idx + 1}. ${item.job.title} - ${item.job.company} (${item.job.city})`, 18, y + 7);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(37, 99, 235);
    doc.text(`Match Score: ${item.analysis.matchPercentage}% [${item.analysis.suitabilityVerdict}]`, pageWidth - 80, y + 7);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(`Matched Skills: ${item.analysis.matchedSkills.join(', ') || 'None'}`, 18, y + 14);
    doc.text(`Critical Skill Gaps: ${item.analysis.missingSkills.join(', ') || 'None detected - Full alignment'}`, 18, y + 20);
    doc.text(`Why Matched: ${item.analysis.whyRecommended.slice(0, 110)}...`, 18, y + 25);

    y += 32;
  });

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(`Skillix Candidate Profile & Match Dossier | User ID: ${user.id} | Generated ${new Date().toLocaleString('en-ZA')}`, 14, 285);

  doc.save(`Skillix_Candidate_${user.name.replace(/\s+/g, '_')}_Profile.pdf`);
}
