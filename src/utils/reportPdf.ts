import jsPDF from 'jspdf';
import type { LaborMarketAnalytics } from '../types';
import type { ReportEnvelope, ReportType, LabelCount } from '../services/api';

type RGB = [number, number, number];

const COLOR = {
  ink: [15, 23, 42] as RGB,
  text: [51, 65, 85] as RGB,
  muted: [100, 116, 139] as RGB,
  line: [226, 232, 240] as RGB,
  zebra: [248, 250, 252] as RGB,
  head: [241, 245, 249] as RGB,
  accent: [245, 158, 11] as RGB,
  good: [5, 150, 105] as RGB,
  bad: [190, 18, 60] as RGB,
  warn: [180, 83, 9] as RGB,
  bar: [37, 99, 235] as RGB,
};

/** jsPDF's built-in fonts only cover Latin-1 + a few punctuation marks; strip anything else instead of printing garbage. */
const safe = (value: unknown): string =>
  String(value ?? '')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/…/g, '...')
    .replace(/[–—]/g, '-')
    .replace(/[^\x20-\x7E\xA0-\xFF•]/g, '');

const dateTime = (iso: string) =>
  new Date(iso).toLocaleString('en-ZA', { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' });

const rand = (n: number | undefined) => (n || n === 0 ? `R${Math.round(n).toLocaleString('en-ZA')}` : '-');

const yesNo = (v: unknown) => (v ? 'Yes' : 'No');

interface Column {
  header: string;
  key: string;
  /** Relative width. */
  w: number;
  align?: 'left' | 'right';
  format?: (value: any, row: Record<string, any>) => string;
  color?: (value: any, row: Record<string, any>) => RGB | undefined;
}

interface Meta {
  generatedAt: string;
  generatedBy: string;
  period?: { from: string | null; to: string | null };
}

/** Thin layout layer over jsPDF: cover banner, running header, paginated tables and "Page X of Y" footers. */
class Report {
  doc: jsPDF;
  y = 0;
  readonly margin = 14;
  private readonly footerH = 14;

  constructor(private title: string, subtitle: string, private meta: Meta, orientation: 'p' | 'l' = 'p') {
    this.doc = new jsPDF({ orientation, unit: 'mm', format: 'a4' });
    this.drawCover(subtitle);
  }

  private get w() { return this.doc.internal.pageSize.getWidth(); }
  private get h() { return this.doc.internal.pageSize.getHeight(); }
  private get contentW() { return this.w - this.margin * 2; }
  private setColor(c: RGB) { this.doc.setTextColor(c[0], c[1], c[2]); }
  private fill(c: RGB) { this.doc.setFillColor(c[0], c[1], c[2]); }

  private drawCover(subtitle: string) {
    const d = this.doc;
    this.fill(COLOR.ink);
    d.rect(0, 0, this.w, 34, 'F');
    this.fill(COLOR.accent);
    d.rect(0, 34, this.w, 1.4, 'F');

    d.setFont('helvetica', 'bold');
    d.setFontSize(9);
    this.setColor(COLOR.accent);
    d.text('SKILLIX', this.margin, 11);

    d.setFontSize(18);
    this.setColor([255, 255, 255]);
    d.text(safe(this.title), this.margin, 21);

    d.setFont('helvetica', 'normal');
    d.setFontSize(9);
    this.setColor([203, 213, 225]);
    d.text(safe(subtitle), this.margin, 28);

    const { from, to } = this.meta.period ?? { from: null, to: null };
    const period = from || to ? `${from ?? 'start'} to ${to ?? 'today'}` : 'All time';
    d.setFontSize(8);
    this.setColor(COLOR.muted);
    d.text(safe(`Generated ${dateTime(this.meta.generatedAt)}  |  ${this.meta.generatedBy}  |  Period: ${period}`), this.margin, 42);
    this.y = 50;
  }

  private newPage() {
    const d = this.doc;
    d.addPage();
    d.setFont('helvetica', 'bold');
    d.setFontSize(8);
    this.setColor(COLOR.muted);
    d.text(safe(`SKILLIX  |  ${this.title}`), this.margin, 10);
    d.setDrawColor(COLOR.line[0], COLOR.line[1], COLOR.line[2]);
    d.line(this.margin, 12.5, this.w - this.margin, 12.5);
    this.y = 20;
  }

  private ensure(height: number) {
    if (this.y + height > this.h - this.footerH) this.newPage();
  }

  heading(text: string) {
    this.ensure(14);
    const d = this.doc;
    d.setFont('helvetica', 'bold');
    d.setFontSize(12);
    this.setColor(COLOR.ink);
    d.text(safe(text), this.margin, this.y);
    this.fill(COLOR.accent);
    d.rect(this.margin, this.y + 1.8, 12, 0.9, 'F');
    this.y += 9;
  }

  paragraph(text: string, color: RGB = COLOR.text) {
    const d = this.doc;
    d.setFont('helvetica', 'normal');
    d.setFontSize(9);
    this.setColor(color);
    const lines = d.splitTextToSize(safe(text), this.contentW) as string[];
    for (const line of lines) {
      this.ensure(5);
      d.text(line, this.margin, this.y);
      this.y += 4.6;
    }
    this.y += 2;
  }

  kpis(items: Array<{ label: string; value: string | number; hint?: string; tone?: 'good' | 'bad' | 'warn' }>) {
    const d = this.doc;
    const perRow = this.w > 250 ? 5 : 4;
    const gap = 4;
    const cardW = (this.contentW - gap * (perRow - 1)) / perRow;
    const cardH = 21;
    for (let i = 0; i < items.length; i += perRow) {
      this.ensure(cardH + gap);
      items.slice(i, i + perRow).forEach((item, idx) => {
        const x = this.margin + idx * (cardW + gap);
        this.fill(COLOR.zebra);
        d.setDrawColor(COLOR.line[0], COLOR.line[1], COLOR.line[2]);
        d.roundedRect(x, this.y, cardW, cardH, 2, 2, 'FD');
        d.setFont('helvetica', 'bold');
        d.setFontSize(6.5);
        this.setColor(COLOR.muted);
        d.text(safe(item.label.toUpperCase()), x + 3, this.y + 5.5);
        d.setFontSize(15);
        this.setColor(item.tone ? COLOR[item.tone] : COLOR.ink);
        d.text(safe(item.value), x + 3, this.y + 13.5);
        if (item.hint) {
          d.setFont('helvetica', 'normal');
          d.setFontSize(6.5);
          this.setColor(COLOR.muted);
          d.text(safe(item.hint), x + 3, this.y + 18.2, { maxWidth: cardW - 6 });
        }
      });
      this.y += cardH + gap;
    }
    this.y += 2;
  }

  bars(title: string, items: LabelCount[], opts: { max?: number; color?: RGB } = {}) {
    const rows = items.slice(0, opts.max ?? 10);
    if (rows.length === 0) return;
    const d = this.doc;
    this.ensure(10 + rows.length * 6.2);
    d.setFont('helvetica', 'bold');
    d.setFontSize(9);
    this.setColor(COLOR.ink);
    d.text(safe(title), this.margin, this.y);
    this.y += 5;

    const labelW = Math.min(70, this.contentW * 0.38);
    const barX = this.margin + labelW + 2;
    const barMaxW = this.contentW - labelW - 16;
    const top = Math.max(...rows.map(r => r.count), 1);
    const color = opts.color ?? COLOR.bar;

    for (const row of rows) {
      this.ensure(6.2);
      d.setFont('helvetica', 'normal');
      d.setFontSize(8);
      this.setColor(COLOR.text);
      const label = d.splitTextToSize(safe(row.label), labelW)[0] as string;
      d.text(label, this.margin, this.y + 3.4);
      this.fill(COLOR.head);
      d.roundedRect(barX, this.y, barMaxW, 4.4, 1, 1, 'F');
      if (row.count > 0) {
        this.fill(color);
        d.roundedRect(barX, this.y, Math.max(1.6, (row.count / top) * barMaxW), 4.4, 1, 1, 'F');
      }
      d.setFont('helvetica', 'bold');
      this.setColor(COLOR.ink);
      d.text(String(row.count), barX + barMaxW + 3, this.y + 3.4);
      this.y += 6.2;
    }
    this.y += 4;
  }

  table(columns: Column[], rows: Record<string, any>[], opts: { fontSize?: number; maxLines?: number } = {}) {
    const d = this.doc;
    if (rows.length === 0) {
      this.paragraph('No records match this report.', COLOR.muted);
      return;
    }
    const fs = opts.fontSize ?? 7.5;
    const lineH = fs * 0.4;
    const pad = 1.6;
    const maxLines = opts.maxLines ?? 3;
    const total = columns.reduce((a, c) => a + c.w, 0);
    const widths = columns.map(c => (c.w / total) * this.contentW);

    const drawHeader = () => {
      this.ensure(9);
      this.fill(COLOR.head);
      d.rect(this.margin, this.y - 4.2, this.contentW, 6.4, 'F');
      d.setFont('helvetica', 'bold');
      d.setFontSize(fs - 0.5);
      this.setColor(COLOR.muted);
      let x = this.margin;
      columns.forEach((c, i) => {
        const label = safe(c.header.toUpperCase());
        if (c.align === 'right') d.text(label, x + widths[i] - pad, this.y, { align: 'right' });
        else d.text(label, x + pad, this.y);
        x += widths[i];
      });
      this.y += 4.2;
    };

    drawHeader();
    rows.forEach((row, idx) => {
      d.setFont('helvetica', 'normal');
      d.setFontSize(fs);
      const cells = columns.map((c, i) => {
        const raw = c.format ? c.format(row[c.key], row) : row[c.key] === undefined || row[c.key] === null || row[c.key] === '' ? '-' : String(row[c.key]);
        let lines = d.splitTextToSize(safe(raw), widths[i] - pad * 2) as string[];
        if (lines.length > maxLines) {
          lines = lines.slice(0, maxLines);
          lines[maxLines - 1] = `${lines[maxLines - 1].slice(0, Math.max(0, lines[maxLines - 1].length - 3))}...`;
        }
        return lines;
      });
      const rowH = Math.max(...cells.map(l => l.length)) * lineH + pad * 1.4;
      if (this.y + rowH > this.h - this.footerH) {
        this.newPage();
        drawHeader();
      }
      if (idx % 2 === 1) {
        this.fill(COLOR.zebra);
        d.rect(this.margin, this.y - 3, this.contentW, rowH, 'F');
      }
      let x = this.margin;
      cells.forEach((lines, i) => {
        const c = columns[i];
        this.setColor(c.color?.(row[c.key], row) ?? COLOR.text);
        lines.forEach((line, k) => {
          const ty = this.y - 0.4 + k * lineH + 0.2;
          if (c.align === 'right') d.text(line, x + widths[i] - pad, ty, { align: 'right' });
          else d.text(line, x + pad, ty);
        });
        x += widths[i];
      });
      this.y += rowH;
    });
    d.setDrawColor(COLOR.line[0], COLOR.line[1], COLOR.line[2]);
    d.line(this.margin, this.y - 2.4, this.w - this.margin, this.y - 2.4);
    this.y += 5;
  }

  save(filename: string) {
    const d = this.doc;
    const pages = d.getNumberOfPages();
    for (let p = 1; p <= pages; p++) {
      d.setPage(p);
      d.setDrawColor(COLOR.line[0], COLOR.line[1], COLOR.line[2]);
      d.line(this.margin, this.h - 11, this.w - this.margin, this.h - 11);
      d.setFont('helvetica', 'normal');
      d.setFontSize(7);
      this.setColor(COLOR.muted);
      d.text('Skillix - Confidential. May contain personal information protected under POPIA; share only with authorised staff.', this.margin, this.h - 7);
      d.text(`Page ${p} of ${pages}`, this.w - this.margin, this.h - 7, { align: 'right' });
    }
    d.save(filename);
  }
}

/* -------------------------------------------------------------------------- */
/*  Status colouring                                                           */
/* -------------------------------------------------------------------------- */

const statusColor = (v: unknown): RGB | undefined => {
  const s = String(v ?? '').toLowerCase();
  if (['active', 'offered', 'yes'].includes(s)) return COLOR.good;
  if (['revoked', 'suspended', 'rejected', 'no'].includes(s)) return COLOR.bad;
  if (['under review', 'assessment sent', 'paused'].includes(s)) return COLOR.warn;
  return undefined;
};

const pct = (part: number, whole: number) => (whole > 0 ? `${Math.round((part / whole) * 100)}%` : '-');

/* -------------------------------------------------------------------------- */
/*  Report builders                                                            */
/* -------------------------------------------------------------------------- */

function overview(r: ReportEnvelope) {
  const t = r.totals;
  const doc = new Report('Platform Overview Report', 'Executive summary of users, employers, vacancies and applications', r);
  doc.kpis([
    { label: 'Candidates', value: t.candidates, hint: `${t.activeCandidates} active, ${t.suspendedCandidates} suspended` },
    { label: 'Employers', value: t.employers, hint: `${t.verifiedEmployers} verified` },
    { label: 'Vacancies', value: t.vacancies, hint: `${t.activeVacancies} live` },
    { label: 'Applications', value: t.applications, hint: `${t.offers} offers made` },
    { label: 'Avg match score', value: t.avgMatchScore === null ? '-' : `${t.avgMatchScore}%`, hint: 'Across applications' },
    { label: 'Unverified accounts', value: t.unverifiedAccounts, hint: 'Email not yet confirmed', tone: t.unverifiedAccounts ? 'warn' : undefined },
    { label: 'Failed sign-ins', value: r.security.failedSignIns, tone: r.security.failedSignIns ? 'warn' : undefined },
    { label: 'Account lockouts', value: r.security.lockouts, tone: r.security.lockouts ? 'bad' : undefined },
  ]);

  doc.heading('Application pipeline');
  doc.bars('Applications by stage', r.funnel, { color: COLOR.bar });
  const total = t.applications as number;
  const reviewed = total - (r.funnel.find((f: LabelCount) => f.label === 'Under Review')?.count ?? 0);
  doc.paragraph(`${reviewed} of ${total} applications (${pct(reviewed, total)}) have moved beyond initial review. ${t.offers} offer(s) made (${pct(t.offers, total)} of applications).`);

  doc.heading('Platform activity - last 6 months');
  doc.table(
    [
      { header: 'Month', key: 'label', w: 2 },
      { header: 'New candidates', key: 'users', w: 2, align: 'right' },
      { header: 'New employers', key: 'employers', w: 2, align: 'right' },
      { header: 'Applications', key: 'applications', w: 2, align: 'right' },
    ],
    r.months,
    { fontSize: 8.5 },
  );

  doc.heading('Where candidates and vacancies are');
  doc.bars('Candidates by province', r.candidatesByProvince, { color: COLOR.good });
  doc.bars('Vacancies by sector', r.vacanciesBySector, { color: COLOR.accent });
  doc.bars('Most-applied-to employers', r.topEmployers, { color: COLOR.bar });

  doc.heading('Security and access');
  doc.table(
    [
      { header: 'Indicator', key: 'k', w: 4 },
      { header: 'Count', key: 'v', w: 1, align: 'right' },
    ],
    [
      { k: 'Failed sign-in attempts', v: r.security.failedSignIns },
      { k: 'Accounts temporarily locked after repeated failures', v: r.security.lockouts },
      { k: 'Administrator-issued password resets', v: r.security.passwordResets },
      { k: 'Accounts deleted', v: r.security.accountsDeleted },
    ],
    { fontSize: 8.5 },
  );
  doc.save(`Skillix_Overview_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
}

function users(r: ReportEnvelope) {
  const rows = r.rows as Record<string, any>[];
  const doc = new Report('Candidate Register', 'All candidate accounts with status and activity', r, 'l');
  const active = rows.filter(x => x.status === 'active').length;
  doc.kpis([
    { label: 'Total candidates', value: rows.length },
    { label: 'Active', value: active, tone: 'good' },
    { label: 'Suspended / revoked', value: rows.length - active, tone: rows.length - active ? 'bad' : undefined },
    { label: 'Email verified', value: rows.filter(x => x.emailVerified).length },
    { label: 'Applications submitted', value: rows.reduce((a, x) => a + (x.applications || 0), 0) },
  ]);
  doc.bars('Candidates by province', r.byProvince, { color: COLOR.good });
  doc.heading('Candidate list');
  doc.table(
    [
      { header: 'Name', key: 'name', w: 3 },
      { header: 'Email', key: 'email', w: 4 },
      { header: 'Phone', key: 'phone', w: 2.2 },
      { header: 'Location', key: 'city', w: 3, format: (_v, x) => `${x.city}, ${x.province}` },
      { header: 'NQF', key: 'nqfLevel', w: 1, align: 'right' },
      { header: 'Exp (yrs)', key: 'experienceYears', w: 1.2, align: 'right' },
      { header: 'Status', key: 'status', w: 1.6, color: statusColor },
      { header: 'Verified', key: 'emailVerified', w: 1.3, format: yesNo, color: statusColor },
      { header: 'Joined', key: 'createdAt', w: 1.8 },
      { header: 'Last sign-in', key: 'lastLoginAt', w: 2.2 },
      { header: 'Apps', key: 'applications', w: 1, align: 'right' },
    ],
    rows,
  );
  doc.save(`Skillix_Candidate_Register_${new Date().toISOString().slice(0, 10)}.pdf`);
}

function employers(r: ReportEnvelope) {
  const rows = r.rows as Record<string, any>[];
  const doc = new Report('Employer Register', 'All employer accounts with verification, status and hiring activity', r, 'l');
  doc.kpis([
    { label: 'Total employers', value: rows.length },
    { label: 'Verified employers', value: rows.filter(x => x.verified).length, tone: 'good' },
    { label: 'Suspended', value: rows.filter(x => x.status === 'suspended').length, tone: rows.some(x => x.status === 'suspended') ? 'bad' : undefined },
    { label: 'Live vacancies', value: rows.reduce((a, x) => a + (x.activeJobsCount || 0), 0) },
    { label: 'Applicants received', value: rows.reduce((a, x) => a + (x.totalApplicantsReceived || 0), 0) },
  ]);
  doc.bars('Employers by industry', r.byIndustry, { color: COLOR.accent });
  doc.heading('Employer list');
  doc.table(
    [
      { header: 'Company', key: 'name', w: 3 },
      { header: 'Email', key: 'email', w: 3.6 },
      { header: 'Industry', key: 'industry', w: 2.6 },
      { header: 'Location', key: 'city', w: 2.6, format: (_v, x) => `${x.city}, ${x.province}` },
      { header: 'Verified', key: 'verified', w: 1.2, format: yesNo, color: statusColor },
      { header: 'Status', key: 'status', w: 1.4, color: statusColor },
      { header: 'Live / total jobs', key: 'activeJobsCount', w: 1.5, align: 'right', format: (_v, x) => `${x.activeJobsCount ?? 0} / ${x.totalJobsCount ?? 0}` },
      { header: 'Applicants', key: 'totalApplicantsReceived', w: 1.3, align: 'right' },
      { header: 'Joined', key: 'createdAt', w: 1.7 },
    ],
    rows,
  );
  doc.save(`Skillix_Employer_Register_${new Date().toISOString().slice(0, 10)}.pdf`);
}

function applications(r: ReportEnvelope) {
  const rows = r.rows as Record<string, any>[];
  const doc = new Report('Application Tracking Report', 'Every application with its current stage and match score', r, 'l');
  const scores = rows.map(x => x.matchScore).filter((n: unknown) => typeof n === 'number');
  doc.kpis([
    { label: 'Applications', value: rows.length },
    { label: 'Shortlisted', value: rows.filter(x => x.status === 'Shortlisted').length },
    { label: 'Interviews', value: rows.filter(x => x.status === 'Interview Scheduled').length },
    { label: 'Offers', value: rows.filter(x => x.status === 'Offered').length, tone: 'good' },
    { label: 'Avg match score', value: scores.length ? `${Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length)}%` : '-' },
  ]);
  doc.bars('Applications by stage', r.byStatus, { color: COLOR.bar });
  doc.bars('Top employers by applications', r.byCompany, { max: 8, color: COLOR.accent });
  doc.heading('Application log');
  doc.table(
    [
      { header: 'Candidate', key: 'candidate', w: 2.6 },
      { header: 'Email', key: 'email', w: 3.4 },
      { header: 'Position', key: 'job', w: 3 },
      { header: 'Employer', key: 'company', w: 2.6 },
      { header: 'Applied', key: 'appliedAt', w: 2 },
      { header: 'Stage', key: 'status', w: 2, color: statusColor },
      { header: 'Match', key: 'matchScore', w: 1, align: 'right', format: v => (typeof v === 'number' ? `${v}%` : '-') },
      { header: 'Last update', key: 'lastUpdate', w: 2 },
    ],
    rows,
  );
  doc.save(`Skillix_Application_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
}

function vacancies(r: ReportEnvelope) {
  const rows = r.rows as Record<string, any>[];
  const doc = new Report('Vacancy Report', 'All posted vacancies with demand and salary range', r, 'l');
  doc.kpis([
    { label: 'Vacancies posted', value: rows.length },
    { label: 'Live', value: rows.filter(x => x.active).length, tone: 'good' },
    { label: 'Paused / closed', value: rows.filter(x => !x.active).length },
    { label: 'Total applicants', value: rows.reduce((a, x) => a + (x.applicants || 0), 0) },
  ]);
  doc.bars('Vacancies by sector', r.bySector, { color: COLOR.accent });
  doc.bars('Vacancies by work model', r.byWorkModel, { color: COLOR.bar });
  doc.heading('Vacancy list');
  doc.table(
    [
      { header: 'Title', key: 'title', w: 3.2 },
      { header: 'Employer', key: 'company', w: 2.6 },
      { header: 'Sector', key: 'sector', w: 2.6 },
      { header: 'City', key: 'city', w: 2 },
      { header: 'Model', key: 'workModel', w: 1.3 },
      { header: 'Salary range (pm)', key: 'salaryMin', w: 2.4, format: (_v, x) => `${rand(x.salaryMin)} - ${rand(x.salaryMax)}` },
      { header: 'Applicants', key: 'applicants', w: 1.2, align: 'right' },
      { header: 'Status', key: 'active', w: 1.2, format: v => (v ? 'Active' : 'Paused'), color: statusColor },
      { header: 'Posted', key: 'postedDate', w: 1.6 },
    ],
    rows,
  );
  doc.save(`Skillix_Vacancy_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
}

function audit(r: ReportEnvelope) {
  const rows = r.rows as Record<string, any>[];
  const doc = new Report('Security and Audit Trail', 'Chronological record of sign-ins, account changes and administrator actions', r, 'l');
  doc.kpis([
    { label: 'Events in period', value: r.total },
    { label: 'Shown in this report', value: rows.length, hint: r.total > rows.length ? `Most recent ${rows.length} only` : undefined },
  ]);
  doc.bars('Most frequent event types', r.byEvent, { max: 8, color: COLOR.bar });
  doc.heading('Event log (newest first)');
  doc.table(
    [
      { header: 'Time', key: 'timestamp', w: 2.2 },
      { header: 'Event', key: 'event', w: 2.6 },
      { header: 'Actor', key: 'actor', w: 3 },
      { header: 'Description', key: 'description', w: 8 },
    ],
    rows,
    { fontSize: 7, maxLines: 3 },
  );
  doc.save(`Skillix_Audit_Trail_${new Date().toISOString().slice(0, 10)}.pdf`);
}

const builders: Record<ReportType, (r: ReportEnvelope) => void> = {
  overview,
  users,
  employers,
  applications,
  vacancies,
  audit,
};

/** Builds and downloads the PDF for a report fetched from /api/admin/reports/:type. */
export function downloadAdminReportPDF(report: ReportEnvelope) {
  builders[report.type](report);
}

/** Labour-market skills diagnostic, built only from live platform analytics. */
export function downloadSkillsGapPDF(analytics: LaborMarketAnalytics, generatedBy = 'Administrator') {
  const doc = new Report('Skills Gap Diagnostic', 'Employer demand versus candidate supply on the platform', {
    generatedAt: new Date().toISOString(),
    generatedBy,
  });
  doc.kpis([
    { label: 'Candidates', value: analytics.totalJobSeekers },
    { label: 'Live vacancies', value: analytics.activeJobPostings },
    { label: 'Applications', value: analytics.totalApplications },
    { label: 'Avg match score', value: analytics.totalApplications ? `${analytics.avgMatchScore}%` : '-' },
  ]);

  doc.heading('Most demanded skills');
  doc.table(
    [
      { header: '#', key: 'rank', w: 0.6 },
      { header: 'Skill', key: 'skill', w: 5 },
      { header: 'Vacancies requiring it', key: 'count', w: 2.4, align: 'right' },
      { header: 'Share of live vacancies', key: 'growthRate', w: 2.6, align: 'right' },
    ],
    analytics.topDemandedSkills.map((s, i) => ({ ...s, rank: i + 1 })),
    { fontSize: 8.5 },
  );

  doc.heading('Largest supply gaps');
  doc.paragraph('Gap = share of vacancies requiring the skill that cannot be filled by a candidate currently holding it on their profile.', COLOR.muted);
  doc.table(
    [
      { header: 'Skill', key: 'skill', w: 5 },
      { header: 'Unmet demand', key: 'demandGapPercent', w: 2, align: 'right', format: v => `${v}%` },
    ],
    analytics.topShortageSkills,
    { fontSize: 8.5 },
  );

  doc.heading('Geography');
  doc.table(
    [
      { header: 'Province', key: 'province', w: 4 },
      { header: 'Vacancies', key: 'jobCount', w: 2, align: 'right' },
      { header: 'Candidates', key: 'candidateCount', w: 2, align: 'right' },
    ],
    analytics.locationDistribution,
    { fontSize: 8.5 },
  );

  doc.heading('Sectors');
  doc.table(
    [
      { header: 'Sector', key: 'sector', w: 4 },
      { header: 'Vacancies', key: 'count', w: 2, align: 'right' },
      { header: 'Avg monthly salary', key: 'avgSalaryZAR', w: 2.4, align: 'right', format: v => rand(v) },
    ],
    analytics.sectorDistribution,
    { fontSize: 8.5 },
  );
  doc.save(`Skillix_Skills_Gap_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
}
