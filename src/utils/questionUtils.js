// Infer question format from section title for CUSTOM sections
export const inferFormatFromTitle = (title) => {
  if (!title) return null;
  const t = title.toLowerCase();
  if (t.includes('match') || t.includes('column') || t.includes('pair')) return 'MATCH';
  if (t.includes('fill') || t.includes('blank')) return 'FIB';
  if (t.includes('true') || t.includes('false') || t.includes('state whether')) return 'TF';
  if (t.includes('draw') || t.includes('label') || t.includes('diagram')) return 'DRAW';
  if (t.includes('solve') || t.includes('calculat') || t.includes('comput')) return 'SOLVE';
  if (t.includes('long') || t.includes('essay') || t.includes('explain in detail') || t.includes('describe in detail')) return 'LA';
  if (t.includes('mcq') || t.includes('multiple choice') || t.includes('choose the correct')) return 'MCQ';
  if (t.includes('short') || t.includes('answer in brief') || t.includes('answer briefly')) return 'SA';
  return null;
};

// Resolve the actual question format for a section
export const getQuestionFormat = (section) => {
  if (section.type === 'CUSTOM') {
    const titleFormat = inferFormatFromTitle(section.title);
    if (titleFormat) return titleFormat;
    return section.questionFormat || 'SA';
  }
  return section.type;
};
