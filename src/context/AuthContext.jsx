import React, { createContext, useContext, useState, useEffect, useRef } from 'react';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Decode a JWT payload without verifying signature (client-side only). */
const decodeJwt = (token) => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
};

/** Returns milliseconds until JWT expiry, or -1 if already expired/invalid. */
const msUntilExpiry = (token) => {
  const decoded = decodeJwt(token);
  if (!decoded || !decoded.exp) return -1;
  return decoded.exp * 1000 - Date.now();
};

/** Persist session data atomically to localStorage. */
const persistSession = (token, user) => {
  localStorage.setItem('trsv_session_token', token);
  localStorage.setItem('trsv_cached_profile', JSON.stringify(user));
};

/** Remove all session data from localStorage. */
const clearPersistedSession = () => {
  localStorage.removeItem('trsv_session_token');
  localStorage.removeItem('trsv_role');
  localStorage.removeItem('trsv_cached_profile');
};

// ─── Provider ───────────────────────────────────────────────────────────────

export const AuthProvider = ({ children }) => {
  const [userProfile, setUserProfile] = useState(() => {
    try {
      const cached = localStorage.getItem('trsv_cached_profile');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });

  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const cached = localStorage.getItem('trsv_cached_profile');
      if (cached) {
        const parsed = JSON.parse(cached);
        return { uid: parsed.id, email: parsed.email };
      }
    } catch { /* ignored */ }
    return null;
  });

  const [token, setToken] = useState(() => localStorage.getItem('trsv_session_token') || null);
  const [loading, setLoading] = useState(true);

  // Ref so interceptor always closes over latest handleSessionClear
  const sessionClearRef = useRef(null);

  // ─── Sync token → localStorage ──────────────────────────────────────────
  useEffect(() => {
    if (token) {
      localStorage.setItem('trsv_session_token', token);
    } else {
      localStorage.removeItem('trsv_session_token');
    }
  }, [token]);

  // ─── Session clear ───────────────────────────────────────────────────────
  const handleSessionClear = () => {
    setCurrentUser(null);
    setUserProfile(null);
    setToken(null);
    clearPersistedSession();
  };

  // Keep ref fresh
  useEffect(() => {
    sessionClearRef.current = handleSessionClear;
  });

  // ─── Silent token refresh ────────────────────────────────────────────────
  /**
   * Calls /api/auth/refresh with the current token.
   * On success, stores the new 30-day token and returns it.
   * On failure, returns null (does NOT clear session — caller decides).
   */
  const silentRefresh = async (currentToken) => {
    try {
      const res = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${currentToken}`,
          'Content-Type': 'application/json',
        },
      });
      if (!res.ok) return null;
      const data = await res.json();
      if (data.success && data.token) {
        setToken(data.token);
        localStorage.setItem('trsv_session_token', data.token);
        console.log('🔄 [AuthContext] Token silently refreshed — valid for 7 more days.');
        return data.token;
      }
    } catch (err) {
      console.warn('[AuthContext] Silent refresh network error:', err.message);
    }
    return null;
  };

  // ─── Background profile fetch (non-blocking) ─────────────────────────────
  const fetchDbProfile = async (sessionToken) => {
    try {
      const response = await fetch('/api/auth/profile', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${sessionToken}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data.success) {
        setUserProfile(data.user);
        setCurrentUser({ uid: data.user.id, email: data.user.email });
        localStorage.setItem('trsv_cached_profile', JSON.stringify(data.user));
        return data.user;
      } else {
        // Only clear if the server explicitly rejects the token
        if (
          response.status === 401 &&
          (data.message === 'Authentication session expired or invalid.' ||
            data.message === 'Invalid or expired token.')
        ) {
          handleSessionClear();
        }
        // For 403 / PROFILE_NOT_FOUND / server blips → fall through to cache
      }
    } catch (error) {
      // Server unreachable (Render cold-start, network blip) → stay logged in with cache
      console.warn('[AuthContext] Profile sync deferred (server unreachable):', error.message);
    }

    // Fall back to cached profile — keeps user logged in during server sleep
    try {
      const cached = localStorage.getItem('trsv_cached_profile');
      if (cached) return JSON.parse(cached);
    } catch { /* ignored */ }
    return null;
  };

  // ─── App-startup session rehydration ────────────────────────────────────
  useEffect(() => {
    const initSession = async () => {
      const storedToken = localStorage.getItem('trsv_session_token');

      if (!storedToken) {
        // No token ever stored → user never logged in
        handleSessionClear();
        setLoading(false);
        return;
      }

      const timeLeft = msUntilExpiry(storedToken);

      if (timeLeft <= 0) {
        // Token is fully expired — must re-login
        console.warn('[AuthContext] Stored token expired. Clearing session.');
        handleSessionClear();
        setLoading(false);
        return;
      }

      // ── Token is still valid ─────────────────────────────────────────────
      const decoded = decodeJwt(storedToken);

      // Immediately hydrate UI from cache so there is zero flash / blank screen
      const cachedRaw = localStorage.getItem('trsv_cached_profile');
      let profile = null;
      try { profile = cachedRaw ? JSON.parse(cachedRaw) : null; } catch { /* ignored */ }

      if (!profile && decoded) {
        // Reconstruct minimal profile from token payload as fallback
        profile = {
          id: decoded.uid,
          email: decoded.email,
          role: decoded.role,
          full_name: decoded.name || 'Student',
          verified: true,
        };
      }

      if (profile) {
        setCurrentUser({ uid: profile.id, email: profile.email });
        setUserProfile(profile);
        setToken(storedToken);
      }

      setLoading(false); // Unlock UI immediately — background tasks run after

      // ── Proactive silent refresh ─────────────────────────────────────────
      // If the token expires within 1 day, silently get a new 7-day token
      const ONE_DAY_MS = 24 * 60 * 60 * 1000;
      let activeToken = storedToken;
      if (timeLeft < ONE_DAY_MS) {
        console.log('[AuthContext] Token expiring soon — triggering silent refresh...');
        const refreshed = await silentRefresh(storedToken);
        if (refreshed) activeToken = refreshed;
        // If refresh fails (server down etc.) keep using old token until it actually expires
      }

      // ── Background DB profile sync (non-blocking) ────────────────────────
      fetchDbProfile(activeToken).catch((err) => {
        console.warn('[AuthContext] Background profile sync error:', err);
      });
    };

    initSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Global Fetch Interceptor ────────────────────────────────────────────
  // IMPORTANT: Only forces logout when the server explicitly says the token is
  // invalid. Does NOT logout on generic 403s or server cold-start blips.
  useEffect(() => {
    const originalFetch = window.fetch;

    window.fetch = async (input, init) => {
      const url =
        typeof input === 'string'
          ? input
          : input instanceof Request
          ? input.url
          : '';

      const response = await originalFetch(input, init);

      const isApiCall = url.includes('/api/');
      const isAuthRoute =
        url.includes('/api/auth/login') ||
        url.includes('/api/auth/signup') ||
        url.includes('/api/auth/refresh') ||
        url.includes('/api/auth/send-otp') ||
        url.includes('/api/auth/verify-otp');

      if ((response.status === 401) && isApiCall && !isAuthRoute) {
        try {
          const clone = response.clone();
          const data = await clone.json();
          // Only the explicit expiry messages trigger logout — NOT generic 403s
          const EXPIRY_MESSAGES = [
            'Invalid or expired token.',
            'Authentication session expired or invalid.',
            'No authorization header provided.',
            'Authorization header required.',
          ];
          if (data && EXPIRY_MESSAGES.includes(data.message)) {
            console.warn('🕵️ [Fetch Interceptor] Token expired — clearing session.');
            if (sessionClearRef.current) sessionClearRef.current();
            window.location.href = '/login';
          }
        } catch { /* Not JSON — ignore */ }
      }

      return response;
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  // ─── Auth Actions ────────────────────────────────────────────────────────

  const login = async (email, password) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.message || 'Authentication failed. Please verify credentials.');
    }

    setToken(data.token);
    setUserProfile(data.user);
    setCurrentUser({ uid: data.user.id, email: data.user.email });
    persistSession(data.token, data.user);

    return data.user;
  };

  const loginWithGoogle = async () => {
    throw new Error('Google SSO authentication is deprecated. Please register a local student account.');
  };

  const signup = async (email, password, fullName, phone, constituencyId, collegeId, profileImage) => {
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
        profileImage,
      }),
    });

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.message || 'Registration with PostgreSQL node failed.');
    }

    setToken(data.token);
    setUserProfile(data.user);
    setCurrentUser({ uid: data.user.id, email: data.user.email });
    persistSession(data.token, data.user);

    return data.user;
  };

  const logout = async () => {
    handleSessionClear();
  };

  const resetPassword = async (email) => {
    const response = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.message || 'Failed to trigger password recovery.');
    return data;
  };

  const confirmResetPassword = async (email, code, newPassword) => {
    const response = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code, newPassword }),
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.message || 'Failed to reset password.');
    return data;
  };

  // ─── Context Value ───────────────────────────────────────────────────────

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
    confirmResetPassword,
    refreshProfile: () => fetchDbProfile(token),
    silentRefresh: () => silentRefresh(token),
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
