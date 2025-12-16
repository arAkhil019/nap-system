import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import '../App.css'; // Ensure App.css is imported

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    
    try {
      setError('');
      setLoading(true);
      await login(email, password);
      navigate('/dashboard'); // Navigate to dashboard on successful login
    } catch (error) {
      // Attempt to provide a more user-friendly error message
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        setError('Invalid email or password. Please try again.');
      } else {
        setError('Failed to log in. Please try again later.');
      }
      console.error("Login error:", error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page-container"> {/* Replaces Tailwind flex, items-center, justify-center, bg-gray-50 etc. */}
      <div className="login-form-card card"> {/* Replaces max-w-md, w-full, space-y-8. Uses .card for styling */}
        <div>
          <h2 className="login-title"> {/* Replaces text-center, text-3xl, font-extrabold, text-gray-900 */}
            Sign in to NAP System
          </h2>
        </div>

        {error && (
          <div className="message message-error login-error-message" role="alert"> {/* Replaces Tailwind alert styles */}
            {error}
          </div>
        )}

        <form className="login-form" onSubmit={handleSubmit}> {/* Replaces mt-8, space-y-6 */}
          <div className="form-group"> {/* Replaces rounded-md, shadow-sm, -space-y-px */}
            {/* <label htmlFor="email-address" className="form-label sr-only">Email address</label> */}
            <input
              id="email-address"
              name="email"
              type="email"
              required
              className="form-input login-input" // Use .form-input
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="form-group">
            {/* <label htmlFor="password" className="form-label sr-only">Password</label> */}
            <input
              id="password"
              name="password"
              type="password"
              required
              className="form-input login-input" // Use .form-input
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className="form-group"> {/* For the button */}
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary btn-full-width login-submit-button" // Use .btn, .btn-primary, .btn-full-width
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}