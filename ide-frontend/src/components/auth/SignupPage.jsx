import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import useAuthStore from '../../stores/authStore';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';
import { Loader2 } from 'lucide-react';
import './LoginPage.css';

const SignupPage = () => {
    const navigate = useNavigate();
    const { isAuthenticated, isLoading, error, signup, clearError } = useAuthStore();
    const [form, setForm] = useState({ name: '', email: '', password: '' });
    const [localError, setLocalError] = useState(null);

    useEffect(() => {
        if (isAuthenticated) navigate('/ide', { replace: true });
    }, [isAuthenticated, navigate]);

    useEffect(() => { clearError(); }, [clearError]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((f) => ({ ...f, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLocalError(null);
        if (!form.name || !form.email || !form.password) {
            setLocalError('All fields are required');
            return;
        }
        if (form.password.length < 8) {
            setLocalError('Password must be at least 8 characters');
            return;
        }
        const result = await signup(form);
        if (result.success) {
            navigate('/ide');
        }
    };

    return (
        <div className="login-page">
            <div className="login-container">
                <Card className="login-card">
                    <CardHeader className="login-header">
                        <div className="login-logo">
                            <span className="login-logo__text">IDE</span>
                        </div>
                        <CardTitle className="login-title">Create your account</CardTitle>
                        <CardDescription>Sign up to start coding in the cloud</CardDescription>
                    </CardHeader>
                    <CardContent className="login-content">
                        {(localError || error) && (
                            <Alert variant="destructive">
                                <AlertDescription>{localError || error}</AlertDescription>
                            </Alert>
                        )}
                        <form onSubmit={handleSubmit} className="auth-form">
                            <div className="form-group">
                                <label>Name</label>
                                <input name="name" value={form.name} onChange={handleChange} placeholder="Your name" />
                            </div>
                            <div className="form-group">
                                <label>Email</label>
                                <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="you@example.com" />
                            </div>
                            <div className="form-group">
                                <label>Password</label>
                                <input name="password" type="password" value={form.password} onChange={handleChange} placeholder="••••••••" />
                            </div>
                            <Button type="submit" disabled={isLoading} className="login-button">
                                {isLoading ? <Loader2 className="button-icon animate-spin" /> : 'Sign Up'}
                            </Button>
                        </form>
                        <div className="login-terms">
                            <p>Already have an account? <Link to="/login" className="login-link">Log in</Link></p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default SignupPage;
