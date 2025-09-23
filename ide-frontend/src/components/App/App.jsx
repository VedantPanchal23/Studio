import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { IDELayout } from '../IDELayout/IDELayout';
import { WorkspaceDashboard } from '../WorkspaceManager';
import {
  LoginPage,
  SignupPage,
  AuthSuccess,
  AuthFailure,
  ProtectedRoute,
  PublicRoute
} from '../auth';
import './App.css';
import useAuthStore from '../../stores/authStore';

// Wrapper component to use useNavigate hook
const WorkspaceWrapper = () => {
  const navigate = useNavigate();
  
  return (
    <ProtectedRoute>
      <WorkspaceDashboard onWorkspaceSelect={(workspace) => {
        navigate(`/ide?workspace=${workspace._id}`);
      }} />
    </ProtectedRoute>
  );
};

function App() {
  const { initializeAuth } = useAuthStore();

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  return (
    <Router>
      <div className="App">
        <Routes>
          {/* Public routes */}
          <Route
            path="/login"
            element={
              <PublicRoute>
                <LoginPage />
              </PublicRoute>
            }
          />
          <Route
            path="/signup"
            element={
              <PublicRoute>
                <SignupPage />
              </PublicRoute>
            }
          />

          <Route
            path="/auth/success"
            element={<AuthSuccess />}
          />

          <Route
            path="/auth/failure"
            element={<AuthFailure />}
          />

          {/* Protected routes */}
          <Route
            path="/workspaces"
            element={<WorkspaceWrapper />}
          />

          <Route
            path="/ide"
            element={
              <ProtectedRoute>
                <IDELayout />
              </ProtectedRoute>
            }
          />

          {/* Default redirect */}
          <Route
            path="/"
            element={<Navigate to={import.meta.env.VITE_DISABLE_AUTH === 'true' ? "/workspaces" : "/login"} replace />}
          />

          {/* Catch all - redirect to login */}
          <Route
            path="*"
            element={<Navigate to="/login" replace />}
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;