import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { name, phone, ticketId } = await request.json()

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

    const message = {
      channelId: channelId,
      channelType: 'whatsapp',
      recipient: {
        name: name,
        phone: `91${formattedPhone}` // Add 91 prefix for India
      },
      whatsapp: {
        type: 'template',
        template: {
          templateName: 'ticket_generated_c1',
          bodyValues: {
            Name: name,
            ticket_id: ticketId
          }
        }
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
