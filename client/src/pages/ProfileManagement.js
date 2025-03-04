import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './ProfileManagement.css';

const ProfileManagement = () => {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    roles: []
  });
  const [showAddForm, setShowAddForm] = useState(false);
  const [formError, setFormError] = useState(null);
  const [formSuccess, setFormSuccess] = useState(null);
  const [editingProfile, setEditingProfile] = useState(null);

  // Available roles
  const availableRoles = [
    'manage_users',
    'manage_profiles',
    'view_logs',
    'manage_devices',
    'manage_settings',
    'manage_own_devices',
    'view_own_usage',
    'limited_access',
    'view_usage',
    'view_devices'
  ];

  // Fetch profiles
  useEffect(() => {
    const fetchProfiles = async () => {
      try {
        setLoading(true);
        const res = await axios.get('/api/v1/profiles');
        setProfiles(res.data);
        setLoading(false);
      } catch (err) {
        setError('Error fetching profiles. Please try again.');
        setLoading(false);
        console.error('Error fetching profiles:', err);
      }
    };
    
    fetchProfiles();
  }, []);

  // Handle form input changes
  const onChange = e => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Handle role checkbox changes
  const handleRoleChange = (role) => {
    const updatedRoles = formData.roles.includes(role)
      ? formData.roles.filter(r => r !== role)
      : [...formData.roles, role];
    
    setFormData({ ...formData, roles: updatedRoles });
  };

  // Handle form submission for new profile
  const onSubmit = async e => {
    e.preventDefault();
    
    try {
      setFormError(null);
      
      if (!formData.name) {
        setFormError('Profile name is required');
        return;
      }
      
      if (!['admin', 'standard', 'kids', 'monitor'].includes(formData.name)) {
        setFormError('Profile name must be one of: admin, standard, kids, monitor');
        return;
      }
      
      // Create profile
      await axios.post('/api/v1/profiles', formData);
      
      // Reset form
      setFormData({
        name: '',
        roles: []
      });
      
      // Show success message
      setFormSuccess('Profile created successfully');
      
      // Refresh profile list
      const res = await axios.get('/api/v1/profiles');
      setProfiles(res.data);
      
      // Hide form after successful submission
      setShowAddForm(false);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setFormSuccess(null);
      }, 3000);
    } catch (err) {
      setFormError(
        err.response && err.response.data.message
          ? err.response.data.message
          : 'Error creating profile. Please try again.'
      );
      console.error('Error creating profile:', err);
    }
  };

  // Handle editing a profile
  const handleEditProfile = (profile) => {
    setEditingProfile(profile.id);
    setFormData({
      name: profile.name,
      roles: profile.roles
    });
  };

  // Handle updating a profile
  const handleUpdateProfile = async (profileId) => {
    try {
      setFormError(null);
      
      // Update profile
      await axios.put(`/api/v1/profiles/${profileId}`, { roles: formData.roles });
      
      // Show success message
      setFormSuccess('Profile updated successfully');
      
      // Refresh profile list
      const res = await axios.get('/api/v1/profiles');
      setProfiles(res.data);
      
      // Clear editing state
      setEditingProfile(null);
      
      // Reset form
      setFormData({
        name: '',
        roles: []
      });
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setFormSuccess(null);
      }, 3000);
    } catch (err) {
      setFormError(
        err.response && err.response.data.message
          ? err.response.data.message
          : 'Error updating profile. Please try again.'
      );
      console.error('Error updating profile:', err);
    }
  };

  // Handle deleting a profile
  const handleDeleteProfile = async (profileId) => {
    if (!window.confirm('Are you sure you want to delete this profile?')) {
      return;
    }
    
    try {
      await axios.delete(`/api/v1/profiles/${profileId}`);
      
      // Update profile list
      setProfiles(profiles.filter(profile => profile.id !== profileId));
      
      setFormSuccess('Profile deleted successfully');
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setFormSuccess(null);
      }, 3000);
    } catch (err) {
      setError(
        err.response && err.response.data.message
          ? err.response.data.message
          : 'Error deleting profile. Please try again.'
      );
      console.error('Error deleting profile:', err);
    }
  };

  // Cancel editing
  const cancelEditing = () => {
    setEditingProfile(null);
    setFormData({
      name: '',
      roles: []
    });
  };

  if (loading) {
    return <div className="loading"></div>;
  }

  return (
    <div className="profile-management">
      <h1>Profile Management</h1>
      
      {error && <div className="alert alert-danger">{error}</div>}
      {formSuccess && <div className="alert alert-success">{formSuccess}</div>}
      
      <div className="profile-management-header">
        <button 
          className="btn btn-primary" 
          onClick={() => setShowAddForm(!showAddForm)}
          disabled={editingProfile !== null}
        >
          {showAddForm ? 'Cancel' : 'Add New Profile'}
        </button>
      </div>
      
      {showAddForm && (
        <div className="profile-form-container">
          <h2>Add New Profile</h2>
          
          {formError && <div className="alert alert-danger">{formError}</div>}
          
          <form onSubmit={onSubmit}>
            <div className="form-group">
              <label htmlFor="name">Profile Name</label>
              <select
                id="name"
                name="name"
                value={formData.name}
                onChange={onChange}
                required
                className="form-control"
              >
                <option value="">Select a profile type</option>
                <option value="admin">Admin</option>
                <option value="standard">Standard</option>
                <option value="kids">Kids</option>
                <option value="monitor">Monitor</option>
              </select>
            </div>
            
            <div className="form-group">
              <label>Roles</label>
              <div className="roles-container">
                {availableRoles.map(role => (
                  <div key={role} className="role-checkbox">
                    <input
                      type="checkbox"
                      id={`role-${role}`}
                      checked={formData.roles.includes(role)}
                      onChange={() => handleRoleChange(role)}
                    />
                    <label htmlFor={`role-${role}`}>{role.replace(/_/g, ' ')}</label>
                  </div>
                ))}
              </div>
            </div>
            
            <button type="submit" className="btn btn-primary">
              Create Profile
            </button>
          </form>
        </div>
      )}
      
      <div className="profile-list">
        <h2>Profiles</h2>
        
        {profiles.length === 0 ? (
          <p>No profiles found.</p>
        ) : (
          <div className="profiles-grid">
            {profiles.map(profile => (
              <div key={profile.id} className="profile-card">
                <div className="profile-card-header">
                  <h3>{profile.name}</h3>
                  <div className="profile-actions">
                    {editingProfile === profile.id ? (
                      <>
                        <button 
                          className="btn btn-primary btn-sm"
                          onClick={() => handleUpdateProfile(profile.id)}
                        >
                          Save
                        </button>
                        <button 
                          className="btn btn-danger btn-sm"
                          onClick={cancelEditing}
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button 
                          className="btn btn-primary btn-sm"
                          onClick={() => handleEditProfile(profile)}
                        >
                          Edit
                        </button>
                        <button 
                          className="btn btn-danger btn-sm"
                          onClick={() => handleDeleteProfile(profile.id)}
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                </div>
                
                <div className="profile-roles">
                  <h4>Roles:</h4>
                  
                  {editingProfile === profile.id ? (
                    <div className="roles-container">
                      {availableRoles.map(role => (
                        <div key={role} className="role-checkbox">
                          <input
                            type="checkbox"
                            id={`edit-role-${role}-${profile.id}`}
                            checked={formData.roles.includes(role)}
                            onChange={() => handleRoleChange(role)}
                          />
                          <label htmlFor={`edit-role-${role}-${profile.id}`}>
                            {role.replace(/_/g, ' ')}
                          </label>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <ul>
                      {profile.roles && profile.roles.length > 0 ? (
                        profile.roles.map(role => (
                          <li key={role}>{role.replace(/_/g, ' ')}</li>
                        ))
                      ) : (
                        <li>No roles assigned</li>
                      )}
                    </ul>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileManagement;
