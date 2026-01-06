/**
 * Interview Kit Question Model
 * Stores interview questions for premium services (e.g., JavaScript Interview Mastery Kit)
 */

import mongoose, { Document, Schema } from 'mongoose'

export interface CoreConcept {
  content: string
}

export interface HowItWorks {
  items: string[]
}

export interface InterviewReadyAnswer {
  content: string
}

export interface VisualUnderstanding {
  diagram?: string
  description?: string
}

export interface InterviewerLens {
  followUpQuestions?: string[]
  edgeCases?: string[]
  whatIfScenarios?: string[]
}

export interface MistakesSection {
  wrongMentalModels?: string[]
  redFlagAnswers?: string[]
  overEngineeringMistakes?: string[]
}

export interface InterviewKitQuestionDocument extends Document {
  serviceId: mongoose.Types.ObjectId
  questionId: string // e.g., "1", "2", etc.
  title: string
  coreConcept: CoreConcept
  howItWorks: HowItWorks
  interviewReadyAnswer: InterviewReadyAnswer
  visualUnderstanding?: VisualUnderstanding
  interviewerLens?: InterviewerLens
  mistakes?: MistakesSection
  order: number // For sorting questions in order
  createdAt: Date
  updatedAt: Date
}

const CoreConceptSchema = new Schema<CoreConcept>(
  {
    content: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { _id: false },
)

const HowItWorksSchema = new Schema<HowItWorks>(
  {
    items: {
      type: [String],
      required: true,
      default: [],
    },
  },
  { _id: false },
)

const InterviewReadyAnswerSchema = new Schema<InterviewReadyAnswer>(
  {
    content: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { _id: false },
)

const VisualUnderstandingSchema = new Schema<VisualUnderstanding>(
  {
    diagram: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
  },
  { _id: false },
)

const InterviewerLensSchema = new Schema<InterviewerLens>(
  {
    followUpQuestions: {
      type: [String],
      default: [],
    },
    edgeCases: {
      type: [String],
      default: [],
    },
    whatIfScenarios: {
      type: [String],
      default: [],
    },
  },
  { _id: false },
)

const MistakesSectionSchema = new Schema<MistakesSection>(
  {
    wrongMentalModels: {
      type: [String],
      default: [],
    },
    redFlagAnswers: {
      type: [String],
      default: [],
    },
    overEngineeringMistakes: {
      type: [String],
      default: [],
    },
  },
  { _id: false },
)

const InterviewKitQuestionSchema = new Schema<InterviewKitQuestionDocument>(
  {
    serviceId: {
      type: Schema.Types.ObjectId,
      ref: 'Service',
      required: true,
      index: true,
    },
    questionId: {
      type: String,
      required: true,
      trim: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    coreConcept: {
      type: CoreConceptSchema,
      required: true,
    },
    howItWorks: {
      type: HowItWorksSchema,
      required: true,
    },
    interviewReadyAnswer: {
      type: InterviewReadyAnswerSchema,
      required: true,
    },
    visualUnderstanding: {
      type: VisualUnderstandingSchema,
    },
    interviewerLens: {
      type: InterviewerLensSchema,
    },
    mistakes: {
      type: MistakesSectionSchema,
    },
    order: {
      type: Number,
      required: true,
      default: 0,
    },
  },
  { timestamps: true },
)

// Compound index: serviceId + questionId should be unique
InterviewKitQuestionSchema.index({ serviceId: 1, questionId: 1 }, { unique: true })

// Index for ordering
InterviewKitQuestionSchema.index({ serviceId: 1, order: 1 })

export const InterviewKitQuestion = mongoose.model<InterviewKitQuestionDocument>(
  'InterviewKitQuestion',
  InterviewKitQuestionSchema,
)
