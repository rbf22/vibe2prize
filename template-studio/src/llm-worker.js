import * as webllm from 'https://esm.sh/@mlc-ai/web-llm@0.2.82';

const handler = new webllm.WebWorkerMLCEngineHandler();

self.onmessage = (msg) => {
  handler.onmessage(msg);
};
