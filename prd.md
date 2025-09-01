# Ticketing System PRD

# Project Overview
   A web-based ticketing system with three panels:
1. **Submission Panel** – for users to submit issues.
2. **Admin Panel** – for team members to view, filter, and manage submitted issues.
3. **Analytics Panel** - for team members to view analytics.

---

# IMPORTANT Rules for AI
- Make sure whenever there is a new context window, you read the PRD first
- Do not delete anything without asking
- All the dropdowns need to be dynamics and from the ticket_dropdown table

---

# Objectives
- Simplify issue reporting via an intuitive form.
- Provide administrators with tools to filter, sort, and manage tickets efficiently.
- Ensure the design remains clean, responsive, and accessible.

---

# Users
- **Submitters**: DSOs, Dealers, ASMs, RSMs, ZSMs, HQ staff.
- **Admins**: Support or management team responsible for resolving issues.
- **Assignees**: these will also be admins but these will be people who will be responsible for resolving a ticket

---

# Panels

## 1. Submission Panel ✅ IMPLEMENTED & DATABASE CONNECTED
### Functionality
- ✅ Acts as the homepage of the app, route /
- ✅ Displays a form for submitting issues
- ✅ Minimal fields for a quick and seamless user experience
- ✅ Extremely mobile friendly with responsive design
- ✅ Form validation and error handling
- ✅ Success confirmation screen after submission
- ✅ **Database Integration**: Tickets are saved to Supabase PostgreSQL database
- ✅ **File Storage**: Attachments are stored in Supabase Storage bucket
- ✅ **WhatsApp Integration**: Automatic notifications sent via Gallabox API when tickets are generated
- ✅ **Ticket ID Display**: Success message prominently shows the generated ticket ID (A-ddmmyy-num format)
- ✅ **Copy Functionality**: Users can copy ticket ID to clipboard for easy reference
- ✅ **User Experience**: Clear instructions to save ticket ID for future reference

### Form Fields
Section 1: **Personal Information**
- ✅ **Name** – Text input (required) with proper validation and dark text
- ✅ **Phone** – Text input (required) with proper validation and dark text
- ✅ **Email** – Text input (optional) with proper validation and dark text
- ✅ **Designation** – Dropdown (DSO, Dealer, ASM, RSM, ZSM, HQ) with placeholder "Select your designation"

Section 2: **Issue Details**
- ✅ **Panel** – Dropdown (Goal App, Dealer Panel, CC Panel) with placeholder "Select panel"
- ✅ **Issue Type** – Dropdown (Tech, Training, General Query) with placeholder "Select issue type"
- ✅ **Description** – Text area for detailed explanation (required) with dark text
- ✅ **Attachments** – Multiple file upload (Images/Videos) with drag & drop support, file preview, and removal able to upload multiple media files

---

## 2. Admin Panel ✅ IMPLEMENTED & FULLY FUNCTIONAL
### Functionality
- Desktop friendly with responsive design
- Route: `/admin`
- Real-time data updates from Supabase database

### Navbar ✅ IMPLEMENTED
- **Analytics Panel Button**: Direct access to `/analytics` route
- **Assignees Dropdown**: Dynamic population from `assignees` table, shows "Name - Department"
- **Date Range Selector**: Smart dropdown with quick actions and custom range
- **Quick Actions**: Today, Yesterday, Last 7 Days, Last 30 Days, Last Year, All Time
- **Custom Range**: From/To date picker
- **Analytics Integration**: Card summary updates based on selected date range

### High Level Analytics/Summary Cards ✅ IMPLEMENTED
- **Progress Priority Card**: Shows total count + High/Medium/Low priority breakdown
- **Resolved Tickets**: Total resolved count with green styling
- **Parked Priority Card**: Shows total count + High/Medium/Low priority breakdown  
- **Total Tickets**: Overall ticket count with blue styling
- **Dropped Tickets**: Total dropped count with red styling
- **Smart Filtering**: Analytics update based on assignee filter + date range (not other filters)

### Search & Filter Bar ✅ IMPLEMENTED
- **Global Search**: Searches across ALL fields (ticket_id, name, phone, email, designation, panel, issue_type_l1, issue_type_l2, description)
- **Dynamic Dropdowns**: All populated from `ticket_dropdown` table
  - Status, Priority, Panel, Designation, Issue Type L1, Issue Type L2
- **Sorting Options**: 
  - Sort by: Created Time, Resolved Time, Ticket ID
  - Sort Order: Ascending/Descending toggle
- **Clear All Filters Button**: One-click reset for all filters and search
- **Ticket Count Display**: Shows "X of Y tickets" based on current filters

