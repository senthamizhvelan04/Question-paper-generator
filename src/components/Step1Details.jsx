import React, { useState, useEffect } from 'react';

const EditableSelect = ({ label, field, value, options, onChange, placeholder }) => {
  const predefined = options.map(o => String(o.value));
  const isCustomValue = value !== '' && value !== undefined && !predefined.includes(String(value));
  const [isCustomMode, setIsCustomMode] = useState(isCustomValue);

  useEffect(() => {
    if (value !== '' && value !== undefined && !predefined.includes(String(value))) {
      setIsCustomMode(true);
    }
  }, [value, predefined]);

  const handleSelectChange = (e) => {
    const val = e.target.value;
    if (val === '__OTHER__') {
      setIsCustomMode(true);
      onChange('');
    } else {
      setIsCustomMode(false);
      onChange(val);
    }
  };

  return (
    <div className="form-group">
      <label className="form-label">{label}</label>
      
      <select
        className="form-select"
        value={isCustomMode ? '__OTHER__' : value}
        onChange={handleSelectChange}
      >
        <option value="">{placeholder}</option>
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
        <option disabled>──────────</option>
        <option value="__OTHER__">Other (Specify manually)...</option>
      </select>

      {isCustomMode && (
        <div style={{ animation: 'toastSlideIn var(--dur-base) var(--ease-snap) forwards', transformOrigin: 'top' }}>
          <input
            type="text"
            className="form-input"
            style={{ 
              width: '100%', 
              marginTop: '4px',
              borderLeft: '3px solid var(--primary)',
              paddingLeft: '12px'
            }}
            placeholder={`Type custom ${label.toLowerCase()}...`}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            autoFocus
          />
        </div>
      )}
    </div>
  );
};

function Step1Details({ headerData, onChange }) {
  const handleChange = (field, value) => {
    const newData = { ...headerData, [field]: value };
    
    // Smart sync: Automatically update Exam Title when Exam Type changes,
    // but only if the user hasn't manually entered a completely custom title.
    if (field === 'examType') {
      const currentTitle = headerData.examTitle || '';
      const oldType = headerData.examType || '';
      
      const norm = (s) => s.toLowerCase().replace(/[-\s]/g, '');
      
      // If title is empty, or matches previous auto-generated titles, or is the initial default
      if (
        !currentTitle || 
        norm(currentTitle).includes(norm(oldType)) ||
        currentTitle === 'Mid-Term Examination 2026'
      ) {
        // Only append 'Examination' if it's a standard type like Mid Term, Final Term.
        // For 'Weekly Quiz' or 'Practice Test', appending Examination sounds weird.
        const suffix = (value.toLowerCase().includes('quiz') || value.toLowerCase().includes('test')) ? '' : ' Examination';
        const year = headerData.academicYear ? ` ${headerData.academicYear}` : '';
        newData.examTitle = value ? `${value}${suffix}${year}` : '';
      }
    }

    onChange(newData);
  };

  return (
    <div className="card">
      <h2 className="card-title">Paper details</h2>
      <div className="form-grid">
        <div className="form-group">
          <label className="form-label">School name</label>
          <input
            type="text"
            className="form-input"
            placeholder="Enter school name"
            value={headerData.schoolName || ''}
            onChange={(e) => handleChange('schoolName', e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Academic year</label>
          <input
            type="text"
            className="form-input"
            placeholder="e.g., 2025-2026"
            value={headerData.academicYear || ''}
            onChange={(e) => handleChange('academicYear', e.target.value)}
          />
        </div>

        <EditableSelect
          label="Grade"
          field="grade"
          value={headerData.grade || ''}
          onChange={(val) => handleChange('grade', val)}
          placeholder="Select grade"
          options={[
            { value: 'III', label: 'III' },
            { value: 'IV', label: 'IV' },
            { value: 'V', label: 'V' },
            { value: 'VI', label: 'VI' }
          ]}
        />

        <EditableSelect
          label="Subject"
          field="subject"
          value={headerData.subject || ''}
          onChange={(val) => handleChange('subject', val)}
          placeholder="Select subject"
          options={[
            { value: 'Mathematics', label: 'Mathematics' },
            { value: 'Science', label: 'Science' },
            { value: 'English', label: 'English' },
            { value: 'Social Studies', label: 'Social Studies' },
            { value: 'Computer Science', label: 'Computer Science' }
          ]}
        />

        <EditableSelect
          label="Exam type"
          field="examType"
          value={headerData.examType || ''}
          onChange={(val) => handleChange('examType', val)}
          placeholder="Select exam type"
          options={[
            { value: 'Unit Test', label: 'Unit Test' },
            { value: 'Mid Term', label: 'Mid Term' },
            { value: 'Final Term', label: 'Final Term' },
            { value: 'Practice Test', label: 'Practice Test' },
            { value: 'Weekly Quiz', label: 'Weekly Quiz' }
          ]}
        />

        <EditableSelect
          label="Duration"
          field="duration"
          value={headerData.duration || ''}
          onChange={(val) => handleChange('duration', val)}
          placeholder="Select duration"
          options={[
            { value: '30 minutes', label: '30 minutes' },
            { value: '45 minutes', label: '45 minutes' },
            { value: '1 hour', label: '1 hour' },
            { value: '1.5 hours', label: '1.5 hours' },
            { value: '2 hours', label: '2 hours' },
            { value: '3 hours', label: '3 hours' }
          ]}
        />

        <EditableSelect
          label="Total marks"
          field="totalMarks"
          value={headerData.totalMarks || ''}
          onChange={(val) => handleChange('totalMarks', val)}
          placeholder="Select marks"
          options={[
            { value: '10', label: '10' },
            { value: '20', label: '20' },
            { value: '25', label: '25' },
            { value: '30', label: '30' },
            { value: '40', label: '40' },
            { value: '50', label: '50' },
            { value: '80', label: '80' },
            { value: '100', label: '100' }
          ]}
        />

        <div className="form-group">
          <label className="form-label">Date of exam</label>
          <input
            type="date"
            className="form-input"
            value={headerData.dateOfExam || ''}
            onChange={(e) => handleChange('dateOfExam', e.target.value)}
          />
        </div>

        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
          <label className="form-label">Exam title</label>
          <input
            type="text"
            className="form-input"
            placeholder="e.g., Mid-Term Examination 2026"
            value={headerData.examTitle || ''}
            onChange={(e) => handleChange('examTitle', e.target.value)}
          />
        </div>

        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
          <label className="form-label">Special instructions</label>
          <textarea
            className="form-textarea"
            placeholder="Instructions for students..."
            value={headerData.instructions || ''}
            onChange={(e) => handleChange('instructions', e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}

export default Step1Details;
