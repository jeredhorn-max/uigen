import { anthropic } from "@ai-sdk/anthropic";
import {
  LanguageModelV2,
  LanguageModelV2CallOptions,
  LanguageModelV2StreamPart,
} from "@ai-sdk/provider";

const MODEL = "claude-haiku-4-5";

export class MockLanguageModel implements LanguageModelV2 {
  readonly specificationVersion = "v2" as const;
  readonly provider = "mock";
  readonly modelId: string;
  readonly supportedUrls = {};

  constructor(modelId: string) {
    this.modelId = modelId;
  }

  private async delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private extractUserPrompt(prompt: LanguageModelV2CallOptions["prompt"]): string {
    for (let i = prompt.length - 1; i >= 0; i--) {
      const message = prompt[i];
      if (message.role === "user") {
        const content = message.content;
        if (Array.isArray(content)) {
          return content
            .filter((p: any) => p.type === "text")
            .map((p: any) => p.text)
            .join(" ");
        }
      }
    }
    return "";
  }

  private getToolCallCount(prompt: LanguageModelV2CallOptions["prompt"]): number {
    return prompt.filter((m) => m.role === "tool").length;
  }

  private async *generateMockStream(
    prompt: LanguageModelV2CallOptions["prompt"],
    userPrompt: string
  ): AsyncGenerator<LanguageModelV2StreamPart> {
    const toolCallCount = this.getToolCallCount(prompt);

    const promptLower = userPrompt.toLowerCase();
    let componentType = "counter";
    let componentName = "Counter";
    if (promptLower.includes("form")) { componentType = "form"; componentName = "ContactForm"; }
    else if (promptLower.includes("card")) { componentType = "card"; componentName = "Card"; }

    yield { type: "stream-start", warnings: [] };

    const textId = "text-1";

    const emitText = async function* (text: string): AsyncGenerator<LanguageModelV2StreamPart> {
      yield { type: "text-start", id: textId };
      for (const char of text) {
        yield { type: "text-delta", id: textId, delta: char };
        await new Promise((r) => setTimeout(r, 20));
      }
      yield { type: "text-end", id: textId };
    };

    // Step 0 (no tool results yet): create App.jsx
    if (toolCallCount === 0) {
      yield* emitText(
        "This is a static response. Add an ANTHROPIC_API_KEY to your .env for real generation. Creating a sample component now."
      );
      yield {
        type: "tool-call",
        toolCallId: "call_1",
        toolName: "str_replace_editor",
        input: JSON.stringify({ command: "create", path: "/App.jsx", file_text: this.getAppCode(componentName) }),
      };
      yield { type: "finish", finishReason: "tool-calls", usage: { inputTokens: 50, outputTokens: 30, totalTokens: 80 } };
      return;
    }

    // Step 1: create component file
    if (toolCallCount === 1) {
      yield* emitText(`Creating the ${componentName} component.`);
      yield {
        type: "tool-call",
        toolCallId: "call_2",
        toolName: "str_replace_editor",
        input: JSON.stringify({ command: "create", path: `/components/${componentName}.jsx`, file_text: this.getComponentCode(componentType) }),
      };
      yield { type: "finish", finishReason: "tool-calls", usage: { inputTokens: 50, outputTokens: 30, totalTokens: 80 } };
      return;
    }

    // Final: done
    yield* emitText(
      `Done! I've created **${componentName}.jsx** and **App.jsx**. You can see the preview on the right.`
    );
    yield { type: "finish", finishReason: "stop", usage: { inputTokens: 50, outputTokens: 50, totalTokens: 100 } };
  }

