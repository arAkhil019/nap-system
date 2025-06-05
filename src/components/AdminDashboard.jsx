import React, { useState } from "react";
import VolunteerLogs from "./VolunteerLogs";
import SingleNAPAssign from "./SingleNAPAssign";
import AddVolunteerForm from "./AddVolunteerForm"; // Create this if it doesn't exist
import MultiNAPsAssign from "./MultiNAPsAssign";
import ImportVolunteers from "./ImportVolunteers";
import SysConfig from "./SysConfig";
import "../App.css"; // Ensure this path is correct for your project structure
import Display from "./Display"; 
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";

export default function AdminDashboard() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("logs");

  async function handleLogout() {
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      console.error("Failed to log out", error);
    }
  }

  return (
    <div className="admin-dashboard-container">
      <div className="dashboard-header">
        <h1 className="dashboard-title">NAP System Dashboard</h1>
        <div className="user-info">
          <span className="user-email">{currentUser?.email}</span>
          <button
            onClick={handleLogout}
            className="btn btn-danger"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="tab-navigation">
        <button
          className={`tab-button ${
            activeTab === "logs" ? "active" : ""
          }`}
          onClick={() => setActiveTab("logs")}
        >
          View Logs
        </button>
        <button
          className={`tab-button ${
            activeTab === "assign" ? "active" : ""
          }`}
          onClick={() => setActiveTab("assign")}
        >
          Assign NAP
        </button>
        <button
          className={`tab-button ${
            activeTab === "addVolunteer" ? "active" : ""
          }`}
          onClick={() => setActiveTab("addVolunteer")}
        >
          Add Volunteer
        </button>
        <button
          className={`tab-button ${
            activeTab === "importVolunteers" ? "active" : ""
          }`}
          onClick={() => setActiveTab("importVolunteers")}
        >
          Import Volunteers
        </button>
        <button
          className={`tab-button ${
            activeTab === "multiAssign" ? "active" : ""
          }`}
          onClick={() => setActiveTab("multiAssign")}
        >
          Bulk Assign NAP
        </button>
        <button
          className={`tab-button ${
            activeTab === "sysConfig" ? "active" : ""
          }`}
          onClick={() => setActiveTab("sysConfig")}
        >
          System Configuration
        </button>
        <button
          className={`tab-button ${
            activeTab === "display" ? "active" : ""
          }`}
          onClick={() => setActiveTab("display")}
        >
          Display NAPs
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === "logs" && <VolunteerLogs />}
        {activeTab === "assign" && <SingleNAPAssign />}
        {activeTab === "addVolunteer" && <AddVolunteerForm />}
        {activeTab === "multiAssign" && <MultiNAPsAssign />}
        {activeTab === "importVolunteers" && <ImportVolunteers />}
        {activeTab === "sysConfig" && <SysConfig />}
        {activeTab === "display" && <Display />}
      </div>
    </div>
  );
}