### Ticket Table ✅ IMPLEMENTED
- **Clickable Rows**: Click any row to open ticket modal (no separate button needed)
- **Configurable Column Widths**: Easy to adjust from code via `columnWidths` object
- **Content Wrapping**: All content wraps to next line when exceeding column width
- **Column Structure**:
  1. **Status** (120px): Status + Priority badges bundled together
  2. **Ticket ID** (130px): Ticket ID format (A-ddmmyy-num)
  3. **Issue Type** (130px): L1 + L2 bundled, content wraps if needed
  4. **Time** (130px): Created + Resolved time bundled, content wraps if needed
  5. **User Details** (200px): Name + Phone + Designation + Email bundled
  6. **Panel** (120px): Panel name
  7. **Description** (200px): Limited to 75 characters + "..." if longer
  8. **Remarks** (200px): Limited to 75 characters + "..." if longer
  9. **Attachment** (130px): File icons + count display
  10. **Assigned To** (150px): Assignee name + department

### Modal ✅ FULLY EDITABLE & COMPREHENSIVE
- **Row Click Activation**: Click any table row to open comprehensive modal
- **Complete Ticket Information**: Displays ALL fields from the ticket table in organized sections
- **Organized Layout**: 
  - **Section 1**: Ticket Status & Assignment (Status, Priority, Assigned To)
  - **Section 2**: Issue Details (Issue Type L1/L2, Panel, Description)
  - **Section 3**: User Information (Name, Phone, Email, Designation)
  - **Section 4**: Attachments (File preview with count display)
  - **Section 5**: Admin Notes & Remarks (Internal comments)
- **Editable Fields**: Comprehensive editing capabilities:
  - ✅ **Fully Editable**: Status, Priority, Assigned To, Issue Type L1, Issue Type L2, Panel, Description, Name, Phone, Email, Designation, Remarks
  - ❌ **Read-only**: Created Time, Resolved Time, Ticket ID, Attachments
- **Smart Field Types**:
  - **Dropdowns**: Status, Priority, Issue Type L1, Issue Type L2, Panel, Designation, Assigned To
  - **Text Inputs**: Name, Phone, Email
  - **Textarea**: Description, Remarks
- **Enhanced UX Features**:
  - **Sticky Header**: Modal header stays visible during scroll
  - **Visual Indicators**: Color-coded section headers with icons
  - **Loading States**: Save button shows loading spinner during updates
  - **Success Feedback**: Green success message before auto-closing
  - **Proper State Management**: All modal states reset on close
- **Save Functionality**: Updates saved to database via ticket service with proper error handling
- **Real-time Updates**: Table refreshes after successful updates
- **Responsive Design**: Optimized for all screen sizes with proper spacing

### Technical Implementation
- **State Management**: React hooks for filters, search, sorting, date range
- **Database Integration**: Supabase for real-time data fetching and updates
- **Service Layer**: Comprehensive ticketService with full CRUD operations
  - `updateTicketStatus()` - Update ticket status
  - `updateTicketPriority()` - Update ticket priority  
  - `assignTicket()` - Assign ticket to team member
  - `updateTicketIssueTypeL1()` - Update issue type L1
  - `updateTicketIssueTypeL2()` - Update issue type L2
  - `updateTicketDescription()` - Update ticket description
  - `updateTicketPanel()` - Update panel assignment
  - `updateTicketUserDetails()` - Update user information (name, phone, email, designation)
  - `updateTicketRemarks()` - Update internal remarks
- **DropdownService**: Dynamic population of all dropdown options from database
- **Admin Authentication**: Basic login system with configurable protection
- **Responsive Design**: Tailwind CSS with mobile-friendly layouts
- **Type Safety**: Full TypeScript implementation
- **Error Handling**: Graceful fallbacks and user feedback

### Column Width Configuration
- **Easy Customization**: All column widths configurable from `columnWidths` object
- **Current Settings**:
  ```typescript
  const columnWidths = {
    status: '120px',        // Status + Priority badges
    ticketId: '130px',      // Ticket ID format
    issueType: '130px',     // Issue Type L1 + L2
    time: '130px',          // Created + Resolved time
    userDetails: '200px',   // Name + Phone + Designation + Email
    panel: '120px',         // Panel name
    description: '200px',   // Description (75 chars + "...")
    remarks: '200px',       // Remarks (75 chars + "...")
    attachment: '130px',    // File icons + count
    assignedTo: '150px'     // Assignee name + department
  }
  ```
- **To Modify**: Simply change the pixel values in the `columnWidths` object
-**Auto-wrapping**: Content automatically wraps to next line when exceeding column width


