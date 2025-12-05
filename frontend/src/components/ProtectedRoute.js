import { Navigate, useLocation } from 'react-router-dom';

const ProtectedRoute = ({ children }) => {
  const location = useLocation();
  
  // Check for user in localStorage
  const user = localStorage.getItem('cryptobank_user') || localStorage.getItem('user');
  const token = localStorage.getItem('token');
  
  // If no user or token, redirect to login
  if (!user || !token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  // Verify token is not expired (basic check)
  try {
    const userData = JSON.parse(user);
    if (!userData.user_id) {
      return <Navigate to="/login" state={{ from: location }} replace />;
    }
  } catch (error) {
    console.error('Invalid user data:', error);
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  return children;
};

export default ProtectedRoute;
