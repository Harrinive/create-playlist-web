/**
 * Story synthesis smoke test (requires LLM keys).
 * Usage: cd apps/api && npx tsx scripts/test-interview-story.ts
 */
import { loadEnv } from '../src/config.js';
import { synthesizeInterviewStory } from '../src/llm/interview/story-synthesize.js';
import { resolveInterviewDefaultModel } from '../src/llm/interview-models.js';
import type { InterviewAnswers } from '../src/types/interview.js';

const env = loadEnv();
const model = resolveInterviewDefaultModel(env);

if (!model) {
    console.error('No interview model configured');
    process.exit(1);
}

const priorAnswers: Partial<InterviewAnswers> = {
    m1: { id: 'kitchen', label: 'Alone in a small kitchen late at night' },
    m2: { id: 'still', label: 'Chair creak, nothing else moving' },
    m3: { id: 'one-drink', label: 'One drink became three — jacket on the pile again' }
};

const story = await synthesizeInterviewStory(
    env,
    priorAnswers,
    'indie folk intimate, trip-hop dusk, warm soul still reachable',
    model
);

const enSentences = story.en.split(/[.!?]+/).filter((s) => s.trim().length > 0);
const zhSentences = story.zh.split(/[。！？]+/).filter((s) => s.trim().length > 0);

console.log('storyEn:', story.en);
console.log('storyZh:', story.zh);
console.log(`EN sentences: ${enSentences.length}, ZH sentences: ${zhSentences.length}`);

if (enSentences.length !== 3 || zhSentences.length !== 3) {
    console.error('Expected exactly 3 sentences in each language');
    process.exit(1);
}

console.log('\nStory synthesis OK');
