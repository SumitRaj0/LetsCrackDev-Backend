/**
 * Script to promote a user to admin role
 * Usage: npx ts-node src/scripts/makeAdmin.ts <user-email>
 */

import dotenv from 'dotenv'
import mongoose from 'mongoose'
import { User } from '../modules/auth/user.model'
import connectDB from '../config/db'

dotenv.config()

const makeAdmin = async (email: string) => {
  try {
    await connectDB()

    const user = await User.findOne({ email: email.toLowerCase().trim() })

    if (!user) {
      console.error(`❌ User with email "${email}" not found`)
      process.exit(1)
    }

    if (user.role === 'admin') {
      console.log(`✅ User "${email}" is already an admin`)
      await mongoose.connection.close()
      process.exit(0)
    }

    user.role = 'admin'
    await user.save()

    console.log(`✅ Successfully promoted "${email}" to admin role`)
    await mongoose.connection.close()
    process.exit(0)
  } catch (error) {
    console.error('❌ Error:', error)
    await mongoose.connection.close()
    process.exit(1)
  }
}

const email = process.argv[2]

if (!email) {
  console.error('❌ Please provide an email address')
  console.log('Usage: npx ts-node src/scripts/makeAdmin.ts <user-email>')
  process.exit(1)
}

makeAdmin(email)

