import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(() => {
    const cached = localStorage.getItem('tsrv_cached_profile');
    return cached ? JSON.parse(cached) : null;
  });
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(() => localStorage.getItem('tsrv_session_token') || null);

  // Sync token state to local storage
  useEffect(() => {
    if (token) {
      localStorage.setItem('tsrv_session_token', token);
    } else {
      localStorage.removeItem('tsrv_session_token');
    }
  }, [token]);

  // Synchronize authenticated state from backend PostgreSQL database
  const fetchDbProfile = async (sessionToken) => {
    try {
      const response = await fetch('/api/auth/profile', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${sessionToken}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (data.success) {
        setUserProfile(data.user);
        // Cache user role and full profile globally to prevent logout on reload
        localStorage.setItem('tsrv_role', data.user.role);
        localStorage.setItem('tsrv_cached_profile', JSON.stringify(data.user));
        return data.user;
      } else {
        console.warn('⚠️ [AuthContext] DB Profile Warning:', data.message);
        if (response.status === 401) {
           handleSessionClear();
        }
      }
    } catch (error) {
      console.error('🚨 [AuthContext] Error fetching DB profile:', error.message);
      // Fall back to locally cached profile to prevent logouts during server sleep/wake or minor connection drops
      const cached = localStorage.getItem('tsrv_cached_profile');
      if (cached) {
        try {
          return JSON.parse(cached);
        } catch (e) {
          return null;
        }
      }
    }
    return null;
  };

  const handleSessionClear = () => {
    setCurrentUser(null);
    setUserProfile(null);
    setToken(null);
    localStorage.removeItem('tsrv_role');
    localStorage.removeItem('tsrv_cached_profile');
    localStorage.removeItem('tsrv_session_token');
  };

  // Local JWT session rehydration on mount
  useEffect(() => {
    const initSession = async () => {
      const storedToken = localStorage.getItem('tsrv_session_token');
      if (storedToken) {
        const profile = await fetchDbProfile(storedToken);
        if (profile) {
          setCurrentUser({ uid: profile.id, email: profile.email });
        } else {
          handleSessionClear();
        }
      } else {
        handleSessionClear();
      }
      setLoading(false);
    };
    initSession();
  }, []);

  /**
   * Universal Login handler supporting both standard student advocates and Supreme secret credentials
   */
  const login = async (email, password) => {
    setLoading(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || 'Authentication failed. Please verify credentials.');
      }

      setToken(data.token);
      setUserProfile(data.user);
      setCurrentUser({ uid: data.user.id, email: data.user.email });

      localStorage.setItem('tsrv_session_token', data.token);
      localStorage.setItem('tsrv_role', data.user.role);
      localStorage.setItem('tsrv_cached_profile', JSON.stringify(data.user));

      setLoading(false);
      return data.user;
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  /**
   * Google Sign-In handler (Deprecated in local JWT migration)
   */
  const loginWithGoogle = async () => {
    throw new Error('Google SSO authentication is deprecated. Please register a local advocate account.');
  };

  /**
   * Student Signup handler with local database registration
   */
  const signup = async (email, password, fullName, phone, constituencyId, collegeId, profileImage) => {
    setLoading(true);
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName,
          email,
          password,
          phone,
          constituencyId: constituencyId ? parseInt(constituencyId) : null,
          collegeId: collegeId && !isNaN(collegeId) ? parseInt(collegeId) : null,
          collegeName: collegeId && isNaN(collegeId) ? collegeId : null,
          role: 'student',
          profileImage
        })
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || 'Registration with PostgreSQL node failed.');
      }

      setToken(data.token);
      setUserProfile(data.user);
      setCurrentUser({ uid: data.user.id, email: data.user.email });

      localStorage.setItem('tsrv_session_token', data.token);
      localStorage.setItem('tsrv_role', 'student');
      localStorage.setItem('tsrv_cached_profile', JSON.stringify(data.user));
      
      setLoading(false);
      return data.user;
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  /**
   * Global Signout handler
   */
  const logout = async () => {
    setLoading(true);
    try {
      handleSessionClear();
      setLoading(false);
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  /**
   * Password reset trigger (Deprecated in local JWT migration)
   */
  const resetPassword = async (email) => {
    throw new Error('Statewide security protocol: Contact your constituency administrator or Supreme Command to request a password reset.');
  };

  const value = {
    currentUser,
    userProfile,
    token,
    loading,
    login,
    loginWithGoogle,
    signup,
    logout,
    resetPassword,
    refreshProfile: () => fetchDbProfile(token)
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
