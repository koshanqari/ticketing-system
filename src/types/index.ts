export type Designation = 'DSO' | 'Dealer' | 'ASM' | 'RSM' | 'ZSM' | 'HQ'
export type Panel = 'Goal App' | 'Dealer Panel' | 'CC Panel'
export type IssueTypeL1 = 'Tech' | 'Training' | 'General Query'
export type Status = 'Open' | 'Ongoing' | 'Closed'
export type Priority = 'Low' | 'Medium' | 'High'

export interface S3Attachment {
  uuid: string
  originalName: string
  s3Key: string
  s3Url: string
  size: number
  type: string
  uploadedAt: string
  downloadUrl?: string
  viewUrl?: string
}

export interface Ticket {
  id: string
  ticket_id: string // Auto-generated human-readable ID (A-ddmmyy-num format)
  created_time: string
  name: string
  phone: string
  email: string | null // Optional - can be null
  designation: Designation
  panel: Panel
  issue_type_l1: IssueTypeL1
  issue_type_l2?: string // Set by admin
  description: string
  attachments: S3Attachment[] // Array of S3 attachment objects
  status: Status // Auto-determined by disposition
  disposition?: string // Set by admin - determines status
  priority: Priority
  assigned_to_id?: string // Foreign key to assignees table, Default: Auto-assigned
  remarks?: string // Admin notes and internal comments
  ext_remarks?: string // External remarks visible to ticket submitter
  closed_time?: string // When status is changed to closed this time will be updated
  source?: string // Optional - tracks where the submission came from
  resolution_estimate?: string // Optional - estimated resolution date set by assignee
}

export interface Assignee {
  id: string
  name: string
  department: string
  phone: string
  is_active: boolean
  created_at: string
}

export interface Admin {
  id: string
  name: string
  password: string
  access_level: string
  is_active: boolean
  created_at: string
}

// New interface for dropdown management
export interface DropdownOption {
  id: string
  dropdown_type: 'status' | 'priority' | 'panel' | 'issue_type_l1' | 'issue_type_l2' | 'designation' | 'disposition'
  value: string
  parent_id?: string
  is_active: boolean
  sort_order?: number
  created_at: string
}

export interface TicketFormData {
  name: string
  phone: string
  email: string | '' // Optional - can be empty string
  designation: Designation | ''
  panel: Panel | ''
  issue_type_l1: IssueTypeL1 | ''
  issue_type_l2: string | ''
  description: string
  attachments: File[]
  source?: string // Optional - hidden field to track submission source
}

export interface FileUploadProgress {
  file: File
  progress: number
  status: 'uploading' | 'completed' | 'error'
  error?: string
}

// New interface for analytics data
export interface TicketAnalytics {
  total: number
  open: number
  ongoing: number
  closed: number
  resolved: number
  highPriority: number
  mediumPriority: number
  lowPriority: number
  byPanel: Record<string, number>
  byIssueType: Record<string, number>
  byDisposition: Record<string, number>
  byIssueTypeL2: Record<string, number>
  byDesignation: Record<string, number>
  byAssignee: Record<string, number>
}
