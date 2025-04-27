import React, { useState } from 'react';
import VolunteerLogs from './VolunteerLogs';
import AssignNAPForm from './AssignNAPForm';
import AddVolunteerForm from './AddVolunteerForm'; // Create this if it doesn't exist
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function AdminDashboard() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('logs');

  async function handleLogout() {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error("Failed to log out", error);
    }
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">NAP System Dashboard</h1>
        <div className="flex items-center">
          <span className="mr-4">{currentUser?.email}</span>
          <button 
            onClick={handleLogout} 
            className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b mb-4">
        <button 
          className={`py-2 px-4 ${activeTab === 'logs' ? 'border-b-2 border-blue-500 font-medium' : ''}`}
          onClick={() => setActiveTab('logs')}
        >
          View Logs
        </button>
        <button 
          className={`py-2 px-4 ${activeTab === 'assign' ? 'border-b-2 border-blue-500 font-medium' : ''}`}
          onClick={() => setActiveTab('assign')}
        >
          Assign NAP
        </button>
        <button 
          className={`py-2 px-4 ${activeTab === 'addVolunteer' ? 'border-b-2 border-blue-500 font-medium' : ''}`}
          onClick={() => setActiveTab('addVolunteer')}
        >
          Add Volunteer
        </button>
      </div>

      {/* Tab Content */}
      <div className="mt-4">
        {activeTab === 'logs' && <VolunteerLogs />}
        {activeTab === 'assign' && <AssignNAPForm />}
        {activeTab === 'addVolunteer' && <AddVolunteerForm />}
      </div>
    </div>
  );
}
