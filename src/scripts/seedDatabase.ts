/**
 * Database Seed Script
 * Populates database with services only
 * Usage: npx ts-node src/scripts/seedDatabase.ts
 */

import dotenv from 'dotenv'
import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import { User } from '../modules/auth/user.model'
import { Resource } from '../modules/resources/resource.model'
import { Course } from '../modules/courses/course.model'
import { Service } from '../modules/services/service.model'
import { Coupon } from '../modules/coupons/coupon.model'
import connectDB from '../config/db'

dotenv.config()

// Services only - all other data removed
const realServices = [
  {
    name: 'ATS Resume Service',
    description:
      'Get your resume professionally reviewed and optimized for ATS (Applicant Tracking Systems). Includes keyword optimization, formatting improvements, and industry-specific enhancements. Perfect for developers looking to pass ATS filters and land more interviews.',
    price: 99,
    category: 'resume' as const,
    slug: 'ats-resume-service',
    deliverables: [
      'ATS-optimized resume review',
      'Keyword enhancement for tech roles',
      'Formatting improvements',
      'Industry-specific optimizations',
      'Cover letter template',
    ],
    availability: true,
  },
  {
    name: 'JavaScript Interview Mastery Kit',
    description:
      'Crack Any JavaScript Interview with Confidence. JavaScript Interview Mastery Kit is a practical, interview-focused preparation kit designed for developers who want to clear JavaScript interviews, not just learn theory. This kit focuses on what interviewers actually ask, how they expect you to answer, and how to handle follow-up questions. Perfect for freshers preparing for their first JavaScript interview, frontend developers (React/Angular/Vue), full-stack developers (MERN/MEAN), developers with 1–4 years experience stuck in interviews, and anyone who knows JavaScript but struggles to explain it in interviews.',
    price: 149,
    category: 'interview' as const,
    slug: 'javascript-interview-mastery-kit',
    deliverables: [
      '40–50 Curated Interview Questions from startups, product companies, and senior-level interviews',
      'Interview-Ready Answers with clear definitions, simple explanations, and one-liner summaries',
      'Real-World Examples: closures in apps, async APIs, event loop behavior, and common bugs',
      'Common Follow-Up Questions preparation to handle "explain more" and "why is this better?"',
      'Mistakes Interviewers Look For - Learn common wrong answers and red flags to avoid',
      'Coverage: fundamentals, scope, hoisting, closures, this/bind, promises, async/await, event loop',
      'Topics: objects, prototypes, inheritance, performance concepts, and debugging scenarios',
    ],
    availability: true,
  },
  {
    name: 'Frontend React Interview Preparation Kit',
    description:
      'Master React interviews with confidence. This comprehensive kit covers React fundamentals, hooks, state management, performance optimization, and advanced patterns. Perfect for frontend developers preparing for React-focused interviews at top tech companies.',
    price: 149,
    category: 'interview' as const,
    slug: 'frontend-react-interview-preparation-kit',
    deliverables: [
      '50+ React interview questions with detailed answers',
      'Hooks deep dive: useState, useEffect, useContext, custom hooks',
      'State management patterns: Redux, Context API, Zustand',
      'Performance optimization techniques and best practices',
      'Component lifecycle and rendering optimization',
      'React Router and navigation patterns',
      'Testing strategies for React applications',
    ],
    availability: true,
  },
  {
    name: 'Node.js Mastery Kit',
    description:
      'Complete Node.js interview preparation kit. Master backend development concepts, async programming, event loop, streams, and production-ready patterns. Perfect for full-stack and backend developers preparing for Node.js interviews.',
    price: 299,
    category: 'interview' as const,
    slug: 'node-mastery-kit',
    deliverables: [
      'Node.js core concepts and event loop deep dive',
      'Async programming patterns: callbacks, promises, async/await',
      'Express.js framework mastery and best practices',
      'Database integration: MongoDB, PostgreSQL, Redis',
      'Authentication and security best practices',
      'Performance optimization and scaling strategies',
      'Production deployment and DevOps practices',
    ],
    availability: true,
  },
  {
    name: 'Full Frontend Preparation Kit',
    description:
      'Complete frontend interview preparation bundle. This comprehensive kit combines React, JavaScript, HTML/CSS, and frontend architecture concepts. Perfect for developers preparing for frontend engineering roles at top companies. Includes everything you need to ace frontend interviews.',
    price: 399,
    category: 'interview' as const,
    slug: 'full-frontend-preparation-kit',
    deliverables: [
      'JavaScript Interview Mastery Kit (included)',
      'Frontend React Interview Preparation Kit (included)',
      'HTML/CSS advanced concepts and responsive design',
      'Frontend architecture and design patterns',
      'Build tools: Webpack, Vite, and modern tooling',
      'State management: Redux, Context API, and alternatives',
      'Performance optimization and bundle size reduction',
      'Accessibility (a11y) and SEO best practices',
      'Testing strategies: Jest, React Testing Library',
      'System design for frontend applications',
    ],
    availability: true,
  },
]

