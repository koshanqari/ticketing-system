import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { name, phone, ticketId, disposition, ticketDescription } = await request.json()

    const apiKey = '67d1129cb7401ffd9e886569'
    const apiSecret = '9c22bae06c1149af81fd1f8f59ebab80'
    const channelId = '67efa1e540e524987a8bfd90'
    const baseUrl = 'https://server.gallabox.com/devapi/messages/whatsapp'

    // Format phone number for WhatsApp API
    const formatPhoneNumber = (phone: string): string => {
      return phone
        .replace(/^\+91/, '') // Remove +91 prefix
        .replace(/[\s\-\(\)]/g, '') // Remove spaces, dashes, parentheses
        .replace(/^91/, '') // Remove 91 prefix if present
    }

    const formattedPhone = formatPhoneNumber(phone)

    // Truncate ticket description to 50 characters
    const truncateDescription = (description: string): string => {
      if (!description || description.trim() === '') return 'No description provided'
      return description.length > 50 ? description.substring(0, 50) + '...' : description
    }

    const truncatedDescription = truncateDescription(ticketDescription || '')

    // Get template name and body values based on disposition
    const getTemplateConfig = (disposition: string) => {
      switch (disposition) {
        case 'New':
          return {
            templateName: 'ticket_generated_c3',
            bodyValues: {
              Name: name,
              ticket_id: ticketId,
              ticket_desc: truncatedDescription
            }
          }
        case 'In Progress':
          return {
            templateName: 'ticket_inprog',
            bodyValues: {
              Name: name,
              ticket_id: ticketId,
              ticket_desc: truncatedDescription
            }
          }
        case 'No Response 1':
          return {
            templateName: 'ticket_not_response_1',
            bodyValues: {
              Name: name,
              ticket_id: ticketId,
              ticket_desc: truncatedDescription
            }
          }
        case 'Resolved':
          return {
            templateName: 'ticket_resolved_c1',
            bodyValues: {
              Name: name,
              ticket_id: ticketId,
              ticket_desc: truncatedDescription
            }
          }
        case 'No Response 2':
          return {
            templateName: 'ticket_not_response_2',
            bodyValues: {
              Name: name,
              ticket_id: ticketId,
              ticket_desc: truncatedDescription
            }
          }
        default:
          // Fallback to new template for backward compatibility
          return {
            templateName: 'ticket_generated_c3',
            bodyValues: {
              Name: name,
              ticket_id: ticketId,
              ticket_desc: truncatedDescription
            }
          }
      }
    }

    const templateConfig = getTemplateConfig(disposition)

    const message = {
      channelId: channelId,
      channelType: 'whatsapp',
      recipient: {
        name: name,
        phone: `91${formattedPhone}` // Add 91 prefix for India
      },
      whatsapp: {
        type: 'template',
        template: templateConfig
      }
    }

    console.log('Sending WhatsApp message via API route:', JSON.stringify(message, null, 2))

    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'apiKey': apiKey,
        'apiSecret': apiSecret,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(message)
    })

    const responseText = await response.text()
    console.log('WhatsApp API Response:', response.status, responseText)

    if (!response.ok) {
      return NextResponse.json(
        { error: 'WhatsApp API failed', details: responseText },
        { status: response.status }
      )
    }

    let result
    try {
      result = JSON.parse(responseText)
    } catch {
      result = responseText
    }

    return NextResponse.json({ success: true, result })

  } catch (error) {
    console.error('WhatsApp API route error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
