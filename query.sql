-- Drop existing functions and triggers
DROP TRIGGER IF EXISTS auto_generate_ticket_id ON tickets;
DROP TRIGGER IF EXISTS auto_generate_ticket_id_and_assign ON tickets;
DROP FUNCTION IF EXISTS generate_ticket_id();
DROP FUNCTION IF EXISTS auto_generate_ticket_id_and_assign();
DROP FUNCTION IF EXISTS auto_assign_support_ticket();

-- Create function that handles round robin assignment for SUPPORT department only
CREATE OR REPLACE FUNCTION auto_assign_support_ticket()
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
    selected_assignee_id UUID;
    min_tickets INTEGER;
BEGIN
    -- Find SUPPORT department assignee with minimum active tickets
    WITH support_assignee_stats AS (
        SELECT 
            a.id,
            a.name,
            a.department,
            COALESCE(ticket_counts.active_count, 0) as active_tickets
        FROM assignees a
        LEFT JOIN (
            SELECT 
                assigned_to_id,
                COUNT(*) as active_count
            FROM tickets 
            WHERE status NOT IN ('Resolved', 'Dropped')
            GROUP BY assigned_to_id
        ) ticket_counts ON a.id = ticket_counts.assigned_to_id
        WHERE a.is_active = true 
        AND a.department = 'Support'  -- Only Support department
    ),
    min_load_assignees AS (
        SELECT id, name, department, active_tickets
        FROM support_assignee_stats
        WHERE active_tickets = (
            SELECT MIN(active_tickets) 
            FROM support_assignee_stats
        )
        ORDER BY id ASC  -- Use ID instead of created_at for ordering
        LIMIT 1
    )
    SELECT id INTO selected_assignee_id
    FROM min_load_assignees;
    
    -- If no Support assignees found, return null (ticket will be unassigned)
    IF selected_assignee_id IS NULL THEN
        RAISE NOTICE 'No active Support department assignees found for auto-assignment';
        RETURN NULL;
    END IF;
    
    RETURN selected_assignee_id;
END;
$$;

-- Create the main trigger function that handles both ticket ID generation and assignment
CREATE OR REPLACE FUNCTION auto_generate_ticket_id_and_assign()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    assigned_user_id UUID;
    current_date_str TEXT;
    ticket_counter INTEGER;
    new_ticket_id TEXT;
BEGIN
    -- Auto-assign ticket to Support team member using round robin
    assigned_user_id := auto_assign_support_ticket();
    
    -- Generate ticket ID
    current_date_str := TO_CHAR(CURRENT_DATE, 'DDMMYY');
    
    -- Find next available counter
    ticket_counter := 1;
    WHILE EXISTS(
        SELECT 1 FROM tickets 
        WHERE ticket_id = 'A-' || current_date_str || '-' || LPAD(ticket_counter::TEXT, 3, '0')
    ) LOOP
        ticket_counter := ticket_counter + 1;
        IF ticket_counter > 999 THEN
            RAISE EXCEPTION 'Maximum tickets per day (999) exceeded';
        END IF;
    END LOOP;
    
    -- Set both ticket_id and assigned_to_id
    NEW.ticket_id := 'A-' || current_date_str || '-' || LPAD(ticket_counter::TEXT, 3, '0');
    NEW.assigned_to_id := assigned_user_id;  -- Will be NULL if no Support assignees
    
    RETURN NEW;
END;
$$;

-- Create the trigger
CREATE TRIGGER auto_generate_ticket_id_and_assign
    BEFORE INSERT ON tickets
    FOR EACH ROW
    EXECUTE FUNCTION auto_generate_ticket_id_and_assign();