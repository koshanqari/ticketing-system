import { supabase, isSupabaseAvailable } from './supabase'
import { TicketFormData, Ticket, Assignee } from '@/types'
import { fileUploadService } from './fileUpload'
// Removed unused imports
import { dispositionWhatsappService } from './dispositionWhatsappService'
import { dropdownService } from './dropdownService'

export class TicketService {
  // Submit a new ticket
  async submitTicket(formData: TicketFormData): Promise<Ticket> {
    try {
      // Check if Supabase is available
      if (!isSupabaseAvailable()) {
        throw new Error('Supabase is not configured. Please check your environment variables.')
      }

      // Get the parent L1 for the selected L2
      let issueTypeL1 = null
      if (formData.issue_type_l2) {
        try {
          issueTypeL1 = await dropdownService.getParentL1ForL2(formData.issue_type_l2)
        } catch (error) {
          console.error('Failed to get parent L1 for L2:', error)
        }
      }

      // Handle file uploads to S3 via API route
      let attachments = []
      if (formData.attachments && formData.attachments.length > 0) {
        try {
          // Create FormData for API request
          const uploadFormData = new FormData()
          console.log('Creating FormData for files:', {
            fileCount: formData.attachments.length,
            fileNames: formData.attachments.map(f => f.name),
            fileSizes: formData.attachments.map(f => f.size),
            fileTypes: formData.attachments.map(f => f.type)
          })
          
          formData.attachments.forEach((file, index) => {
            console.log(`Adding file ${index + 1} to FormData:`, {
              name: file.name,
              size: file.size,
              type: file.type
            })
            uploadFormData.append('files', file)
          })

          // Upload files via API route
          console.log('Starting file upload to /api/upload-files...')
          let uploadResponse;
          try {
            uploadResponse = await fetch('/api/upload-files', {
              method: 'POST',
              body: uploadFormData,
              // Add timeout for multiple file uploads
              signal: AbortSignal.timeout(60000) // 60 seconds timeout
            })
          } catch (fetchError) {
            console.error('Fetch error during upload:', fetchError)
            if (fetchError instanceof Error && fetchError.name === 'TimeoutError') {
              throw new Error('File upload timed out. Please try with fewer files or smaller file sizes.')
            }
            throw new Error(`Network error during file upload: ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}`)
          }

          console.log('Upload response received:', {
            ok: uploadResponse.ok,
            status: uploadResponse.status,
            statusText: uploadResponse.statusText,
            headers: Object.fromEntries(uploadResponse.headers.entries()),
            bodyUsed: uploadResponse.bodyUsed
          })

          // Clone the response to avoid body stream issues in Vercel
          const responseClone = uploadResponse.clone()
          
          if (!uploadResponse.ok) {
            console.log('Upload failed, processing error response...')
            let errorMessage = 'Upload failed';
            try {
              console.log('Attempting to read error response as JSON...')
              const errorData = await responseClone.json()
              console.log('Error data parsed:', errorData)
              errorMessage = errorData.message || errorData.details || 'Upload failed'
            } catch (jsonError) {
              console.log('Failed to parse error as JSON, trying text...', jsonError)
              try {
                const errorText = await responseClone.text()
                console.log('Error text:', errorText)
                errorMessage = `Upload failed: ${errorText}`
              } catch (textError) {
                console.log('Failed to read error as text:', textError)
                errorMessage = `Upload failed: ${uploadResponse.status} ${uploadResponse.statusText}`
              }
            }
            throw new Error(errorMessage)
          }

          // Parse the successful response
          console.log('Upload successful, parsing response...')
          let uploadData;
          try {
            uploadData = await uploadResponse.json()
            console.log('Upload data parsed successfully:', uploadData)
          } catch (parseError) {
            console.error('Failed to parse upload response as JSON:', parseError)
            console.log('Response body used:', uploadResponse.bodyUsed)
            throw new Error('Invalid response from upload API - not valid JSON')
          }
          attachments = uploadData.data.map((result: {
            uuid: string;
            originalName: string;
            s3Key: string;
            s3Url: string;
            size: number;
            type: string;
            uploadedAt: string;
          }) => ({
            uuid: result.uuid,
            originalName: result.originalName,
            s3Key: result.s3Key,
            s3Url: result.s3Url,
            size: result.size,
            type: result.type,
            uploadedAt: result.uploadedAt
          }))
        } catch (error) {
          console.error('Failed to upload files to S3:', error)
          throw new Error(`File upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      }

      // Create the ticket record - database handles assignment and ticket ID automatically
      const { data: ticket, error: ticketError } = await supabase!
        .from('tickets')
        .insert({
          name: formData.name,
          phone: formData.phone,
          email: formData.email,
          designation: formData.designation,
          panel: formData.panel,
          issue_type_l1: issueTypeL1, // Auto-set based on L2 selection
          issue_type_l2: formData.issue_type_l2,
          description: formData.description,
          disposition: 'New', // Auto-set to New for new tickets
          status: 'Open', // Auto-set to Open (parent of New disposition)
          // priority: left null - admins will set this when reviewing the ticket
          // assigned_to_id will be auto-set by database trigger for Support department
          // ticket_id will be auto-generated by database trigger
          attachments: attachments
        })
        .select()
        .single()

      if (ticketError) {
        throw new Error(`Failed to create ticket: ${ticketError.message}`)
      }

      // If there are attachments, upload them
      if (formData.attachments.length > 0) {
        const attachmentUrls = await fileUploadService.uploadMultipleFiles(
          formData.attachments,
          ticket.id
        )

        // Update the ticket with attachment URLs
        if (attachmentUrls.length > 0) {
          const { error: updateError } = await supabase!
            .from('tickets')
            .update({ attachments: attachmentUrls })
            .eq('id', ticket.id)

          if (updateError) {
            console.warn('Failed to update ticket with attachments:', updateError)
          }
        }
      }

      // Send WhatsApp notification for new ticket (don't block ticket creation if this fails)
      try {
        if (formData.phone) {
          await dispositionWhatsappService.sendNewTicketNotification(
            formData.name,
            formData.phone,
            ticket.ticket_id || 'TBD'
          )
        }
      } catch (whatsappError) {
        console.warn('WhatsApp notification failed, but ticket was created:', whatsappError)
        // Don't fail the ticket creation if WhatsApp fails
      }

      return ticket
    } catch (error) {
      throw new Error(`Ticket submission failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Get all tickets
  async getAllTickets(): Promise<Ticket[]> {
    try {
      if (!isSupabaseAvailable()) {
        throw new Error('Supabase is not configured')
      }

      const { data, error } = await supabase!
        .from('tickets')
        .select('*')
        .order('created_time', { ascending: false })

      if (error) {
        throw new Error(`Failed to fetch tickets: ${error.message}`)
      }

      return data || []
    } catch (error) {
      throw new Error(`Failed to fetch tickets: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Get ticket by ID
  async getTicketById(id: string): Promise<Ticket | null> {
    try {
      if (!isSupabaseAvailable()) {
        throw new Error('Supabase is not configured')
      }

      const { data, error } = await supabase!
        .from('tickets')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        throw new Error(`Failed to fetch ticket: ${error.message}`)
      }

      return data
    } catch (error) {
      throw new Error(`Failed to fetch ticket: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Update ticket status
  async updateTicketStatus(id: string, status: string): Promise<void> {
    try {
      if (!isSupabaseAvailable()) {
        throw new Error('Supabase is not configured')
      }

      const updateData: { status: string; resolved_time?: string | null } = { status }
      
      // If status is resolved, set resolved_time
      if (status === 'Resolved') {
        updateData.resolved_time = new Date().toISOString()
      } else {
        // If status changes from resolved to something else, clear resolved_time
        updateData.resolved_time = null
      }

      const { error } = await supabase!
        .from('tickets')
        .update(updateData)
        .eq('id', id)

      if (error) {
        throw new Error(`Failed to update ticket status: ${error.message}`)
      }
    } catch (error) {
      throw new Error(`Failed to update ticket status: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Update ticket disposition (and auto-set status based on disposition)
  async updateTicketDisposition(id: string, disposition: string): Promise<void> {
    try {
      if (!isSupabaseAvailable()) {
        throw new Error('Supabase is not configured')
      }

      // Get the parent status for the disposition
      let status = null
      try {
        status = await dropdownService.getParentStatusForDisposition(disposition)
      } catch (error) {
        console.error('Failed to get parent status for disposition:', error)
      }

      const updateData: { disposition: string; status: string; resolved_time?: string | null } = { 
        disposition,
        status: status || 'Progress' // fallback to Progress if status lookup fails
      }
      
      // If status is resolved, set resolved_time
      if (status === 'Resolved') {
        updateData.resolved_time = new Date().toISOString()
      } else {
        // If status changes from resolved to something else, clear resolved_time
        updateData.resolved_time = null
      }

      const { error } = await supabase!
        .from('tickets')
        .update(updateData)
        .eq('id', id)

      if (error) {
        throw new Error(`Failed to update ticket disposition: ${error.message}`)
      }
    } catch (error) {
      throw new Error(`Failed to update ticket disposition: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Update ticket priority
  async updateTicketPriority(id: string, priority: string): Promise<void> {
    try {
      if (!isSupabaseAvailable()) {
        throw new Error('Supabase is not configured')
      }

      const { error } = await supabase!
        .from('tickets')
        .update({ priority })
        .eq('id', id)

      if (error) {
        throw new Error(`Failed to update ticket priority: ${error.message}`)
      }
    } catch (error) {
      throw new Error(`Failed to update ticket priority: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Update ticket remarks
  async updateTicketRemarks(id: string, remarks: string): Promise<void> {
    try {
      if (!isSupabaseAvailable()) {
        throw new Error('Supabase is not configured')
      }

      const { error } = await supabase!
        .from('tickets')
        .update({ remarks })
        .eq('id', id)

      if (error) {
        throw new Error(`Failed to update ticket remarks: ${error.message}`)
      }
    } catch (error) {
      throw new Error(`Failed to update ticket remarks: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Update ticket issue type L2
  async updateTicketIssueTypeL2(id: string, issueTypeL2: string): Promise<void> {
    try {
      if (!isSupabaseAvailable()) {
        throw new Error('Supabase is not configured')
      }

      const { error } = await supabase!
        .from('tickets')
        .update({ issue_type_l2: issueTypeL2 })
        .eq('id', id)

      if (error) {
        throw new Error(`Failed to update ticket issue type L2: ${error.message}`)
      }
    } catch (error) {
      throw new Error(`Failed to update ticket issue type L2: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Update ticket issue type L1
  async updateTicketIssueTypeL1(id: string, issueTypeL1: string): Promise<void> {
    try {
      if (!isSupabaseAvailable()) {
        throw new Error('Supabase is not configured')
      }

      const { error } = await supabase!
        .from('tickets')
        .update({ issue_type_l1: issueTypeL1 })
        .eq('id', id)

      if (error) {
        throw new Error(`Failed to update ticket issue type L1: ${error.message}`)
      }
    } catch (error) {
      throw new Error(`Failed to update ticket issue type L1: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Update ticket description
  async updateTicketDescription(id: string, description: string): Promise<void> {
    try {
      if (!isSupabaseAvailable()) {
        throw new Error('Supabase is not configured')
      }

      const { error } = await supabase!
        .from('tickets')
        .update({ description })
        .eq('id', id)

      if (error) {
        throw new Error(`Failed to update ticket description: ${error.message}`)
      }
    } catch (error) {
      throw new Error(`Failed to update ticket description: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Update ticket panel
  async updateTicketPanel(id: string, panel: string): Promise<void> {
    try {
      if (!isSupabaseAvailable()) {
        throw new Error('Supabase is not configured')
      }

      const { error } = await supabase!
        .from('tickets')
        .update({ panel })
        .eq('id', id)

      if (error) {
        throw new Error(`Failed to update ticket panel: ${error.message}`)
      }
    } catch (error) {
      throw new Error(`Failed to update ticket panel: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Update ticket user details
  async updateTicketUserDetails(id: string, userDetails: { name: string; phone: string; email: string | null; designation: string }): Promise<void> {
    try {
      if (!isSupabaseAvailable()) {
        throw new Error('Supabase is not configured')
      }

      const { error } = await supabase!
        .from('tickets')
        .update(userDetails)
        .eq('id', id)

      if (error) {
        throw new Error(`Failed to update ticket user details: ${error.message}`)
      }
    } catch (error) {
      throw new Error(`Failed to update ticket user details: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Assign ticket to assignee
  async assignTicket(id: string, assigneeId: string): Promise<void> {
    try {
      if (!isSupabaseAvailable()) {
        throw new Error('Supabase is not configured')
      }

      const { error } = await supabase!
        .from('tickets')
        .update({ assigned_to_id: assigneeId })
        .eq('id', id)

      if (error) {
        throw new Error(`Failed to assign ticket: ${error.message}`)
      }
    } catch (error) {
      throw new Error(`Failed to assign ticket: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Auto-assign ticket using round-robin algorithm
  private async autoAssignTicket(): Promise<string | null> {
    try {
      if (!isSupabaseAvailable()) {
        throw new Error('Supabase is not configured')
      }

      // Get all active assignees
      const { data: assignees, error: assigneesError } = await supabase!
        .from('assignees')
        .select('*')
        .eq('is_active', true)
        .order('created_at')

      if (assigneesError) {
        console.warn('Failed to fetch assignees for auto-assignment:', assigneesError)
        return null
      }

      if (!assignees || assignees.length === 0) {
        console.warn('No active assignees found for auto-assignment')
        return null
      }

      // Get current ticket counts for each assignee (only active tickets)
      const assigneeStats = await Promise.all(
        assignees.map(async (assignee) => {
          const { count } = await supabase!
            .from('tickets')
            .select('*', { count: 'exact', head: true })
            .eq('assigned_to_id', assignee.id)
            .not('status', 'in', '(Resolved,Dropped)')

          return {
            ...assignee,
            activeTicketCount: count || 0
          }
        })
      )

      // Find assignee with minimum active tickets
      const minTickets = Math.min(...assigneeStats.map(a => a.activeTicketCount))
      const candidates = assigneeStats.filter(a => a.activeTicketCount === minTickets)
      
      // If multiple have same count, pick the one with earliest creation date
      const selectedAssignee = candidates.sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      )[0]

      if (selectedAssignee) {
        console.log(`Auto-assigned ticket to ${selectedAssignee.name} (${selectedAssignee.department}) - Active tickets: ${selectedAssignee.activeTicketCount}`)
        return selectedAssignee.id
      }

      return null
    } catch (error) {
      console.error('Auto-assignment failed:', error)
      return null
    }
  }

  // Reassign tickets from inactive assignees
  async reassignInactiveAssigneeTickets(): Promise<number> {
    try {
      if (!isSupabaseAvailable()) {
        throw new Error('Supabase is not configured')
      }

      // Get all tickets assigned to inactive assignees
      const { data: ticketsToReassign, error: fetchError } = await supabase!
        .from('tickets')
        .select(`
          id,
          assigned_to_id,
          assignees!inner(name, is_active)
        `)
        .eq('assignees.is_active', false)
        .not('status', 'in', '(Resolved,Dropped)')

      if (fetchError) {
        throw new Error(`Failed to fetch tickets for reassignment: ${fetchError.message}`)
      }

      let reassignedCount = 0

      // Reassign each ticket
      for (const ticket of ticketsToReassign || []) {
        const newAssigneeId = await this.autoAssignTicket()
        if (newAssigneeId) {
          const { error: updateError } = await supabase!
            .from('tickets')
            .update({ assigned_to_id: newAssigneeId })
            .eq('id', ticket.id)

          if (!updateError) {
            reassignedCount++
            console.log(`Reassigned ticket ${ticket.id} from inactive assignee to new assignee`)
          }
        }
      }

      return reassignedCount
    } catch (error) {
      throw new Error(`Failed to reassign tickets: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Get all assignees
  async getAllAssignees(): Promise<Assignee[]> {
    try {
      if (!isSupabaseAvailable()) {
        throw new Error('Supabase is not configured')
      }

      const { data, error } = await supabase!
        .from('assignees')
        .select('*')
        .eq('is_active', true)
        .order('name')

      if (error) {
        throw new Error(`Failed to fetch assignees: ${error.message}`)
      }

      return data || []
    } catch (error) {
      throw new Error(`Failed to fetch assignees: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Get assignment statistics
  async getAssignmentStatistics(): Promise<{
    assignee_name: string;
    department: string;
    is_active: boolean;
    total_tickets: number;
    active_tickets: number;
  }[]> {
    try {
      if (!isSupabaseAvailable()) {
        throw new Error('Supabase is not configured')
      }

      const { data, error } = await supabase!
        .from('assignees')
        .select(`
          id,
          name,
          department,
          is_active,
          created_at,
          tickets:assigned_to_id(
            id,
            status
          )
        `)

      if (error) {
        throw new Error(`Failed to fetch assignment statistics: ${error.message}`)
      }

      // Process the data to get counts
      return data?.map(assignee => ({
        assignee_name: assignee.name,
        department: assignee.department,
        is_active: assignee.is_active,
        total_tickets: assignee.tickets?.length || 0,
        active_tickets: assignee.tickets?.filter((t: { status: string }) => 
          !['Resolved', 'Dropped'].includes(t.status)
        ).length || 0
      })) || []
    } catch (error) {
      throw new Error(`Failed to get assignment statistics: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
}

export const ticketService = new TicketService()
