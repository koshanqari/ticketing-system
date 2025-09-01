export type Designation = 'DSO' | 'Dealer' | 'ASM' | 'RSM' | 'ZSM' | 'HQ'
export type Panel = 'Goal App' | 'Dealer Panel' | 'CC Panel'
export type IssueTypeL1 = 'Tech' | 'Training' | 'General Query'
export type Status = 'Progress' | 'Resolved' | 'Parked' | 'Dropped'
export type Priority = 'Low' | 'Medium' | 'High'

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
  attachments: string[] // Array of file URLs stored in Supabase Storage
  status: Status
  priority: Priority
  assigned_to_id?: string // Foreign key to assignees table, Default: Auto-assigned
  remarks?: string // Admin notes and internal comments
  resolved_time?: string // When status is changed to resolved this time will be updated
}

export interface Assignee {
  id: string
  name: string
  department: string
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
  dropdown_type: 'status' | 'priority' | 'panel' | 'issue_type_l1' | 'issue_type_l2' | 'designation'
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
  description: string
  attachments: File[]
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
  progress: number
  resolved: number
  parked: number
  dropped: number
  highPriority: number
  mediumPriority: number
  lowPriority: number
  byPanel: Record<string, number>
  byIssueType: Record<string, number>
  byDesignation: Record<string, number>
  byAssignee: Record<string, number>
}
