/**
 * Script to reset a user's password
 * Usage: npx ts-node src/scripts/resetPassword.ts <user-email> <new-password>
 */

import dotenv from 'dotenv'
import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import { User } from '../modules/auth/user.model'
import connectDB from '../config/db'

dotenv.config()

const resetPassword = async (email: string, newPassword: string) => {
  try {
    await connectDB()

    const user = await User.findOne({ email: email.toLowerCase().trim() })

    if (!user) {
      console.error(`❌ User with email "${email}" not found`)
      await mongoose.connection.close()
      process.exit(1)
    }

    // Hash the new password
    const passwordHash = await bcrypt.hash(newPassword, 10)

    // Update user password
    user.passwordHash = passwordHash
    await user.save()

    console.log(`✅ Successfully reset password for "${email}"`)
    console.log(`   New password: ${newPassword}`)
    console.log(`   Role: ${user.role}`)
    await mongoose.connection.close()
    process.exit(0)
  } catch (error) {
    console.error('❌ Error:', error)
    await mongoose.connection.close()
    process.exit(1)
  }
}

const email = process.argv[2]
const password = process.argv[3]

if (!email || !password) {
  console.error('❌ Please provide both email and new password')
  console.log('Usage: npx ts-node src/scripts/resetPassword.ts <user-email> <new-password>')
  process.exit(1)
}

if (password.length < 6) {
  console.error('❌ Password must be at least 6 characters long')
  process.exit(1)
}

resetPassword(email, password)
