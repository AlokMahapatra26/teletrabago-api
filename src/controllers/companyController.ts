import { Response } from 'express';
import { supabase } from '../config/supabase';
import { AuthRequest } from '../middleware/auth';

export const createCompany = async (req: AuthRequest, res: Response) => {
  try {
    const { name } = req.body;
    const owner_id = req.user?.id;

    const { data: company, error: companyError } = await supabase
      .from('companies')
      .insert([{ name, owner_id }])
      .select()
      .single();

    if (companyError) {
      return res.status(400).json({ error: companyError.message });
    }

    const { error: memberError } = await supabase
      .from('company_members')
      .insert([
        {
          company_id: company.id,
          user_id: owner_id,
          role: 'owner',
        },
      ]);

    if (memberError) {
      return res.status(400).json({ error: memberError.message });
    }

    return res.status(201).json({ company });
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const getCompanies = async (req: AuthRequest, res: Response) => {
  try {
    const user_id = req.user?.id;

    const { data, error } = await supabase
      .from('company_members')
      .select('*, companies(*)')
      .eq('user_id', user_id);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.status(200).json({ companies: data });
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const addMember = async (req: AuthRequest, res: Response) => {
  try {
    const { company_id, user_email, role } = req.body;

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('email', user_email)
      .single();

    if (userError) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { data, error } = await supabase
      .from('company_members')
      .insert([
        {
          company_id,
          user_id: user.id,
          role: role || 'member',
        },
      ])
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.status(201).json({ member: data });
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const getMembers = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('company_members')
      .select('*, users(email, full_name)')
      .eq('company_id', id);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.status(200).json({ data });
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const getUserRole = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params; // company_id
    const user_id = req.user?.id;

    const { data, error } = await supabase
      .from('company_members')
      .select('role')
      .eq('company_id', id)
      .eq('user_id', user_id)
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.status(200).json({ role: data.role });
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
};
