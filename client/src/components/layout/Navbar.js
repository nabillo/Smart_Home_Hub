import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Navbar.css';

const Navbar = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const authLinks = (
    <ul>
      <li>
        <Link to="/dashboard">Dashboard</Link>
      </li>
      {user && user.profile === 'admin' && (
        <>
          <li>
            <Link to="/users">Users</Link>
          </li>
          <li>
            <Link to="/profiles">Profiles</Link>
          </li>
        </>
      )}
      <li>
        <span className="user-info">
          Welcome, {user ? user.login : ''}
        </span>
      </li>
      <li>
        <button onClick={handleLogout} className="btn-logout">
          Logout
        </button>
      </li>
    </ul>
  );

  const guestLinks = (
    <ul>
      <li>
        <Link to="/login">Login</Link>
      </li>
    </ul>
  );

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <h1>
          <Link to="/">
            <i className="fas fa-home"></i> Smart Home
          </Link>
        </h1>
        <div className="navbar-menu">
          {isAuthenticated ? authLinks : guestLinks}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
