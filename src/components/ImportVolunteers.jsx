import React, { useState } from 'react';
import { db } from '../firebase';
import { collection, addDoc, writeBatch, doc } from 'firebase/firestore';
import * as XLSX from 'xlsx';

// Database fields matching the Volunteers collection
const dbFields = ['S_No', 'Name', 'Roll_No', 'Club_Designation', 'Role', 'Branch', 'Section', 'Mail', 'Number', 'UNIT', 'Blood_Group', 'Address', 'NV_ID', 'IMG_LINK', 'Paid', 'Barcode'];

export default function ImportVolunteers() {
  const [file, setFile] = useState(null);
  const [headers, setHeaders] = useState([]);
  const [mappings, setMappings] = useState({});
  const [previewData, setPreviewData] = useState([]);
  const [sheetData, setSheetData] = useState(null);
  const [step, setStep] = useState(1); // 1: Upload, 2: Mapping, 3: Result
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState({ success: 0, failed: 0 });

  // Handle file upload
  const handleFileUpload = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;
    
    setFile(selectedFile);
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Get first worksheet
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        // Ensure there's data
        if (jsonData.length < 2) {
          alert('Excel file must have headers and at least one data row');
          return;
        }
        
        // Extract headers
        const excelHeaders = jsonData[0];
        
        // Create initial mappings with smart matching
        const initialMappings = {};
        dbFields.forEach(field => {
          // Try to find a matching header (case insensitive, ignoring spaces/underscores)
          const matchedHeader = excelHeaders.find(
            header => String(header).toLowerCase().replace(/[_\s]/g, '') === 
                     field.toLowerCase().replace(/[_\s]/g, '')
          );
          initialMappings[field] = matchedHeader || '';
        });
        
        setHeaders(excelHeaders);
        setMappings(initialMappings);
        setPreviewData(jsonData.slice(1, 5)); // First 4 data rows for preview
        setSheetData(jsonData);
        setStep(2); // Move to mapping step
      } catch (error) {
        console.error('Error parsing Excel file:', error);
        alert('Failed to process the Excel file: ' + error.message);
      }
    };
    
    reader.readAsArrayBuffer(selectedFile);
  };

  // Handle mapping change
  const handleMappingChange = (dbField, excelHeader) => {
    setMappings(prev => ({
      ...prev,
      [dbField]: excelHeader
    }));
  };

  // Import volunteers
  const handleImport = async () => {
    if (!sheetData || sheetData.length < 2) {
      alert('No data to import');
      return;
    }

    setLoading(true);
    const excelHeaders = sheetData[0];
    const rows = sheetData.slice(1);
    let successCount = 0;
    let failedCount = 0;
    
    try {
      // Use batch writes for efficiency (max 500 operations per batch)
      const BATCH_SIZE = 400;
      let batch = writeBatch(db);
      let operationCount = 0;
      
      for (const row of rows) {
        // Skip empty rows
        if (!row.length) continue;
        
        const volunteerData = {};
        
        // Map Excel columns to database fields
        for (const [dbField, excelHeader] of Object.entries(mappings)) {
          if (excelHeader) {
            const columnIndex = excelHeaders.indexOf(excelHeader);
            if (columnIndex !== -1) {
              let value = row[columnIndex];
              
              // Handle special field conversions
              if (dbField === 'Paid' && typeof value === 'string') {
                value = value.toLowerCase() === 'true' || value === '1' || value.toLowerCase() === 'yes';
              } else if (value === undefined) {
                value = '';
              }
              
              volunteerData[dbField] = value;
            }
          }
        }
        
        // Skip if missing essential data
        if (!volunteerData.NV_ID) {
          failedCount++;
          continue;
        }
        
        try {
          // Add volunteer document
          const docRef = doc(collection(db, 'Volunteers'));
          batch.set(docRef, volunteerData);
          operationCount++;
          console.log(operationCount,'inserted');
          
          // Also initialize NAP_Points for this volunteer
          const napRef = doc(collection(db, 'NAP_Points'));
          batch.set(napRef, {
            NV_ID: volunteerData.NV_ID,
            Roll_No: volunteerData.Roll_No || '',
            UNIT: volunteerData.UNIT || '',
            Total_NAPs: 0
          });
          operationCount++;
          
          successCount++;
          
          // Commit batch if reaching limit
          if (operationCount >= BATCH_SIZE) {
            await batch.commit();
            batch = writeBatch(db);
            operationCount = 0;
          }
        } catch (err) {
          failedCount++;
        }
      }
      
      // Commit final batch
      if (operationCount > 0) {
        await batch.commit();
      }
      
      setResult({ success: successCount, failed: failedCount });
      setStep(3); // Move to results step
    } catch (error) {
      console.error('Error importing volunteers:', error);
      alert('Failed to import volunteers: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Reset the form
  const handleReset = () => {
    setFile(null);
    setHeaders([]);
    setMappings({});
    setPreviewData([]);
    setSheetData(null);
    setStep(1);
    setResult({ success: 0, failed: 0 });
  };

return (
    <div className="p-4 max-w-4xl mx-auto">
        <h2 className="text-xl font-bold mb-4">Import Volunteers from Excel</h2>
        
        {step === 1 && (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <h3 className="mt-2 text-sm font-medium text-gray-900">Upload Excel File</h3>
                <p className="mt-1 text-sm text-gray-500">
                    File should include volunteer information in columns
                </p>
                <div className="mt-4">
                    <input
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={handleFileUpload}
                        className="block w-full text-sm text-gray-500 
                            file:mr-4 file:py-2 file:px-4
                            file:rounded-md file:border-0
                            file:text-sm file:font-medium
                            file:bg-blue-50 file:text-blue-700
                            hover:file:bg-blue-100"
                    />
                </div>
            </div>
        )}
        
        {step === 2 && (
            <div>
                <div className="mb-6 bg-blue-50 border-l-4 border-blue-500 p-4">
                    <p className="text-sm text-blue-700">
                        Map each database field to the corresponding column in your Excel file. 
                        Fields that couldn't be automatically matched need to be selected manually.
                    </p>
                </div>
                
                <h3 className="font-medium text-lg mb-2">Data Preview</h3>
                <div className="overflow-x-auto mb-6 border rounded">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                {headers.map((header, idx) => (
                                    <th key={idx} className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider text-left">
                                        {header}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {previewData.map((row, rowIdx) => (
                                <tr key={rowIdx} className={rowIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                    {headers.map((_, colIdx) => (
                                        <td key={colIdx} className="px-3 py-2 text-xs text-gray-500 whitespace-nowrap">
                                            {row[colIdx]}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                
                <h3 className="font-medium text-lg mb-4">Map Fields</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                    {dbFields.map(field => (
                        <div key={field} className="mb-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {field}
                            </label>
                            <select
                                value={mappings[field] || ''}
                                onChange={(e) => handleMappingChange(field, e.target.value)}
                                className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
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
                
                <div className="flex justify-between mt-6">
                    <button
                        onClick={handleReset}
                        className="bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleImport}
                        disabled={loading}
                        className={`${loading 
                            ? 'bg-blue-300' 
                            : 'bg-blue-600 hover:bg-blue-700'} text-white py-2 px-6 rounded flex items-center`}
                    >
                        {loading ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-2 h-[100px] w-[100px] text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Importing...
                            </>
                        ) : 'Import Volunteers'}
                    </button>
                </div>
            </div>
        )}
        
        {step === 3 && (
            <div className="text-center py-8">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                    <svg className="h-[10px] w-[100px] text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                </div>
                <h3 className="mt-3 text-lg font-medium text-gray-900">Import Complete</h3>
                <div className="mt-2">
                    <p className="text-sm text-gray-500">
                        Successfully imported {result.success} volunteers.
                        {result.failed > 0 && ` Failed to import ${result.failed} volunteers.`}
                    </p>
                </div>
                <div className="mt-6">
                    <button
                        onClick={handleReset}
                        className="inline-flex justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                    >
                        Import Another File
                    </button>
                </div>
            </div>
        )}
    </div>
);
}