## 3. Analytics Panel
### Functionality
- route /analytics
- Comprehensive ticket analytics and reporting dashboard
- Performance metrics and trend analysis
- Exportable reports for stakeholders
- Desktop friendly

### Features
- **Key Metrics Dashboard**: Total, Resolved, In Progress, High Priority tickets
- **Distribution Charts**: Status, Priority, Issue Type, and Panel breakdowns
- **Performance Metrics**: Average Response Time, Resolution Time, Customer Satisfaction
- **Trend Analysis**: Weekly ticket volume trends
- **Filtering Options**: Time period and panel-based filtering
- **Export Functionality**: Report generation and download
- **Visual Elements**: Charts, graphs, and data visualization
- **Responsive Design**: Mobile-optimized analytics interface

---

# Admin Authentication System

## Overview
The system now includes a basic admin authentication system to protect the Admin Panel and Analytics Panel.

## Configuration
- **Toggle Control**: Easy on/off switch in `src/config/admin.ts`
- **Setting**: `ADMIN_PROTECTION_ENABLED: 'yes' | 'no'`
- **Default**: `'yes'` (protection enabled)

## How It Works

### When Protection is ON (`'yes'`):
- **Admin Panel** (`/admin`): Requires login
- **Analytics Panel** (`/analytics`): Requires login
- **Login Required**: Login ID + password from `admins` table
- **Session Persistence**: Uses localStorage for session management
- **Logout Functionality**: Clear session button in protected pages

### When Protection is OFF (`'no'`):
- **Admin Panel** (`/admin`): No login required
- **Analytics Panel** (`/analytics`): No login required
- **Direct Access**: Users can access panels immediately
- **No Authentication**: Bypasses all login checks

## Components

### 1. AdminLogin Component
- **Location**: `src/components/AdminLogin.tsx`
- **Features**: Login ID/password form with validation
- **UI**: Professional modal with error handling
- **Icons**: User, Lock, Eye/EyeOff for password visibility

### 2. AdminProtected Component
- **Location**: `src/components/AdminProtected.tsx`
- **Purpose**: Higher-order component for route protection
- **Logic**: Checks config + authentication state
- **Features**: Loading states, session management, logout header

### 3. Configuration File
- **Location**: `src/config/admin.ts`
- **Function**: `isAdminProtectionEnabled()`
- **Usage**: Import and call to check protection status

## API Endpoint

### Admin Authentication
- **Route**: `/api/admin/auth`
- **Method**: `POST`
- **Body**: `{ loginId, password }`
- **Response**: `{ success, adminId, message }`
- **Database**: Checks `admins` table for credentials

## Database Requirements

