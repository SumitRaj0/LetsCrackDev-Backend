/**
 * Chatbot Flow Integration Tests
 * Tests chatbot messaging flow end-to-end
 */

import request from 'supertest'
import app from '../../app'
import {
  createTestUser,
  cleanupTestData,
  generateTestEmail,
  authenticatedRequest,
} from './testHelpers'

describe('Chatbot Flow - Integration Tests', () => {
  let regularUser: { accessToken: string; id: string }

  beforeEach(async () => {
    await cleanupTestData()
    regularUser = await createTestUser(
      generateTestEmail('user'),
      'Test@1234',
      'Regular User',
      'user',
    )
  })

  afterEach(async () => {
    await cleanupTestData()
  })

  describe('Chat Message Flow', () => {
    test('TC-CHATBOT-FLOW-001: Send message → receive response', async () => {
      const response = await authenticatedRequest(
        'post',
        '/api/v1/chatbot/chat',
        regularUser.accessToken,
      )
        .send({
          message: 'What is JavaScript?',
        })
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.reply).toBeDefined()
      expect(typeof response.body.data.reply).toBe('string')
      expect(response.body.data.reply.length).toBeGreaterThan(0)
    })

    test('TC-CHATBOT-FLOW-002: Send message with conversation history', async () => {
      // First message
      const firstResponse = await authenticatedRequest(
        'post',
        '/api/v1/chatbot/chat',
        regularUser.accessToken,
      )
        .send({
          message: 'What is React?',
        })
        .expect(200)

      expect(firstResponse.body.success).toBe(true)
      const firstReply = firstResponse.body.data.reply

      // Second message with history
      const secondResponse = await authenticatedRequest(
        'post',
        '/api/v1/chatbot/chat',
        regularUser.accessToken,
      )
        .send({
          message: 'Can you tell me more about it?',
          history: [
            { role: 'user', content: 'What is React?' },
            { role: 'assistant', content: firstReply },
          ],
        })
        .expect(200)

      expect(secondResponse.body.success).toBe(true)
      expect(secondResponse.body.data.reply).toBeDefined()
      expect(typeof secondResponse.body.data.reply).toBe('string')
    })

    test('TC-CHATBOT-FLOW-003: Multiple message conversation flow', async () => {
      const history: Array<{ role: string; content: string }> = []

      // Message 1
      const msg1Response = await authenticatedRequest(
        'post',
        '/api/v1/chatbot/chat',
        regularUser.accessToken,
      )
        .send({
          message: 'Explain async/await in JavaScript',
          history,
        })
        .expect(200)

      expect(msg1Response.body.success).toBe(true)
      history.push({ role: 'user', content: 'Explain async/await in JavaScript' })
      history.push({ role: 'assistant', content: msg1Response.body.data.reply })

      // Message 2
      const msg2Response = await authenticatedRequest(
        'post',
        '/api/v1/chatbot/chat',
        regularUser.accessToken,
      )
        .send({
          message: 'How does it differ from promises?',
          history,
        })
        .expect(200)

      expect(msg2Response.body.success).toBe(true)
      history.push({ role: 'user', content: 'How does it differ from promises?' })
      history.push({ role: 'assistant', content: msg2Response.body.data.reply })

      // Message 3
      const msg3Response = await authenticatedRequest(
        'post',
        '/api/v1/chatbot/chat',
        regularUser.accessToken,
      )
        .send({
          message: 'Give me an example',
          history,
        })
        .expect(200)

      expect(msg3Response.body.success).toBe(true)
      expect(msg3Response.body.data.reply).toBeDefined()
    })

    test('TC-CHATBOT-FLOW-004: Chat requires authentication', async () => {
      await request(app)
        .post('/api/v1/chatbot/chat')
        .send({
          message: 'Test message',
        })
        .expect(401)
    })

    test('TC-CHATBOT-FLOW-005: Empty message validation', async () => {
      await authenticatedRequest('post', '/api/v1/chatbot/chat', regularUser.accessToken)
        .send({
          message: '',
        })
        .expect(400)
    })

    test('TC-CHATBOT-FLOW-006: Missing message field', async () => {
      await authenticatedRequest('post', '/api/v1/chatbot/chat', regularUser.accessToken)
        .send({})
        .expect(400)
    })

    test('TC-CHATBOT-FLOW-007: Long message handling', async () => {
      const longMessage = 'Explain JavaScript in detail. '.repeat(100) // Very long message

      const response = await authenticatedRequest(
        'post',
        '/api/v1/chatbot/chat',
        regularUser.accessToken,
      ).send({
        message: longMessage,
      })

      // Should either succeed or return appropriate error (400/429/500)
      expect([200, 400, 429, 500]).toContain(response.status)
    })

    test('TC-CHATBOT-FLOW-008: Rate limiting behavior', async () => {
      // Send multiple messages rapidly
      const messages = Array.from({ length: 15 }, (_, i) => `Test message ${i + 1}`)

      const responses = await Promise.all(
        messages.map((msg) =>
          authenticatedRequest('post', '/api/v1/chatbot/chat', regularUser.accessToken).send({
            message: msg,
          }),
        ),
      )

      // Some requests should succeed, some may be rate limited (429)
      // The exact behavior depends on rate limit configuration
      const statusCodes = responses.map((r) => r.status)
      expect(statusCodes).toContain(200) // At least some should succeed

      // If rate limited, should get 429
      if (statusCodes.includes(429)) {
        const rateLimitedResponse = responses.find((r) => r.status === 429)
        expect(rateLimitedResponse?.body.error || rateLimitedResponse?.body.message).toBeDefined()
      }
    })
  })

  describe('Chatbot Error Handling', () => {
    test('TC-CHATBOT-FLOW-009: Handles invalid history format gracefully', async () => {
      // History with invalid role
      const response = await authenticatedRequest(
        'post',
        '/api/v1/chatbot/chat',
        regularUser.accessToken,
      ).send({
        message: 'Test message',
        history: [
          { role: 'invalid_role', content: 'Previous message' },
          { role: 'user', content: 'User message' },
        ],
      })

      // Should either filter invalid history or return error
      expect([200, 400]).toContain(response.status)
    })

    test('TC-CHATBOT-FLOW-010: Handles missing content in history', async () => {
      const response = await authenticatedRequest(
        'post',
        '/api/v1/chatbot/chat',
        regularUser.accessToken,
      ).send({
        message: 'Test message',
        history: [{ role: 'user' }, { role: 'assistant', content: 'Reply' }],
      })

      // Should filter out messages without content or return error
      expect([200, 400]).toContain(response.status)
    })
  })
})
