import React, { useState } from 'react';
import API from '../api';

export default function Login({ onLoginSuccess }) {
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    try {
      if (isRegister) {
        await API.post('/auth/register', { name, email, password });
        setSuccessMsg('Registration successful! Please sign in.');
        setIsRegister(false);
        setPassword('');
      } else {
        const res = await API.post('/auth/login', { email, password });
        localStorage.setItem('token', res.data.token);
        onLoginSuccess();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong');
    }
  };

  return (
    <div className="relative flex items-center justify-center min-h-screen w-full overflow-hidden bg-[#0B0B0C]">
      {/* Background Lime Glow */}
      <div className="absolute w-[500px] h-[500px] bg-[#C6F432]/10 rounded-full blur-[140px] -top-20 -left-20 pointer-events-none"></div>

      {/* Glassmorphic Card */}
      <form onSubmit={handleSubmit} className="relative z-10 p-8 w-full max-w-md bg-white/[0.02] backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl text-left mx-4">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold tracking-tight text-white">
            {isRegister ? 'Create Account' : 'DevFlow Login'}
          </h2>
          <p className="text-sm text-gray-400 mt-2">
            {isRegister ? 'Join DevFlow workspace' : 'Sign in to your DevFlow workspace'}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl">
            {error}
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 bg-[#C6F432]/10 border border-[#C6F432]/30 text-[#C6F432] text-sm rounded-xl">
            {successMsg}
          </div>
        )}

        {isRegister && (
          <div className="mb-5">
            <label className="block text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">Full Name</label>
            <input 
              type="text" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              placeholder="John Doe"
              className="w-full px-4 py-3 bg-black/60 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-[#C6F432] transition"
              required 
            />
          </div>
        )}

        <div className="mb-5">
          <label className="block text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">Email Address</label>
          <input 
            type="email" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            placeholder="name@example.com"
            className="w-full px-4 py-3 bg-black/60 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-[#C6F432] transition"
            required 
          />
        </div>

        <div className="mb-6">
          <label className="block text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">Password</label>
          <input 
            type="password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            placeholder="••••••••"
            className="w-full px-4 py-3 bg-black/60 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-[#C6F432] transition"
            required 
          />
        </div>

        <button 
          type="submit" 
          className="w-full py-3 bg-[#C6F432] hover:bg-[#b0df22] text-[#0B0B0C] font-semibold rounded-xl shadow-[0_0_25px_rgba(198,244,50,0.25)] transition duration-200"
        >
          {isRegister ? 'Sign Up' : 'Sign In'}
        </button>

        <div className="mt-6 text-center">
          <button 
            type="button" 
            onClick={() => { setIsRegister(!isRegister); setError(''); setSuccessMsg(''); }} 
            className="text-sm text-gray-400 hover:text-[#C6F432] transition"
          >
            {isRegister ? 'Already have an account? Sign In' : "Don't have an account? Register here"}
          </button>
        </div>
      </form>
    </div>
  );
}