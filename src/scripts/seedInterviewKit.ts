/**
 * Seed Interview Kit Questions
 * Loads questions from JSON file into MongoDB
 * Usage: npx ts-node src/scripts/seedInterviewKit.ts
 */

import dotenv from 'dotenv'
import mongoose from 'mongoose'
import fs from 'fs'
import path from 'path'
import { Service } from '../modules/services/service.model'
import { InterviewKitQuestion } from '../modules/interviewKits/interviewKitQuestion.model'
import connectDB from '../config/db'

dotenv.config()

interface QuestionFromJSON {
  id: string
  title: string
  coreConcept: { content: string }
  howItWorks: { items: string[] }
  interviewReadyAnswer: { content: string }
  visualUnderstanding?: { diagram?: string; description?: string }
  interviewerLens?: {
    followUpQuestions?: string[]
    edgeCases?: string[]
    whatIfScenarios?: string[]
  }
  mistakes?: {
    wrongMentalModels?: string[]
    redFlagAnswers?: string[]
    overEngineeringMistakes?: string[]
  }
}

const seedInterviewKit = async () => {
  try {
    console.log('🌱 Starting interview kit seeding...')

    // Connect to database
    await connectDB()
    console.log('✅ Connected to database')

    // Find the JavaScript Interview Mastery Kit service
    const service = await Service.findOne({ slug: 'javascript-interview-mastery-kit' })

    if (!service) {
      console.error('❌ Service "javascript-interview-mastery-kit" not found')
      console.log('💡 Please run seedDatabase.ts first to create services')
      await mongoose.connection.close()
      process.exit(1)
    }

    console.log(`✅ Found service: ${service.name} (${service._id})`)

    // Load questions from JSON file
    const jsonPath = path.join(
      __dirname,
      '../modules/interviewKits/data/javascript-interview-mastery-kit.json',
    )

    if (!fs.existsSync(jsonPath)) {
      console.error(`❌ JSON file not found: ${jsonPath}`)
      console.log('💡 Please run scripts/generate-interview-kit-json.js first')
      await mongoose.connection.close()
      process.exit(1)
    }

    const questionsData: QuestionFromJSON[] = JSON.parse(fs.readFileSync(jsonPath, 'utf8'))

    console.log(`📚 Loaded ${questionsData.length} questions from JSON`)

    // Delete existing questions for this service
    const deleted = await InterviewKitQuestion.deleteMany({ serviceId: service._id })
    console.log(`🗑️  Deleted ${deleted.deletedCount} existing questions`)

    // Insert questions
    console.log('\n💾 Inserting questions...')
    let inserted = 0
    let errors = 0

    for (let i = 0; i < questionsData.length; i++) {
      const q = questionsData[i]
      try {
        await InterviewKitQuestion.create({
          serviceId: service._id,
          questionId: q.id,
          title: q.title,
          coreConcept: q.coreConcept,
          howItWorks: q.howItWorks,
          interviewReadyAnswer: q.interviewReadyAnswer,
          visualUnderstanding: q.visualUnderstanding,
          interviewerLens: q.interviewerLens,
          mistakes: q.mistakes,
          order: i + 1, // 1-indexed order
        })
        inserted++
        if ((i + 1) % 10 === 0) {
          console.log(`  ✅ Inserted ${i + 1}/${questionsData.length} questions...`)
        }
      } catch (error: any) {
        errors++
        console.error(`  ❌ Error inserting question ${q.id}: ${error.message}`)
      }
    }

    console.log(`\n✅ Seeding completed:`)
    console.log(`  - Inserted: ${inserted}`)
    console.log(`  - Errors: ${errors}`)
    console.log(`  - Total: ${questionsData.length}`)

    // Verify count
    const count = await InterviewKitQuestion.countDocuments({ serviceId: service._id })
    console.log(`\n📊 Verification: ${count} questions in database for this service`)

    await mongoose.connection.close()
    process.exit(0)
  } catch (error) {
    console.error('❌ Error seeding interview kit:', error)
    await mongoose.connection.close()
    process.exit(1)
  }
}

seedInterviewKit()
