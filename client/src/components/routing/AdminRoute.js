import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const AdminRoute = ({ children }) => {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return <div className="loading"></div>;
  }

  return isAuthenticated && user && user.profile === 'admin' ? 
    children : 
    <Navigate to="/dashboard" />;
};

export default AdminRoute;
