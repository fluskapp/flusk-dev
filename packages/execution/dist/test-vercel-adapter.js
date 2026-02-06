/**
 * Local test script for Vercel adapter
 *
 * Usage: tsx packages/execution/src/test-vercel-adapter.ts
 */
import handler from './vercel-adapter.js';
// Mock Vercel request/response
function createMockRequest(method, url, body) {
    return {
        method,
        url,
        headers: {
            'content-type': 'application/json',
        },
        body,
    };
}
function createMockResponse() {
    const headers = {};
    const response = {
        statusCode: 200,
        body: '',
        headers,
        status(code) {
            this.statusCode = code;
            return this;
        },
        setHeader(key, value) {
            headers[key] = value;
            return this;
        },
        send(data) {
            this.body = typeof data === 'string' ? data : JSON.stringify(data);
            console.log('\n✅ Response:', {
                status: this.statusCode,
                headers: this.headers,
                body: this.body,
            });
        },
        json(data) {
            this.setHeader('content-type', 'application/json');
            this.send(data);
        },
    };
    return response;
}
// Test cases
async function testHealthEndpoint() {
    console.log('\n🧪 Test 1: Health endpoint');
    const req = createMockRequest('GET', '/health');
    const res = createMockResponse();
    await handler(req, res);
}
async function testLLMCallsEndpoint() {
    console.log('\n🧪 Test 2: LLM calls endpoint (will fail without DB)');
    const req = createMockRequest('POST', '/api/v1/llm-calls', {
        model: 'gpt-4',
        provider: 'openai',
        prompt: 'Test prompt',
        maxTokens: 100,
    });
    const res = createMockResponse();
    await handler(req, res);
}
async function runTests() {
    console.log('🚀 Testing Vercel adapter...\n');
    try {
        await testHealthEndpoint();
        await testLLMCallsEndpoint();
        console.log('\n✅ Tests completed\n');
    }
    catch (error) {
        console.error('\n❌ Test failed:', error);
        process.exit(1);
    }
}
runTests();
//# sourceMappingURL=test-vercel-adapter.js.map