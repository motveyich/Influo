/*
  # Create Support System Tables

  1. New Tables
    - `support_tickets`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users) - Ticket creator
      - `subject` (text) - Ticket subject
      - `category` (text) - Category: general, technical, billing, account, feature, bug
      - `priority` (text) - Priority: low, normal, high, urgent
      - `status` (text) - Status: open, in_progress, resolved, closed
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      - `assigned_to` (uuid, references auth.users) - Assigned staff member
      - `resolved_at` (timestamptz) - Resolution date
    
    - `support_messages`
      - `id` (uuid, primary key)
      - `ticket_id` (uuid, references support_tickets)
      - `sender_id` (uuid, references auth.users)
      - `message` (text)
      - `is_staff_response` (boolean) - Whether it's a staff response
      - `created_at` (timestamptz)
      - `attachments` (jsonb) - Array of file URLs

  2. Security
    - Enable RLS on both tables
    - Users can view/create their own tickets
    - Users can view/create messages in their own tickets
    - Admins and moderators can view/manage all tickets
    - Admins and moderators can respond to any ticket

  3. Indexes
    - Index on user_id for fast ticket lookup
    - Index on status for filtering
    - Index on ticket_id for messages
*/

-- Create support_tickets table
CREATE TABLE IF NOT EXISTS support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  subject text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  priority text NOT NULL DEFAULT 'normal',
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  CONSTRAINT valid_category CHECK (category IN ('general', 'technical', 'billing', 'account', 'feature', 'bug')),
  CONSTRAINT valid_priority CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  CONSTRAINT valid_status CHECK (status IN ('open', 'in_progress', 'resolved', 'closed'))
);

-- Create support_messages table
CREATE TABLE IF NOT EXISTS support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid REFERENCES support_tickets(id) ON DELETE CASCADE NOT NULL,
  sender_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  message text NOT NULL,
  is_staff_response boolean DEFAULT false NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  attachments jsonb DEFAULT '[]'::jsonb
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned_to ON support_tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created_at ON support_tickets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_messages_ticket_id ON support_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_support_messages_sender_id ON support_messages(sender_id);

-- Enable RLS
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;

-- Support Tickets Policies

-- Users can view their own tickets or staff can view all
CREATE POLICY "Users can view own tickets"
  ON support_tickets
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id 
    OR EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role IN ('admin', 'moderator')
      AND user_roles.is_active = true
    )
  );

-- Users can create their own tickets
CREATE POLICY "Users can create own tickets"
  ON support_tickets
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own tickets (close them)
CREATE POLICY "Users can update own tickets"
  ON support_tickets
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Admins and moderators can update any ticket
CREATE POLICY "Staff can update tickets"
  ON support_tickets
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role IN ('admin', 'moderator')
      AND user_roles.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role IN ('admin', 'moderator')
      AND user_roles.is_active = true
    )
  );

-- Support Messages Policies

-- Users can view messages in their own tickets or staff can view all
CREATE POLICY "Users can view messages in own tickets"
  ON support_messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM support_tickets 
      WHERE support_tickets.id = ticket_id 
      AND support_tickets.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role IN ('admin', 'moderator')
      AND user_roles.is_active = true
    )
  );

-- Users can create messages in their own tickets
CREATE POLICY "Users can create messages in own tickets"
  ON support_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (
      EXISTS (
        SELECT 1 FROM support_tickets 
        WHERE support_tickets.id = ticket_id 
        AND support_tickets.user_id = auth.uid()
      )
      AND auth.uid() = sender_id
      AND is_staff_response = false
    )
    OR (
      EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_roles.user_id = auth.uid() 
        AND user_roles.role IN ('admin', 'moderator')
        AND user_roles.is_active = true
      )
      AND auth.uid() = sender_id
    )
  );

-- Function to update ticket updated_at timestamp
CREATE OR REPLACE FUNCTION update_support_ticket_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE support_tickets 
  SET updated_at = now() 
  WHERE id = NEW.ticket_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update ticket timestamp when message is added
DROP TRIGGER IF EXISTS update_ticket_on_message ON support_messages;
CREATE TRIGGER update_ticket_on_message
  AFTER INSERT ON support_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_support_ticket_timestamp();