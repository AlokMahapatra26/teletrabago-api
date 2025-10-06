import { Response } from 'express';
import { supabase } from '../config/supabase';
import { AuthRequest } from '../middleware/auth';

export const getMeetings = async (req: AuthRequest, res: Response) => {
  try {
    const { company_id } = req.query;

    if (!company_id) {
      return res.status(400).json({ error: 'Company ID is required' });
    }

    const { data, error } = await supabase
      .from('meetings')
      .select(`
        *,
        created_user:users!meetings_created_by_fkey(id, email, full_name),
        participants:meeting_participants(
          id,
          user_id,
          status,
          users(id, email, full_name)
        )
      `)
      .eq('company_id', company_id)
      .order('scheduled_time', { ascending: true });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.status(200).json({ meetings: data });
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const createMeeting = async (req: AuthRequest, res: Response) => {
  try {
    const { company_id, title, description, scheduled_time, duration_minutes, participant_ids } = req.body;
    const created_by = req.user?.id;

    if (!company_id || !title || !scheduled_time) {
      return res.status(400).json({ error: 'Company ID, title, and scheduled time are required' });
    }

    // Generate unique room name
    const roomName = `meeting-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    console.log('Creating meeting with room_name:', roomName);

    // Create meeting in database
    const { data: meeting, error: meetingError } = await supabase
      .from('meetings')
      .insert([
        {
          company_id,
          title,
          description,
          scheduled_time,
          duration_minutes: duration_minutes || 60,
          room_name: roomName, // Make sure this is here
          created_by,
        },
      ])
      .select()
      .single();

    if (meetingError) {
      console.error('Failed to create meeting:', meetingError);
      return res.status(400).json({ error: meetingError.message });
    }

    console.log('Meeting created:', meeting);

    // Add participants
    if (participant_ids && participant_ids.length > 0) {
      const participants = participant_ids.map((user_id: string) => ({
        meeting_id: meeting.id,
        user_id,
        status: 'invited',
      }));

      const { error: participantsError } = await supabase
        .from('meeting_participants')
        .insert(participants);

      if (participantsError) {
        console.error('Failed to add participants:', participantsError);
      }
    }

    return res.status(201).json({ meeting });
  } catch (error) {
    console.error('Create meeting error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};


export const updateMeeting = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { title, description, scheduled_time, duration_minutes } = req.body;

    const { data, error } = await supabase
      .from('meetings')
      .update({
        title,
        description,
        scheduled_time,
        duration_minutes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.status(200).json({ meeting: data });
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteMeeting = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('meetings')
      .delete()
      .eq('id', id);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.status(200).json({ message: 'Meeting deleted successfully' });
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const joinMeeting = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const user_id = req.user?.id;

    // Update participant status
    const { error } = await supabase
      .from('meeting_participants')
      .update({
        status: 'attended',
        joined_at: new Date().toISOString(),
      })
      .eq('meeting_id', id)
      .eq('user_id', user_id);

    if (error) {
      console.error('Failed to update participant status:', error);
    }

    // Get meeting details
    const { data: meeting, error: meetingError } = await supabase
      .from('meetings')
      .select('room_name')
      .eq('id', id)
      .single();

    if (meetingError) {
      return res.status(400).json({ error: meetingError.message });
    }

    return res.status(200).json({ room_name: meeting.room_name });
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
};
