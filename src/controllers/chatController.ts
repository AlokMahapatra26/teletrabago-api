import { Response } from 'express';
import { supabase } from '../config/supabase';
import { AuthRequest } from '../middleware/auth';

export const getMessages = async (req: AuthRequest, res: Response) => {
  try {
    const { company_id } = req.query;

    if (!company_id) {
      return res.status(400).json({ error: 'Company ID is required' });
    }

    const { data, error } = await supabase
      .from('chat_messages')
      .select(`
        *,
        user:users!chat_messages_user_id_fkey(id, email, full_name)
      `)
      .eq('company_id', company_id)
      .order('created_at', { ascending: true })
      .limit(100);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.status(200).json({ messages: data });
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const sendMessage = async (req: AuthRequest, res: Response) => {
  try {
    const { company_id, message } = req.body;
    const user_id = req.user?.id;

    if (!company_id || !message) {
      return res.status(400).json({ error: 'Company ID and message are required' });
    }

    if (message.trim().length === 0) {
      return res.status(400).json({ error: 'Message cannot be empty' });
    }

    const { data, error } = await supabase
      .from('chat_messages')
      .insert([
        {
          company_id,
          user_id,
          message: message.trim(),
        },
      ])
      .select(`
        *,
        user:users!chat_messages_user_id_fkey(id, email, full_name)
      `)
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.status(201).json({ message: data });
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteMessage = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const user_id = req.user?.id;

    // Check if message belongs to user
    const { data: message, error: fetchError } = await supabase
      .from('chat_messages')
      .select('user_id')
      .eq('id', id)
      .single();

    if (fetchError || !message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    if (message.user_id !== user_id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const { error } = await supabase
      .from('chat_messages')
      .delete()
      .eq('id', id);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.status(200).json({ message: 'Message deleted successfully' });
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
};
