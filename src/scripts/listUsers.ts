/**
 * Script to list all users in the database
 * Usage: npx ts-node src/scripts/listUsers.ts
 */

import dotenv from 'dotenv'
import mongoose from 'mongoose'
import { User } from '../modules/auth/user.model'
import connectDB from '../config/db'

dotenv.config()

const listUsers = async () => {
  try {
    await connectDB()

    const users = await User.find({ deletedAt: null }).select('name email role createdAt')

    if (users.length === 0) {
      console.log('❌ No users found in the database')
      await mongoose.connection.close()
      process.exit(0)
    }

    console.log(`\n📋 Found ${users.length} user(s):\n`)
    users.forEach((user, index) => {
      console.log(`${index + 1}. Name: ${user.name}`)
      console.log(`   Email: ${user.email}`)
      console.log(`   Role: ${user.role}`)
      console.log(`   Created: ${user.createdAt}`)
      console.log('')
    })

    await mongoose.connection.close()
    process.exit(0)
  } catch (error) {
    console.error('❌ Error:', error)
    await mongoose.connection.close()
    process.exit(1)
  }
}

listUsers()

