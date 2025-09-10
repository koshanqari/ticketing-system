// Removed unused interfaces

// Removed unused interface

export class DispositionWhatsAppService {
  private apiKey = '67d1129cb7401ffd9e886569'
  private apiSecret = '9c22bae06c1149af81fd1f8f59ebab80'
  private channelId = '67efa1e540e524987a8bfd90'
  private baseUrl = 'https://server.gallabox.com/devapi/messages/whatsapp'
  private corsProxy = process.env.NEXT_PUBLIC_CORS_PROXY || 'https://cors-anywhere.herokuapp.com/'

  // Format phone number for WhatsApp API (remove +91, spaces, dashes)
  private formatPhoneNumber(phone: string): string {
    return phone
      .replace(/^\+91/, '') // Remove +91 prefix
      .replace(/[\s\-\(\)]/g, '') // Remove spaces, dashes, parentheses
      .replace(/^91/, '') // Remove 91 prefix if present
  }

  // Send WhatsApp notification for New disposition (ticket creation)
  async sendNewTicketNotification(name: string, phone: string, ticketId: string, ticketDescription?: string): Promise<boolean> {
    try {
      console.log('Sending New ticket WhatsApp notification...')
      
      const response = await fetch('/api/whatsapp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          disposition: 'New',
          name,
          phone,
          ticketId,
          ticketDescription
        })
      })

      const result = await response.json()
      console.log('New ticket WhatsApp response:', result)

      if (!response.ok) {
        console.error('New ticket WhatsApp error:', result)
        return false
      }

      console.log('New ticket WhatsApp notification sent successfully')
      return true
    } catch (error) {
      console.error('Failed to send New ticket WhatsApp notification:', error)
      return false
    }
  }

  // Send WhatsApp notification for In Progress disposition
  async sendInProgressNotification(name: string, phone: string, ticketId: string, ticketDescription?: string): Promise<boolean> {
    try {
      console.log('Sending In Progress WhatsApp notification...')
      
      const response = await fetch('/api/whatsapp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          disposition: 'In Progress',
          name,
          phone,
          ticketId,
          ticketDescription
        })
      })

      const result = await response.json()
      console.log('In Progress WhatsApp response:', result)

      if (!response.ok) {
        console.error('In Progress WhatsApp error:', result)
        return false
      }

      console.log('In Progress WhatsApp notification sent successfully')
      return true
    } catch (error) {
      console.error('Failed to send In Progress WhatsApp notification:', error)
      return false
    }
  }

  // Send WhatsApp notification for No Response 1 disposition
  async sendNoResponse1Notification(name: string, phone: string, ticketId: string, ticketDescription?: string): Promise<boolean> {
    try {
      console.log('Sending No Response 1 WhatsApp notification...')
      
      const response = await fetch('/api/whatsapp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          disposition: 'No Response 1',
          name,
          phone,
          ticketId,
          ticketDescription
        })
      })

      const result = await response.json()
      console.log('No Response 1 WhatsApp response:', result)

      if (!response.ok) {
        console.error('No Response 1 WhatsApp error:', result)
        return false
      }

      console.log('No Response 1 WhatsApp notification sent successfully')
      return true
    } catch (error) {
      console.error('Failed to send No Response 1 WhatsApp notification:', error)
      return false
    }
  }

  // Send WhatsApp notification for Resolved disposition
  async sendResolvedNotification(name: string, phone: string, ticketId: string, ticketDescription?: string): Promise<boolean> {
    try {
      console.log('Sending Resolved WhatsApp notification...')
      
      const response = await fetch('/api/whatsapp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          disposition: 'Resolved',
          name,
          phone,
          ticketId,
          ticketDescription
        })
      })

      const result = await response.json()
      console.log('Resolved WhatsApp response:', result)

      if (!response.ok) {
        console.error('Resolved WhatsApp error:', result)
        return false
      }

      console.log('Resolved WhatsApp notification sent successfully')
      return true
    } catch (error) {
      console.error('Failed to send Resolved WhatsApp notification:', error)
      return false
    }
  }

  // Send WhatsApp notification for No Response 2 disposition
  async sendNoResponse2Notification(name: string, phone: string, ticketId: string, ticketDescription?: string): Promise<boolean> {
    try {
      console.log('Sending No Response 2 WhatsApp notification...')
      
      const response = await fetch('/api/whatsapp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          disposition: 'No Response 2',
          name,
          phone,
          ticketId,
          ticketDescription
        })
      })

      const result = await response.json()
      console.log('No Response 2 WhatsApp response:', result)

      if (!response.ok) {
        console.error('No Response 2 WhatsApp error:', result)
        return false
      }

      console.log('No Response 2 WhatsApp notification sent successfully')
      return true
    } catch (error) {
      console.error('Failed to send No Response 2 WhatsApp notification:', error)
      return false
    }
  }

  // Send WhatsApp notification for External Remarks
  async sendExternalRemarksNotification(name: string, phone: string, ticketId: string, ticketDescription?: string): Promise<boolean> {
    try {
      console.log('Sending External Remarks WhatsApp notification...')
      
      const response = await fetch('/api/whatsapp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          disposition: 'External Remarks',
          name,
          phone,
          ticketId,
          ticketDescription
        })
      })

      const result = await response.json()
      console.log('External Remarks WhatsApp response:', result)

      if (!response.ok) {
        console.error('External Remarks WhatsApp error:', result)
        return false
      }

      console.log('External Remarks WhatsApp notification sent successfully')
      return true
    } catch (error) {
      console.error('Failed to send External Remarks WhatsApp notification:', error)
      return false
    }
  }

  // Generic method to send WhatsApp based on disposition
  async sendDispositionNotification(
    disposition: string, 
    name: string, 
    phone: string, 
    ticketId: string,
    ticketDescription?: string
  ): Promise<boolean> {
    switch (disposition) {
      case 'New':
        return this.sendNewTicketNotification(name, phone, ticketId, ticketDescription)
      case 'In Progress':
        return this.sendInProgressNotification(name, phone, ticketId, ticketDescription)
      case 'No Response 1':
        return this.sendNoResponse1Notification(name, phone, ticketId, ticketDescription)
      case 'Resolved':
        return this.sendResolvedNotification(name, phone, ticketId, ticketDescription)
      case 'No Response 2':
        return this.sendNoResponse2Notification(name, phone, ticketId, ticketDescription)
      default:
        console.log(`No WhatsApp notification configured for disposition: ${disposition}`)
        return true // Return true for dispositions that don't need WhatsApp
    }
  }

  // Check if a disposition triggers WhatsApp notification
  static getDispositionsWithWhatsApp(): string[] {
    return ['New', 'In Progress', 'No Response 1', 'Resolved', 'No Response 2']
  }
}

export const dispositionWhatsappService = new DispositionWhatsAppService()
