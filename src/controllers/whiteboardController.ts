import { Response } from 'express';
import { supabase } from '../config/supabase';
import { AuthRequest } from '../middleware/auth';

export const getWhiteboards = async (req: AuthRequest, res: Response) => {
  try {
    const { company_id } = req.query;

    if (!company_id) {
      return res.status(400).json({ error: 'Company ID is required' });
    }

    const { data, error } = await supabase
      .from('whiteboards')
      .select('*')
      .eq('company_id', company_id)
      .order('updated_at', { ascending: false });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.status(200).json({ whiteboards: data });
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const createWhiteboard = async (req: AuthRequest, res: Response) => {
  try {
    const { company_id, title } = req.body;
    const created_by = req.user?.id;

    const { data, error } = await supabase
      .from('whiteboards')
      .insert([
        {
          company_id,
          title: title || 'Untitled Whiteboard',
          created_by,
        },
      ])
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.status(201).json({ whiteboard: data });
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateWhiteboard = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { title } = req.body;

    const { data, error } = await supabase
      .from('whiteboards')
      .update({
        title,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.status(200).json({ whiteboard: data });
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteWhiteboard = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('whiteboards')
      .delete()
      .eq('id', id);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.status(200).json({ message: 'Whiteboard deleted successfully' });
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
};
