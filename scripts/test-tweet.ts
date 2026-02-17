import { TwitterApi } from 'twitter-api-v2';

const client = new TwitterApi({
  appKey: 'AtNUHSZCFe7twSDqr1EJr3hI9',
  appSecret: 'VlUSmmgXnCIMTbvV4GF4x4N1TaelfRjVYbwLSsoYbrRVNVXE27',
  accessToken: '1991899311484133376-aS5Hcakx8TPNjta40D4Id1823YpX5x',
  accessSecret: 'i0yXJR0rAh7is6dUMJ2xFE7jNuwSaffHXbCrM0NQuyMwm',
});

const tweet = `🚀 Flusk v0.2.0 is live!

One command to track your LLM costs:
npx @flusk/cli analyze ./app.js

✅ OpenAI, Anthropic & Gemini support
✅ Streaming instrumentation
✅ --redact flag for prompt privacy
✅ Zero-setup, zero-deps (node:sqlite)

Open source, MIT licensed.
https://github.com/adirbenyossef/flusk-dev

#opensource #devtools #LLM #AI`;

const { data } = await client.v2.tweet(tweet);
console.log(`✅ Tweet posted: https://x.com/fluskapp/status/${data.id}`);
