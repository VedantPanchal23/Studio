import React, { useState } from 'react';
import { Loader2, FolderPlus } from 'lucide-react';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Checkbox } from '../ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import styles from './CreateWorkspaceDialog.module.css';

const RUNTIME_OPTIONS = [
  { value: 'node', label: 'Node.js', description: 'JavaScript runtime' },
  { value: 'python', label: 'Python', description: 'Python interpreter' },
  { value: 'java', label: 'Java', description: 'Java Virtual Machine' },
  { value: 'cpp', label: 'C++', description: 'C++ compiler' },
  { value: 'go', label: 'Go', description: 'Go compiler' },
  { value: 'rust', label: 'Rust', description: 'Rust compiler' },
  { value: 'php', label: 'PHP', description: 'PHP interpreter' },
  { value: 'ruby', label: 'Ruby', description: 'Ruby interpreter' }
];

export const CreateWorkspaceDialog = ({ open, onOpenChange }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    isPublic: false,
    runtime: 'node',
    version: 'latest'
  });
  const [errors, setErrors] = useState({});
  
  const { createWorkspace, loading } = useWorkspaceStore();

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Workspace name is required';
    } else if (formData.name.length > 100) {
      newErrors.name = 'Workspace name must be less than 100 characters';
    } else if (!/^[a-zA-Z0-9\s\-_]+$/.test(formData.name)) {
      newErrors.name = 'Workspace name can only contain letters, numbers, spaces, hyphens, and underscores';
    }
    
    if (formData.description && formData.description.length > 500) {
      newErrors.description = 'Description must be less than 500 characters';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      const workspaceData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        isPublic: formData.isPublic,
        settings: {
          runtime: formData.runtime,
          version: formData.version
        }
      };

      await createWorkspace(workspaceData);
      
      // Reset form and close dialog
      setFormData({
        name: '',
        description: '',
        isPublic: false,
        runtime: 'node',
        version: 'latest'
      });
      setErrors({});
      onOpenChange(false);
    } catch (error) {
      // Handle API errors
      if (error.response?.data?.errors) {
        const apiErrors = {};
        error.response.data.errors.forEach(err => {
          apiErrors[err.path] = err.msg;
        });
        setErrors(apiErrors);
      } else {
        setErrors({ 
          general: error.response?.data?.message || 'Failed to create workspace' 
        });
      }
    }
  };

  const handleCancel = () => {
    setFormData({
      name: '',
      description: '',
      isPublic: false,
      runtime: 'node',
      version: 'latest'
    });
    setErrors({});
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={styles.dialogContent}>
        <DialogHeader>
          <DialogTitle className={styles.dialogTitle}>
            <FolderPlus className={styles.titleIcon} />
            <span>Create New Workspace</span>
          </DialogTitle>
          <DialogDescription>
            Create a new workspace to organize your projects and collaborate with others.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className={styles.form}>
          {errors.general && (
            <div className={styles.errorAlert}>
              {errors.general}
            </div>
          )}

          <div className={styles.fieldGroup}>
            <Label htmlFor="name">Workspace Name *</Label>
            <Input
              id="name"
              placeholder="My Awesome Project"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className={errors.name ? 'border-destructive' : ''}
            />
            {errors.name && (
              <p className={styles.fieldError}>{errors.name}</p>
            )}
          </div>

          <div className={styles.fieldGroup}>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Brief description of your workspace..."
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              className={errors.description ? 'border-destructive' : ''}
              rows={3}
            />
            {errors.description && (
              <p className={styles.fieldError}>{errors.description}</p>
            )}
          </div>

          <div className={styles.fieldGrid}>
            <div className={styles.fieldGroup}>
              <Label htmlFor="runtime">Runtime</Label>
              <Select
                value={formData.runtime}
                onValueChange={(value) => handleInputChange('runtime', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select runtime" />
                </SelectTrigger>
                <SelectContent>
                  {RUNTIME_OPTIONS.map((runtime) => (
                    <SelectItem key={runtime.value} value={runtime.value}>
                      <div className={styles.runtimeOption}>
                        <span>{runtime.label}</span>
                        <span className={styles.runtimeDescription}>
                          {runtime.description}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className={styles.fieldGroup}>
              <Label htmlFor="version">Version</Label>
              <Input
                id="version"
                placeholder="latest"
                value={formData.version}
                onChange={(e) => handleInputChange('version', e.target.value)}
              />
            </div>
          </div>

          <div className={styles.checkboxGroup}>
            <Checkbox
              id="isPublic"
              checked={formData.isPublic}
              onCheckedChange={(checked) => handleInputChange('isPublic', checked)}
            />
            <Label htmlFor="isPublic" className={styles.checkboxLabel}>
              Make this workspace public
            </Label>
          </div>
          {formData.isPublic && (
            <p className={styles.checkboxDescription}>
              Public workspaces can be viewed by anyone, but only collaborators can edit.
            </p>
          )}

          <DialogFooter className={styles.dialogFooter}>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className={styles.submitButton}>
              {loading ? (
                <>
                  <Loader2 className={styles.loadingIcon} />
                  Creating...
                </>
              ) : (
                <>
                  <FolderPlus className={styles.createIcon} />
                  Create Workspace
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateWorkspaceDialog;