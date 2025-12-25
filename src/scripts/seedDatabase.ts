/**
 * Database Seed Script
 * Populates database with real resources, courses, and services
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

// Real documentation resources
const realResources = [
  {
    title: 'MDN Web Docs - JavaScript',
    description:
      'Comprehensive JavaScript documentation and guides. The most trusted resource for web developers learning JavaScript, covering everything from basics to advanced topics.',
    category: 'JavaScript',
    tags: ['javascript', 'documentation', 'web-development', 'mdn'],
    link: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript',
    thumbnail: 'https://developer.mozilla.org/favicon-48x48.png',
    difficulty: 'beginner' as const,
  },
  {
    title: 'React Official Documentation',
    description:
      'Official React documentation with guides, API reference, and tutorials. Learn React from the creators themselves.',
    category: 'React',
    tags: ['react', 'frontend', 'documentation', 'javascript'],
    link: 'https://react.dev',
    thumbnail: 'https://react.dev/favicon.ico',
    difficulty: 'beginner' as const,
  },
  {
    title: 'Node.js Official Documentation',
    description:
      'Complete Node.js API documentation and guides. Everything you need to build server-side applications with Node.js.',
    category: 'Node.js',
    tags: ['nodejs', 'backend', 'server', 'documentation'],
    link: 'https://nodejs.org/docs',
    thumbnail: 'https://nodejs.org/static/images/favicons/favicon.ico',
    difficulty: 'intermediate' as const,
  },
  {
    title: 'TypeScript Handbook',
    description:
      'Complete TypeScript documentation covering types, interfaces, generics, and advanced patterns. Essential for modern JavaScript development.',
    category: 'TypeScript',
    tags: ['typescript', 'documentation', 'types', 'javascript'],
    link: 'https://www.typescriptlang.org/docs',
    thumbnail: 'https://www.typescriptlang.org/favicon.ico',
    difficulty: 'intermediate' as const,
  },
  {
    title: 'Vue.js Official Guide',
    description:
      'Official Vue.js documentation and guide. Progressive JavaScript framework for building user interfaces.',
    category: 'Vue.js',
    tags: ['vue', 'frontend', 'framework', 'documentation'],
    link: 'https://vuejs.org/guide',
    thumbnail: 'https://vuejs.org/logo.svg',
    difficulty: 'beginner' as const,
  },
  {
    title: 'Express.js API Reference',
    description:
      'Fast, unopinionated, minimalist web framework for Node.js. Complete API documentation and guides.',
    category: 'Express',
    tags: ['express', 'nodejs', 'backend', 'api'],
    link: 'https://expressjs.com/en/api.html',
    thumbnail: 'https://expressjs.com/images/favicon.png',
    difficulty: 'intermediate' as const,
  },
  {
    title: 'MongoDB Documentation',
    description:
      'Complete MongoDB documentation including guides, tutorials, and API reference. Learn NoSQL database management.',
    category: 'Database',
    tags: ['mongodb', 'database', 'nosql', 'documentation'],
    link: 'https://www.mongodb.com/docs',
    thumbnail: 'https://www.mongodb.com/assets/images/global/favicon.ico',
    difficulty: 'intermediate' as const,
  },
  {
    title: 'PostgreSQL Documentation',
    description:
      "Official PostgreSQL documentation. Comprehensive guide to the world's most advanced open-source relational database.",
    category: 'Database',
    tags: ['postgresql', 'database', 'sql', 'documentation'],
    link: 'https://www.postgresql.org/docs',
    thumbnail: 'https://www.postgresql.org/favicon.ico',
    difficulty: 'intermediate' as const,
  },
  {
    title: 'Tailwind CSS Documentation',
    description:
      'Utility-first CSS framework documentation. Rapidly build modern websites without ever leaving your HTML.',
    category: 'CSS',
    tags: ['tailwind', 'css', 'styling', 'frontend'],
    link: 'https://tailwindcss.com/docs',
    thumbnail: 'https://tailwindcss.com/favicon.ico',
    difficulty: 'beginner' as const,
  },
  {
    title: 'Git Documentation',
    description: 'Official Git documentation and reference. Learn version control from the source.',
    category: 'Tools',
    tags: ['git', 'version-control', 'tools', 'documentation'],
    link: 'https://git-scm.com/doc',
    thumbnail: 'https://git-scm.com/favicon.ico',
    difficulty: 'beginner' as const,
  },
  {
    title: 'Docker Documentation',
    description:
      'Complete Docker documentation. Learn containerization and deploy applications with Docker.',
    category: 'DevOps',
    tags: ['docker', 'containers', 'devops', 'deployment'],
    link: 'https://docs.docker.com',
    thumbnail: 'https://docs.docker.com/favicon.ico',
    difficulty: 'advanced' as const,
  },
  {
    title: 'AWS Documentation',
    description:
      'Amazon Web Services documentation. Comprehensive guides for cloud computing services.',
    category: 'Cloud',
    tags: ['aws', 'cloud', 'devops', 'documentation'],
    link: 'https://docs.aws.amazon.com',
    thumbnail: 'https://aws.amazon.com/favicon.ico',
    difficulty: 'advanced' as const,
  },
  {
    title: 'Next.js Documentation',
    description:
      'The React Framework for Production. Learn Next.js with comprehensive guides and API reference.',
    category: 'React',
    tags: ['nextjs', 'react', 'framework', 'ssr'],
    link: 'https://nextjs.org/docs',
    thumbnail: 'https://nextjs.org/favicon.ico',
    difficulty: 'intermediate' as const,
  },
  {
    title: 'GraphQL Documentation',
    description: 'GraphQL query language documentation. Learn to build APIs with GraphQL.',
    category: 'API',
    tags: ['graphql', 'api', 'query-language', 'documentation'],
    link: 'https://graphql.org/learn',
    thumbnail: 'https://graphql.org/img/favicon.png',
    difficulty: 'intermediate' as const,
  },
  {
    title: 'REST API Best Practices',
    description:
      'RESTful API design best practices and guidelines. Learn to build robust REST APIs.',
    category: 'API',
    tags: ['rest', 'api', 'backend', 'best-practices'],
    link: 'https://restfulapi.net',
    thumbnail: 'https://restfulapi.net/favicon.ico',
    difficulty: 'intermediate' as const,
  },
]

// Real courses with actual content
const realCourses = [
  {
    title: 'Complete JavaScript Mastery',
    description:
      'Master JavaScript from fundamentals to advanced concepts. Learn ES6+, async/await, closures, promises, and modern JavaScript patterns. Build real-world projects and become a JavaScript expert.',
    thumbnail: 'https://via.placeholder.com/400x300/4F46E5/FFFFFF?text=JavaScript+Mastery',
    lessons: [
      {
        title: 'JavaScript Fundamentals',
        description: 'Learn variables, data types, operators, and basic syntax',
        videoUrl: 'https://www.youtube.com/watch?v=W6NZfCO5SIk',
        freePreview: true,
        duration: 45,
        order: 1,
      },
      {
        title: 'Functions and Scope',
        description: 'Understanding functions, arrow functions, and scope in JavaScript',
        videoUrl: 'https://www.youtube.com/watch?v=Mus_vwhTCq0',
        freePreview: true,
        duration: 50,
        order: 2,
      },
      {
        title: 'Arrays and Objects',
        description: 'Working with arrays, objects, and array methods',
        videoUrl: 'https://www.youtube.com/watch?v=hdI2bqOjy3c',
        freePreview: false,
        duration: 60,
        order: 3,
      },
      {
        title: 'ES6+ Features',
        description: 'Destructuring, spread operator, template literals, and more',
        videoUrl: 'https://www.youtube.com/watch?v=NCwa_xi0Uuc',
        freePreview: false,
        duration: 55,
        order: 4,
      },
      {
        title: 'Async JavaScript',
        description: 'Promises, async/await, and handling asynchronous operations',
        videoUrl: 'https://www.youtube.com/watch?v=PoRJizFvM7s',
        freePreview: false,
        duration: 70,
        order: 5,
      },
    ],
    price: 2999,
    difficulty: 'beginner' as const,
    category: 'JavaScript',
    isPremium: true,
  },
  {
    title: 'React Complete Guide',
    description:
      'Learn React from scratch to advanced. Build modern web applications with React hooks, context API, routing, and state management. Includes real-world projects.',
    thumbnail: 'https://via.placeholder.com/400x300/61DAFB/000000?text=React+Guide',
    lessons: [
      {
        title: 'React Basics',
        description: 'Introduction to React, JSX, components, and props',
        videoUrl: 'https://www.youtube.com/watch?v=SqcY0GlETPk',
        freePreview: true,
        duration: 40,
        order: 1,
      },
      {
        title: 'State and Events',
        description: 'Understanding state, setState, and event handling',
        videoUrl: 'https://www.youtube.com/watch?v=4pO-HcG2igk',
        freePreview: true,
        duration: 45,
        order: 2,
      },
      {
        title: 'React Hooks',
        description: 'useState, useEffect, useContext, and custom hooks',
        videoUrl: 'https://www.youtube.com/watch?v=TNhaISOUy6Q',
        freePreview: false,
        duration: 60,
        order: 3,
      },
      {
        title: 'React Router',
        description: 'Client-side routing with React Router',
        videoUrl: 'https://www.youtube.com/watch?v=Law7wfdg_ls',
        freePreview: false,
        duration: 50,
        order: 4,
      },
      {
        title: 'State Management',
        description: 'Redux, Context API, and state management patterns',
        videoUrl: 'https://www.youtube.com/watch?v=CVpUuw9XSjY',
        freePreview: false,
        duration: 65,
        order: 5,
      },
    ],
    price: 3999,
    difficulty: 'intermediate' as const,
    category: 'React',
    isPremium: true,
  },
  {
    title: 'Node.js Backend Development',
    description:
      'Build scalable backend applications with Node.js and Express. Learn REST APIs, authentication, database integration, and deployment strategies.',
    thumbnail: 'https://via.placeholder.com/400x300/339933/FFFFFF?text=Node.js+Backend',
    lessons: [
      {
        title: 'Node.js Fundamentals',
        description: 'Introduction to Node.js, npm, and the Node.js ecosystem',
        videoUrl: 'https://www.youtube.com/watch?v=TlB_eWDSMt4',
        freePreview: true,
        duration: 50,
        order: 1,
      },
      {
        title: 'Express.js Basics',
        description: 'Building REST APIs with Express.js',
        videoUrl: 'https://www.youtube.com/watch?v=L72fhGm1tfE',
        freePreview: true,
        duration: 55,
        order: 2,
      },
      {
        title: 'Database Integration',
        description: 'Connecting to MongoDB and PostgreSQL',
        videoUrl: 'https://www.youtube.com/watch?v=WDrU305J1yw',
        freePreview: false,
        duration: 70,
        order: 3,
      },
      {
        title: 'Authentication & Security',
        description: 'JWT authentication, password hashing, and security best practices',
        videoUrl: 'https://www.youtube.com/watch?v=Ud5xKCYQTjM',
        freePreview: false,
        duration: 65,
        order: 4,
      },
      {
        title: 'Deployment & DevOps',
        description: 'Deploying Node.js applications and CI/CD pipelines',
        videoUrl: 'https://www.youtube.com/watch?v=0mQbxF-_1-M',
        freePreview: false,
        duration: 60,
        order: 5,
      },
    ],
    price: 3499,
    difficulty: 'intermediate' as const,
    category: 'Node.js',
    isPremium: true,
  },
  {
    title: 'TypeScript for JavaScript Developers',
    description:
      'Master TypeScript and build type-safe applications. Learn types, interfaces, generics, and advanced TypeScript patterns.',
    thumbnail: 'https://via.placeholder.com/400x300/3178C6/FFFFFF?text=TypeScript',
    lessons: [
      {
        title: 'TypeScript Basics',
        description: 'Introduction to TypeScript, types, and type annotations',
        videoUrl: 'https://www.youtube.com/watch?v=ahCwqrYpIuM',
        freePreview: true,
        duration: 45,
        order: 1,
      },
      {
        title: 'Interfaces and Types',
        description: 'Creating interfaces, type aliases, and complex types',
        videoUrl: 'https://www.youtube.com/watch?v=2lVKiG1y66E',
        freePreview: true,
        duration: 50,
        order: 2,
      },
      {
        title: 'Generics',
        description: 'Understanding and using TypeScript generics',
        videoUrl: 'https://www.youtube.com/watch?v=nViEqpgwxHE',
        freePreview: false,
        duration: 55,
        order: 3,
      },
      {
        title: 'Advanced Types',
        description: 'Union types, intersection types, and type guards',
        videoUrl: 'https://www.youtube.com/watch?v=O6A-u_FoEX8',
        freePreview: false,
        duration: 60,
        order: 4,
      },
      {
        title: 'TypeScript with React',
        description: 'Using TypeScript in React applications',
        videoUrl: 'https://www.youtube.com/watch?v=FJDVKeh7RJI',
        freePreview: false,
        duration: 65,
        order: 5,
      },
    ],
    price: 2799,
    difficulty: 'intermediate' as const,
    category: 'TypeScript',
    isPremium: true,
  },
  {
    title: 'Full Stack Development Bootcamp',
    description:
      'Complete full-stack development course covering frontend, backend, databases, and deployment. Build real-world projects from scratch.',
    thumbnail: 'https://via.placeholder.com/400x300/FF6B6B/FFFFFF?text=Full+Stack',
    lessons: [
      {
        title: 'Frontend Fundamentals',
        description: 'HTML, CSS, JavaScript, and modern frontend frameworks',
        videoUrl: 'https://www.youtube.com/watch?v=zJSY8tbf_ys',
        freePreview: true,
        duration: 90,
        order: 1,
      },
      {
        title: 'Backend Development',
        description: 'Server-side development with Node.js and Express',
        videoUrl: 'https://www.youtube.com/watch?v=Oe421EPjeBE',
        freePreview: true,
        duration: 85,
        order: 2,
      },
      {
        title: 'Database Design',
        description: 'SQL and NoSQL databases, data modeling, and queries',
        videoUrl: 'https://www.youtube.com/watch?v=ztHopE5Wnpc',
        freePreview: false,
        duration: 100,
        order: 3,
      },
      {
        title: 'Authentication & Authorization',
        description: 'Implementing secure authentication and authorization',
        videoUrl: 'https://www.youtube.com/watch?v=F-sFp_AvHc8',
        freePreview: false,
        duration: 95,
        order: 4,
      },
      {
        title: 'Deployment & Production',
        description: 'Deploying applications and production best practices',
        videoUrl: 'https://www.youtube.com/watch?v=ykB0YMyj6sE',
        freePreview: false,
        duration: 80,
        order: 5,
      },
    ],
    price: 4999,
    difficulty: 'advanced' as const,
    category: 'Full Stack',
    isPremium: true,
  },
]

// Real services
const realServices = [
  {
    name: 'Resume Review & Optimization',
    description:
      'Get your resume professionally reviewed and optimized for tech roles. Includes ATS optimization, keyword enhancement, and formatting improvements. Perfect for developers looking to land their dream job.',
    price: 1999,
    category: 'resume' as const,
    slug: 'resume-review-optimization',
    deliverables: [
      'Professional resume review',
      'ATS optimization',
      'Keyword enhancement',
      'Formatting improvements',
      'Cover letter template',
    ],
    availability: true,
  },
  {
    name: 'Technical Interview Preparation',
    description:
      'One-on-one technical interview coaching. Practice coding problems, system design, and behavioral questions. Get personalized feedback and strategies to ace your interviews.',
    price: 2999,
    category: 'interview' as const,
    slug: 'technical-interview-preparation',
    deliverables: [
      'Mock technical interviews',
      'Coding problem practice',
      'System design guidance',
      'Behavioral interview prep',
      'Personalized feedback',
    ],
    availability: true,
  },
  {
    name: 'Career Mentorship Program',
    description:
      'Monthly mentorship sessions with experienced developers. Get guidance on career growth, skill development, and navigating the tech industry. Perfect for early to mid-level developers.',
    price: 4999,
    category: 'mentorship' as const,
    slug: 'career-mentorship-program',
    deliverables: [
      'Monthly 1-on-1 sessions',
      'Career roadmap planning',
      'Skill development guidance',
      'Industry insights',
      'Networking opportunities',
    ],
    availability: true,
  },
  {
    name: 'Portfolio Website Development',
    description:
      'Professional portfolio website built with modern technologies. Showcase your projects, skills, and experience. Includes responsive design, SEO optimization, and hosting setup.',
    price: 8999,
    category: 'portfolio' as const,
    slug: 'portfolio-website-development',
    deliverables: [
      'Custom portfolio website',
      'Responsive design',
      'SEO optimization',
      'Project showcase',
      'Hosting setup',
    ],
    availability: true,
  },
]

// Real coupons
const realCoupons = [
  {
    code: 'WELCOME20',
    discountType: 'percentage' as const,
    discountValue: 20,
    minPurchaseAmount: 1000,
    validFrom: new Date(),
    validUntil: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
    usageLimit: 100,
    usageCount: 0,
    applicableTo: 'all' as const,
    isActive: true,
    description: 'Welcome discount - 20% off on all purchases',
  },
  {
    code: 'STUDENT50',
    discountType: 'percentage' as const,
    discountValue: 50,
    minPurchaseAmount: 2000,
    maxDiscountAmount: 2000,
    validFrom: new Date(),
    validUntil: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000), // 180 days
    usageLimit: 50,
    usageCount: 0,
    applicableTo: 'course' as const,
    isActive: true,
    description: 'Student discount - 50% off on courses (max ₹2000)',
  },
  {
    code: 'FIRST500',
    discountType: 'fixed' as const,
    discountValue: 500,
    minPurchaseAmount: 2000,
    validFrom: new Date(),
    validUntil: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
    usageLimit: 200,
    usageCount: 0,
    applicableTo: 'all' as const,
    isActive: true,
    description: 'Flat ₹500 off on purchases above ₹2000',
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

    // Seed Resources
    console.log('\n📚 Seeding resources...')
    let resourcesCreated = 0
    for (const resourceData of realResources) {
      const existing = await Resource.findOne({ link: resourceData.link })
      if (!existing) {
        await Resource.create({
          ...resourceData,
          createdBy: adminUser._id,
        })
        resourcesCreated++
        console.log(`  ✅ Created: ${resourceData.title}`)
      } else {
        console.log(`  ⏭️  Skipped (exists): ${resourceData.title}`)
      }
    }
    console.log(`✅ Created ${resourcesCreated} new resources`)

    // Seed Courses
    console.log('\n🎓 Seeding courses...')
    let coursesCreated = 0
    for (const courseData of realCourses) {
      const existing = await Course.findOne({ title: courseData.title })
      if (!existing) {
        await Course.create({
          ...courseData,
          createdBy: adminUser._id,
        })
        coursesCreated++
        console.log(`  ✅ Created: ${courseData.title}`)
      } else {
        console.log(`  ⏭️  Skipped (exists): ${courseData.title}`)
      }
    }
    console.log(`✅ Created ${coursesCreated} new courses`)

    // Seed Services
    console.log('\n💼 Seeding services...')
    let servicesCreated = 0
    for (const serviceData of realServices) {
      const existing = await Service.findOne({ slug: serviceData.slug })
      if (!existing) {
        await Service.create({
          ...serviceData,
          createdBy: adminUser._id,
        })
        servicesCreated++
        console.log(`  ✅ Created: ${serviceData.name}`)
      } else {
        console.log(`  ⏭️  Skipped (exists): ${serviceData.name}`)
      }
    }
    console.log(`✅ Created ${servicesCreated} new services`)

    // Seed Coupons
    console.log('\n🎫 Seeding coupons...')
    let couponsCreated = 0
    for (const couponData of realCoupons) {
      const existing = await Coupon.findOne({ code: couponData.code })
      if (!existing) {
        await Coupon.create({
          ...couponData,
          createdBy: adminUser._id,
        })
        couponsCreated++
        console.log(`  ✅ Created: ${couponData.code}`)
      } else {
        console.log(`  ⏭️  Skipped (exists): ${couponData.code}`)
      }
    }
    console.log(`✅ Created ${couponsCreated} new coupons`)

    console.log('\n🎉 Database seeding completed successfully!')
    console.log('\n📊 Summary:')
    console.log(`  - Resources: ${resourcesCreated} created`)
    console.log(`  - Courses: ${coursesCreated} created`)
    console.log(`  - Services: ${servicesCreated} created`)
    console.log(`  - Coupons: ${couponsCreated} created`)
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
