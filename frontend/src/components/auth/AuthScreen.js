import React, { useState } from 'react';
import { useChatContext } from '../../context/ChatContext';
import { Eye, EyeOff } from 'lucide-react';

const AuthScreen = () => {
    const { handleLogin, handleRegister, authLoading, authError, setAuthError } = useChatContext();
    const [authMode, setAuthMode] = useState('login');
    const [form, setForm] = useState({ username: '', password: '', email: '' });
    const [showPassword, setShowPassword] = useState(false);

    const handleAuth = async (e) => {
        e.preventDefault();
        try {
            if (authMode === 'login') {
                await handleLogin({ username: form.username, password: form.password });
            } else {
                await handleRegister({ username: form.username, password: form.password, email: form.email });
            }
        } catch (error) {
            // Error is already set in the hook, but you could add more logic here
            console.error(error);
        }
    };
    
    const switchMode = (mode) => {
        setAuthMode(mode);
        setAuthError(''); // Clear errors on mode switch
        setForm({ username: '', password: '', email: '' });
    };

    // PASTE THE ENTIRE <div>...</div> from your original `if (!isAuthenticated)` block here.
    // Then, replace the state variables and handlers with the ones from this component.
    // For example, onClick={() => setAuthMode('login')} becomes onClick={() => switchMode('login')}
    // And onSubmit={handleAuth} remains the same.
    return (
     
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 w-full max-w-md border border-white/20">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">
              <span className="text-blue-400">Fast</span>Chat
            </h1>
            <p className="text-gray-300">Real-time communication platform</p>
          </div>
          
          <div className="flex mb-6 bg-white/5 rounded-lg p-1">
            <button
              onClick={() => switchMode('login')}
              className={`flex-1 py-2 px-4 rounded-md font-medium transition-all ${
                authMode === 'login' 
                  ? 'bg-blue-500 text-white' 
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              Login
            </button>
            <button
    onClick={() => switchMode('register')} // <<< CHANGE THIS
    className={`flex-1 py-2 px-4 rounded-md font-medium transition-all ${
        authMode === 'register' 
            ? 'bg-blue-500 text-white' 
            : 'text-gray-300 hover:text-white'
    }`}
>
    Register
</button>
          </div>
          
          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <input
                type="text"
                placeholder="Username"
                value={form.username}
                onChange={(e) => setForm({...form, username: e.target.value})}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            
            {authMode === 'register' && (
              <div>
                <input
                  type="email"
                  placeholder="Email (optional)"
                  value={form.email}
                  onChange={(e) => setForm({...form, email: e.target.value})}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
            
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                value={form.password}
                onChange={(e) => setForm({...form, password: e.target.value})}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 pr-12"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            
            {authError && (
              <div className="text-red-400 text-sm text-center">{authError}</div>
            )}
            
            <button
              type="submit"
              disabled={authLoading}
              className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {authLoading ? 'Please wait...' : (authMode === 'login' ? 'Login' : 'Register')}
            </button>
          </form>
        </div>
      </div>
    )
   
};

export default AuthScreen;