### Admins Table Structure
```sql
CREATE TABLE admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  login_id TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  access_level TEXT DEFAULT 'admin',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Usage Instructions

### To Enable Protection:
1. Set `ADMIN_PROTECTION_ENABLED = 'yes'` in `src/config/admin.ts`
2. Restart development server
3. Access `/admin` or `/analytics` will show login form

### To Disable Protection:
1. Set `ADMIN_PROTECTION_ENABLED = 'no'` in `src/config/admin.ts`
2. Restart development server
3. Access `/admin` or `/analytics` directly (no login)

### To Add Admin Users:
1. Insert records into `admins` table
2. Use login ID + password for login
3. Set `is_active = true` for active accounts

## Security Notes

### Current Implementation:
- **Basic Authentication**: Simple email/password check
- **Session Storage**: Uses localStorage (client-side)
- **Password Storage**: Plain text (NOT production-ready)

### Production Recommendations:
- **Password Hashing**: Use bcrypt or similar
- **JWT Tokens**: Implement proper session management
- **HTTPS**: Ensure secure connections
- **Rate Limiting**: Prevent brute force attacks
- **Session Expiry**: Add timeout mechanisms

---

# Implementation Status & Technical Details

## ✅ Completed Features

### Submission Panel (Homepage)
- **Next.js 14** with App Router and TypeScript
- **Tailwind CSS** for responsive, mobile-first design
- **Form State Management** with React hooks
- **File Upload System** supporting multiple images/videos
- **Form Validation** with user-friendly error messages
- **Success Flow** with confirmation screen
- **Mobile Optimization** with responsive grid layouts

### Technical Architecture
- **Component Structure**: Modular React components
- **Type Safety**: Full TypeScript implementation
- **File Handling**: Drag & drop with preview and removal
- **State Management**: Local state with proper validation
- **Error Handling**: Graceful fallbacks and user feedback

### UI/UX Improvements
- **Dynamic Text Colors**: Medium gray placeholders (#6B7280) for optimal readability, dark gray selected text
- **Interactive Elements**: Hover states and focus rings
- **Form Validation**: Real-time feedback and error prevention
- **File Management**: Visual file previews with type-specific icons
- **Responsive Design**: Optimized for all screen sizes
- **Success Feedback**: Prominent ticket ID display with copy functionality
- **User Guidance**: Clear instructions for saving ticket ID for reference

---

# UI/UX Design Guidelines
- **Theme Colors**:
  - **Primary Background**: Light Gray (#F9FAFB) - Clean, modern feel (as seen in the main content area)
  - **Secondary Background**: White (#FFFFFF) - Card and content areas, sidebar background
  - **Accent Colors**: Blue (#3B82F6) for highlights and interactive elements (e.g., selected navigation item, "Add customer" button, chart accents)
  - **Text Colors**: 
    - Primary: Dark Gray (#111827) for headings and important text
    - Secondary: Medium Gray (#6B7280) for descriptions and labels
    - Placeholder: Medium Gray (#6B7280) for input placeholders and dropdown options (optimal readability)
  - **Borders**: Light Gray (#E5E7EB) for subtle separation and input fields
  - **Status Colors**:
    - Success: Green (#10B981)
    - Warning: Yellow (#F59E0B)
    - Error: Red (#EF4444)
    - Info: Blue (#3B82F6) - Note: This is the same as the main accent color, which is fine for info badges.

- **Style**:
  - **Modern Light Theme**: Clean, professional, and minimalist aesthetic.
  - **Typography**: Sans-serif font (e.g., Inter, Roboto, or similar) for readability.
  - **Rounded Corners**: Subtle rounded corners on cards, buttons, and input fields for a softer look.
  - **Responsive Design**: Optimized for both desktop and mobile devices.
  - **Iconography**: Consistent line icons for navigation and actions.
  - **Interactive Elements**: Clear hover states and visual feedback for buttons and clickable items.
  - **Data Visualization**: Use of charts (bar, gauge) and clear metrics for dashboard insights.
  - **Card-based Layout**: Information presented in distinct, easily digestible cards.
  - **Highlighted States**: Use of accent color for selected navigation items and important actions.
  - **Dark Highlight Card**: A specific card (e.g., "Prime Estate") can be highlighted with a dark background and white text for emphasis or selection.

---

# Data Model

## ticket Table
| Field         | Type       | Notes       |
|---------------|------------|-------------|
| id            | uuid       | Primary key |
| ticket_id     | text       | Auto-generated human-readable ID (A-ddmmyy-num format), generated from the database only
| created_time  | timestamp  | Auto-generated |
| name          | text       | Required |
| phone         | text       | Required |
| email         | text       | Optional |
| designation   | text       | DSO, Dealer, ASM, RSM, ZSM, HQ |
| panel         | text       | Goal App, Dealer Panel, CC Panel |
| issue_type_l1 | text       | Tech, Training, General Query |
| issue_type_l2 | text       | Set by admin |
| description   | text       | Required |
| attachments   | text[]     | Array of file URLs stored in Supabase Storage |
| status        | text       | Progress, Resolved, Parked, Dropped |
| priority      | text       | Low, Medium, High |
| assigned_to_id| uuid       | Foreign key to assignees table, Default: Unassigned |
| remarks       | text       | Admin notes and internal comments |
| resolved_time | timestamp  | When status is changed to resolved this time will be updated, if status is changed again, resolved time should be null again |


## ticket_dropdown Table
| Field         | Type       | Notes      |
|---------------|-----------|-------------|
| id            | uuid      | Primary key |
| dropdown_type | text      | e.g., status, priority, panel, issue_type_l1, issue_type_l2, designation |
| value         | text      | Dropdown value (e.g., Progress, Resolved, Goal App) |
| parent_id     | uuid      | Links L2 to L1 if applicable (nullable) |
| is_active     | boolean   | To soft-delete/hide values |
| created_at    | timestamp | Auto-generated |


## assignees Table: 
| Field       | Type       | Notes        |
|-------------|------------|--------------|
| id          | uuid       | Primary key |
| name        | text       | Unique person name |
| department  | text       | Support, Product, Tech etc 
| is_active   | boolean    | Whether assignee is active |
| created_at  | timestamp  | Auto-generated |

Notes:
- These will are responsible for solving tickets
- Each ticket will be auto assigned to anyone from the support team using round robbin

## admins table: 
| Field         | Type       | Notes |
|---------------|-----------|-------|
| id            | uuid       | Primary key |
| login_id      | text       | Unique team/person name |
| password_hash | text       | 
| access_level  | text       | default Admin
| is_active     | boolean    | Whether Admin is active |
| created_at    | timestamp  | Auto-generated |

Notes: 
- Admins are those who can access admin panel

---

## Technical Notes
- **Frontend Framework**: Next.js 14 (with TailwindCSS & TypeScript) ✅
- **Backend & DB**: Supabase (PostgreSQL) ✅ **CONNECTED & WORKING** (in testing and MVP, we will use Supabase, however finally we will shift to PostgreSQL which is on AWS servers)
- **Database Schema**: All tables created and populated with sample data ✅
- **File Storage**: Supabase Storage bucket configured and working ✅
- **WhatsApp API**: Gallabox integration via Next.js API route ✅ **WORKING**
- **Ticket ID System**: Auto-generated human-readable IDs (A-ddmmyy-num format) ✅
- **Auth**: Supabase Auth (Not in MVP, Admin Panel and Analytics panel should be directly accessed for now using /admin or /analytics)
- **Deployment**: Vercel (preferred) or Netlify
- **Real-Time Updates**: Supabase subscriptions for admin dashboard

## Database Implementation Details

### ✅ Database Setup Complete
- **Supabase Project**: `ywpvziwvojaeqowmbafg` ✅
- **Tables Created**: tickets, assignees, admins ✅
- **Storage Bucket**: `ticket-attachments` configured ✅
- **Sample Data**: 5 sample tickets with realistic scenarios ✅

## WhatsApp API Integration

### ✅ WhatsApp Notifications
- **Automatic notifications** sent when tickets are generated ✅
- **Template-based messaging** with user name and ticket ID ✅
- **Server-side integration** via Next.js API route ✅

### 🎫 Ticket ID System
- **Format**: `A-ddmmyy-num` (e.g., A-250124-001)
- **Auto-generation**: Database trigger creates IDs automatically
- **Uniqueness**: Each ticket gets a unique, human-readable identifier
- **Daily Reset**: Counter resets each day for clean numbering

### 🔧 Database Triggers & Functions
- **Auto Ticket ID**: `generate_ticket_id()` function
- **Status Management**: Automatic `resolved_time` updates
- **File Handling**: Attachment URLs stored as TEXT array
- **Referential Integrity**: Foreign key relationships maintained

### 📊 Current Database Status
- **Total Tickets**: 5 sample tickets
- **Total Assignees**: 4 team members
- **Storage**: Ready for file uploads
- **Performance**: Indexed for optimal query performance


---

## Acceptance Criteria

### ✅ Phase 1: Submission Panel - COMPLETED & DATABASE INTEGRATED
- ✅ Users can submit tickets through Submission Panel
- ✅ Form validation prevents incomplete submissions
- ✅ File attachments support multiple images/videos
- ✅ Mobile-responsive design implemented
- ✅ UI follows modern light theme with proper contrast
- ✅ Success confirmation flow implemented
- ✅ **Database Integration**: Tickets saved to Supabase PostgreSQL ✅
- ✅ **File Storage**: Attachments stored in Supabase Storage ✅
- ✅ **WhatsApp Integration**: Automatic notifications via Gallabox API ✅
- ✅ **Ticket ID System**: Auto-generated human-readable IDs (A-ddmmyy-num) ✅
- ✅ **Ticket ID Display**: Success message shows generated ticket ID prominently ✅
- ✅ **Copy Functionality**: Users can copy ticket ID to clipboard ✅
- ✅ **Sample Data**: Database populated with 5 sample tickets ✅

### ✅ Phase 2: Admin Panel - COMPLETED
- **Database Ready**: All data structures in place ✅
- **Sample Data**: 5 tickets available for testing ✅
- **API Layer**: Ticket service implemented ✅
- **Admin Interface**: Fully functional admin panel built ✅
- **Remarks Field**: Added to tickets table for admin notes ✅
- **Direct Editing**: Status, priority, assignment, and remarks can be changed inline ✅
- **Search & Filtering**: Advanced search and filter capabilities ✅
- **Assignee Management**: Dropdown selection from active team members ✅
- **Real-time Updates**: Changes reflect immediately in the UI ✅

### 📋 Phase 3: Analytics Panel - PLANNED
- Performance metrics and reporting dashboard
- Exportable reports for stakeholders
- Trend analysis and data visualization

### 🔧 System Requirements
- System supports at least **1,000 users** with scalable backend ✅
- Supabase integration ready for production deployment ✅
- File storage system configured and tested ✅
- WhatsApp notification system operational via Gallabox API ✅
- Database schema implemented and tested ✅
- Ticket ID system operational ✅

---
