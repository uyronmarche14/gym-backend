# Backend Management Scripts

This directory contains interactive scripts for managing your gym backend.

---

## 📋 Available Scripts

### 1. Admin Management (`createAdmin.js`)
### 2. Membership Plan Management (`managePlans.js`)
### 3. Database Seeding (`prisma/seed.js`)

---

## 🔐 Admin Management Script

### Quick Start
```bash
cd backend
npm run create-admin
```

### Features

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

### Usage Examples

#### Create a New Admin
```bash
npm run create-admin
# Choose option 1
# Enter details when prompted
```

#### Check if Admin Exists
```bash
npm run create-admin
# Choose option 2
# Enter email to check
```

#### Upgrade Existing User to Admin
```bash
npm run create-admin
# Choose option 1
# Enter existing user's email
# Confirm upgrade when prompted
```

### Default Admin (from seed)
- **Email**: admin@campusone.com
- **Username**: admin
- **Password**: admin123

### Security Notes
- All passwords are hashed using bcrypt
- Admin users have `isVerified: true` by default
- Store admin credentials securely
- Change default admin password in production

---

## 💳 Membership Plan Management Script

### Quick Start
```bash
cd backend
npm run manage-plans
```

### Features

This interactive script allows you to:

1. **View All Plans**
   - Display all membership plans in a formatted table
   - Shows ID, name, duration, prices, and status

2. **Create New Plan**
   - Add custom membership plans
   - Set regular and student pricing
   - Configure duration and description

3. **Update Existing Plan**
   - Modify plan details
   - Update pricing
   - Change active status

4. **Delete Plan**
   - Remove plans (with safety checks)
   - Warns if plan has associated payments

5. **Toggle Active/Inactive**
   - Quickly enable/disable plans
   - Safer than deletion

6. **Seed Default Plans**
   - Load standard membership plans
   - Creates/updates 7 default plans

### Default Plans (from seed)

| Plan Name              | Duration | Price  | Student Price |
|------------------------|----------|--------|---------------|
| Walk-In / Daily        | 1 day    | ₱60    | ₱55           |
| 1 Week Membership      | 7 days   | ₱300   | ₱250          |
| Half Month Membership  | 15 days  | ₱500   | ₱400          |
| 1 Month Membership     | 30 days  | ₱750   | ₱650          |
| 3 Months Membership    | 90 days  | ₱2000  | -             |
| 6 Months Membership    | 180 days | ₱3000  | -             |
| 1 Year Membership      | 365 days | ₱5000  | -             |

### Usage Examples

#### View All Plans
```bash
npm run manage-plans
# Choose option 1
```

#### Create Custom Plan
```bash
npm run manage-plans
# Choose option 2
# Enter: "2 Month Membership", 60 days, ₱1200, etc.
```

#### Seed Default Plans
```bash
npm run manage-plans
# Choose option 6
# Confirm with 'yes'
```

---

## 🌱 Database Seeding

### Method 1: Using Prisma (Recommended)
```bash
cd backend
npx prisma db seed
```

### Method 2: Using npm script
```bash
cd backend
npm run seed
```

### What Gets Seeded?

1. **Default Admin User**
   - Email: admin@campusone.com
   - Username: admin
   - Password: admin123

2. **Default Membership Plans**
   - 7 standard plans (see table above)
   - Includes student pricing where applicable

### When to Run Seed?

- ✅ **First time setup** - After running migrations
- ✅ **Reset database** - After dropping/recreating database
- ✅ **Development** - To quickly populate test data
- ❌ **Production** - Use with caution, may duplicate data

---

## 🚀 Complete Setup Workflow

For a fresh installation:

```bash
# 1. Navigate to backend
cd backend

# 2. Install dependencies
npm install

# 3. Configure .env file
# (Make sure DATABASE_URL is set)

# 4. Generate Prisma Client
npx prisma generate

# 5. Run migrations (creates tables)
npx prisma migrate dev

# 6. Seed database (creates admin + plans)
npx prisma db seed

# 7. Start server
npm run dev
```

---

## 📝 Notes

- All scripts use ES modules (`import/export`)
- Requires Node.js and a configured database
- Scripts are interactive - follow the prompts
- Safe to run multiple times (checks for duplicates)
- Use `Ctrl+C` to exit any script

---

## 🆘 Troubleshooting

### "Cannot find module @prisma/client"
```bash
npx prisma generate
```

### "Database connection failed"
- Check your `.env` file
- Ensure DATABASE_URL is correct
- Verify database server is running (XAMPP MySQL)

### "Plan already exists"
- Use update option instead of create
- Or use the seed option (updates existing)

### "Admin already exists"
- Use check option to verify
- Or use upgrade option to change role

---

## 🔗 Related Files

- `scripts/createAdmin.js` - Admin management
- `scripts/managePlans.js` - Plan management
- `prisma/seed.js` - Database seeding
- `prisma/schema.prisma` - Database schema
- `package.json` - Script definitions
