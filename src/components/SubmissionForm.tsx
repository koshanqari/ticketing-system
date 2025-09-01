'use client'

import { useState, useEffect } from 'react'
import { Upload, Send, User, AlertTriangle, Image, X, Video, File } from 'lucide-react'
import { cn } from '@/lib/utils'
import { TicketFormData, Designation, Panel, IssueTypeL1, DropdownOption } from '@/types'
import { fileUploadService } from '@/lib/fileUpload'
import { ticketService } from '@/lib/ticketService'
import { dropdownService } from '@/lib/dropdownService'

export default function SubmissionForm() {
  const [formData, setFormData] = useState<TicketFormData>({
    name: '',
    phone: '',
    email: '',
    designation: '',
    panel: '',
    issue_type_l1: '',
    description: '',
    attachments: []
  })

  const [dropdownOptions, setDropdownOptions] = useState<Record<string, DropdownOption[]>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [submittedTicket, setSubmittedTicket] = useState<{ ticket_id?: string } | null>(null)

  // Load dropdown options on component mount
  useEffect(() => {
    const loadDropdownOptions = async () => {
      try {
        const options = await dropdownService.getAllDropdownOptions()
        setDropdownOptions(options)
      } catch (error) {
        console.error('Failed to load dropdown options:', error)
      }
    }
    
    loadDropdownOptions()
  }, [])

  const handleInputChange = (field: keyof TicketFormData, value: string | File) => {
    // Special handling for phone number to ensure only digits
    if (field === 'phone') {
      // Remove all non-digit characters and limit to 10 digits
      const digitsOnly = value.toString().replace(/\D/g, '').slice(0, 10)
      setFormData(prev => ({ ...prev, [field]: digitsOnly }))
    } else {
      setFormData(prev => ({ ...prev, [field]: value }))
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) {
      setFormData(prev => ({
        ...prev,
        attachments: [...prev.attachments, ...files]
      }))
    }
  }

    const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate that dropdowns are selected
    if (!formData.designation || !formData.panel || !formData.issue_type_l1) {
      setSubmitError('Please select all required fields (Designation, Panel, and Issue Type).')
      return
    }
    
    // Basic phone validation
    if (!formData.phone.trim()) {
      setSubmitError('Please enter your phone number.')
      return
    }
    
    // Validate phone number is exactly 10 digits
    if (!/^\d{10}$/.test(formData.phone)) {
      setSubmitError('Please enter exactly 10 digits for your phone number.')
      return
    }
    
    setIsSubmitting(true)
    setSubmitError('')

    try {
      // Submit ticket to Supabase database
      const submittedTicketData = await ticketService.submitTicket(formData)
      
      // Store the submitted ticket data to show ticket ID
      setSubmittedTicket(submittedTicketData)
      setSubmitSuccess(true)
      setFormData({
        name: '',
        phone: '',
        email: '',
        designation: '',
        panel: '',
        issue_type_l1: '',
        description: '',
        attachments: []
      })
      
      // Success message stays until user chooses to submit another ticket
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Failed to submit ticket. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (submitSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <div className="w-8 h-8 bg-green-500 rounded-full"></div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Ticket Submitted!</h2>
          
          {/* Ticket ID Display */}
          {submittedTicket?.ticket_id ? (
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <p className="text-sm text-blue-600 mb-1">Your Ticket ID:</p>
              <p className="text-2xl font-bold text-blue-700 font-mono">
                {submittedTicket.ticket_id}
              </p>
              <p className="text-xs text-blue-500 mt-1">
                Please save this number for future reference
              </p>
            </div>
          ) : (
            <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
              <p className="text-sm text-yellow-600 mb-1">Ticket Submitted Successfully</p>
              <p className="text-xs text-yellow-500">
                Your ticket has been submitted. Ticket ID will be available shortly.
              </p>
            </div>
          )}


          
                      <p className="text-gray-600 mb-6">
              Your issue has been successfully submitted. We&apos;ll get back to you soon.
              {submittedTicket?.ticket_id && (
                <span className="block mt-2 text-sm">
                  You can reference this ticket using ID: <strong>{submittedTicket.ticket_id}</strong>
                </span>
              )}
            </p>
          
          <div className="space-y-3">
                      <button
            onClick={() => {
              setSubmitSuccess(false)
              setSubmittedTicket(null)
            }}
            className="w-full bg-blue-600 text-white py-3 px-6 rounded-xl font-medium hover:bg-blue-700 transition-colors"
          >
            Submit Another Ticket
          </button>
            
            {/* Copy Ticket ID Button */}
            {submittedTicket?.ticket_id && (
              <button
                onClick={() => {
                  if (submittedTicket.ticket_id) {
                    navigator.clipboard.writeText(submittedTicket.ticket_id)
                  }
                  // You could add a toast notification here
                }}
                className="w-full bg-gray-100 text-gray-700 py-2 px-6 rounded-xl font-medium hover:bg-gray-200 transition-colors text-sm"
              >
                📋 Copy Ticket ID
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
            Submit Your Issue
          </h1>
          <p className="text-lg text-gray-600">
            We&apos;re here to help! Please fill out the form below to report your issue.
          </p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Personal Information Section */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <User className="w-5 h-5 mr-2 text-blue-600" />
                Personal Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder:text-gray-500 text-gray-900"
                    placeholder="Enter your full name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    onKeyPress={(e) => {
                      // Only allow numeric input
                      if (!/[0-9]/.test(e.key)) {
                        e.preventDefault()
                      }
                    }}
                    maxLength={10}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder:text-gray-500 text-gray-900"
                    placeholder="10 digit phone number"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {formData.phone.length}/10 digits
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder:text-gray-500 text-gray-900"
                    placeholder="Enter your email address (optional)"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Designation *
                  </label>
                  <select
                    required
                    value={formData.designation}
                    onChange={(e) => handleInputChange('designation', e.target.value as Designation)}
                    className={`w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white text-gray-900`}
                  >
                    <option value="" disabled className="text-gray-500">
                      Select your designation
                    </option>
                    {dropdownOptions.designation?.map((option) => (
                      <option key={option.id} value={option.value}>
                        {option.value}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Issue Details Section */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <AlertTriangle className="w-5 h-5 mr-2 text-blue-600" />
                Issue Details
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Panel *
                  </label>
                  <select
                    required
                    value={formData.panel}
                    onChange={(e) => handleInputChange('panel', e.target.value as Panel)}
                    className={`w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white text-gray-900`}
                  >
                    <option value="" disabled className="text-gray-500">
                      Select panel
                    </option>
                    {dropdownOptions.panel?.map((option) => (
                      <option key={option.id} value={option.value}>
                        {option.value}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Issue Type *
                  </label>
                  <select
                    required
                    value={formData.issue_type_l1}
                    onChange={(e) => handleInputChange('issue_type_l1', e.target.value as IssueTypeL1)}
                    className={`w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white text-gray-900`}
                  >
                    <option value="" disabled className="text-gray-500">
                      Select issue type
                    </option>
                    {dropdownOptions.issue_type_l1?.map((option) => (
                      <option key={option.id} value={option.value} className="text-gray-900">
                        {option.value}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description *
                </label>
                                  <textarea
                    required
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none placeholder:text-gray-500 text-gray-900"
                    placeholder="Please describe your issue in detail..."
                  />
              </div>
            </div>

            {/* Attachment Section */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Attachment (Optional)
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-blue-400 transition-colors">
                <input
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <div className="flex flex-col items-center">
                    <Upload className="w-8 h-8 text-gray-400 mb-2" />
                    <p className="text-sm text-gray-600">
                      <span className="font-medium text-blue-600 hover:text-blue-500">
                        Click to upload
                      </span>{' '}
                      or drag and drop
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Multiple images and videos up to 10MB each
                    </p>
                  </div>
                </label>
                {formData.attachments.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {formData.attachments.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                        <div className="flex items-center text-sm text-blue-700">
                          {fileUploadService.isImage(file) ? (
                            <Image className="w-4 h-4 mr-2" />
                          ) : fileUploadService.isVideo(file) ? (
                            <Video className="w-4 h-4 mr-2" />
                          ) : (
                            <File className="w-4 h-4 mr-2" />
                          )}
                          {file.name}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setFormData(prev => ({
                              ...prev,
                              attachments: prev.attachments.filter((_, i) => i !== index)
                            }))
                          }}
                          className="text-red-500 hover:text-red-700 p-1"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className={cn(
                  "w-full py-4 px-6 rounded-xl font-medium text-white transition-all duration-200",
                  isSubmitting
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700 active:scale-95"
                )}
              >
                {isSubmitting ? (
                  <div className="flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Submitting...
                  </div>
                ) : (
                  <div className="flex items-center justify-center">
                    <Send className="w-5 h-5 mr-2" />
                    Submit Ticket
                  </div>
                )}
              </button>
            </div>

            {/* Error Message */}
            {submitError && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                <p className="text-red-700 text-sm">{submitError}</p>
              </div>
            )}
          </form>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-gray-500">
          <p>Need immediate assistance? Contact our support team.</p>
        </div>
      </div>
    </div>
  )
}
