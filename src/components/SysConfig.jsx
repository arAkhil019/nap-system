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
} from "firebase/firestore";

export default function SysConfig() {
  // State management
  const [configData, setConfigData] = useState({
    currLOG: "",
    depts: [],
    subGroups: [],
    deptNAPs: {},
    sgNAPs: {},
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });
  const [activeTab, setActiveTab] = useState("general");
  const [newDept, setNewDept] = useState("");
  const [newSubGroup, setNewSubGroup] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [updatingStats, setUpdatingStats] = useState(false);

  // Fetch config data on component mount
  useEffect(() => {
    fetchConfigData();
  }, []);

  // Fetch config data from Firestore
  const fetchConfigData = async () => {
    setLoading(true);
    try {
      const configRef = doc(db, "configs", "systemConfig");
      const configSnapshot = await getDoc(configRef);

      if (configSnapshot.exists()) {
        setConfigData(configSnapshot.data());
      } else {
        // Create default config if it doesn't exist
        const defaultConfig = {
          currLOG: "LOG-" + Date.now(),
          depts: [],
          subGroups: [],
          deptNAPs: {},
          sgNAPs: {},
        };
        await setDoc(configRef, defaultConfig);
        setConfigData(defaultConfig);
      }
    } catch (error) {
      console.error("Error fetching config:", error);
      showMessage("Failed to load configuration data", "error");
    } finally {
      setLoading(false);
    }
  };

  // Save config data to Firestore
  const saveConfigData = async (updatedData = configData) => {
    setSaving(true);
    try {
      const configRef = doc(db, "configs", "systemConfig");
      await updateDoc(configRef, updatedData);
      showMessage("Configuration saved successfully", "success");
    } catch (error) {
      console.error("Error saving config:", error);
      showMessage("Failed to save configuration", "error");
    } finally {
      setSaving(false);
    }
  };

  // Extract departments and subgroups from volunteers collection
  const extractFromVolunteers = async () => {
    setExtracting(true);
    try {
      const volunteersRef = collection(db, "Volunteers");
      const volunteersSnapshot = await getDocs(volunteersRef);

      const departments = new Set();
      const units = new Set();

      // Extract unique departments and units
      volunteersSnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.Branch) departments.add(data.Branch);
        if (data.UNIT) units.add(data.UNIT);
      });

      // Update config data
      const updatedConfig = {
        ...configData,
        depts: Array.from(departments).filter(Boolean),
        subGroups: Array.from(units).filter(Boolean),
      };

      setConfigData(updatedConfig);
      await saveConfigData(updatedConfig);
      showMessage(
        "Successfully extracted departments and subgroups",
        "success"
      );
    } catch (error) {
      console.error("Error extracting data:", error);
      showMessage("Failed to extract data from volunteers", "error");
    } finally {
      setExtracting(false);
    }
  };

  // Add a new department
  const handleAddDept = () => {
    if (!newDept.trim()) return;

    if (configData.depts.includes(newDept.trim())) {
      showMessage("This department already exists", "error");
      return;
    }

    const updatedDepts = [...configData.depts, newDept.trim()];
    const updatedConfig = { ...configData, depts: updatedDepts };
    setConfigData(updatedConfig);
    saveConfigData(updatedConfig);
    setNewDept("");
  };

  // Add a new subgroup
  const handleAddSubGroup = () => {
    if (!newSubGroup.trim()) return;

    if (configData.subGroups.includes(newSubGroup.trim())) {
      showMessage("This subgroup already exists", "error");
      return;
    }

    const updatedSubGroups = [...configData.subGroups, newSubGroup.trim()];
    const updatedConfig = { ...configData, subGroups: updatedSubGroups };
    setConfigData(updatedConfig);
    saveConfigData(updatedConfig);
    setNewSubGroup("");
  };

  // Delete a department
  const handleDeleteDept = (dept) => {
    const updatedDepts = configData.depts.filter((d) => d !== dept);
    const updatedDeptNAPs = { ...configData.deptNAPs };
    delete updatedDeptNAPs[dept];

    const updatedConfig = {
      ...configData,
      depts: updatedDepts,
      deptNAPs: updatedDeptNAPs,
    };

    setConfigData(updatedConfig);
    saveConfigData(updatedConfig);
  };

  // Delete a subgroup
  const handleDeleteSubGroup = (subGroup) => {
    const updatedSubGroups = configData.subGroups.filter(
      (sg) => sg !== subGroup
    );
    const updatedSgNAPs = { ...configData.sgNAPs };
    delete updatedSgNAPs[subGroup];

    const updatedConfig = {
      ...configData,
      subGroups: updatedSubGroups,
      sgNAPs: updatedSgNAPs,
    };

    setConfigData(updatedConfig);
    saveConfigData(updatedConfig);
  };

  // Update current LOG ID
  const handleLogIdChange = (e) => {
    setConfigData({
      ...configData,
      currLOG: e.target.value,
    });
  };

  // Save current LOG ID
  const saveLogId = () => {
    saveConfigData(configData);
  };

  // Show messages
  const showMessage = (text, type) => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: "", type: "" }), 5000);
  };

  // Update NAP statistics from volunteers collection
  const updateNAPStatistics = async () => {
    setUpdatingStats(true);
    try {
      // Step 1: Get snapshots of both vLOGs and LOGs collections
      const vLogsRef = collection(db, "vLOGs");
      const logsRef = collection(db, "LOGs");
      const vLogsSnapshot = await getDocs(vLogsRef);
      const logsSnapshot = await getDocs(logsRef);

      // Create a map for quick access to LOG documents by ID
      const logsMap = {};
      logsSnapshot.docs.forEach((doc) => {
        logsMap[doc.data()["Log_ID"]] = doc.data();
      });
      console.log(logsMap);

      // Start with existing NAP data from config
      const deptNAPs = { ...configData.deptNAPs };
      const sgNAPs = { ...configData.sgNAPs };

      // Ensure all departments and subgroups are included
      configData.depts.forEach((dept) => {
        if (!deptNAPs.hasOwnProperty(dept)) {
          deptNAPs[dept] = 0;
        }
      });
      configData.subGroups.forEach((sg) => {
        if (!sgNAPs.hasOwnProperty(sg)) {
          sgNAPs[sg] = 0;
        }
      });

      // Step 2: Iterate through each vLOGs document
      for (const vLogDoc of vLogsSnapshot.docs) {
        const vLogData = vLogDoc.data();
        // console.log(vLogData); correctly working till here

        // Skip if no volunteer ID or logs field
        if (!vLogData.NV_ID || !vLogData.logs || !Array.isArray(vLogData.logs))
          continue;

        // Step 3: For each logID in the logs field, find NAPs value and total it
        let totalNAPs = 0;
        for (const logID of vLogData.logs) {
          if (logsMap[logID] && logsMap[logID].NAPs) {
            totalNAPs += Number(logsMap[logID].NAPs);
          }
        }

        // Skip if no NAPs were found
        if (totalNAPs === 0) continue;

        // Step 4: Update the volunteer with matching NV_ID
        const volunteersRef = collection(db, "volunteers");
        const q = query(volunteersRef, where("NV_ID", "==", vLogData.NV_ID));
        const volunteerSnapshot = await getDocs(q);

        if (!volunteerSnapshot.empty) {
          const volunteerDoc = volunteerSnapshot.docs[0];
          const volunteerData = volunteerDoc.data();

          // Update the volunteer's NAP field
          await updateDoc(doc(db, "volunteers", volunteerDoc.id), {
            NAP: totalNAPs,
          });

          console.log(
            volunteerData,
            volunteerData.Branch,
            volunteerData.Unit,
            deptNAPs[volunteerData.Branch],
            sgNAPs[volunteerData.Unit]
          );
          // Step 5: Update department and subgroup NAP totals
          deptNAPs[volunteerData.Branch] += totalNAPs;
          console.log("in branch loop");
          sgNAPs[volunteerData.Unit] += totalNAPs;
          console.log("in unit loop");

          console.log(
            deptNAPs[volunteerData.Branch],
            sgNAPs[volunteerData.Unit]
          );
          //   console.log(deptNAPs, sgNAPs);
        }
      }

      // Update config with new NAP counts
      const updatedConfig = {
        ...configData,
        deptNAPs,
        sgNAPs,
      };

      setConfigData(updatedConfig);
      await saveConfigData(updatedConfig);
      showMessage("NAP statistics updated successfully", "success");
    } catch (error) {
      console.error("Error updating NAP statistics:", error);
      showMessage("Failed to update NAP statistics", "error");
    } finally {
      setUpdatingStats(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold mb-6">System Configuration</h2>

      {/* Message display */}
      {message.text && (
        <div
          className={`p-4 mb-6 rounded-md ${
            message.type === "error"
              ? "bg-red-100 text-red-700 border-l-4 border-red-500"
              : "bg-green-100 text-green-700 border-l-4 border-green-500"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex -mb-px">
          <button
            onClick={() => setActiveTab("general")}
            className={`py-2 px-4 ${
              activeTab === "general"
                ? "border-b-2 border-blue-500 text-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            General
          </button>
          <button
            onClick={() => setActiveTab("departments")}
            className={`py-2 px-4 ${
              activeTab === "departments"
                ? "border-b-2 border-blue-500 text-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Departments
          </button>
          <button
            onClick={() => setActiveTab("subgroups")}
            className={`py-2 px-4 ${
              activeTab === "subgroups"
                ? "border-b-2 border-blue-500 text-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Subgroups
          </button>
          <button
            onClick={() => setActiveTab("naps")}
            className={`py-2 px-4 ${
              activeTab === "naps"
                ? "border-b-2 border-blue-500 text-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            NAP Statistics
          </button>
        </nav>
      </div>

      {/* General Tab */}
      {activeTab === "general" && (
        <div>
          <div className="mb-6">
            <h3 className="text-lg font-medium mb-2">Current LOG ID</h3>
            <div className="flex">
              <input
                type="text"
                value={configData.currLOG}
                onChange={handleLogIdChange}
                className="border rounded-l p-2 flex-grow"
              />
              <button
                onClick={saveLogId}
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-r"
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              This ID is used as a prefix for new LOG entries
            </p>
          </div>

          <div>
            <h3 className="text-lg font-medium mb-2">
              Extract Data from Volunteers
            </h3>
            <button
              onClick={extractFromVolunteers}
              disabled={extracting}
              className="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded flex items-center"
            >
              {extracting ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Extracting...
                </>
              ) : (
                "Extract Departments & Subgroups from Volunteers"
              )}
            </button>
            <p className="text-sm text-gray-500 mt-1">
              This will extract departments from Branch field and subgroups from
              UNIT field in the Volunteers collection
            </p>
          </div>
        </div>
      )}

      {/* Departments Tab */}
      {activeTab === "departments" && (
        <div>
          <h3 className="text-lg font-medium mb-4">Manage Departments</h3>

          {/* Add Department Form */}
          <div className="mb-6">
            <div className="flex">
              <input
                type="text"
                value={newDept}
                onChange={(e) => setNewDept(e.target.value)}
                placeholder="New department name"
                className="border rounded-l p-2 flex-grow"
              />
              <button
                onClick={handleAddDept}
                className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-r"
              >
                Add
              </button>
            </div>
          </div>

          {/* Departments List */}
          <div className="border rounded-md overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Department Name
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {configData.depts.length === 0 ? (
                  <tr>
                    <td
                      colSpan="2"
                      className="px-6 py-4 text-center text-sm text-gray-500"
                    >
                      No departments added yet
                    </td>
                  </tr>
                ) : (
                  configData.depts.map((dept, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {dept}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleDeleteDept(dept)}
                          className="text-red-600 hover:text-red-800"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Subgroups Tab */}
      {activeTab === "subgroups" && (
        <div>
          <h3 className="text-lg font-medium mb-4">Manage Subgroups</h3>

          {/* Add Subgroup Form */}
          <div className="mb-6">
            <div className="flex">
              <input
                type="text"
                value={newSubGroup}
                onChange={(e) => setNewSubGroup(e.target.value)}
                placeholder="New subgroup name"
                className="border rounded-l p-2 flex-grow"
              />
              <button
                onClick={handleAddSubGroup}
                className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-r"
              >
                Add
              </button>
            </div>
          </div>

          {/* Subgroups List */}
          <div className="border rounded-md overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Subgroup Name
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {configData.subGroups.length === 0 ? (
                  <tr>
                    <td
                      colSpan="2"
                      className="px-6 py-4 text-center text-sm text-gray-500"
                    >
                      No subgroups added yet
                    </td>
                  </tr>
                ) : (
                  configData.subGroups.map((subGroup, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {subGroup}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleDeleteSubGroup(subGroup)}
                          className="text-red-600 hover:text-red-800"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* NAP Statistics Tab */}
      {activeTab === "naps" && (
        <div>
          <div className="mb-6">
            <button
              onClick={updateNAPStatistics}
              disabled={updatingStats}
              className="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded flex items-center mb-4"
            >
              {updatingStats ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Updating Statistics...
                </>
              ) : (
                "Update NAP Statistics"
              )}
            </button>
            <p className="text-sm text-gray-500 mb-6">
              This will recalculate NAP counts for each department and subgroup
              based on current volunteer data
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Department NAPs */}
            <div className="border rounded-md p-4">
              <h3 className="text-lg font-medium mb-4">Department NAPs</h3>
              <div className="overflow-y-auto max-h-80">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Department
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total NAPs
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {Object.keys(configData.deptNAPs || {}).length === 0 ? (
                      <tr>
                        <td
                          colSpan="2"
                          className="px-4 py-2 text-center text-sm text-gray-500"
                        >
                          No department NAP data available
                        </td>
                      </tr>
                    ) : (
                      Object.entries(configData.deptNAPs || {}).map(
                        ([dept, naps], index) => (
                          <tr key={index}>
                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                              {dept}
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap text-right text-sm text-gray-900">
                              {naps}
                            </td>
                          </tr>
                        )
                      )
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Subgroup NAPs */}
            <div className="border rounded-md p-4">
              <h3 className="text-lg font-medium mb-4">Subgroup NAPs</h3>
              <div className="overflow-y-auto max-h-80">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Subgroup
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total NAPs
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {Object.keys(configData.sgNAPs || {}).length === 0 ? (
                      <tr>
                        <td
                          colSpan="2"
                          className="px-4 py-2 text-center text-sm text-gray-500"
                        >
                          No subgroup NAP data available
                        </td>
                      </tr>
                    ) : (
                      Object.entries(configData.sgNAPs || {}).map(
                        ([sg, naps], index) => (
                          <tr key={index}>
                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                              {sg}
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap text-right text-sm text-gray-900">
                              {naps}
                            </td>
                          </tr>
                        )
                      )
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
