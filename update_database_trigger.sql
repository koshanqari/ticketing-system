-- Update the database trigger to only auto-assign when assigned_to_id is not provided
-- This allows self-raise tickets to use custom assignment while regular tickets get auto-assigned

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS auto_generate_ticket_id_and_assign ON tickets;
DROP FUNCTION IF EXISTS auto_generate_ticket_id_and_assign();

-- Create the updated trigger function that respects existing assignments
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
    -- Only auto-assign if assigned_to_id is not already provided by the form
    -- This allows self-raise tickets to use custom assignment while regular tickets get auto-assigned
    IF NEW.assigned_to_id IS NULL THEN
        -- Auto-assign ticket to Support team member using round robin
        assigned_user_id := auto_assign_support_ticket();
        NEW.assigned_to_id := assigned_user_id;  -- Will be NULL if no Support assignees
    END IF;
    
    -- Generate ticket ID (always generate, regardless of assignment)
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
    
    -- Set ticket_id
    NEW.ticket_id := 'A-' || current_date_str || '-' || LPAD(ticket_counter::TEXT, 3, '0');
    
    RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER auto_generate_ticket_id_and_assign
    BEFORE INSERT ON tickets
    FOR EACH ROW
    EXECUTE FUNCTION auto_generate_ticket_id_and_assign();
