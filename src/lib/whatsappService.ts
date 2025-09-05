// Removed unused interfaces

// Removed unused interface

export class WhatsAppService {
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

  // Send WhatsApp notification for ticket generation
  async sendTicketNotification(name: string, phone: string, ticketId: string): Promise<boolean> {
    try {
      console.log('Sending WhatsApp notification via local API route...')
      
      // Use local API route to avoid CORS issues
      const response = await fetch('/api/whatsapp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name,
          phone,
          ticketId
        })
      })

      const result = await response.json()
      console.log('WhatsApp API route response:', result)

      if (!response.ok) {
        console.error('WhatsApp API route error:', result)
        return false
      }

      console.log('WhatsApp notification sent successfully via API route')
      return true
    } catch (error) {
      console.error('Failed to send WhatsApp notification:', error)
      return false
    }
  }

  // Test the WhatsApp API connection
  async testConnection(): Promise<boolean> {
    try {
      console.log('Testing WhatsApp API via local API route...')
      
      // Use local API route to avoid CORS issues
      const response = await fetch('/api/whatsapp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: 'Test User',
          phone: '916006324328',
          ticketId: 'TEST-001'
        })
      })

      const result = await response.json()
      console.log('Test connection response:', result)

      return response.ok
    } catch (error) {
      console.error('WhatsApp API test failed:', error)
      return false
    }
  }
}

export const whatsappService = new WhatsAppService()