const seedDatabase = async () => {
  try {
    console.log('🌱 Starting database seeding...')

    // Connect to database
    await connectDB()
    console.log('✅ Connected to database')

    // Create or get admin user
    let adminUser = await User.findOne({ email: 'admin@letscrackdev.com' })

    if (!adminUser) {
      const hashedPassword = await bcrypt.hash('Admin@123', 10)
      adminUser = await User.create({
        name: 'Admin User',
        email: 'admin@letscrackdev.com',
        passwordHash: hashedPassword,
        role: 'admin',
        isPremium: true,
      })
      console.log('✅ Created admin user: admin@letscrackdev.com')
    } else {
      // Ensure user is admin
      if (adminUser.role !== 'admin') {
        adminUser.role = 'admin'
        await adminUser.save()
        console.log('✅ Updated user to admin role')
      } else {
        console.log('✅ Admin user already exists')
      }
    }

    // Delete all existing resources, courses, and coupons
    console.log('\n🗑️  Cleaning up existing data...')

    const resourcesDeleted = await Resource.deleteMany({})
    console.log(`  ✅ Deleted ${resourcesDeleted.deletedCount} resources`)

    const coursesDeleted = await Course.deleteMany({})
    console.log(`  ✅ Deleted ${coursesDeleted.deletedCount} courses`)

    const couponsDeleted = await Coupon.deleteMany({})
    console.log(`  ✅ Deleted ${couponsDeleted.deletedCount} coupons`)

    // Delete all existing services
    const servicesDeleted = await Service.deleteMany({})
    console.log(`  ✅ Deleted ${servicesDeleted.deletedCount} existing services`)

    // Seed Services only
    console.log('\n💼 Seeding services...')
    let servicesCreated = 0
    let servicesUpdated = 0

    for (const serviceData of realServices) {
      const existing = await Service.findOne({ slug: serviceData.slug })

      if (!existing) {
        await Service.create({
          ...serviceData,
          createdBy: adminUser._id,
        })
        servicesCreated++
        console.log(`  ✅ Created: ${serviceData.name} - ₹${serviceData.price}`)
      } else {
        // Update existing service
        existing.name = serviceData.name
        existing.description = serviceData.description
        existing.price = serviceData.price
        existing.category = serviceData.category
        existing.deliverables = serviceData.deliverables
        existing.availability = serviceData.availability
        await existing.save()
        servicesUpdated++
        console.log(`  🔄 Updated: ${serviceData.name} - ₹${serviceData.price}`)
      }
    }

    console.log(`\n✅ Services seeding completed:`)
    console.log(`  - Created: ${servicesCreated}`)
    console.log(`  - Updated: ${servicesUpdated}`)

    console.log('\n🎉 Database seeding completed successfully!')
    console.log('\n📊 Summary:')
    console.log(`  - Resources: ${resourcesDeleted.deletedCount} deleted (none created)`)
    console.log(`  - Courses: ${coursesDeleted.deletedCount} deleted (none created)`)
    console.log(
      `  - Services: ${servicesDeleted.deletedCount} deleted, ${servicesCreated} created, ${servicesUpdated} updated`,
    )
    console.log(`  - Coupons: ${couponsDeleted.deletedCount} deleted (none created)`)
    console.log(`\n👤 Admin Login:`)
    console.log(`  Email: admin@letscrackdev.com`)
    console.log(`  Password: Admin@123`)

    await mongoose.connection.close()
    process.exit(0)
  } catch (error) {
    console.error('❌ Error seeding database:', error)
    await mongoose.connection.close()
    process.exit(1)
  }
}

seedDatabase()
