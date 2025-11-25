# Admin Management Script

## Quick Start

### Check Existing Admins & Create New Admin
```bash
cd backend
pnpm create-admin
```

## Features

This interactive script allows you to:

1. **View All Existing Admins**
   - Lists all admin users in the database
   - Shows ID, email, username, name, and creation date

2. **Check Admin by Email**
   - Verify if a specific email has admin access
   - View detailed admin information

3. **Create New Admin**
   - Interactive prompts for admin details
   - Automatic password hashing
   - Email uniqueness validation
   - Upgrade existing users to admin

## Usage Examples

### Create a New Admin
```bash
pnpm create-admin
# Choose option 1
# Enter details when prompted
```

### Check if Admin Exists
```bash
pnpm create-admin
# Choose option 2
# Enter email to check
```

### Upgrade Existing User to Admin
```bash
pnpm create-admin
# Choose option 1
# Enter existing user's email
# Confirm upgrade when prompted
```

## Default Admin (from seed)
- **Email**: admin@campusone.com
- **Username**: admin
- **Password**: admin123

## Security Notes
- All passwords are hashed using bcrypt
- Admin users have `isVerified: true` by default
- Store admin credentials securely
- Change default admin password in production
