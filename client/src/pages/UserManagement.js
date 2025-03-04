import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './UserManagement.css';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    login: '',
    password: '',
    profile: 'standard'
  });
  const [showAddForm, setShowAddForm] = useState(false);
  const [formError, setFormError] = useState(null);
  const [formSuccess, setFormSuccess] = useState(null);

  // Fetch users and profiles
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch users
        const usersRes = await axios.get('/api/v1/users');
        setUsers(usersRes.data);
        
        // Fetch profiles
        const profilesRes = await axios.get('/api/v1/profiles');
        setProfiles(profilesRes.data);
        
        setLoading(false);
      } catch (err) {
        setError('Error fetching data. Please try again.');
        setLoading(false);
        console.error('Error fetching data:', err);
      }
    };
    
    fetchData();
  }, []);

  // Handle form input changes
  const onChange = e => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Handle form submission
  const onSubmit = async e => {
    e.preventDefault();
    
    try {
      setFormError(null);
      
      // Validate password
      if (formData.password.length < 12) {
        setFormError('Password must be at least 12 characters long');
        return;
      }
      
      if (!/[A-Z]/.test(formData.password)) {
        setFormError('Password must contain at least one uppercase letter');
        return;
      }
      
      if (!/[!@#$%^&*(),.?":{}|<>]/.test(formData.password)) {
        setFormError('Password must contain at least one symbol');
        return;
      }
      
      // Create user
      await axios.post('/api/v1/users', formData);
      
      // Reset form
      setFormData({
        login: '',
        password: '',
        profile: 'standard'
      });
      
      // Show success message
      setFormSuccess('User created successfully');
      
      // Refresh user list
      const res = await axios.get('/api/v1/users');
      setUsers(res.data);
      
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
          : 'Error creating user. Please try again.'
      );
      console.error('Error creating user:', err);
    }
  };

  // Handle profile change
  const handleProfileChange = async (userId, profile) => {
    try {
      await axios.put(`/api/v1/users/${userId}/profile`, { profile });
      
      // Update user list
      setUsers(users.map(user => 
        user.id === userId ? { ...user, profile } : user
      ));
      
      setFormSuccess('Profile updated successfully');
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setFormSuccess(null);
      }, 3000);
    } catch (err) {
      setError(
        err.response && err.response.data.message
          ? err.response.data.message
          : 'Error updating profile. Please try again.'
      );
      console.error('Error updating profile:', err);
    }
  };

  // Handle user deletion
  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) {
      return;
    }
    
    try {
      await axios.delete(`/api/v1/users/${userId}`);
      
      // Update user list
      setUsers(users.filter(user => user.id !== userId));
      
      setFormSuccess('User deleted successfully');
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setFormSuccess(null);
      }, 3000);
    } catch (err) {
      setError(
        err.response && err.response.data.message
          ? err.response.data.message
          : 'Error deleting user. Please try again.'
      );
      console.error('Error deleting user:', err);
    }
  };

  if (loading) {
    return <div className="loading"></div>;
  }

  return (
    <div className="user-management">
      <h1>User Management</h1>
      
      {error && <div className="alert alert-danger">{error}</div>}
      {formSuccess && <div className="alert alert-success">{formSuccess}</div>}
      
      <div className="user-management-header">
        <button 
          className="btn btn-primary" 
          onClick={() => setShowAddForm(!showAddForm)}
        >
          {showAddForm ? 'Cancel' : 'Add New User'}
        </button>
      </div>
      
      {showAddForm && (
        <div className="user-form-container">
          <h2>Add New User</h2>
          
          {formError && <div className="alert alert-danger">{formError}</div>}
          
          <form onSubmit={onSubmit}>
            <div className="form-group">
              <label htmlFor="login">Username</label>
              <input
                type="text"
                id="login"
                name="login"
                value={formData.login}
                onChange={onChange}
                required
                minLength="3"
                className="form-control"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={onChange}
                required
                minLength="12"
                className="form-control"
              />
              <small>
                Password must be at least 12 characters long, include at least one uppercase letter and one symbol.
              </small>
            </div>
            
            <div className="form-group">
              <label htmlFor="profile">Profile</label>
              <select
                id="profile"
                name="profile"
                value={formData.profile}
                onChange={onChange}
                className="form-control"
              >
                {profiles.map(profile => (
                  <option key={profile.id} value={profile.name}>
                    {profile.name}
                  </option>
                ))}
              </select>
            </div>
            
            <button type="submit" className="btn btn-primary">
              Create User
            </button>
          </form>
        </div>
      )}
      
      <div className="user-list">
        <h2>Users</h2>
        
        {users.length === 0 ? (
          <p>No users found.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Username</th>
                <th>Profile</th>
                <th>Created At</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id}>
                  <td>{user.login}</td>
                  <td>
                    <select
                      value={user.profile}
                      onChange={e => handleProfileChange(user.id, e.target.value)}
                      className="profile-select"
                    >
                      {profiles.map(profile => (
                        <option key={profile.id} value={profile.name}>
                          {profile.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>{new Date(user.created_at).toLocaleString()}</td>
                  <td>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => handleDeleteUser(user.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default UserManagement;
