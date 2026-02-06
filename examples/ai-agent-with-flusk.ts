/**
 * AI Agent with Flusk - Complete E2E Example
 *
 * This example demonstrates how to:
 * 1. Wrap OpenAI client with Flusk SDK
 * 2. Make multiple LLM calls (some repeated)
 * 3. Trigger pattern analysis
 * 4. Get automation suggestions
 * 5. Display potential savings
 */

import OpenAI from 'openai'
import { FluskClient, wrapOpenAI } from '@flusk/sdk'
import 'dotenv/config'

async function main() {
  console.log('🚀 Starting Flusk E2E Example\n')

  // 1. Initialize Flusk client
  const flusk = new FluskClient({
    apiKey: process.env.FLUSK_API_KEY || 'test_org_key',
    baseUrl: process.env.FLUSK_BASE_URL || 'http://localhost:3000',
  })

  // 2. Wrap OpenAI client for automatic tracking
  const openai = wrapOpenAI(
    new OpenAI({ apiKey: process.env.OPENAI_API_KEY }),
    flusk
  )

  console.log('📊 Making LLM calls...\n')

  // 3. Simulate AI agent making various calls
  // Some repeated prompts to trigger pattern detection

  // Repeated prompt #1 - Simple math (should be detected as cacheable)
  console.log('  → Call 1-3: Repeated math question')
  for (let i = 0; i < 3; i++) {
    await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: 'What is 2+2?' }],
    })
    console.log(`    ✓ Call ${i + 1} completed`)
  }

  // Repeated prompt #2 - Common question (should also be detected)
  console.log('\n  → Call 4-5: Repeated general knowledge')
  for (let i = 0; i < 2; i++) {
    await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: 'What is the capital of France?',
        },
      ],
    })
    console.log(`    ✓ Call ${i + 4} completed`)
  }

  // Unique calls (shouldn't trigger automation suggestions)
  console.log('\n  → Call 6-7: Unique prompts')
  await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'user',
        content: 'Write a haiku about programming',
      },
    ],
  })
  console.log('    ✓ Call 6 completed')

  await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'user',
        content: 'Explain quantum computing in simple terms',
      },
    ],
  })
  console.log('    ✓ Call 7 completed')

  // 4. Trigger pattern analysis
  console.log('\n🔍 Triggering pattern analysis...')
  try {
    const analyzeResponse = await fetch(
      `${process.env.FLUSK_BASE_URL || 'http://localhost:3000'}/api/v1/patterns/analyze`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.FLUSK_API_KEY || 'test_org_key'}`,
        },
      }
    )

    if (analyzeResponse.ok) {
      console.log('  ✓ Pattern analysis triggered')
    } else {
      console.log(`  ⚠ Analysis endpoint returned: ${analyzeResponse.status}`)
    }
  } catch (error) {
    console.log('  ⚠ Pattern analysis endpoint not yet implemented')
  }

  // 5. Get automation suggestions
  console.log('\n💡 Fetching automation suggestions...')
  try {
    const suggestions = await flusk.getSuggestions()

    if (suggestions.length === 0) {
      console.log('  ℹ No suggestions yet (pattern analysis may still be processing)')
    } else {
      console.log('\n🎯 Automation Suggestions:')
      suggestions.forEach((suggestion, index) => {
        console.log(`\n  ${index + 1}. ${suggestion.suggestedAutomation}`)
        console.log(`     Call Pattern: ${suggestion.callSignature}`)
        console.log(`     Frequency: ${suggestion.frequency} calls`)
        console.log(`     Current Cost: $${suggestion.totalCost.toFixed(4)}`)
        console.log(`     Potential Savings: $${suggestion.potentialSavings.toFixed(4)}/month`)
        console.log(`     Confidence: ${(suggestion.confidence * 100).toFixed(0)}%`)
        console.log(`     Status: ${suggestion.status}`)
      })

      // Calculate total savings
      const totalSavings = suggestions.reduce(
        (sum, s) => sum + s.potentialSavings,
        0
      )
      console.log(`\n  💰 Total Potential Savings: $${totalSavings.toFixed(2)}/month`)
    }
  } catch (error) {
    if (error instanceof Error) {
      console.log(`  ⚠ Suggestions endpoint error: ${error.message}`)
    } else {
      console.log('  ⚠ Suggestions endpoint not yet implemented')
    }
  }

  console.log('\n✅ Example completed!\n')
}

main().catch((error) => {
  console.error('❌ Error:', error)
  process.exit(1)
})
