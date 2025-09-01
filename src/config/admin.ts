// Admin Protection Configuration
// Set this to 'no' to disable password protection for admin and analytics panels
// Set this to 'yes' to enable password protection

export const ADMIN_PROTECTION_ENABLED: string = 'yes'

// When ADMIN_PROTECTION_ENABLED is 'no':
// - Admin panel (/admin) will be accessible without login
// - Analytics panel (/analytics) will be accessible without login
// - No authentication required

// When ADMIN_PROTECTION_ENABLED is 'yes':
// - Admin panel (/admin) will require login
// - Analytics panel (/analytics) will require login
// - Users must authenticate with admin credentials

// To change this setting:
// 1. Change the value above from 'yes' to 'no' or vice versa
// 2. Save the file
// 3. Restart your development server (npm run dev)
// 4. The change will take effect immediately

export const isAdminProtectionEnabled = () => ADMIN_PROTECTION_ENABLED === 'yes'

// Helper functions for better clarity
export const isProtectionDisabled = () => ADMIN_PROTECTION_ENABLED === 'no'
export const getProtectionStatus = () => ADMIN_PROTECTION_ENABLED

// Debug function to check current status
export const debugProtectionStatus = () => {
  const status = ADMIN_PROTECTION_ENABLED
  const isEnabled = status === 'yes'
  const isDisabled = status === 'no'
  
  console.log('🔒 Admin Protection Status:', {
    currentValue: status,
    isEnabled,
    isDisabled,
    message: isEnabled 
      ? 'Password protection is ENABLED - Login required' 
      : 'Password protection is DISABLED - No login required'
  })
}
