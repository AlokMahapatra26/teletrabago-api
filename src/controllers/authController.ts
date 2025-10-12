import { Request, Response } from 'express';
import { supabase } from '../config/supabase';

export const signup = async (req: Request, res: Response) => {
  try {
    const { email, password, full_name } = req.body;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name },
        emailRedirectTo: process.env.FRONTEND_URL + "/signin",
      },
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Don't return tokens until email confirmed
    return res.status(201).json({
      message: "Signup successful! Please check your email and confirm your account before logging in.",
    });

  } catch (error) {
    console.error("Signup error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const signin = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.status(200).json({
      user: data.user,
      session: data.session
    });
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const signout = async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const { error } = await supabase.auth.signOut();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.status(200).json({ message: 'Signed out successfully' });
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const getProfile = async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    return res.status(200).json({ user });
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
};
