import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
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

function App() {
  const { initializeAuth, isAuthenticated } = useAuthStore();

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
            element={
              <ProtectedRoute>
                <WorkspaceDashboard onWorkspaceSelect={(workspace) => {
                  window.location.href = `/ide?workspace=${workspace._id}`;
                }} />
              </ProtectedRoute>
            }
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
            element={<Navigate to="/workspaces" replace />}
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