  private getComponentCode(componentType: string): string {
    switch (componentType) {
      case "form":
        return `import { useState } from 'react';

const ContactForm = () => {
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
  const handleSubmit = (e) => { e.preventDefault(); alert('Submitted!'); };

  const inputClass = "w-full bg-transparent border-b border-zinc-700 focus:border-amber-400 outline-none py-3 text-white placeholder-zinc-600 transition-colors duration-200";

  return (
    <div className="max-w-md w-full p-10 bg-zinc-950 border border-zinc-800 rounded-2xl">
      <p className="text-xs tracking-widest uppercase text-amber-400 mb-2">Get in touch</p>
      <h2 className="text-3xl font-bold tracking-tight text-white mb-10">Contact Us</h2>
      <form onSubmit={handleSubmit} className="space-y-8">
        <input type="text" name="name" placeholder="Your name" value={formData.name} onChange={handleChange} className={inputClass} />
        <input type="email" name="email" placeholder="Email address" value={formData.email} onChange={handleChange} className={inputClass} />
        <textarea name="message" placeholder="Your message" value={formData.message} onChange={handleChange} rows={4} className={inputClass + " resize-none"} />
        <button type="submit"
          className="w-full py-3 bg-amber-400 text-zinc-950 font-semibold tracking-wide rounded-full hover:bg-amber-300 transition-all duration-200 mt-2">
          Send Message
        </button>
      </form>
    </div>
  );
};
export default ContactForm;`;

      case "card":
        return `const Card = ({ title = "Welcome", description = "A sample card component." }) => (
  <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden max-w-sm">
    <div className="p-8">
      <div className="w-10 h-10 rounded-full bg-violet-500/20 flex items-center justify-center mb-6">
        <div className="w-4 h-4 rounded-full bg-violet-400" />
      </div>
      <h3 className="text-2xl font-bold tracking-tight text-white mb-3">{title}</h3>
      <p className="text-slate-400 leading-relaxed">{description}</p>
    </div>
    <div className="px-8 py-4 border-t border-white/5 flex items-center justify-between">
      <span className="text-xs tracking-widest uppercase text-slate-500">Learn more</span>
      <span className="text-violet-400 text-sm">→</span>
    </div>
  </div>
);
export default Card;`;

      default:
        return `import { useState } from 'react';

const Counter = () => {
  const [count, setCount] = useState(0);
  return (
    <div className="flex flex-col items-center p-10 bg-zinc-900 border border-zinc-800 rounded-2xl min-w-[260px]">
      <span className="text-xs tracking-widest uppercase text-zinc-500 mb-6">Counter</span>
      <div className="text-7xl font-bold tracking-tight text-white tabular-nums mb-8">{count}</div>
      <div className="flex gap-3">
        <button onClick={() => setCount(c => c - 1)}
          className="w-11 h-11 rounded-full bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white transition-all duration-150 text-lg font-light">−</button>
        <button onClick={() => setCount(0)}
          className="px-5 h-11 rounded-full bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white transition-all duration-150 text-sm tracking-wide">reset</button>
        <button onClick={() => setCount(c => c + 1)}
          className="w-11 h-11 rounded-full bg-indigo-600 text-white hover:bg-indigo-500 transition-all duration-150 text-lg font-light">+</button>
      </div>
    </div>
  );
};
export default Counter;`;
    }
  }

  private getAppCode(componentName: string): string {
    return `import ${componentName} from '@/components/${componentName}';

export default function App() {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-8">
      <${componentName} />
    </div>
  );
}`;
  }

  async doGenerate(options: LanguageModelV2CallOptions) {
    const userPrompt = this.extractUserPrompt(options.prompt);
    const parts: LanguageModelV2StreamPart[] = [];
    for await (const part of this.generateMockStream(options.prompt, userPrompt)) {
      parts.push(part);
    }

    const content: any[] = [];
    let currentTextId: string | null = null;
    let currentText = "";

    for (const part of parts) {
      if (part.type === "text-start") { currentTextId = part.id; currentText = ""; }
      else if (part.type === "text-delta" && currentTextId) { currentText += part.delta; }
      else if (part.type === "text-end" && currentText) { content.push({ type: "text", text: currentText }); currentTextId = null; currentText = ""; }
      else if (part.type === "tool-call") { content.push(part); }
    }

    const finishPart = parts.find((p) => p.type === "finish") as any;
    return {
      content,
      finishReason: (finishPart?.finishReason ?? "stop") as any,
      usage: finishPart?.usage ?? { inputTokens: 50, outputTokens: 50, totalTokens: 100 },
      warnings: [],
    };
  }

  async doStream(options: LanguageModelV2CallOptions) {
    const userPrompt = this.extractUserPrompt(options.prompt);
    const self = this;

    const stream = new ReadableStream<LanguageModelV2StreamPart>({
      async start(controller) {
        try {
          for await (const chunk of self.generateMockStream(options.prompt, userPrompt)) {
            controller.enqueue(chunk);
          }
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return { stream };
  }
}

export function getLanguageModel() {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey || apiKey.trim() === "") {
    console.log("No ANTHROPIC_API_KEY found, using mock provider");
    return new MockLanguageModel("mock-claude-haiku-4-5");
  }

  return anthropic(MODEL);
}
