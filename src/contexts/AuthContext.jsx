// src/contexts/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Create auth context
const AuthContext = createContext();

// Custom hook to use the auth context
export function useAuth() {
  return useContext(AuthContext);
}

// Provider component
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check if user is logged in on initial load
  useEffect(() => {
    // Get session from Supabase auth
    const checkAuthState = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          throw error;
        }

        setUser(session?.user || null);
      } catch (error) {
        console.error("Auth state check failed:", error.message);
        setError(error);
      } finally {
        setLoading(false);
      }
    };

    checkAuthState();

    // Set up auth state change listener
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user || null);
      }
    );

    // Clean up subscription
    return () => {
      if (authListener && authListener.subscription) {
        authListener.subscription.unsubscribe();
      }
    };
  }, []);

  // Sign in function
  const signIn = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      return { data };
    } catch (error) {
      console.error("Sign in failed:", error.message);
      return { error };
    }
  };

  // Sign up function
  // src/contexts/AuthContext.jsx - Update the signUp function
// ...existing imports and code...

// Update the signUp function to properly set display_name
const signUp = async (email, password, username) => {
  try {
    // First, sign up the user with email and password
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
          display_name: username // Add this field specifically
        }
      }
    });

    if (error) {
      throw error;
    }

    // If sign up successful, update the user to ensure display_name is set
    if (data?.user && username) {
      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          username,
          display_name: username // This is the field that Supabase uses
        }
      });

      if (updateError) {
        console.error("Username update failed:", updateError.message);
      }
    }

    return { data };
  } catch (error) {
    console.error("Sign up failed:", error.message);
    return { error };
  }
};

// Add a helper function to get display name
const getDisplayName = async () => {
  try {
    const { data, error } = await supabase.auth.getUser();
    
    if (error) {
      throw error;
    }
    
    return data.user.user_metadata.display_name || data.user.user_metadata.username || null;
  } catch (error) {
    console.error("Failed to get display name:", error.message);
    return null;
  }
};

// Add this function to your context value export


// ...rest of the AuthContext stays the same...

  // Sign out function
  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        throw error;
      }
      
      return { success: true };
    } catch (error) {
      console.error("Sign out failed:", error.message);
      return { error };
    }
  };

  // Reset password function
  const resetPassword = async (email) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        throw error;
      }

      return { success: true };
    } catch (error) {
      console.error("Password reset failed:", error.message);
      return { error };
    }
  };

  // Update user profile
  const updateProfile = async (userData) => {
    try {
      const { error } = await supabase.auth.updateUser(userData);

      if (error) {
        throw error;
      }

      return { success: true };
    } catch (error) {
      console.error("Profile update failed:", error.message);
      return { error };
    }
  };

  // Get current user
  const getCurrentUser = async () => {
    try {
      const { data: { user: currentUser }, error } = await supabase.auth.getUser();

      if (error) {
        throw error;
      }

      return { user: currentUser };
    } catch (error) {
      console.error("Get current user failed:", error.message);
      return { error };
    }
  };

  // Context value
  const value = {
    user,
    loading,
    error,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updateProfile,
    getCurrentUser,
    getDisplayName, // Add this to the exported values
    supabase
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}