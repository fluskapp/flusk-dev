// Try posting with OAuth 2.0 user context using client credentials
import { TwitterApi } from 'twitter-api-v2';

// OAuth 2.0 Client Credentials
const client = new TwitterApi({
  clientId: 'VWgwR3BEWHhxYzRLZzVEOHo2Vkk6MTpjaQ',
  clientSecret: 'EU65DcOb4RTe0Fb8T8vWx9Bdd1usXYOdg98G8mOOatIkNrP-0X',
});

// Generate auth link for user authorization
const { url, codeVerifier, state } = client.generateOAuth2AuthLink(
  'https://github.com/adirbenyossef/flusk-dev',
  { scope: ['tweet.read', 'tweet.write', 'users.read', 'offline.access'] }
);

console.log('🔗 Open this URL in your browser and authorize:');
console.log(url);
console.log('\nAfter authorizing, copy the full redirect URL and send it to me.');
console.log('\nCode verifier (save this):', codeVerifier);
console.log('State:', state);
