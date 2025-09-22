import { supabase, isSupabaseAvailable } from './supabase'
import { TicketFormData, Ticket, Assignee } from '@/types'
import { fileUploadService } from './fileUpload'
// Removed unused imports
import { dispositionWhatsappService } from './dispositionWhatsappService'
import { dropdownService } from './dropdownService'

export class TicketService {
  // Submit a new ticket with custom assignment
  async submitTicketWithAssignment(formData: TicketFormData, assignedToId?: string): Promise<Ticket> {
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

      // Handle file uploads to S3 via API route - upload one by one to avoid Vercel 413 Payload Too Large error
      const attachments = []
      if (formData.attachments && formData.attachments.length > 0) {
        console.log('Starting individual file uploads to avoid Vercel payload limits:', {
          fileCount: formData.attachments.length,
          totalSize: formData.attachments.reduce((sum, f) => sum + f.size, 0),
          fileNames: formData.attachments.map(f => f.name)
        })

        // Upload files one by one to avoid Vercel 413 Payload Too Large error
        for (let i = 0; i < formData.attachments.length; i++) {
          const file = formData.attachments[i]
          console.log(`Uploading file ${i + 1}/${formData.attachments.length}: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`)
          
          try {
            // Create FormData for single file
            const uploadFormData = new FormData()
            uploadFormData.append('files', file)

            // Upload single file via API route
            const uploadResponse = await fetch('/api/upload-files', {
              method: 'POST',
              body: uploadFormData,
              signal: AbortSignal.timeout(30000) // 30 seconds per file
            })

            console.log(`File ${i + 1} upload response:`, {
              ok: uploadResponse.ok,
              status: uploadResponse.status,
              statusText: uploadResponse.statusText
            })

            if (!uploadResponse.ok) {
              let errorMessage = `Upload failed for ${file.name}`;
              try {
                const errorData = await uploadResponse.json()
                errorMessage = errorData.message || errorData.details || errorMessage
              } catch {
                // If JSON parsing fails, just use status text
                errorMessage = `${errorMessage}: ${uploadResponse.statusText}`
              }
              throw new Error(errorMessage)
            }

            // Parse successful response
            const uploadData = await uploadResponse.json()
            if (uploadData.success && uploadData.data && uploadData.data.length > 0) {
              const result = uploadData.data[0] // Single file result
              attachments.push({
                uuid: result.uuid,
                originalName: result.originalName,
                s3Key: result.s3Key,
                s3Url: result.s3Url,
                size: result.size,
                type: result.type,
                uploadedAt: result.uploadedAt,
              })
              console.log(`File ${i + 1} uploaded successfully:`, result.uuid)
            } else {
              throw new Error(`Invalid response for file ${file.name}`)
            }
          } catch (error) {
            console.error(`Failed to upload file ${i + 1} (${file.name}):`, error)
            throw new Error(`Failed to upload ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`)
          }
        }
        
        console.log(`All ${attachments.length} files uploaded successfully`)
      }

      // Create the ticket record with custom assignment
      const ticketData: {
        name: string
        phone: string
        email: string | null
        designation: string
        panel: string
        issue_type_l1: string | null
        issue_type_l2: string
        description: string
        disposition: string
        status: string
        attachments: Array<{
          uuid: string
          originalName: string
          s3Key: string
          s3Url: string
          size: number
          type: string
          uploadedAt: string
        }>
        assigned_to_id?: string
        source?: string
      } = {
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
        attachments: attachments,
        source: formData.source // Include source field
      }

      // If assignedToId is provided and not empty, use it; otherwise let database handle auto-assignment
      if (assignedToId && assignedToId.trim() !== '') {
        ticketData.assigned_to_id = assignedToId
      }
      // If assignedToId is empty or null, don't set it - let database trigger handle auto-assignment

      const { data: ticket, error: ticketError } = await supabase!
        .from('tickets')
        .insert(ticketData)
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
            ticket.ticket_id || 'TBD',
            formData.description
          )
        }
      } catch (whatsappError) {
        console.warn('WhatsApp notification failed, but ticket was created:', whatsappError)
        // Don't fail the ticket creation if WhatsApp fails
      }

      // Send assignment notification if ticket was assigned to someone
      if (ticket.assigned_to_id) {
        try {
          // Get assignee details
          const { data: assignee, error: assigneeError } = await supabase!
            .from('assignees')
            .select('name, phone')
            .eq('id', ticket.assigned_to_id)
            .eq('is_active', true)
            .single()

          if (!assigneeError && assignee && assignee.phone) {
            console.log('Sending assignment notification to assignee for new ticket...')
            await this.sendAssignmentNotification(
              assignee.name,
              assignee.phone,
              ticket.ticket_id || 'TBD',
              formData.description
            )
            console.log('✅ Assignment notification sent successfully to assignee')
          } else {
            console.log('⚠️ Assignee not found or no phone number available, skipping assignment notification')
          }
        } catch (assignmentError) {
          console.warn('Assignment notification failed, but ticket was created:', assignmentError)
          // Don't fail the ticket creation if assignment notification fails
        }
      }

      return ticket
    } catch (error) {
      throw new Error(`Ticket submission failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

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

      // Handle file uploads to S3 via API route - upload one by one to avoid Vercel 413 Payload Too Large error
      const attachments = []
      if (formData.attachments && formData.attachments.length > 0) {
        console.log('Starting individual file uploads to avoid Vercel payload limits:', {
          fileCount: formData.attachments.length,
          totalSize: formData.attachments.reduce((sum, f) => sum + f.size, 0),
          fileNames: formData.attachments.map(f => f.name)
        })

        // Upload files one by one to avoid Vercel 413 Payload Too Large error
        for (let i = 0; i < formData.attachments.length; i++) {
          const file = formData.attachments[i]
          console.log(`Uploading file ${i + 1}/${formData.attachments.length}: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`)
          
          try {
            // Create FormData for single file
            const uploadFormData = new FormData()
            uploadFormData.append('files', file)

            // Upload single file via API route
            const uploadResponse = await fetch('/api/upload-files', {
              method: 'POST',
              body: uploadFormData,
              signal: AbortSignal.timeout(30000) // 30 seconds per file
            })

            console.log(`File ${i + 1} upload response:`, {
              ok: uploadResponse.ok,
              status: uploadResponse.status,
              statusText: uploadResponse.statusText
            })

            if (!uploadResponse.ok) {
              let errorMessage = `Upload failed for ${file.name}`;
              try {
                const errorData = await uploadResponse.json()
                errorMessage = errorData.message || errorData.details || errorMessage
              } catch {
                // If JSON parsing fails, just use status text
                errorMessage = `${errorMessage}: ${uploadResponse.statusText}`
              }
              throw new Error(errorMessage)
            }

            // Parse successful response
            const uploadData = await uploadResponse.json()
            if (uploadData.success && uploadData.data && uploadData.data.length > 0) {
              const result = uploadData.data[0] // Single file result
              attachments.push({
                uuid: result.uuid,
                originalName: result.originalName,
                s3Key: result.s3Key,
                s3Url: result.s3Url,
                size: result.size,
                type: result.type,
                uploadedAt: result.uploadedAt,
              })
              console.log(`File ${i + 1} uploaded successfully:`, result.uuid)
            } else {
              throw new Error(`Invalid response for file ${file.name}`)
            }
          } catch (error) {
            console.error(`Failed to upload file ${i + 1} (${file.name}):`, error)
            throw new Error(`Failed to upload ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`)
          }
        }
        
        console.log(`All ${attachments.length} files uploaded successfully`)
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
          attachments: attachments,
          source: formData.source // Include source field
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
            ticket.ticket_id || 'TBD',
            formData.description
          )
        }
      } catch (whatsappError) {
        console.warn('WhatsApp notification failed, but ticket was created:', whatsappError)
        // Don't fail the ticket creation if WhatsApp fails
      }

      // Send assignment notification if ticket was auto-assigned to someone
      if (ticket.assigned_to_id) {
        try {
          // Get assignee details
          const { data: assignee, error: assigneeError } = await supabase!
            .from('assignees')
            .select('name, phone')
            .eq('id', ticket.assigned_to_id)
            .eq('is_active', true)
            .single()

          if (!assigneeError && assignee && assignee.phone) {
            console.log('Sending assignment notification to assignee for auto-assigned ticket...')
            await this.sendAssignmentNotification(
              assignee.name,
              assignee.phone,
              ticket.ticket_id || 'TBD',
              formData.description
            )
            console.log('✅ Assignment notification sent successfully to assignee')
          } else {
            console.log('⚠️ Assignee not found or no phone number available, skipping assignment notification')
          }
        } catch (assignmentError) {
          console.warn('Assignment notification failed, but ticket was created:', assignmentError)
          // Don't fail the ticket creation if assignment notification fails
        }
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

  // Get tickets by phone number
  async getTicketsByPhone(phone: string): Promise<Ticket[]> {
    try {
      if (!isSupabaseAvailable()) {
        throw new Error('Supabase is not configured')
      }

      const { data, error } = await supabase!
        .from('tickets')
        .select('*')
        .eq('phone', phone)
        .order('created_time', { ascending: false })

      if (error) {
        throw new Error(`Failed to fetch tickets by phone: ${error.message}`)
      }

      return data || []
    } catch (error) {
      throw new Error(`Failed to fetch tickets by phone: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Get ticket by ticket ID (human-readable ID)
  async getTicketByTicketId(ticketId: string): Promise<Ticket | null> {
    try {
      if (!isSupabaseAvailable()) {
        throw new Error('Supabase is not configured')
      }

      const { data, error } = await supabase!
        .from('tickets')
        .select('*')
        .eq('ticket_id', ticketId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned
          return null
        }
        throw new Error(`Failed to fetch ticket by ID: ${error.message}`)
      }

      return data
    } catch (error) {
      throw new Error(`Failed to fetch ticket by ID: ${error instanceof Error ? error.message : 'Unknown error'}`)
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

      const updateData: { status: string; closed_time?: string | null } = { status }
      
      // If status is closed, set closed_time
      if (status === 'Closed') {
        updateData.closed_time = new Date().toISOString()
      } else {
        // If status changes from closed to something else, clear closed_time
        updateData.closed_time = null
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

      const updateData: { disposition: string; status: string; closed_time?: string | null } = { 
        disposition,
        status: status || 'Progress' // fallback to Progress if status lookup fails
      }
      
      // Handle closed_time based on status
      if (status === 'Closed') {
        // If status is closed, set closed_time
        updateData.closed_time = new Date().toISOString()
      } else {
        // If status changes from closed to something else, clear closed_time
        updateData.closed_time = null
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

  // Update ticket resolution estimate
  async updateTicketResolutionEstimate(id: string, resolutionEstimate: string | null): Promise<void> {
    try {
      if (!isSupabaseAvailable()) {
        throw new Error('Supabase is not configured')
      }

      const { error } = await supabase!
        .from('tickets')
        .update({ resolution_estimate: resolutionEstimate })
        .eq('id', id)

      if (error) {
        throw new Error(`Failed to update ticket resolution estimate: ${error.message}`)
      }
    } catch (error) {
      throw new Error(`Failed to update ticket resolution estimate: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Update ticket external remarks
  async updateTicketExtRemarks(id: string, extRemarks: string): Promise<void> {
    try {
      if (!isSupabaseAvailable()) {
        throw new Error('Supabase is not configured')
      }

      const { error } = await supabase!
        .from('tickets')
        .update({ ext_remarks: extRemarks })
        .eq('id', id)

      if (error) {
        throw new Error(`Failed to update ticket external remarks: ${error.message}`)
      }
    } catch (error) {
      throw new Error(`Failed to update ticket external remarks: ${error instanceof Error ? error.message : 'Unknown error'}`)
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

  // Send assignment notification via WhatsApp
  async sendAssignmentNotification(name: string, phone: string, ticketId: string, ticketDescription: string): Promise<boolean> {
    try {
      console.log('Sending assignment notification via WhatsApp...')
      
      const response = await fetch('/api/whatsapp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name,
          phone,
          ticketId,
          ticketDescription,
          notificationType: 'assignment'
        })
      })

      const result = await response.json()
      console.log('Assignment notification API response:', result)

      if (!response.ok) {
        console.error('Assignment notification API error:', result)
        return false
      }

      console.log('Assignment notification sent successfully')
      return true
    } catch (error) {
      console.error('Failed to send assignment notification:', error)
      return false
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
