import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { db } from '../firebase';
import { collection, writeBatch, query, where, getDocs, doc, setDoc, getDoc } from 'firebase/firestore';
import '../App.css';

export default function ImportVolunteers() {
  const [file, setFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState({ success: 0, skippedExists: 0, skippedInvalid:0, errors: 0, errorDetails: [] });

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setResults({ success: 0, skippedExists: 0, skippedInvalid:0, errors: 0, errorDetails: [] });
  };

  const processImport = async () => {
    if (!file) {
      alert("Please select a file first.");
      return;
    }
    setImporting(true);
    const newResults = { success: 0, skippedExists: 0, skippedInvalid:0, errors: 0, errorDetails: [] };

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 }); // header:1 gives array of arrays

        if (data.length < 2) { // Header + at least one data row
          newResults.errorDetails.push({ row: 0, error: "Sheet is empty or has no data rows." });
          setResults(newResults);
          setImporting(false);
          return;
        }

        const headers = data[0].map(h => String(h).trim());
        // Expected headers (adjust as per your Excel file)
        const expectedHeaders = ["NV_ID", "Roll_No", "firstName", "lastName", "email", "phone", "Branch", "UNIT"];
        // Validate headers (optional but good practice)
        // ... header validation logic ...

        const volunteersRef = collection(db, "Volunteers");
        let batch = writeBatch(db);
        let batchCounter = 0;

        for (let i = 1; i < data.length; i++) { // Start from 1 to skip header row
          const row = data[i];
          const volunteerData = {};
          headers.forEach((header, index) => {
            volunteerData[header] = row[index] !== undefined ? String(row[index]).trim() : "";
          });

          const nvId = volunteerData.NV_ID;
          const rollNo = volunteerData.Roll_No;

          if (!nvId || !rollNo) {
            newResults.skippedInvalid++;
            newResults.errorDetails.push({ row: i + 1, nvId, error: "Missing NV_ID or Roll_No." });
            continue;
          }

          // Check for existing NV_ID in Volunteers
          const volunteerDocRef = doc(db, "Volunteers", nvId);
          const volunteerDocSnap = await getDoc(volunteerDocRef);

          if (volunteerDocSnap.exists()) {
            newResults.skippedExists++;
            newResults.errorDetails.push({ row: i + 1, nvId, error: `NV_ID ${nvId} already exists.` });
            // Still ensure NAPs/vLOGs exist for this existing volunteer if you want to be thorough
            await ensureNapsAndVLogsExistForRow(nvId, rollNo, volunteerData.UNIT, batch);
            batchCounter++; // Count this as an operation for batching
            continue;
          }

          // Check for existing Roll_No in Volunteers
          const qRollNo = query(volunteersRef, where("Roll_No", "==", rollNo));
          const rollNoSnapshot = await getDocs(qRollNo);
          if (!rollNoSnapshot.empty) {
            newResults.skippedExists++;
            newResults.errorDetails.push({ row: i + 1, nvId, rollNo, error: `Roll_No ${rollNo} already exists.` });
            continue;
          }
          
          // Add to Volunteers collection
          // Use NV_ID as document ID
          batch.set(volunteerDocRef, { ...volunteerData, DateJoined: new Date() });
          batchCounter++;

          // Ensure NAPs and vLOGs entries using NV_ID as document ID
          await ensureNapsAndVLogsExistForRow(nvId, rollNo, volunteerData.UNIT, batch);
          batchCounter += 2; // Potentially 2 more set operations

          newResults.success++;

          if (batchCounter >= 490) { // Firestore batch limit is 500
            await batch.commit();
            batch = writeBatch(db); // Reinitialize batch
            batchCounter = 0;
          }
        }

        if (batchCounter > 0) {
          await batch.commit();
        }
        alert(`Import finished. Success: ${newResults.success}, Skipped (Exists): ${newResults.skippedExists}, Skipped (Invalid): ${newResults.skippedInvalid}, Errors: ${newResults.errors}`);
      } catch (error) {
        console.error("Error processing file:", error);
        newResults.errors++;
        newResults.errorDetails.push({ row: 'General', error: error.message });
        alert("Error during import: " + error.message);
      } finally {
        setResults(prev => ({
            success: prev.success + newResults.success,
            skippedExists: prev.skippedExists + newResults.skippedExists,
            skippedInvalid: prev.skippedInvalid + newResults.skippedInvalid,
            errors: prev.errors + newResults.errors,
            errorDetails: [...prev.errorDetails, ...newResults.errorDetails]
        }));
        setImporting(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  // Helper to ensure NAPs/vLOGs for import, using NV_ID as document ID
  const ensureNapsAndVLogsExistForRow = async (nvId, rollNo, unit, batchInstance) => {
    // NAPs: Use NV_ID as document ID
    const napDocRef = doc(db, "NAPs", nvId);
    const napDocSnap = await getDoc(napDocRef); // Check if it exists first
    if (!napDocSnap.exists()) {
        const napData = { NV_ID: nvId, Roll_No: rollNo || "", Unit: unit || "", TotalNAPs: 0 };
        for (let k = 1; k <= 19; k++) napData[k.toString()] = 0;
        batchInstance.set(napDocRef, napData);
    }

    // vLOGs: Use NV_ID as document ID
    const vLogDocRef = doc(db, "vLOGs", nvId);
    const vLogDocSnap = await getDoc(vLogDocRef); // Check if it exists first
    if (!vLogDocSnap.exists()) {
        batchInstance.set(vLogDocRef, { NV_ID: nvId, logs: [] });
    }
  };


  return (
    <div className="card">
      <h2 className="page-title">Import Volunteers from Excel</h2>
      <div className="form-group">
        <label htmlFor="volunteerFile" className="form-label">Upload .xlsx or .csv file</label>
        <input type="file" id="volunteerFile" className="form-input" accept=".xlsx, .csv" onChange={handleFileChange} />
      </div>
      <button onClick={processImport} className="btn btn-primary" disabled={importing || !file}>
        {importing ? 'Importing...' : 'Start Import'}
      </button>
      { (results.success > 0 || results.skippedExists > 0 || results.skippedInvalid > 0 || results.errors > 0) &&
        <div className="import-results card" style={{marginTop: '1rem'}}>
          <h4>Import Summary:</h4>
          <p>Successfully Imported: {results.success}</p>
          <p>Skipped (Already Existed by NV_ID/Roll_No): {results.skippedExists}</p>
          <p>Skipped (Invalid Data - Missing NV_ID/Roll_No): {results.skippedInvalid}</p>
          <p>Errors during processing: {results.errors}</p>
          {results.errorDetails.length > 0 && (
            <div>
              <h5>Details:</h5>
              <ul style={{maxHeight: '200px', overflowY: 'auto'}}>
                {results.errorDetails.slice(0, 20).map((err, i) => <li key={i}>Row {err.row}: {err.nvId ? `(NV_ID: ${err.nvId})` : ''} {err.error}</li>)}
                {results.errorDetails.length > 20 && <li>...and {results.errorDetails.length - 20} more.</li>}
              </ul>
            </div>
          )}
        </div>
      }
    </div>
  );
}