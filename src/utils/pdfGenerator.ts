import jsPDF from 'jspdf';
import { Note } from '../types';
import { getReadingMetrics } from './readingProgress';

/**
 * Generates a clean, formatted PDF document of a note's content for downloading, printing, or sharing.
 */
export function generateNotePDF(note: Note): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const metrics = getReadingMetrics(note);
  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 15;
  const contentWidth = pageWidth - margin * 2; // 180mm

  let y = margin;

  function checkAddPage(neededHeight: number = 10) {
    if (y + neededHeight > pageHeight - margin) {
      doc.addPage();
      y = margin;
      // Draw subtle header line on new pages
      doc.setDrawColor(220, 225, 230);
      doc.setLineWidth(0.3);
      doc.line(margin, margin - 5, pageWidth - margin, margin - 5);
    }
  }

  // --- Title & Header Banner ---
  doc.setFillColor(16, 185, 129); // Emerald accent bar
  doc.rect(margin, y, 4, 16, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(15, 23, 42); // slate-900

  const titleLines = doc.splitTextToSize(note.title, contentWidth - 8);
  doc.text(titleLines, margin + 8, y + 6);
  y += Math.max(16, titleLines.length * 7 + 4);

  // Metadata Line
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139); // slate-500

  const metaText = `Source: ${note.domain || 'Vault'} (${note.url || 'Local'})  |  Scraped: ${note.created_at || 'N/A'}`;
  const splitMeta = doc.splitTextToSize(metaText, contentWidth);
  doc.text(splitMeta, margin, y);
  y += splitMeta.length * 4 + 2;

  // Divider Line
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  // --- Summary & Metrics Box ---
  checkAddPage(20);
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.roundedRect(margin, y, contentWidth, 18, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(`Word Count: ${metrics.wordCount} words`, margin + 4, y + 6);
  doc.text(`Est. Reading Time: ~${metrics.readTimeMinutes} min`, margin + 60, y + 6);

  if (note.focus_time_seconds && note.focus_time_seconds > 0) {
    const focusMins = Math.floor(note.focus_time_seconds / 60);
    const focusSecs = note.focus_time_seconds % 60;
    doc.text(`Focused Study: ${focusMins}m ${focusSecs}s`, margin + 120, y + 6);
  } else {
    doc.text(`Primary Tech: ${metrics.primaryLanguage}`, margin + 120, y + 6);
  }

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  const tagsStr = note.tags && note.tags.length > 0 ? note.tags.join(', ') : 'None';
  const langStr = note.languages && note.languages.length > 0 ? note.languages.join(', ') : 'General';
  doc.text(`Languages: ${langStr}  |  Tags: ${tagsStr}`, margin + 4, y + 13);

  y += 24;

  // --- Student Remarks (If present) ---
  if (note.student_notes && note.student_notes.trim().length > 0) {
    checkAddPage(25);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(16, 185, 129); // emerald
    doc.text('Student Remarks & Study Notes:', margin, y);
    y += 6;

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59);

    const studentLines = doc.splitTextToSize(note.student_notes, contentWidth - 8);
    const boxHeight = studentLines.length * 4.5 + 6;

    doc.setFillColor(240, 253, 244); // emerald-50
    doc.setDrawColor(187, 247, 208); // emerald-200
    doc.roundedRect(margin, y, contentWidth, boxHeight, 2, 2, 'FD');

    doc.text(studentLines, margin + 4, y + 5);
    y += boxHeight + 8;
  }

  // --- Main Note Content ---
  checkAddPage(20);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('Note Summary & Content:', margin, y);
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85); // slate-700

  const mainContent = note.content || note.summary || 'No text content available.';
  const contentLines = doc.splitTextToSize(mainContent, contentWidth);

  for (let i = 0; i < contentLines.length; i++) {
    checkAddPage(6);
    doc.text(contentLines[i], margin, y);
    y += 4.5;
  }
  y += 6;

  // --- Code Snippets Section ---
  if (note.code_snippets && note.code_snippets.length > 0) {
    checkAddPage(20);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(`Code Snippets (${note.code_snippets.length}):`, margin, y);
    y += 8;

    note.code_snippets.forEach((snippet, index) => {
      checkAddPage(25);

      // Snippet header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(14, 165, 233); // sky-500
      doc.text(`Snippet #${index + 1} (${(snippet.language || 'code').toUpperCase()}):`, margin, y);
      y += 5;

      const codeText = snippet.code || '';
      const rawLines = codeText.split('\n');

      const formattedLines: string[] = [];
      rawLines.forEach((line) => {
        const wrapped = doc.splitTextToSize(line, contentWidth - 8);
        formattedLines.push(...wrapped);
      });

      const codeBoxHeight = formattedLines.length * 4 + 6;

      checkAddPage(Math.min(codeBoxHeight + 8, 40));

      // Draw dark monospace code block
      doc.setFillColor(15, 23, 42); // slate-900 background
      doc.roundedRect(margin, y, contentWidth, codeBoxHeight, 2, 2, 'F');

      doc.setFont('courier', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(226, 232, 240); // slate-200 code text

      let codeY = y + 4.5;
      for (let j = 0; j < formattedLines.length; j++) {
        if (codeY + 4 > pageHeight - margin) {
          doc.addPage();
          y = margin;
          doc.setFillColor(15, 23, 42);
          const remainingLines = formattedLines.length - j;
          const remainingHeight = remainingLines * 4 + 6;
          doc.roundedRect(margin, y, contentWidth, remainingHeight, 2, 2, 'F');
          codeY = y + 4.5;
          doc.setFont('courier', 'normal');
          doc.setFontSize(8);
          doc.setTextColor(226, 232, 240);
        }
        doc.text(formattedLines[j], margin + 4, codeY);
        codeY += 4;
      }

      y = codeY + 6;
    });
  }

  // --- Add Page Numbers to Footer ---
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text(
      `KayBiT Vault - ${note.title.slice(0, 35)} | Page ${i} of ${totalPages}`,
      pageWidth / 2,
      pageHeight - 8,
      { align: 'center' }
    );
  }

  // Save PDF file
  const safeFilename = (note.title || 'programming_note')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .slice(0, 30);
  doc.save(`${safeFilename}_note.pdf`);
}
