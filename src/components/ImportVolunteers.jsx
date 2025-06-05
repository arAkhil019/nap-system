import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import "../App.css";

export default function ImportVolunteers() {
  const [file, setFile] = useState(null);
  const [headers, setHeaders] = useState([]);
  const [mappings, setMappings] = useState({});
  const [previewData, setPreviewData] = useState([]);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState({ success: 0, failed: 0 });
  
  // Define database fields
  const dbFields = [
    "NV_ID", 
    "firstName", 
    "lastName", 
    "email", 
    "phone", 
    "address", 
    "city", 
    "state", 
    "zipCode",
    "availability",
    "skills"
  ];

  const handleFileUpload = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;
    
    setFile(selectedFile);
    
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        if (jsonData.length < 2) {
          alert('File does not contain enough data');
          return;
        }
        
        const headers = jsonData[0];
        const preview = jsonData.slice(1, 6); // First 5 rows for preview
        
        setHeaders(headers);
        setPreviewData(preview);
        
        // Try auto-mapping headers
        const autoMappings = {};
        headers.forEach((header, index) => {
          const normalizedHeader = header.toLowerCase().trim();
          
          dbFields.forEach(field => {
            if (normalizedHeader === field.toLowerCase()) {
              autoMappings[field] = header;
            }
          });
        });
        
        setMappings(autoMappings);
        setStep(2);
      } catch (error) {
        console.error('Error reading Excel file:', error);
        alert('Failed to read Excel file: ' + error.message);
      }
    };
    
    reader.readAsArrayBuffer(selectedFile);
  };

  const handleMappingChange = (dbField, excelHeader) => {
    setMappings(prev => ({
      ...prev,
      [dbField]: excelHeader
    }));
  };

  const handleImport = async () => {
    setLoading(true);
    
    try {
      // Simulate import process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setResult({ success: 25, failed: 2 });
      setStep(3);
    } catch (error) {
      console.error('Import error:', error);
      alert('Import failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setHeaders([]);
    setMappings({});
    setPreviewData([]);
    setStep(1);
    setResult({ success: 0, failed: 0 });
  };

  return (
    <div className="card">
      <h2 className="page-title">Import Volunteers from Excel</h2>
      
      {step === 1 && (
        <div className="file-upload">
          <h3 className="section-title">Upload Excel File</h3>
          <p className="form-help-text">
            File should include volunteer information in columns
          </p>
          <div className="mt-4">
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileUpload}
              className="file-upload-input"
            />
          </div>
        </div>
      )}
      
      {step === 2 && (
        <div>
          <div className="message message-info">
            <p>
              Map each database field to the corresponding column in your Excel file. 
              Fields that couldn't be automatically matched need to be selected manually.
            </p>
          </div>
          
          <h3 className="section-title">Data Preview</h3>
          <div className="table-container mb-4">
            <table className="table">
              <thead>
                <tr>
                  {headers.map((header, idx) => (
                    <th key={idx}>{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewData.map((row, rowIdx) => (
                  <tr key={rowIdx}>
                    {headers.map((_, colIdx) => (
                      <td key={colIdx}>{row[colIdx]}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <h3 className="section-title">Map Fields</h3>
          <div className="form-grid" style={{gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))"}}>
            {dbFields.map(field => (
              <div key={field} className="form-group">
                <label className="form-label">
                  {field}
                </label>
                <select
                  value={mappings[field] || ''}
                  onChange={(e) => handleMappingChange(field, e.target.value)}
                  className="form-select"
                >
                  <option value="">-- Not Mapped --</option>
                  {headers.map((header, idx) => (
                    <option key={idx} value={header}>
                      {header}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
          
          <div className="flex justify-between mt-4">
            <button
              onClick={handleReset}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={loading}
              className={`btn btn-primary ${loading ? "disabled" : ""}`}
            >
              {loading ? (
                <>
                  <span className="spinner">⟳</span> Importing...
                </>
              ) : 'Import Volunteers'}
            </button>
          </div>
        </div>
      )}
      
      {step === 3 && (
        <div className="text-center" style={{padding: "32px 0"}}>
          <div className="flex items-center justify-center mb-2" style={{
            height: "48px",
            width: "48px", 
            borderRadius: "9999px", 
            backgroundColor: "#d1fae5",
            margin: "0 auto"
          }}>
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="#047857" style={{width: "24px", height: "24px"}}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="section-title">Import Complete</h3>
          <div className="mt-2">
            <p>
              Successfully imported {result.success} volunteers.
              {result.failed > 0 && ` Failed to import ${result.failed} volunteers.`}
            </p>
          </div>
          <div className="mt-4">
            <button
              onClick={handleReset}
              className="btn btn-primary"
            >
              Import Another File
            </button>
          </div>
        </div>
      )}
    </div>
  );
}