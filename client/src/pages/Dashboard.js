import React from 'react';
import { useAuth } from '../context/AuthContext';
import './Dashboard.css';

const Dashboard = () => {
  const { user } = useAuth();

  return (
    <div className="dashboard">
      <h1>Dashboard</h1>
      
      <div className="dashboard-welcome">
        <h2>Welcome, {user ? user.login : 'User'}</h2>
        <p>Profile: {user ? user.profile : 'N/A'}</p>
      </div>
      
      <div className="dashboard-cards">
        <div className="dashboard-card">
          <h3>Profile Information</h3>
          <p>Your current profile is <strong>{user ? user.profile : 'N/A'}</strong></p>
          <p>This determines what features and settings you can access in the system.</p>
        </div>
        
        {user && user.profile === 'admin' && (
          <div className="dashboard-card">
            <h3>Admin Tools</h3>
            <p>As an administrator, you have access to:</p>
            <ul>
              <li>User Management</li>
              <li>Profile Management</li>
              <li>System Settings</li>
              <li>Audit Logs</li>
            </ul>
          </div>
        )}
        
        <div className="dashboard-card">
          <h3>System Status</h3>
          <p>All systems are operational</p>
          <div className="status-indicator online"></div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
