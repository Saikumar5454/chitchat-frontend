import React, { useState } from 'react';

const API_URL = process.env.REACT_APP_API_URL;

export const Auth = ({ onAuthenticated }) => {
    const [email, setEmail] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [mode, setMode] = useState('login');
    const [otpStep, setOtpStep] = useState('request');
    const [otp, setOtp] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const submitAuth = async (event) => {
        event.preventDefault();
        setError('');
        if (mode === 'register' && password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }
        setLoading(true);
        try {
            const endpoint = mode === 'otp' || (mode === 'register' && otpStep === 'verify') ? 'verify-otp' : mode;
            const response = await fetch(`${API_URL}/api/auth/${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(mode === 'register' && otpStep === 'verify'
                    ? { email, display_name: displayName, password, confirm_password: confirmPassword, code: otp }
                    : mode === 'register'
                        ? { email, display_name: displayName, password, confirm_password: confirmPassword }
                        : mode === 'login' ? { email, password } : { email, code: otp }),
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(
                    response.status === 401
                        ? 'Login failed: the email or password does not match an account in the database.'
                        : data.detail || 'Authentication failed'
                );
            }
            localStorage.setItem('chat_token', data.token);
            onAuthenticated(data.token);
        } catch (authError) {
            setError(authError.message);
        } finally {
            setLoading(false);
        }
    };

    const requestOtp = async () => {
        setError('');
        setLoading(true);
        try {
            const response = await fetch(`${API_URL}/api/auth/request-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.detail || 'Could not send OTP');
            setOtpStep('verify');
            setError(data.dev_code ? `Development OTP: ${data.dev_code}` : 'Check your email for the OTP.');
        } catch (otpError) {
            setError(otpError.message);
        } finally {
            setLoading(false);
        }
    };

    const beginRegistration = async (event) => {
        event.preventDefault();
        setError('');
        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }
        await requestOtp();
    };

    const switchMode = () => {
        setMode((currentMode) => currentMode === 'login' ? 'register' : 'login');
        setError('');
        setPassword('');
        setConfirmPassword('');
        setOtp('');
        setOtpStep('request');
    };

    return (
        <section className="auth-card">
            <p className="eyebrow">PRIVATE CHAT ROOM</p>
            <h1>{mode === 'login' ? 'Welcome back.' : mode === 'register' ? 'Create your account.' : 'Email OTP login.'}</h1>
            <p className="auth-subtitle">{mode === 'login' ? 'Log in to continue your conversations.' : mode === 'register' ? 'Register once, then return anytime with your email and password.' : 'Use a one-time code sent to your email.'}</p>
            {mode === 'register' && otpStep === 'verify' ? (
                <form onSubmit={submitAuth}>
                    <label htmlFor="register-otp">Verification code</label>
                    <input id="register-otp" inputMode="numeric" value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="000000" required />
                    <button type="submit" disabled={loading || otp.length !== 6}>{loading ? 'Creating account...' : 'Verify and create account'}</button>
                </form>
            ) : mode === 'otp' && otpStep === 'request' ? (
                <form onSubmit={(event) => { event.preventDefault(); requestOtp(); }}>
                    <label htmlFor="otp-email">Email address</label>
                    <input id="otp-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" autoComplete="email" required />
                    <button type="submit" disabled={loading}>{loading ? 'Sending...' : 'Send OTP'}</button>
                </form>
            ) : mode === 'otp' ? (
                <form onSubmit={mode === 'register' ? beginRegistration : submitAuth}>
                    <label htmlFor="otp">Verification code</label>
                    <input id="otp" inputMode="numeric" value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="000000" required />
                    <button type="submit" disabled={loading || otp.length !== 6}>{loading ? 'Verifying...' : 'Enter chat'}</button>
                </form>
            ) : (
                <form onSubmit={mode === 'register' ? beginRegistration : submitAuth}>
                {mode === 'register' && (
                    <>
                        <label htmlFor="display-name">Your name</label>
                        <input id="display-name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="e.g. Alex" minLength="2" maxLength="80" autoComplete="name" required />
                    </>
                )}
                <label htmlFor="email">Email address</label>
                <input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" maxLength="254" autoComplete="email" required />
                <label htmlFor="password">Password</label>
                <input id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" minLength="8" maxLength="128" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required />
                {mode === 'register' && (
                    <>
                        <label htmlFor="confirm-password">Confirm password</label>
                        <input id="confirm-password" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Repeat your password" minLength="8" maxLength="128" autoComplete="new-password" required />
                    </>
                )}
                <button type="submit" disabled={loading}>{loading ? 'Please wait...' : mode === 'login' ? 'Log in' : 'Create account'}</button>
                </form>
            )}
            <div className="auth-links">
                <button type="button" className="text-button auth-switch" onClick={switchMode}>
                    {mode === 'register' ? 'Already registered? Log in' : 'New here? Create an account'}
                </button>
                {mode === 'login' && <button type="button" className="text-button auth-switch" onClick={() => { setMode('otp'); setOtpStep('request'); setError(''); }}>Log in with email OTP</button>}
            </div>
            {error && <p className="auth-error" role="alert">{error}</p>}
        </section>
    );
};
