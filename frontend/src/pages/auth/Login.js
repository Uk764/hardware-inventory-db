import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast, { Toaster } from 'react-hot-toast';
import { FiMail, FiLock, FiEye, FiEyeOff } from 'react-icons/fi';

const Login = () => {
  const [email, setEmail]               = useState('');
  const [password, setPassword]         = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading]           = useState(false);

  const { login } = useAuth();
  const navigate  = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please enter email and password');
      return;
    }
    setLoading(true);
    try {
      await login(email, password);
      toast.success('Login successful!');
      navigate('/dashboard');
    } catch (error) {
      const message = error.response?.data?.message || 'Login failed';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 
                    via-blue-800 to-blue-600 
                    flex items-center justify-center p-4">
      <Toaster position="top-right" />

      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="bg-blue-600 text-white w-16 h-16 rounded-2xl 
                          flex items-center justify-center text-2xl 
                          font-bold mx-auto mb-4">
            🏪
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Hardware Store</h1>
          <p className="text-gray-500 text-sm mt-1">Inventory Management System</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">

          <div>
            <label className="input-label">Email Address</label>
            <div className="relative">
              <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 
                                  text-gray-400 text-lg" />
              <input
                type="email"
                className="input-field pl-10"
                placeholder="admin@hardwarestore.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <label className="input-label">Password</label>
            <div className="relative">
              <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 
                                  text-gray-400 text-lg" />
              <input
                type={showPassword ? 'text' : 'password'}
                className="input-field pl-10 pr-10"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 
                           text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <FiEyeOff /> : <FiEye />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full justify-center py-3 text-base"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 
                                border-b-2 border-white">
                </div>
                Logging in...
              </>
            ) : 'Login'}
          </button>

        </form>

        <div className="mt-6 p-3 bg-blue-50 rounded-lg">
          <p className="text-xs text-blue-700 text-center">
            Default: admin@hardwarestore.com / password
          </p>
        </div>

      </div>
    </div>
  );
};

export default Login;