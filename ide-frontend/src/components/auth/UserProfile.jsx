import React, { useState } from 'react';
import useAuthStore from '../../stores/authStore';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Alert, AlertDescription } from '../ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Separator } from '../ui/separator';
import { Badge } from '../ui/badge';
import { 
  User, 
  Mail, 
  Settings, 
  Palette, 
  Type, 
  Keyboard, 
  Save, 
  Loader2,
  CheckCircle,
  LogOut
} from 'lucide-react';
import './UserProfile.css';

/**
 * User profile component for viewing and editing user information
 */
const UserProfile = ({ onClose }) => {
  const { 
    user, 
    isLoading, 
    error, 
    updateProfile, 
    logout,
    clearError 
  } = useAuthStore();

  const [formData, setFormData] = useState({
    name: user?.name || '',
    preferences: {
      theme: user?.preferences?.theme || 'dark',
      fontSize: user?.preferences?.fontSize || 14,
      keyBindings: user?.preferences?.keyBindings || 'vscode',
      autoSave: user?.preferences?.autoSave ?? true,
      tabSize: user?.preferences?.tabSize || 2
    }
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    clearError();
    setSaveSuccess(false);
  };

  const handlePreferenceChange = (preference, value) => {
    setFormData(prev => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        [preference]: value
      }
    }));
    clearError();
    setSaveSuccess(false);
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      clearError();
      
      const success = await updateProfile(formData);
      
      if (success) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (error) {
      console.error('Profile update failed:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    if (window.confirm('Are you sure you want to log out?')) {
      await logout();
    }
  };

  const getUserInitials = (name) => {
    return name
      ?.split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'U';
  };

  if (!user) {
    return (
      <Card>
        <CardContent className="profile-no-data">
          <p>No user data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="profile-container">
      {/* User Info Card */}
      <Card>
        <CardHeader>
          <div className="profile-header">
            <Avatar className="profile-avatar">
              <AvatarImage src={user.avatar} alt={user.name} />
              <AvatarFallback style={{fontSize: '1.125rem'}}>
                {getUserInitials(user.name)}
              </AvatarFallback>
            </Avatar>
            <div className="profile-info">
              <CardTitle className="profile-title">
                <User className="profile-title-icon" />
                <span>Profile Information</span>
              </CardTitle>
              <CardDescription>
                Manage your account settings and preferences
              </CardDescription>
            </div>
            {user.isVerified && (
              <Badge variant="secondary" className="profile-badge">
                <CheckCircle className="profile-badge-icon" />
                <span>Verified</span>
              </Badge>
            )}
          </div>
        </CardHeader>
        
        <CardContent className="profile-form">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {saveSuccess && (
            <Alert>
              <CheckCircle style={{height: '1rem', width: '1rem'}} />
              <AlertDescription>Profile updated successfully!</AlertDescription>
            </Alert>
          )}
          
          <div className="profile-form-row">
            <div className="profile-form-group">
              <Label htmlFor="name">Display Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Enter your name"
              />
            </div>
            
            <div className="profile-form-group">
              <Label htmlFor="email">Email Address</Label>
              <div className="profile-form-input-group">
                <Mail className="profile-form-icon" />
                <Input
                  id="email"
                  value={user.email}
                  disabled
                  style={{backgroundColor: '#f9fafb'}}
                />
              </div>
              <p className="profile-form-help">
                Email cannot be changed
              </p>
            </div>
          </div>
          
          <div className="profile-stats">
            <p><strong>Member since:</strong> {new Date(user.createdAt).toLocaleDateString()}</p>
            <p><strong>Last login:</strong> {new Date(user.lastLogin).toLocaleDateString()}</p>
            <p><strong>Workspaces:</strong> {user.workspaceCount || 0}</p>
          </div>
        </CardContent>
      </Card>

      {/* Preferences Card */}
      <Card>
        <CardHeader>
          <CardTitle className="profile-preferences-title">
            <Settings className="profile-title-icon" />
            <span>IDE Preferences</span>
          </CardTitle>
          <CardDescription>
            Customize your development environment
          </CardDescription>
        </CardHeader>
        
        <CardContent className="profile-preferences">
          <div className="profile-preferences-form">
            <div className="profile-form-group">
              <Label style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                <Palette style={{height: '1rem', width: '1rem'}} />
                <span>Theme</span>
              </Label>
              <Select
                value={formData.preferences.theme}
                onValueChange={(value) => handlePreferenceChange('theme', value)}
              >
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
                <SelectItem value="auto">Auto</SelectItem>
              </Select>
            </div>
            
            <div className="profile-form-group">
              <Label style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                <Keyboard style={{height: '1rem', width: '1rem'}} />
                <span>Key Bindings</span>
              </Label>
              <Select
                value={formData.preferences.keyBindings}
                onValueChange={(value) => handlePreferenceChange('keyBindings', value)}
              >
                <SelectItem value="vscode">VS Code</SelectItem>
                <SelectItem value="vim">Vim</SelectItem>
                <SelectItem value="emacs">Emacs</SelectItem>
                <SelectItem value="sublime">Sublime Text</SelectItem>
              </Select>
            </div>
            
            <div className="profile-form-group">
              <Label style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                <Type style={{height: '1rem', width: '1rem'}} />
                <span>Font Size</span>
              </Label>
              <Select
                value={formData.preferences.fontSize.toString()}
                onValueChange={(value) => handlePreferenceChange('fontSize', parseInt(value))}
              >
                {[10, 11, 12, 13, 14, 15, 16, 17, 18, 20, 22, 24].map(size => (
                  <SelectItem key={size} value={size.toString()}>
                    {size}px
                  </SelectItem>
                ))}
              </Select>
            </div>
            
            <div className="profile-form-group">
              <Label>Tab Size</Label>
              <Select
                value={formData.preferences.tabSize.toString()}
                onValueChange={(value) => handlePreferenceChange('tabSize', parseInt(value))}
              >
                {[2, 3, 4, 6, 8].map(size => (
                  <SelectItem key={size} value={size.toString()}>
                    {size} spaces
                  </SelectItem>
                ))}
              </Select>
            </div>
          </div>
          
          <div className="profile-checkbox-group">
            <input
              type="checkbox"
              id="autoSave"
              checked={formData.preferences.autoSave}
              onChange={(e) => handlePreferenceChange('autoSave', e.target.checked)}
              className="profile-checkbox"
            />
            <Label htmlFor="autoSave">Enable auto-save</Label>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="profile-actions">
        <Button
          onClick={handleLogout}
          variant="outline"
          className="profile-logout-btn"
        >
          <LogOut className="profile-button-icon" />
          Log Out
        </Button>
        
        <div className="profile-actions-group">
          {onClose && (
            <Button onClick={onClose} variant="outline">
              Cancel
            </Button>
          )}
          <Button
            onClick={handleSave}
            disabled={isSaving || isLoading}
          >
            {isSaving ? (
              <Loader2 className="profile-button-icon animate-spin" />
            ) : (
              <Save className="profile-button-icon" />
            )}
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;