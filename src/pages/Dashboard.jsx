import { useState, useEffect } from 'react';
import { Container, Typography, Box, Button } from '@mui/material';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

export default function Dashboard() {
  const [users, setUsers] = useState([]);
  const { token, logout } = useAuth();

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await axios.get('http://localhost:3000/api/v1/users', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setUsers(response.data);
      } catch (error) {
        console.error('Failed to fetch users:', error);
      }
    };

    fetchUsers();
  }, [token]);

  return (
    <Container>
      <Box sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Dashboard
        </Typography>
        <Button onClick={logout} variant="contained" color="secondary">
          Logout
        </Button>
        
        <Typography variant="h6" sx={{ mt: 4 }}>
          Users
        </Typography>
        {users.map(user => (
          <Box key={user.id} sx={{ mt: 2 }}>
            <Typography>
              Username: {user.username} - Role: {user.role}
            </Typography>
          </Box>
        ))}
      </Box>
    </Container>
  );
}
