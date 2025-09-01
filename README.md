# Ticketing System

A modern web-based ticketing system built with Next.js, TypeScript, and Tailwind CSS. The system allows users to submit issues and administrators to manage tickets efficiently.

## Features

### Submission Panel (Homepage)
- **Personal Information**: Name, Phone, Email, Designation
- **Issue Details**: Panel selection, Issue Type, Description
- **File Attachments**: Support for images and videos
- **Mobile-First Design**: Optimized for all devices
- **Form Validation**: Required field validation and error handling

### Admin Panel (Coming Soon)
- Ticket management and filtering
- Status updates and priority management
- Assignment to team members
- Real-time updates

### Analytics Panel (Coming Soon)
- Performance metrics and reporting
- Trend analysis and data visualization
- Exportable reports

## Tech Stack

- **Frontend**: Next.js 14 with App Router
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Deployment**: Vercel (recommended)

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account and project

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd ticketing-system
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.local.example .env.local
```

4. Update `.env.local` with your Supabase credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

5. Run the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
src/
├── app/                 # Next.js App Router
│   ├── page.tsx        # Homepage (Submission Form)
│   └── layout.tsx      # Root layout
├── components/          # React components
│   └── SubmissionForm.tsx
├── lib/                 # Utility functions
│   ├── supabase.ts     # Supabase client
│   └── utils.ts        # Helper functions
└── types/               # TypeScript type definitions
    └── index.ts
```

## Database Schema

The system uses the following main tables:

- **tickets**: Core ticket information
- **assignees**: Team members who can be assigned tickets
- **admins**: Administrative users

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Code Style

- TypeScript for type safety
- Tailwind CSS for styling
- Component-based architecture
- Responsive design principles

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Set environment variables in Vercel dashboard
4. Deploy automatically on push

### Manual Deployment

1. Build the project: `npm run build`
2. Start the production server: `npm run start`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions, please contact the development team.
