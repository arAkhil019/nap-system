import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, doc, getDoc, setDoc, getDocs, updateDoc, query, where, writeBatch, deleteDoc } from 'firebase/firestore'; // Ensure setDoc is imported
import '../App.css';

export default function SysConfig() {
  const [configData, setConfigData] = useState({
    currLOG: '',
    depts: [],
    subGroups: [],
    deptNAPs: {},
    sgNAPs: {},
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [activeTab, setActiveTab] = useState('general');

  const [newDept, setNewDept] = useState('');
  const [newSubGroup, setNewSubGroup] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [updatingStats, setUpdatingStats] = useState(false);
  const [syncingVolunteers, setSyncingVolunteers] = useState(false);
  const [resettingNAPs, setResettingNAPs] = useState(false); // New state for NAP reset

  const showMessage = (text, type) => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 7000); // Increased timeout for very important messages
  };

  const fetchConfigData = async () => {
    setLoading(true);
    try {
      const configRef = doc(db, "configs", "systemConfig");
      const configSnapshot = await getDoc(configRef);
      if (configSnapshot.exists()) {
        setConfigData((prev) => ({ ...prev, ...configSnapshot.data() }));
      } else {
        const defaultConfig = {
          currLOG: "LOG000001", // Default if not set
          depts: [],
          subGroups: [],
          deptNAPs: {},
          sgNAPs: {},
        };
        await setDoc(configRef, defaultConfig);
        setConfigData(defaultConfig);
        showMessage("Default system configuration created.", "info");
      }
    } catch (error) {
      console.error("Error fetching config:", error);
      showMessage(`Error fetching config: ${error.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfigData();
  }, []);

  const handleSaveConfig = async (updatedData = configData) => {
    setSaving(true);
    try {
      const configRef = doc(db, "configs", "systemConfig");
      await setDoc(configRef, updatedData, { merge: true });
      showMessage("Configuration saved successfully!", "success");
    } catch (error) {
      console.error("Error saving config:", error);
      showMessage(`Error saving config: ${error.message}`, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setConfigData((prev) => ({ ...prev, [name]: value }));
  };

  // Department Management
  const handleAddDept = async () => {
    if (newDept.trim() && !configData.depts.includes(newDept.trim())) {
      const updatedDepts = [...configData.depts, newDept.trim()];
      const updatedConfig = { ...configData, depts: updatedDepts };
      setConfigData(updatedConfig);
      await handleSaveConfig(updatedConfig); // Save immediately
      setNewDept("");
    } else if (configData.depts.includes(newDept.trim())) {
      showMessage("Department already exists.", "error");
    }
  };

  const handleRemoveDept = async (deptToRemove) => {
    const updatedDepts = configData.depts.filter((dept) => dept !== deptToRemove);
    const updatedConfig = { ...configData, depts: updatedDepts };
    setConfigData(updatedConfig);
    await handleSaveConfig(updatedConfig); // Save immediately
  };

  // SubGroup Management (similar to Department)
  const handleAddSubGroup = async () => {
    if (newSubGroup.trim() && !configData.subGroups.includes(newSubGroup.trim())) {
      const updatedSubGroups = [...configData.subGroups, newSubGroup.trim()];
      const updatedConfig = { ...configData, subGroups: updatedSubGroups };
      setConfigData(updatedConfig);
      await handleSaveConfig(updatedConfig); // Save immediately
      setNewSubGroup("");
    } else if (configData.subGroups.includes(newSubGroup.trim())) {
      showMessage("Sub-Group already exists.", "error");
    }
  };

  const handleRemoveSubGroup = async (sgToRemove) => {
    const updatedSubGroups = configData.subGroups.filter((sg) => sg !== sgToRemove);
    const updatedConfig = { ...configData, subGroups: updatedSubGroups };
    setConfigData(updatedConfig);
    await handleSaveConfig(updatedConfig); // Save immediately
  };

  const extractFromVolunteers = async () => {
    setExtracting(true);
    try {
      const volunteersRef = collection(db, "Volunteers"); // Ensure collection name is correct
      const volunteersSnapshot = await getDocs(volunteersRef);

      const departments = new Set(configData.depts);
      const units = new Set(configData.subGroups);

      volunteersSnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.Branch) departments.add(data.Branch.trim());
        if (data.UNIT) units.add(data.UNIT.trim());
      });

      const updatedConfig = {
        ...configData,
        depts: Array.from(departments).filter(Boolean).sort(),
        subGroups: Array.from(units).filter(Boolean).sort(),
      };
      setConfigData(updatedConfig);
      await handleSaveConfig(updatedConfig);
      showMessage("Departments and Sub-Groups extracted and updated.", "success");
    } catch (error) {
      console.error("Error extracting data:", error);
      showMessage(`Error extracting data: ${error.message}`, "error");
    } finally {
      setExtracting(false);
    }
  };

  const syncVolunteerDocuments = async () => {
    setSyncingVolunteers(true);
    showMessage('Syncing vLOGs/NAPs documents... This might take a moment.', 'info');
    try {
      const volunteersSnapshot = await getDocs(collection(db, "Volunteers"));
      let createdVLogs = 0;
      let createdNAPs = 0;
      let batch = writeBatch(db);
      let batchCounter = 0;

      for (const volunteerDoc of volunteersSnapshot.docs) {
        const volunteerData = volunteerDoc.data();
        const NV_ID = volunteerData.NV_ID;

        if (!NV_ID) continue;

        // Check and create vLOGs using NV_ID as document ID
        const vLogRef = doc(db, "vLOGs", NV_ID);
        const vLogSnap = await getDoc(vLogRef); // Efficiently check existence
        if (!vLogSnap.exists()) {
          batch.set(vLogRef, { NV_ID, logs: [] });
          createdVLogs++;
          batchCounter++;
        }

        // Check and create NAPs using NV_ID as document ID
        const napRef = doc(db, "NAPs", NV_ID);
        const napSnap = await getDoc(napRef); // Efficiently check existence
        if (!napSnap.exists()) {
          const defaultNapData = { NV_ID, Roll_No: volunteerData.Roll_No || "", Unit: volunteerData.UNIT || "", TotalNAPs: 0 };
          for (let i = 1; i <= 19; i++) defaultNapData[i.toString()] = 0;
          batch.set(napRef, defaultNapData);
          createdNAPs++;
          batchCounter++;
        }
        
        if (batchCounter >= 490) {
            await batch.commit();
            batch = writeBatch(db);
            batchCounter = 0;
        }
      }
      if (batchCounter > 0) {
        await batch.commit();
      }
      showMessage(`Sync complete: ${createdVLogs} vLOGs, ${createdNAPs} NAPs documents ensured/created.`, 'success');
    } catch (error) {
      console.error("Error syncing documents:", error);
      showMessage(`Error syncing documents: ${error.message}`, 'error');
    } finally {
      setSyncingVolunteers(false);
    }
  };

  // Placeholder for updateOverallStats - this is complex and depends on your data structure
  const updateOverallStats = async () => {
    setUpdatingStats(true);
    showMessage("Updating stats... This might take a while.", "info");
    // This function would iterate through all NAPs, sum them up by dept/subgroup
    // and update deptNAPs and sgNAPs in the systemConfig.
    // This is a simplified placeholder.
    try {
      // 1. Fetch all NAPs documents
      const napsSnapshot = await getDocs(collection(db, "NAPs"));
      const deptNAPsCalc = {};
      const sgNAPsCalc = {};

      // 2. For each NAPs doc, get the volunteer's dept and subgroup
      for (const napDoc of napsSnapshot.docs) {
        const napData = napDoc.data();
        const volunteerSnapshot = await getDocs(query(collection(db, "Volunteers"), where("NV_ID", "==", napData.NV_ID)));

        if (!volunteerSnapshot.empty) {
          const volunteerData = volunteerSnapshot.docs[0].data();
          const dept = volunteerData.Branch;
          const sg = volunteerData.UNIT;
          const totalNAPs = napData.TotalNAPs || 0;

          if (dept) {
            deptNAPsCalc[dept] = (deptNAPsCalc[dept] || 0) + totalNAPs;
          }
          if (sg) {
            sgNAPsCalc[sg] = (sgNAPsCalc[sg] || 0) + totalNAPs;
          }
        }
      }

      // 3. Update configData state and save
      const updatedConfig = { ...configData, deptNAPs: deptNAPsCalc, sgNAPs: sgNAPsCalc };
      setConfigData(updatedConfig);
      await handleSaveConfig(updatedConfig);
      showMessage("Overall NAPs statistics updated successfully!", "success");
    } catch (error) {
      console.error("Error updating stats:", error);
      showMessage(`Error updating stats: ${error.message}`, "error");
    } finally {
      setUpdatingStats(false);
    }
  };

  const handleResetAllNAPs = async () => {
    const confirmationPrompt = 
      "EXTREME WARNING: This action will:\n" +
      "1. Reset ALL NAPs (category points and TotalNAPs) to ZERO for every volunteer.\n" +
      "2. Delete ALL documents in the 'LOGs' collection.\n" +
      "3. Delete ALL documents in the 'vLOGs' collection.\n" +
      "4. Reset the 'currLOG' ID in system config to 'LOG240001'.\n" +
      "5. Clear aggregated NAPs statistics (deptNAPs and sgNAPs).\n\n" +
      "This action is IRREVERSIBLE and will result in significant data loss.\n" +
      "To confirm, type 'CONFIRM' in the box below:";

    const userInput = window.prompt(confirmationPrompt);

    if (userInput !== "CONFIRM") {
      showMessage('NAPs and Logs reset cancelled by user or incorrect confirmation.', 'info');
      return;
    }

    setResettingNAPs(true);
    showMessage('Performing full system reset (NAPs, LOGs, vLOGs, currLOG)... This may take some time.', 'info');

    try {
      const batch = writeBatch(db);
      
      // 1. Reset NAPs collection
      const napsCollectionRef = collection(db, "NAPs");
      const napsSnapshot = await getDocs(napsCollectionRef);
      napsSnapshot.forEach((napDoc) => {
        const napDocRef = doc(db, "NAPs", napDoc.id);
        const updateData = { TotalNAPs: 0 };
        for (let i = 1; i <= 19; i++) {
          updateData[i.toString()] = 0;
        }
        batch.update(napDocRef, updateData);
      });

      // 2. Delete all documents in LOGs collection
      const logsCollectionRef = collection(db, "LOGs");
      const logsSnapshot = await getDocs(logsCollectionRef);
      logsSnapshot.forEach((logDoc) => {
        batch.delete(doc(db, "LOGs", logDoc.id));
      });

      // 3. Delete all documents in vLOGs collection
      const vLogsCollectionRef = collection(db, "vLOGs");
      const vLogsSnapshot = await getDocs(vLogsCollectionRef);
      vLogsSnapshot.forEach((vLogDoc) => {
        batch.delete(doc(db, "vLOGs", vLogDoc.id));
      });

      // 4. Update systemConfig: reset currLOG, deptNAPs, sgNAPs
      const configRef = doc(db, 'configs', 'systemConfig');
      batch.update(configRef, {
        currLOG: "LOG240001",
        deptNAPs: {},
        sgNAPs: {}
      });
      
      await batch.commit();

      await fetchConfigData(); 
      showMessage('Full system reset successful: All NAPs, LOGs, vLOGs cleared, and currLOG updated.', 'success');
    } catch (error) {
      console.error("Error during full system reset:", error);
      showMessage(`Error during full system reset: ${error.message}`, 'error');
    } finally {
      setResettingNAPs(false);
    }
  };


  if (loading) return <div className="loading-container"><p>Loading System Configuration...</p></div>;

  return (
    <div className="card">
      <h2 className="page-title">System Configuration</h2>

      {message.text && (
        <div className={`message ${message.type === 'error' ? 'message-error' : message.type === 'success' ? 'message-success' : 'message-info'}`}>
          {message.text}
        </div>
      )}

      <div className="tab-navigation">
        <button className={`tab-button ${activeTab === 'general' ? 'active' : ''}`} onClick={() => setActiveTab('general')}>General</button>
        <button className={`tab-button ${activeTab === 'departments' ? 'active' : ''}`} onClick={() => setActiveTab('departments')}>Departments</button>
        <button className={`tab-button ${activeTab === 'subgroups' ? 'active' : ''}`} onClick={() => setActiveTab('subgroups')}>Sub-Groups</button>
        <button className={`tab-button ${activeTab === 'stats' ? 'active' : ''}`} onClick={() => setActiveTab('stats')}>Stats</button>
        <button className={`tab-button ${activeTab === 'actions' ? 'active' : ''}`} onClick={() => setActiveTab('actions')}>Actions</button>
      </div>

      <div className="tab-content">
        {activeTab === 'general' && (
          <div className="config-section">
            <h3 className="section-title">General Settings</h3>
            <div className="form-group">
              <label htmlFor="currLOG" className="form-label">Current LOG ID Format:</label>
              <input type="text" name="currLOG" id="currLOG" value={configData.currLOG} onChange={handleInputChange} className="form-input" />
            </div>
            <button onClick={() => handleSaveConfig()} className="btn btn-primary" disabled={saving || resettingNAPs}>
              {saving ? 'Saving...' : 'Save General Settings'}
            </button>
          </div>
        )}

        {activeTab === 'departments' && (
          <div className="config-section">
            <h3 className="section-title">Manage Departments</h3>
            <div className="form-group inline-form-group">
              <input type="text" value={newDept} onChange={(e) => setNewDept(e.target.value)} placeholder="New department name" className="form-input"/>
              <button onClick={handleAddDept} className="btn btn-success">Add Department</button>
            </div>
            <ul className="list-container">
              {configData.depts?.map(dept => (
                <li key={dept} className="list-item">
                  {dept} <button onClick={() => handleRemoveDept(dept)} className="btn btn-danger btn-small">Remove</button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {activeTab === 'subgroups' && (
          <div className="config-section">
            <h3 className="section-title">Manage Sub-Groups</h3>
            <div className="form-group inline-form-group">
              <input type="text" value={newSubGroup} onChange={(e) => setNewSubGroup(e.target.value)} placeholder="New sub-group name" className="form-input"/>
              <button onClick={handleAddSubGroup} className="btn btn-success">Add Sub-Group</button>
            </div>
            <ul className="list-container">
              {configData.subGroups?.map(sg => (
                <li key={sg} className="list-item">
                  {sg} <button onClick={() => handleRemoveSubGroup(sg)} className="btn btn-danger btn-small">Remove</button>
                </li>
              ))}
            </ul>
          </div>
        )}
        
        {activeTab === 'stats' && (
            <div className="config-section">
                <h3 className="section-title">NAPs Statistics</h3>
                <div className="stats-grid">
                    <div>
                        <h4>By Department:</h4>
                        {Object.keys(configData.deptNAPs || {}).length > 0 ? (
                            <ul className="list-container">
                                {Object.entries(configData.deptNAPs).map(([dept, naps]) => (
                                    <li key={dept} className="list-item">{dept}: {naps} NAPs</li>
                                ))}
                            </ul>
                        ) : <p>No department NAPs data available. Try updating stats.</p>}
                    </div>
                    <div>
                        <h4>By Sub-Group:</h4>
                        {Object.keys(configData.sgNAPs || {}).length > 0 ? (
                            <ul className="list-container">
                                {Object.entries(configData.sgNAPs).map(([sg, naps]) => (
                                    <li key={sg} className="list-item">{sg}: {naps} NAPs</li>
                                ))}
                            </ul>
                        ) : <p>No sub-group NAPs data available. Try updating stats.</p>}
                    </div>
                </div>
            </div>
        )}

        {activeTab === 'actions' && (
          <div className="config-section">
            <h3 className="section-title">System Actions</h3>
            <div className="action-buttons-group">
                <button onClick={extractFromVolunteers} className="btn btn-secondary" disabled={extracting || resettingNAPs || syncingVolunteers || updatingStats}>
                {extracting ? 'Extracting...' : 'Extract Depts/Units from Volunteers'}
                </button>
                <button onClick={syncVolunteerDocuments} className="btn btn-secondary" disabled={syncingVolunteers || resettingNAPs || extracting || updatingStats}>
                {syncingVolunteers ? 'Syncing...' : 'Sync vLOGs/NAPs Docs'}
                </button>
                <button onClick={updateOverallStats} className="btn btn-secondary" disabled={updatingStats || resettingNAPs || extracting || syncingVolunteers}>
                {updatingStats ? 'Updating...' : 'Update Overall NAPs Stats'}
                </button>
                <button 
                  onClick={handleResetAllNAPs} 
                  className="btn btn-danger"
                  disabled={resettingNAPs || extracting || syncingVolunteers || updatingStats}
                >
                  {resettingNAPs ? 'Performing Full Reset...' : 'Full System Reset (NAPs & Logs)'}
                </button>
            </div>
            <p className="form-hint">
              <strong>Warning:</strong> "Full System Reset" is an extremely destructive operation. It clears all NAPs, deletes all LOGs and vLOGs, and resets the Log ID counter. Use with extreme caution.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
