import React, { useState } from "react";
import VolunteerLogs from "./VolunteerLogs";
import SingleNAPAssign from "./SingleNAPAssign";
import AddVolunteerForm from "./AddVolunteerForm";
import MultiNAPsAssign from "./MultiNAPsAssign";
import ImportVolunteers from "./ImportVolunteers";
import SysConfig from "./SysConfig";
import "../App.css";
import Display from "./Display";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import EditVolunteers from "./EditVolunteers"; // Import the new component

export default function AdminDashboard() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("display"); // Default to display NAPs

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
            activeTab === "display" ? "active" : ""
          }`}
          onClick={() => setActiveTab("display")}
        >
          Display NAPs
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
            activeTab === "editVolunteers" ? "active" : ""
          }`}
          onClick={() => setActiveTab("editVolunteers")}
        >
          Manage Volunteers
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
            activeTab === "assign" ? "active" : ""
          }`}
          onClick={() => setActiveTab("assign")}
        >
          Assign NAP
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
            activeTab === "logs" ? "active" : ""
          }`}
          onClick={() => setActiveTab("logs")}
        >
          View Activity Logs
        </button>
        <button
          className={`tab-button ${
            activeTab === "sysConfig" ? "active" : ""
          }`}
          onClick={() => setActiveTab("sysConfig")}
        >
          System Configuration
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === "display" && <Display />}
        {activeTab === "logs" && <VolunteerLogs />}
        {activeTab === "assign" && <SingleNAPAssign />}
        {activeTab === "addVolunteer" && <AddVolunteerForm />}
        {activeTab === "editVolunteers" && <EditVolunteers />} {/* Add new component here */}
        {activeTab === "multiAssign" && <MultiNAPsAssign />}
        {activeTab === "importVolunteers" && <ImportVolunteers />}
        {activeTab === "sysConfig" && <SysConfig />}
      </div>
    </div>
  );
}
