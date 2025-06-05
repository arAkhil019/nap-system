import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import {
  collection,
  doc,
  getDoc,
  setDoc,
  getDocs,
  updateDoc,
  query,
  where,
  writeBatch,
} from "firebase/firestore";
import "../App.css";

export default function SysConfig() {
  const [configData, setConfigData] = useState({
    currLOG: "",
    depts: [],
    subGroups: [],
    deptNAPs: {}, // Not directly edited here, but shown
    sgNAPs: {}, // Not directly edited here, but shown
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" }); // type can be 'success' or 'error'
  const [activeTab, setActiveTab] = useState("general"); // 'general', 'departments', 'subgroups', 'stats'

  const [newDept, setNewDept] = useState("");
  const [newSubGroup, setNewSubGroup] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [updatingStats, setUpdatingStats] = useState(false);
  const [syncingVolunteers, setSyncingVolunteers] = useState(false);

  const showMessage = (text, type) => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: "", type: "" }), 3000);
  };

  const fetchConfigData = async () => {
    setLoading(true);
    try {
      const configRef = doc(db, "configs", "systemConfig");
      const configSnapshot = await getDoc(configRef);
      if (configSnapshot.exists()) {
        setConfigData((prev) => ({ ...prev, ...configSnapshot.data() }));
      } else {
        // Initialize with default if not exists
        const defaultConfig = {
          currLOG: "LOG000001",
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
    try {
      const volunteersSnapshot = await getDocs(collection(db, "Volunteers"));
      let createdVLogs = 0;
      let createdNAPs = 0;
      const batch = writeBatch(db);

      for (const volunteerDoc of volunteersSnapshot.docs) {
        const volunteerData = volunteerDoc.data();
        const NV_ID = volunteerData.NV_ID;

        if (!NV_ID) continue;

        // Check vLOGs
        const vLogsQuery = query(collection(db, "vLOGs"), where("NV_ID", "==", NV_ID));
        const vLogsSnap = await getDocs(vLogsQuery);
        if (vLogsSnap.empty) {
          const vLogRef = doc(collection(db, "vLOGs"));
          batch.set(vLogRef, { NV_ID, logs: [] });
          createdVLogs++;
        }

        // Check NAPs
        const napsQuery = query(collection(db, "NAPs"), where("NV_ID", "==", NV_ID));
        const napsSnap = await getDocs(napsQuery);
        if (napsSnap.empty) {
          const napRef = doc(collection(db, "NAPs"));
          const defaultNapData = { NV_ID, Roll_No: volunteerData.Roll_No || "", Unit: volunteerData.UNIT || "", TotalNAPs: 0 };
          for (let i = 1; i <= 19; i++) defaultNapData[i.toString()] = 0;
          batch.set(napRef, defaultNapData);
          createdNAPs++;
        }
      }
      await batch.commit();
      showMessage(`Synced documents: ${createdVLogs} vLOGs, ${createdNAPs} NAPs created.`, "success");
    } catch (error) {
      console.error("Error syncing documents:", error);
      showMessage(`Error syncing documents: ${error.message}`, "error");
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
            <button onClick={() => handleSaveConfig()} className="btn btn-primary" disabled={saving}>
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
                <button onClick={extractFromVolunteers} className="btn btn-secondary" disabled={extracting}>
                {extracting ? 'Extracting...' : 'Extract Depts/Units from Volunteers'}
                </button>
                <button onClick={syncVolunteerDocuments} className="btn btn-secondary" disabled={syncingVolunteers}>
                {syncingVolunteers ? 'Syncing...' : 'Sync vLOGs/NAPs Docs'}
                </button>
                <button onClick={updateOverallStats} className="btn btn-secondary" disabled={updatingStats}>
                {updatingStats ? 'Updating...' : 'Update Overall NAPs Stats'}
                </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
