import React, { useState, useEffect, useRef } from 'react';
import { getQuestionFormat } from '../utils/questionUtils';

const SECTION_LABELS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

const TYPE_DISPLAY = {
  MCQ: 'Multiple choice',
  FIB: 'Fill in the blanks',
  TF: 'True or false',
  SA: 'Short answer',
  LA: 'Long answer',
  MATCH: 'Match the following',
  DRAW: 'Draw and label',
  SOLVE: 'Solve',
  CUSTOM: 'Custom',
};

function getSectionLabel(index) {
  return SECTION_LABELS[index] || String(index + 1);
}

function getStableShuffledMatch(questionsList) {
  const colBTexts = questionsList.map((q) => {
    const raw = (q.columnB || '').replace(/^\s*[a-gA-G][\.\s\-)]+\s*/, '').trim();
    return raw || '____________________';
  });
  const sorted = [...colBTexts].sort();
  return sorted.map((text, idx) => `${String.fromCharCode(97 + idx)}. ${text}`);
}

function generatePlainText(headerData, sections) {
  const lines = [];

  lines.push((headerData.schoolName || 'SCHOOL NAME').toUpperCase());
  lines.push(headerData.examTitle || 'Examination');
  lines.push(
    `Grade: ${headerData.grade || '—'} | Subject: ${headerData.subject || '—'} | Duration: ${headerData.duration || '—'} | Max Marks: ${headerData.totalMarks || '—'}`
  );
  lines.push(
    `Date: ${headerData.dateOfExam || '—'} | Academic Year: ${headerData.academicYear || '—'}`
  );
  lines.push('');

  if (headerData.instructions) {
    lines.push('Instructions:');
    headerData.instructions
      .split('\n')
      .filter((l) => l.trim())
      .forEach((line) => lines.push(line));
    lines.push('');
  }

  sections.forEach((section, sIdx) => {
    const label = getSectionLabel(sIdx);
    const typeName = section.title || TYPE_DISPLAY[section.type] || section.type;
    const resolvedType = getQuestionFormat(section);
    const total = section.numQuestions * section.marksPerQuestion;
    lines.push(
      `Section ${label}: ${typeName} (${section.numQuestions} × ${section.marksPerQuestion} = ${total} marks)`
    );
    
    const questionsList = section.questions || [];
    
    if (resolvedType === 'MATCH') {
      lines.push('Q1. Match the following columns (Scrambled for Exam):');
      lines.push('Column A\t\t\tColumn B');
      const scrambledB = getStableShuffledMatch(questionsList);
      for (let i = 0; i < section.numQuestions; i++) {
        const q = questionsList[i] || {};
        const rawA = (q.columnA || '').replace(/^\s*\d+[\.\s\-)]+\s*/, '').trim();
        const colA = `${i + 1}. ${rawA || '__________'}`;
        const colB = scrambledB[i] || `${String.fromCharCode(97 + i)}. __________`;
        lines.push(`${colA}\t\t\t${colB}`);
      }
    } else {
      for (let i = 1; i <= section.numQuestions; i++) {
        const q = questionsList[i - 1] || {};
        const qText = q.text ? q.text : `_______________`;
        lines.push(`Q${i}. ${qText} [${section.marksPerQuestion} mark(s)]`);
        if (resolvedType === 'MCQ' && q.options) {
          lines.push(`   (a) ${q.options[0] || '____'}\t(b) ${q.options[1] || '____'}\t(c) ${q.options[2] || '____'}\t(d) ${q.options[3] || '____'}`);
        }
      }
    }
    lines.push('');
  });

  return lines.join('\n');
}

function generateAnswerKeyText(headerData, sections) {
  const lines = [];
  lines.push(`ANSWER KEY: ${(headerData.schoolName || 'SCHOOL NAME').toUpperCase()}`);
  lines.push(headerData.examTitle || 'Examination');
  lines.push(`Subject: ${headerData.subject || '—'} | Grade: ${headerData.grade || '—'}`);
  lines.push('');

  sections.forEach((section, sIdx) => {
    const label = getSectionLabel(sIdx);
    const displayName = section.title || TYPE_DISPLAY[section.type] || section.type;
    const resolvedType = getQuestionFormat(section);
    lines.push(`Section ${label} (${displayName}) Answers:`);
    const questionsList = section.questions || [];
    
    questionsList.forEach((q, idx) => {
      if (resolvedType === 'MATCH') {
        lines.push(`Pair ${idx + 1}: ${q.columnA || '___'} -> ${q.columnB || '___'}`);
      } else {
        lines.push(`Q${idx + 1}: ${q.text || '___'}`);
        lines.push(`   Answer: ${q.answer || 'No answer key provided.'}`);
      }
    });
    lines.push('');
  });

  return lines.join('\n');
}

