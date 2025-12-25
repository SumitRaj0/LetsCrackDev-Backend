# Database Seeding Guide

This guide explains how to seed the database with real resources, courses, services, and coupons.

## What Gets Seeded

### 📚 Resources (15 items)

Real documentation links including:

- MDN Web Docs (JavaScript)
- React Official Documentation
- Node.js Documentation
- TypeScript Handbook
- Vue.js Guide
- Express.js API Reference
- MongoDB & PostgreSQL Docs
- Tailwind CSS Documentation
- Git Documentation
- Docker & AWS Documentation
- Next.js & GraphQL Docs
- And more...

### 🎓 Courses (5 courses)

Real courses with actual content:

1. **Complete JavaScript Mastery** - ₹2,999
2. **React Complete Guide** - ₹3,999
3. **Node.js Backend Development** - ₹3,499
4. **TypeScript for JavaScript Developers** - ₹2,799
5. **Full Stack Development Bootcamp** - ₹4,999

Each course includes:

- Multiple lessons with video URLs
- Free preview lessons
- Proper difficulty levels
- Real course descriptions

### 💼 Services (4 services)

1. **Resume Review & Optimization** - ₹1,999
2. **Technical Interview Preparation** - ₹2,999
3. **Career Mentorship Program** - ₹4,999
4. **Portfolio Website Development** - ₹8,999

### 🎫 Coupons (3 coupons)

1. **WELCOME20** - 20% off (all purchases, min ₹1000)
2. **STUDENT50** - 50% off courses (max ₹2000 discount)
3. **FIRST500** - Flat ₹500 off (min ₹2000 purchase)

## How to Run

### Prerequisites

1. MongoDB must be running and accessible
2. `MONGODB_URI` environment variable must be set
3. Node.js and npm installed

### Run the Seed Script

```bash
# From the backend directory
npm run seed
```

Or directly with ts-node:

```bash
npx ts-node src/scripts/seedDatabase.ts
```

## What Happens

1. **Connects to Database** - Uses your `MONGODB_URI` from `.env`
2. **Creates Admin User** - If not exists:
   - Email: `admin@letscrackdev.com`
   - Password: `Admin@123`
   - Role: `admin`
3. **Seeds Resources** - Adds 15 real documentation resources
4. **Seeds Courses** - Adds 5 real courses with lessons
5. **Seeds Services** - Adds 4 professional services
6. **Seeds Coupons** - Adds 3 active coupons

## Safety Features

- **Idempotent** - Can run multiple times safely
- **No Duplicates** - Checks for existing items before creating
- **Preserves Data** - Won't overwrite existing data
- **Admin Creation** - Creates admin user if doesn't exist

## Admin Credentials

After seeding, you can login with:

```
Email: admin@letscrackdev.com
Password: Admin@123
```

**⚠️ Important:** Change the admin password after first login in production!

## Verification

After seeding, verify the data:

1. **Check Resources:**

   ```bash
   # Use your API or MongoDB client
   GET /api/v1/resources
   ```

2. **Check Courses:**

   ```bash
   GET /api/v1/courses
   ```

3. **Check Services:**

   ```bash
   GET /api/v1/services
   ```

4. **Check Coupons:**
   ```bash
   GET /api/v1/coupons
   ```

## Frontend Display

Once seeded, the frontend will automatically display:

- ✅ Resources page with all documentation links
- ✅ Courses page with all courses
- ✅ Premium page with services
- ✅ Checkout with coupon functionality

## Customization

To add your own data, edit `src/scripts/seedDatabase.ts`:

1. Add more resources to `realResources` array
2. Add more courses to `realCourses` array
3. Add more services to `realServices` array
4. Add more coupons to `realCoupons` array

Then run `npm run seed` again.

## Troubleshooting

### "MONGODB_URI not defined"

- Make sure `.env` file exists in backend directory
- Add `MONGODB_URI=your_connection_string`

### "Connection failed"

- Check MongoDB is running
- Verify connection string is correct
- Check network/firewall settings

### "User already exists"

- This is normal if you've run the script before
- The script will skip existing items

## Notes

- All data is created by the admin user
- Resources use real documentation URLs
- Courses include placeholder video URLs (update with real videos)
- Services are ready for production use
- Coupons are active and ready to use

---

**Last Updated:** Database seeding script ready for use ✅
