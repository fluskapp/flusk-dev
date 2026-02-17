import { TwitterApi } from 'twitter-api-v2';

const client = new TwitterApi({
  appKey: 'AtNUHSZCFe7twSDqr1EJr3hI9',
  appSecret: 'VlUSmmgXnCIMTbvV4GF4x4N1TaelfRjVYbwLSsoYbrRVNVXE27',
  accessToken: '1991899311484133376-4KnhIn3LcrJiVixayUz30KtdJ1yUuC',
  accessSecret: 'WnY4ynERGyc86dZ1GfJhfVhk1flG2hH5XOZ6yNX1L2Tna',
});

const { data } = await client.v2.tweet('🚀 Flusk v0.2.0 is live!\n\nOne command to track your LLM costs:\nnpx @flusk/cli analyze ./app.js\n\n✅ OpenAI, Anthropic & Gemini support\n✅ Streaming instrumentation\n✅ --redact flag for prompt privacy\n✅ Zero-setup, zero-deps (node:sqlite)\n\nOpen source, MIT licensed.\nhttps://github.com/adirbenyossef/flusk-dev\n\n#opensource #devtools #LLM #AI');
console.log(`✅ Tweet: https://x.com/fluskapp/status/${data.id}`);