export default function Step3Preview({ headerData, sections, syllabusData, onSectionsChange, isLiveMini = false }) {
  const [copied, setCopied] = useState(false);
  const [copiedAnswers, setCopiedAnswers] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState('paper'); // 'paper', 'answers', 'keypoints'
  const [flash, setFlash] = useState(false);
  const [paginatedSections, setPaginatedSections] = useState([]);
  const [isEditMode, setIsEditMode] = useState(false);

  useEffect(() => {
    if (isLiveMini) {
      setFlash(true);
      const timer = setTimeout(() => setFlash(false), 900);
      return () => clearTimeout(timer);
    }
  }, [sections, headerData, isLiveMini]);

  const handleQuestionTextChange = (sectionId, qId, newText) => {
    if (!onSectionsChange) return;
    const newSections = sections.map(sec => {
      if (sec.id !== sectionId) return sec;
      return {
        ...sec,
        questions: (sec.questions || []).map(q => {
          if (q.id === qId) return { ...q, text: newText };
          return q;
        })
      };
    });
    onSectionsChange(newSections);
  };

  const handleOptionTextChange = (sectionId, qId, optIndex, newText) => {
    if (!onSectionsChange) return;
    const newSections = sections.map(sec => {
      if (sec.id !== sectionId) return sec;
      return {
        ...sec,
        questions: (sec.questions || []).map(q => {
          if (q.id === qId) {
            const newOpts = [...(q.options || ['', '', '', ''])];
            newOpts[optIndex] = newText;
            return { ...q, options: newOpts };
          }
          return q;
        })
      };
    });
    onSectionsChange(newSections);
  };

  const handleMatchTextChange = (sectionId, qId, field, newText) => {
    if (!onSectionsChange) return;
    const newSections = sections.map(sec => {
      if (sec.id !== sectionId) return sec;
      return {
        ...sec,
        questions: (sec.questions || []).map(q => {
          if (q.id === qId) return { ...q, [field]: newText };
          return q;
        })
      };
    });
    onSectionsChange(newSections);
  };

  // Estimate height for each question type (in px, at A4 scale)
  const estimateQuestionHeight = (type, q) => {
    // Estimate text wrapping (approx 95 chars per line for standard academic font)
    const textLen = (q.text || '').length;
    const lines = Math.max(1, Math.ceil(textLen / 95));
    const wrapHeight = (lines - 1) * 24; // 24px per extra line (line-height 1.6 * 15px)

    // Base heights now precisely include the 14px grid gap between questions
    let base = 50;
    switch (type) {
      case 'MCQ': 
        let r1 = 1, r2 = 1;
        const o = q.options || ['', '', '', ''];
        const lA = (o[0] || '').length + 4;
        const lB = (o[1] || '').length + 4;
        const lC = (o[2] || '').length + 4;
        const lD = (o[3] || '').length + 4;
        r1 = Math.max(Math.ceil(lA / 35), Math.ceil(lB / 35), 1);
        r2 = Math.max(Math.ceil(lC / 35), Math.ceil(lD / 35), 1);
        base = 43 + ((r1 + r2) * 26);
        break;
      case 'FIB': base = 35; break;
      case 'TF': base = 35; break;
      case 'SA': base = 83; break;
      case 'LA': base = 155; break;
      case 'MATCH': base = 35; break;
      case 'DRAW': base = 183; break;
      case 'SOLVE': base = 155; break;
      default: base = 50;
    }
    
    return base + wrapHeight;
  };

  useEffect(() => {
    // A4 usable content height inside padding is exactly 1009px with 10mm bottom margin
    const PAGE_HEIGHT = 1009;
    
    // Precisely matched to actual CSS DOM rendering heights
    const HEADER_HEIGHT = 142;       
    const STUDENT_BOX_HEIGHT = 122;   
    const INSTRUCTIONS_HEIGHT = instructionLines.length > 0 ? (78 + instructionLines.length * 25) : 0;
    const SECTION_HEADER_HEIGHT = 88; 
    const CONTINUED_HEADER_HEIGHT = 0; // Removed per user request
    const SIGNATURE_HEIGHT = 65;
    const FOOTER_HEIGHT = 0; // Footer is absolutely positioned below padding boundary; takes no layout space!

    let pages = [];
    let currentPage = {
      showSchoolHeader: true,
      showStudentBox: true,
      showInstructions: instructionLines.length > 0,
      sections: [],
      showSignature: false
    };
    let currentHeight = HEADER_HEIGHT + STUDENT_BOX_HEIGHT + INSTRUCTIONS_HEIGHT + FOOTER_HEIGHT;

    sections.forEach((section, sIdx) => {
      const secLabel = getSectionLabel(sIdx);
      const resolvedFormat = getQuestionFormat(section);
      const displayName = section.title || TYPE_DISPLAY[section.type] || section.type;
      const qList = section.questions || [];

      // For MATCH type, treat as a single block
      if (resolvedFormat === 'MATCH') {
        const matchBlockHeight = SECTION_HEADER_HEIGHT + 40 + (qList.length * 30) + 10;
        if (currentHeight + matchBlockHeight > PAGE_HEIGHT) {
          pages.push(currentPage);
          currentPage = {
            showSchoolHeader: false, showStudentBox: false, showInstructions: false,
            sections: [], showSignature: false
          };
          currentHeight = FOOTER_HEIGHT;
        }
        currentPage.sections.push({
          sectionId: section.id, label: secLabel, title: displayName,
          type: resolvedFormat, marksPerQuestion: section.marksPerQuestion,
          numQuestions: section.numQuestions, showHeader: true,
          questions: qList.map((q, i) => ({ ...q, originalIndex: i + 1 }))
        });
        currentHeight += matchBlockHeight;
        return;
      }

      let currentSectionSegment = {
        sectionId: section.id, label: secLabel, title: displayName,
        type: resolvedFormat, marksPerQuestion: section.marksPerQuestion,
        numQuestions: section.numQuestions, showHeader: true, questions: []
      };

      let firstQHeight = 0;
      if (qList.length > 0) {
        firstQHeight = estimateQuestionHeight(resolvedFormat, qList[0]);
      }

      // Check if section header AND at least the first question fit 
      // (This prevents "orphaned headers" with huge blank spaces below them)
      if (currentHeight + SECTION_HEADER_HEIGHT + firstQHeight > PAGE_HEIGHT) {
        pages.push(currentPage);
        currentPage = {
          showSchoolHeader: false, showStudentBox: false, showInstructions: false,
          sections: [], showSignature: false
        };
        currentHeight = FOOTER_HEIGHT;
      }
      currentPage.sections.push(currentSectionSegment);
      currentHeight += SECTION_HEADER_HEIGHT;

      qList.forEach((q, qIdx) => {
        const qH = estimateQuestionHeight(resolvedFormat, q);
        if (currentHeight + qH > PAGE_HEIGHT) {
          pages.push(currentPage);
          currentPage = {
            showSchoolHeader: false, showStudentBox: false, showInstructions: false,
            sections: [], showSignature: false
          };
          currentSectionSegment = {
            sectionId: section.id, label: secLabel, title: displayName,
            type: resolvedFormat, marksPerQuestion: section.marksPerQuestion,
            numQuestions: section.numQuestions, showHeader: false, questions: []
          };
          currentPage.sections.push(currentSectionSegment);
          currentHeight = FOOTER_HEIGHT + CONTINUED_HEADER_HEIGHT;
        }
        currentSectionSegment.questions.push({ ...q, originalIndex: qIdx + 1 });
        currentHeight += qH;
      });
    });

    // Add signature
    if (currentHeight + SIGNATURE_HEIGHT > PAGE_HEIGHT) {
      pages.push(currentPage);
      currentPage = {
        showSchoolHeader: false, showStudentBox: false, showInstructions: false,
        sections: [], showSignature: true
      };
    } else {
      currentPage.showSignature = true;
    }
    pages.push(currentPage);

    setPaginatedSections(pages);
  }, [sections, headerData, activeSubTab]);

  const handlePrint = () => {
    window.print();
  };

  const handleCopyText = () => {
    const text = generatePlainText(headerData, sections);
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleCopyAnswers = () => {
    const text = generateAnswerKeyText(headerData, sections);
    navigator.clipboard.writeText(text).then(() => {
      setCopiedAnswers(true);
      setTimeout(() => setCopiedAnswers(false), 2000);
    });
  };

  const handleDownloadPDF = async () => {
    const elementId = activeSubTab === 'paper' ? 'printable-exam-paper' : 
                      activeSubTab === 'answers' ? 'printable-answers-paper' : 'printable-keypoints-paper';
    const element = document.getElementById(elementId);
    if (!element) return;

    const html2canvas = (await import('html2canvas')).default;
    const { jsPDF } = await import('jspdf');

    const originalStyle = element.getAttribute('style');
    element.style.background = '#ffffff';
    element.style.color = '#000000';
    element.style.padding = '20mm 15mm';
    element.style.width = '210mm';
    element.style.boxSizing = 'border-box';

    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff'
      });

      if (originalStyle) {
        element.setAttribute('style', originalStyle);
      } else {
        element.removeAttribute('style');
      }

      const imgData = canvas.toDataURL('image/jpeg', 1.0);
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const rawSchool = headerData.schoolName || 'School';
      const rawTitle = headerData.examTitle || 'Exam';
      const rawGrade = headerData.grade || '';
      const rawSubject = headerData.subject || '';
      const cleanName = `${rawSchool}_${rawGrade}_${rawSubject}_${rawTitle}`
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .replace(/__+/g, '_');

      pdf.save(`${cleanName}_${activeSubTab}.pdf`);
    } catch (error) {
      console.error('PDF generation failed:', error);
      alert('Failed to generate PDF. Please try browser print instead.');
    }
  };

  const handleDownloadWord = async () => {
    const docx = await import('docx');
    const { 
      Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, 
      WidthType, AlignmentType 
    } = docx;

    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: (headerData.schoolName || 'SCHOOL NAME').toUpperCase(),
                bold: true,
                size: 32,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: (headerData.examTitle || 'EXAMINATION').toUpperCase(),
                bold: true,
                size: 24,
              }),
            ],
          }),
          
          new Table({
            width: {
              size: 100,
              type: WidthType.PERCENTAGE,
            },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: `CLASS: ${headerData.grade || '—'}`, bold: true })] })],
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: `SUBJECT: ${headerData.subject || '—'}`, bold: true })] })],
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: `MAX MARKS: ${headerData.totalMarks || '—'}`, bold: true })] })],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: `DATE: ${headerData.dateOfExam || '—'}` })] })],
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: `DURATION: ${headerData.duration || '—'}` })] })],
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: `ACADEMIC YEAR: ${headerData.academicYear || '—'}` })] })],
                  }),
                ],
              }),
            ],
          }),

          new Paragraph({ text: '', spacing: { before: 200 } }),

          new Table({
            width: {
              size: 100,
              type: WidthType.PERCENTAGE,
            },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: 'Candidate Name: _______________________' })] })],
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: 'Roll Number: _______________________' })] })],
                  }),
                ],
              }),
            ],
          }),

          new Paragraph({ text: '', spacing: { before: 200 } }),

          ...(headerData.instructions ? [
            new Paragraph({
              children: [new TextRun({ text: 'INSTRUCTIONS TO CANDIDATES:', bold: true, underline: {} })],
            }),
            ...headerData.instructions.split('\n').map(line => new Paragraph({
              children: [new TextRun({ text: `• ${line}` })],
              spacing: { after: 100 }
            }))
          ] : []),

          new Paragraph({ text: '', spacing: { before: 400 } }),

          ...sections.flatMap((section, sIdx) => {
            const label = String.fromCharCode(65 + sIdx);
            const displayName = (section.title || section.type || '').toUpperCase();
            const resolvedFormat = getQuestionFormat(section);

            const sectionHeader = [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 300, after: 100 },
                children: [
                  new TextRun({
                    text: `SECTION ${label}: ${displayName}`,
                    bold: true,
                    size: 24,
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { after: 200 },
                children: [
                  new TextRun({
                    text: `[${section.numQuestions} Questions × ${section.marksPerQuestion} Mark(s) = ${section.numQuestions * section.marksPerQuestion} Marks]`,
                    italic: true,
                  }),
                ],
              }),
            ];

            const questionParagraphs = (section.questions || []).flatMap((q, qIdx) => {
              const prefix = `${qIdx + 1}. `;
              
              if (resolvedFormat === 'MATCH') {
                return [
                  new Paragraph({
                    children: [new TextRun({ text: `${prefix}Match the following columns:`, bold: true })]
                  }),
                  ... (() => {
                    const scrambledB = getStableShuffledMatch(section.questions || []);
                    return (section.questions || []).map((matchQ, mIdx) => {
                      const rawA = (matchQ.columnA || '').replace(/^\s*\d+[\.\s\-)]+\s*/, '').trim();
                      const formattedA = `${mIdx + 1}. ${rawA || '___'}`;
                      const formattedB = scrambledB[mIdx] || `${String.fromCharCode(97 + mIdx)}. ___`;
                      return new Paragraph({
                        children: [
                          new TextRun({ text: `   ${formattedA}` }),
                          new TextRun({ text: `         |         ` }),
                          new TextRun({ text: `   ${formattedB}` })
                        ],
                        spacing: { after: 100 }
                      });
                    });
                  })()
                ];
              }

              const mainText = q.text || '_______________';
              const p = new Paragraph({
                children: [
                  new TextRun({ text: `${prefix}${mainText}` }),
                  new TextRun({ text: `    (${section.marksPerQuestion} Marks)`, bold: true })
                ],
                spacing: { after: 100 }
              });

              const extras = [];
              if (resolvedFormat === 'MCQ') {
                const opts = q.options && q.options.some(o => o.trim()) ? q.options : ['____', '____', '____', '____'];
                extras.push(new Paragraph({
                  children: [
                    new TextRun({ text: `   (a) ${opts[0] || '____'}      (b) ${opts[1] || '____'}` }),
                  ]
                }));
                extras.push(new Paragraph({
                  children: [
                    new TextRun({ text: `   (c) ${opts[2] || '____'}      (d) ${opts[3] || '____'}` }),
                  ],
                  spacing: { after: 150 }
                }));
              } else if (resolvedFormat === 'SA') {
                extras.push(new Paragraph({ children: [new TextRun({ text: '__________________________________________________________________' })] }));
                extras.push(new Paragraph({ children: [new TextRun({ text: '__________________________________________________________________' })], spacing: { after: 150 } }));
              } else if (resolvedFormat === 'LA') {
                for (let j = 0; j < 6; j++) {
                  extras.push(new Paragraph({ children: [new TextRun({ text: '__________________________________________________________________' })] }));
                }
                extras[extras.length - 1].spacing = { after: 150 };
              } else if (resolvedFormat === 'SOLVE') {
                for (let j = 0; j < 4; j++) {
                  extras.push(new Paragraph({ children: [new TextRun({ text: '__________________________________________________________________' })] }));
                }
                extras[extras.length - 1].spacing = { after: 150 };
              } else if (resolvedFormat === 'DRAW') {
                extras.push(new Paragraph({
                  children: [new TextRun({ text: '   [Draw space provided below]' })]
                }));
                for (let j = 0; j < 5; j++) {
                  extras.push(new Paragraph({ children: [new TextRun({ text: '|                                                                                                  |' })] }));
                }
                extras.push(new Paragraph({ children: [new TextRun({ text: '   -------------------------------------------------------------------------------------------------' })], spacing: { after: 150 } }));
              }

              return [p, ...extras];
            });

            return [...sectionHeader, ...questionParagraphs];
          })
        ]
      }]
    });

    Packer.toBlob(doc).then((blob) => {
      const rawSchool = headerData.schoolName || 'School';
      const rawTitle = headerData.examTitle || 'Exam';
      const rawGrade = headerData.grade || '';
      const rawSubject = headerData.subject || '';
      const cleanName = `${rawSchool}_${rawGrade}_${rawSubject}_${rawTitle}`
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .replace(/__+/g, '_');

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${cleanName}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  };

  const instructionLines = headerData.instructions
    ? headerData.instructions.split('\n').filter((l) => l.trim())
    : [];

  const renderQuestionsList = (section) => {
    const items = [];
    const questionsList = section.questions || [];

    if (section.type === 'MATCH') {
      const totalSectionMarks = section.numQuestions * section.marksPerQuestion;
      const scrambledB = getStableShuffledMatch(questionsList);
      items.push(
        <div className="sheet-q-row" key="match-unified">
          <div className="sheet-q-num">1.</div>
          <div className="sheet-q-body">
            <div style={{ marginBottom: '8px' }}>Match the following columns:</div>
            <table className="sheet-match-table">
              <thead>
                <tr>
                  <th style={{ width: '50%', textAlign: 'left' }}>Column A</th>
                  <th style={{ width: '50%', textAlign: 'left' }}>Column B</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: section.numQuestions }).map((_, idx) => {
                  const q = questionsList[idx] || {};
                  return (
                    <tr key={idx}>
                      <td>
                        {(() => {
                          const raw = (q.columnA || '').replace(/^\s*\d+[\.\s\-)]+\s*/, '').trim();
                          return `${idx + 1}. ${raw || '____________________'}`;
                        })()}
                      </td>
                      <td>
                        {scrambledB[idx] || `${String.fromCharCode(97 + idx)}. ____________________`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="sheet-q-marks">({totalSectionMarks})</div>
        </div>
      );
      return items;
    }

    questionsList.forEach((q, qIdx) => {
      const displayNum = q.originalIndex || (qIdx + 1);
      items.push(
        <div className="sheet-q-row" key={q.id || displayNum}>
          <div className="sheet-q-num">{displayNum}.</div>
          <div className="sheet-q-body">
            {renderQuestionBody(section.id, section.type, displayNum, q)}
          </div>
          <div className="sheet-q-marks">({section.marksPerQuestion})</div>
        </div>
      );
    });
    return items;
  };

  const renderQuestionBody = (sectionId, type, num, q) => {
    const resolvedType = type;
    const textVal = q.text ? q.text : '_______________';

    const renderText = (fallback) => {
      const displayVal = q.text ? q.text : fallback;
      return (
        <div
          className={isEditMode ? 'editable-text-active' : ''}
          contentEditable={isEditMode}
          suppressContentEditableWarning={true}
          onBlur={(e) => {
            if (isEditMode) {
              const val = e.target.innerText.trim();
              if (val !== q.text) {
                handleQuestionTextChange(sectionId, q.id, val);
              }
            }
          }}
          style={{
            outline: isEditMode ? '1px dashed #ccc' : 'none',
            padding: isEditMode ? '2px 4px' : '0',
            margin: isEditMode ? '-2px -4px' : '0',
            borderRadius: '2px',
            minHeight: '1.2em',
            display: 'block',
            width: '100%',
            cursor: isEditMode ? 'text' : 'inherit'
          }}
        >
          {displayVal}
        </div>
      );
    };

    switch (resolvedType) {
      case 'MCQ': {
        const opts = q.options && q.options.some((o) => o.trim())
          ? q.options
          : ['____', '____', '____', '____'];
        return (
          <>
            {renderText('_______________')}
            <div className="sheet-mcq-options">
              {[0, 1, 2, 3].map((optIdx) => (
                <div key={optIdx} style={{ display: 'flex', alignItems: 'flex-start' }}>
                  <span style={{ marginRight: '6px' }}>({String.fromCharCode(97 + optIdx)})</span>
                  <div
                    className={isEditMode ? 'editable-text-active' : ''}
                    contentEditable={isEditMode}
                    suppressContentEditableWarning={true}
                    onBlur={(e) => {
                      if (isEditMode) {
                        const val = e.target.innerText.trim();
                        if (val !== opts[optIdx]) {
                          handleOptionTextChange(sectionId, q.id, optIdx, val);
                        }
                      }
                    }}
                    style={{
                      outline: isEditMode ? '1px dashed #ccc' : 'none',
                      padding: isEditMode ? '2px 4px' : '0',
                      margin: isEditMode ? '-2px -4px' : '0',
                      borderRadius: '2px',
                      minHeight: '1.2em',
                      flex: 1,
                      cursor: isEditMode ? 'text' : 'inherit'
                    }}
                  >
                    {opts[optIdx] || '____'}
                  </div>
                </div>
              ))}
            </div>
          </>
        );
      }
      case 'FIB':
        return renderText('Fill in the blank: _______________');
      case 'TF':
        return renderText('State True or False: _______________');
      case 'SA':
        return (
          <div className="sheet-write-lines" style={{ marginTop: '4px' }}>
            {renderText('_______________')}
            <div className="sheet-write-line" style={{ borderBottom: '1px solid #888', height: '24px' }} />
            <div className="sheet-write-line" style={{ borderBottom: '1px solid #888', height: '24px' }} />
          </div>
        );
      case 'LA':
        return (
          <div className="sheet-write-lines" style={{ marginTop: '4px' }}>
            {renderText('_______________')}
            <div className="sheet-write-line" style={{ borderBottom: '1px solid #888', height: '24px' }} />
            <div className="sheet-write-line" style={{ borderBottom: '1px solid #888', height: '24px' }} />
            <div className="sheet-write-line" style={{ borderBottom: '1px solid #888', height: '24px' }} />
            <div className="sheet-write-line" style={{ borderBottom: '1px solid #888', height: '24px' }} />
            <div className="sheet-write-line" style={{ borderBottom: '1px solid #888', height: '24px' }} />
          </div>
        );
      case 'DRAW':
        return (
          <div style={{ marginTop: '4px' }}>
            {renderText('_______________')}
            <div className="blank-area"></div>
          </div>
        );
      case 'SOLVE':
        return (
          <div style={{ marginTop: '4px' }}>
            {renderText('_______________')}
            <div className="blank-lines"></div>
            <div className="blank-lines"></div>
            <div className="blank-lines"></div>
            <div className="blank-lines"></div>
          </div>
        );
      default:
        return renderText('_______________');
    }
  };

  const renderAnswerKeyBody = (type, q) => {
    if (!q.answer) {
      return <div style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>No answer key specified.</div>;
    }

    if (type === 'MCQ') {
      return (
        <div style={{ fontWeight: 600, color: 'var(--primary)' }}>
          Correct Option: ({q.answer.toLowerCase()}) {q.options?.[q.answer.toLowerCase().charCodeAt(0) - 97] || ''}
        </div>
      );
    }

    return (
      <div style={{ padding: '6px 12px', borderLeft: '3px solid var(--primary)', backgroundColor: 'rgba(0,0,0,0.02)', fontSize: '0.85rem' }}>
        {q.answer}
      </div>
    );
  };

  return (
    <div>
      {/* Tag row */}
      {!isLiveMini && (
        <div className="tag-row">
          {headerData.grade && <span className="tag-badge">Grade: {headerData.grade}</span>}
          {headerData.subject && <span className="tag-badge">{headerData.subject}</span>}
          {headerData.examType && <span className="tag-badge">{headerData.examType}</span>}
          {headerData.duration && <span className="tag-badge">{headerData.duration}</span>}
          {headerData.totalMarks && <span className="tag-badge">Total marks: {headerData.totalMarks}</span>}
        </div>
      )}

      {/* Sub-tab navigation */}
      {!isLiveMini && (
        <div className="no-print" style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px', borderBottom: '0.5px solid var(--border-color)', paddingBottom: '16px' }}>
          
          {/* Tab Selection Row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginRight: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>View Mode:</span>
            <div className="segmented-control">
              <button 
                type="button"
                className={`control-btn ${activeSubTab === 'paper' ? 'active' : ''}`} 
                onClick={() => setActiveSubTab('paper')}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                Question Paper
              </button>
              <button 
                type="button"
                className={`control-btn ${activeSubTab === 'answers' ? 'active' : ''}`} 
                onClick={() => setActiveSubTab('answers')}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>
                Answer Key
              </button>
              <button 
                type="button"
                className={`control-btn ${activeSubTab === 'keypoints' ? 'active' : ''}`} 
                onClick={() => setActiveSubTab('keypoints')}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                Syllabus Topics
              </button>
            </div>
          </div>

          {/* Actions Row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginRight: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Actions:</span>
            {activeSubTab === 'paper' && (
              <button 
                className={`btn ${isEditMode ? 'btn-primary' : 'btn-secondary'}`} 
                onClick={() => setIsEditMode(!isEditMode)}
                style={{ display: 'inline-flex', alignItems: 'center' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                {isEditMode ? 'Finish Editing' : 'Edit Paper Inline'}
              </button>
            )}
            <button className="btn btn-secondary" onClick={handlePrint} style={{ display: 'inline-flex', alignItems: 'center' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
              Print Paper
            </button>
            <button className="btn btn-secondary" onClick={handleDownloadPDF}>
              Download PDF
            </button>
            {activeSubTab === 'paper' && (
              <button className="btn btn-secondary" onClick={handleDownloadWord}>
                Download Word (.docx)
              </button>
            )}
            {activeSubTab === 'paper' && (
              <button className="btn btn-secondary" onClick={handleCopyText}>
                {copied ? 'Copied!' : 'Copy Paper as Text'}
              </button>
            )}
            {activeSubTab === 'answers' && (
              <button className="btn btn-secondary" onClick={handleCopyAnswers}>
                {copiedAnswers ? 'Copied!' : 'Copy Answers as Text'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* A4 Preview Sheet */}
      <div 
        className="preview-sheet-outer"
        style={isLiveMini ? {
          transform: 'scale(0.8)',
          transformOrigin: 'top center',
          width: '125%', // Compensate for scale down width shrinkage
          boxShadow: 'none',
          border: 'none',
          padding: 0,
          margin: 0
        } : {}}
      >

        {/* ══════════════════════════════════════
            TAB: QUESTION PAPER — Multi-page A4
            ══════════════════════════════════════ */}
        {activeSubTab === 'paper' && (
          <div id="printable-exam-paper" className={flash ? 'preview-updated-flash' : ''} style={{ display: 'flex', flexDirection: 'column', gap: '0', width: '100%', alignItems: 'center' }}>
            {paginatedSections.map((page, pIdx) => (
                <React.Fragment key={pIdx}>
                  <div className="preview-sheet-page">
                    {page.showSchoolHeader && (
                      <div className="sheet-header">
                        <div className="sheet-school">{headerData.schoolName || 'SCHOOL NAME'}</div>
                        <div className="sheet-title">{headerData.examTitle || 'EXAMINATION'}</div>
                        <div className="sheet-meta-row">
                          <span><strong>CLASS:</strong> {headerData.grade || '—'}</span>
                          <span><strong>SUBJECT:</strong> {headerData.subject || '—'}</span>
                          <span><strong>MAX MARKS:</strong> {headerData.totalMarks || '—'}</span>
                          <span><strong>DURATION:</strong> {headerData.duration || '—'}</span>
                          <span><strong>DATE:</strong> {headerData.dateOfExam || '—'}</span>
                        </div>
                      </div>
                    )}

                    {page.showStudentBox && (
                      <div className="sheet-student-box">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', fontSize: '0.95rem', padding: '4px' }}>
                          <div style={{ display: 'flex', gap: '40px' }}>
                            <div style={{ display: 'flex', flex: 1.5, alignItems: 'flex-end' }}>
                              <strong style={{ whiteSpace: 'nowrap', marginRight: '8px' }}>Candidate Name:</strong>
                              <div style={{ flex: 1, borderBottom: '1px solid #000', height: '1.2em' }}></div>
                            </div>
                            <div style={{ display: 'flex', flex: 1, alignItems: 'flex-end' }}>
                              <strong style={{ whiteSpace: 'nowrap', marginRight: '8px' }}>Roll Number:</strong>
                              <div style={{ flex: 1, borderBottom: '1px solid #000', height: '1.2em' }}></div>
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '40px' }}>
                            <div style={{ display: 'flex', flex: 1, alignItems: 'flex-end' }}>
                              <strong style={{ whiteSpace: 'nowrap', marginRight: '8px' }}>Candidate Signature:</strong>
                              <div style={{ flex: 1, borderBottom: '1px solid #000', height: '1.2em' }}></div>
                            </div>
                            <div style={{ display: 'flex', flex: 1, alignItems: 'flex-end' }}>
                              <strong style={{ whiteSpace: 'nowrap', marginRight: '8px' }}>Invigilator Signature:</strong>
                              <div style={{ flex: 1, borderBottom: '1px solid #000', height: '1.2em' }}></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {page.showInstructions && instructionLines.length > 0 && (
                      <div className="sheet-instructions">
                        <div className="instructions-title">INSTRUCTIONS TO CANDIDATES:</div>
                        <ol style={{ paddingLeft: '18px', margin: '4px 0 0 0' }}>
                          {instructionLines.map((line, idx) => <li key={idx}>{line}</li>)}
                        </ol>
                      </div>
                    )}

                    {page.sections.map((secSegment) => {
                      const total = secSegment.numQuestions * secSegment.marksPerQuestion;
                      return (
                        <div className="sheet-section" key={secSegment.sectionId}>
                          {secSegment.showHeader ? (
                            <div className="sheet-section-header">
                              <div className="sheet-section-name">SECTION {secSegment.label}</div>
                              <div className="sheet-section-desc">{secSegment.title.toUpperCase()}</div>
                              <div className="sheet-section-marks">[{secSegment.numQuestions} Questions × {secSegment.marksPerQuestion} Mark(s) = {total} Marks]</div>
                            </div>
                          ) : null}
                          <div className="sheet-question-list">
                            {renderQuestionsList({ 
                              id: secSegment.sectionId,
                              type: secSegment.type,
                              marksPerQuestion: secSegment.marksPerQuestion,
                              numQuestions: secSegment.numQuestions,
                              questions: secSegment.questions
                            })}
                          </div>
                        </div>
                      );
                    })}

                    {page.showSignature && sections.length > 0 && (
                      <div style={{ position: 'absolute', bottom: '12mm', left: '15mm', right: '15mm', display: 'flex', justifyContent: 'space-between', paddingTop: '15px', borderTop: '1.5px solid #000', pageBreakInside: 'avoid', fontSize: '0.98rem' }}>
                        <div><strong>Signature of Examiner</strong></div>
                        <div><strong>Signature of Principal</strong></div>
                      </div>
                    )}

                    <div className="sheet-footer" style={{ position: 'absolute', bottom: '5mm', left: '15mm', right: '15mm', borderTop: '0.5px solid #888888', display: 'flex', justifyContent: 'flex-end', fontSize: '0.72rem', color: '#666666', fontFamily: 'var(--font-academic)', zIndex: 10 }}>
                      <span>Page {pIdx + 1} of {paginatedSections.length}</span>
                    </div>
                  </div>

                  {pIdx < paginatedSections.length - 1 && (
                    <div className="preview-page-break-indicator no-print" />
                  )}
                </React.Fragment>
              ))}
          </div>
        )}


        {/* ══════════════════════════════════════
            TAB: ANSWER KEY — Single sheet
            ══════════════════════════════════════ */}
        {activeSubTab === 'answers' && (
          <div className={`preview-sheet-inner ${flash ? 'preview-updated-flash' : ''}`} id="printable-answers-paper">
            <div className="sheet-header">
              <div className="sheet-school">{headerData.schoolName || 'SCHOOL NAME'}</div>
              <div className="sheet-title" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span>{headerData.examTitle || 'EXAMINATION'}</span>
                <span style={{ fontSize: '0.9rem', letterSpacing: '2px', fontWeight: 'bold' }}>ANSWER KEY / SOLUTIONS</span>
              </div>
              <table className="sheet-meta-table">
                <tbody>
                  <tr>
                    <td><strong>CLASS:</strong> {headerData.grade || '—'}</td>
                    <td><strong>SUBJECT:</strong> {headerData.subject || '—'}</td>
                    <td><strong>MAX MARKS:</strong> {headerData.totalMarks || '—'}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {sections.map((section, sIdx) => {
              const label = getSectionLabel(sIdx);
              const displayName = section.title || TYPE_DISPLAY[section.type] || section.type;
              const resolvedFormat = getQuestionFormat(section);
              return (
                <div className="sheet-section" key={section.id} style={{ pageBreakInside: 'avoid' }}>
                  <div className="sheet-section-header" style={{ borderBottom: '1px solid #333' }}>
                    <div className="sheet-section-name">SECTION {label}</div>
                    <div className="sheet-section-desc">{displayName.toUpperCase()} — ANSWERS</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '12px' }}>
                    {resolvedFormat === 'MATCH' ? (
                      // For MATCH: show one answer block with all pairs
                      <div>
                        <div style={{ fontWeight: 'bold' }}>Match the Following — Correct Pairs:</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', paddingLeft: '14px', marginTop: '6px' }}>
                          {(section.questions || []).map((matchQ, matchIdx) => {
                            const rawA = (matchQ.columnA || '').replace(/^\s*\d+[\.\s\-)]+\s*/, '').trim() || '___';
                            const rawB = (matchQ.columnB || '').replace(/^\s*[a-gA-G][\.\s\-)]+\s*/, '').trim() || '___';
                            return (
                              <div key={matchQ.id || matchIdx} style={{ fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ minWidth: '16px' }}>{matchIdx + 1}.</span>
                                <span>{rawA} → {rawB}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      (section.questions || []).map((q, idx) => (
                        <div key={q.id || idx} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <div style={{ fontWeight: 'bold' }}>Q{idx + 1}. {q.text || '—'}</div>
                          {renderAnswerKeyBody(resolvedFormat, q)}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ══════════════════════════════════════
            TAB: KEY POINTS — Single sheet
            ══════════════════════════════════════ */}
        {activeSubTab === 'keypoints' && syllabusData?.topics && (
          <div className="preview-sheet-inner" id="printable-keypoints-paper">
            <div className="sheet-header">
              <div className="sheet-school">{headerData.schoolName || 'SCHOOL NAME'}</div>
              <div className="sheet-title" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span>{headerData.examTitle || 'EXAMINATION'}</span>
                <span style={{ fontSize: '0.9rem', letterSpacing: '2px', fontWeight: 'bold' }}>STUDY GUIDE &amp; KEY POINTS</span>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '16px' }}>
              {syllabusData.topics.filter(t => t.enabled).map((topic, tIdx) => (
                <div key={topic.id} style={{ pageBreakInside: 'avoid', border: '0.5px solid #ccc', borderRadius: '4px', padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1.5px solid #333', paddingBottom: '4px', marginBottom: '8px' }}>
                    <span style={{ fontWeight: 'bold', fontSize: '1rem' }}>Topic {tIdx + 1}: {topic.name}</span>
                    <span style={{ fontSize: '0.78rem', fontWeight: 600 }}>Difficulty: {topic.difficulty}</span>
                  </div>
                  <ul style={{ margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {topic.keyPoints.map((point, pIdx) => (
                      <li key={pIdx} style={{ fontSize: '0.88rem', lineHeight: '1.4' }}>{point}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}


