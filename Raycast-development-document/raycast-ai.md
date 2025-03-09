Title: AI | Raycast API

URL Source: https://developers.raycast.com/api-reference/ai

Markdown Content:
1.  [API Reference](https://developers.raycast.com/api-reference)

AI
--

The AI API provides developers with seamless access to AI functionality without requiring API keys, configuration, or extra dependencies.

Some users might not have access to this API. If a user doesn't have access to Raycast Pro, they will be asked if they want to get access when your extension calls the AI API. If the user doesn't wish to get access, the API call will throw an error.

You can check if a user has access to the API using [`environment.canAccess(AI)`](https://developers.raycast.com/api-reference/environment).

Ask AI anything you want. Use this in “no-view” Commands, effects, or callbacks. In a React component, you might want to use the [useAI util hook](https://developers.raycast.com/utilities/react-hooks/useai) instead.

```
async function ask(prompt: string, options?: AskOptions): Promise<string> & EventEmitter;
```

Basic usage:
```
import { AI, Clipboard } from "@raycast/api";

export default async function command() {
  const answer = await AI.ask("Suggest 5 jazz songs");

  await Clipboard.copy(answer);
}
```

Error Handling:
```
import { AI, showToast, Toast } from "@raycast/api";

export default async function command() {
  try {
    await AI.ask("Suggest 5 jazz songs");
  } catch (error) {
    // Handle error here, eg: by showing a Toast
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to generate answer",
    });
  }
}
```

Stream answer:
```
import { AI, getSelectedFinderItems, showHUD } from "@raycast/api";
import fs from "fs";

export default async function main() {
  let allData = "";
  const [file] = await getSelectedFinderItems();

  const answer = AI.ask("Suggest 5 jazz songs");

  // Listen to "data" event to stream the answer
  answer.on("data", async (data) => {
    allData += data;
    await fs.promises.writeFile(`${file.path}`, allData.trim(), "utf-8");
  });

  await answer;

  await showHUD("Done!");
}
```

user feedback:
```
import { AI, getSelectedFinderItems, showHUD } from "@raycast/api";
import fs from "fs";

export default async function main() {
  let allData = "";
  const [file] = await getSelectedFinderItems();

  // If you're doing something that happens in the background
  // Consider showing a HUD or a Toast as the first step
  // To give users feedback about what's happening
  await showHUD("Generating answer...");

  const answer = await AI.ask("Suggest 5 jazz songs");

  await fs.promises.writeFile(`${file.path}`, allData.trim(), "utf-8");

  // Then, when everythig is done, notify the user again
  await showHUD("Done!");
}
```

check for access:
```
import { AI, getSelectedFinderItems, showHUD, environment } from "@raycast/api";
import fs from "fs";

export default async function main() {
  if (environment.canAccess(AI)) {
    const answer = await AI.ask("Suggest 5 jazz songs");
    await Clipboard.copy(answer);
  } else {
    await showHUD("You don't have access :(");
  }
}
```

The prompt to ask the AI.

Options to control which and how the AI model should behave.

A Promise that resolves with a prompt completion.

Concrete tasks, such as fixing grammar, require less creativity while open-ended questions, such as generating ideas, require more.

```
type Creativity = "none" | "low" | "medium" | "high" | "maximum" | number;
```

If a number is passed, it needs to be in the range 0-2. For larger values, 2 will be used. For lower values, 0 will be used.

The AI model to use to answer to the prompt. Defaults to `AI.Model["OpenAI_GPT3.5-turbo"]`.

GPT-4 is the model with broad general knowledge, allowing it to follow complex instructions and solve difficult problems. This model is the previous generation, use GPT-4o for better results.

GPT-4 Turbo is an evolution of the GPT-4 model with a larger context. This model is the previous generation, use GPT-4o for better results.

GPT-4o is the most advanced and fastest model from OpenAI, making it a great choice for complex everyday problems and deeper conversations.

GPT-4o mini is a highly intelligent and fast model that is ideal for a variety of everyday tasks.

OpenAI o1-preview is an advanced reasoning model designed to tackle complex problems in science, coding, mathematics, and similar fields.

OpenAI o1-mini is a faster, more cost-effective reasoning model particularly effective at coding tasks.

OpenAI o1 is an advanced reasoning model designed to tackle complex problems in science, coding, mathematics, and similar fields.

OpenAI o3-mini is a fast and powerful reasoning model optimized for STEM tasks like science, math, and coding. It offers advanced features like web search making it ideal for complex problem-solving with reduced latency.

Claude 3.5 Haiku is Anthropic's fastest model, with a large context window that makes it ideal for analyzing code, documents, or large amounts of text.

Claude 3.5 Sonnet from Anthropic has enhanced intelligence with increased speed. It excels at complex tasks like visual reasoning or workflow orchestrations. Currently points to claude-3-5-sonnet-20241022

Claude 3 Opus is Anthropic's intelligent model designed to solve highly complex tasks. It stands out for its remarkable fluency.

Lightweight Perplexity model with search grounding, quicker than Sonar Pro

Premier Perplexity model with search grounding, supporting advanced queries and follow-ups

Perplexity\_Sonar\_Reasoning

Lightweight reasoning offering powered by reasoning models trained with DeepSeek R1.

Perplexity\_Sonar\_Reasoning\_Pro

Premier reasoning offering powered by DeepSeek R1.

Llama 3.3 70B is an open-source model from Meta, state-of-the-art in areas like reasoning, math, and general knowledge.

Llama 3.1 8B is an open-source model from Meta, optimized for instruction following and high-speed performance.

Llama 3 70B from Meta is a highly capable open-source LLM that can serve as a tool for various text-related tasks.

Llama 3.1 405B is Meta's flagship open-source model, offering unparalleled capabilities in general knowledge, steerability, math, tool use, and multilingual translation.

Mixtral 8x7B from Mistral is an open-source model that demonstrates high performance in generating code and text at an impressive speed.

Mistral Nemo is a small model built in collaboration with NVIDIA, and released under the Apache 2.0 license.

Mistral Large is Mistral's top-tier reasoning model for high-complexity tasks with stronger multilingual support. Currently points to mistral-large-2411

Mistral Small is Mistral's latest enterprise-grade small model that delivers significant improvements in human alignment, reasoning capabilities, and code. Currently points to mistral-small-2501

Codestral is Mistral's cutting-edge language model that specializes in low-latency, high-frequency tasks such as fill-in-the-middle (FIM), code correction and test generation. Currently points to codestral-2501

Fully open-source model with performance on par with OpenAI-o1

DeepSeek\_R1\_Distill\_Llama\_3.3\_70B

DeepSeek R1 Distill Llama 3.3 70B is a fine-tuned version of Llama 3.3 70B, leveraging DeepSeek-R1's advanced capabilities for enhanced reasoning and precision.

Google's fastest multimodal model with exceptional speed and efficiency for quick, high-frequency tasks

Google's high-performing multimodal model for complex tasks requiring deep reasoning and nuanced understanding

Google's powerful workhorse model with low latency and enhanced performance, built to power agentic experiences

Google\_Gemini\_2.0\_Flash\_Thinking

Gemini 2.0 Flash Thinking is an experimental model that generates its internal reasoning process, enabling stronger analytical capabilities

Grok-2 is xAI's frontier language model with state-of-the-art reasoning capabilities

If a model isn't available to the user, Raycast will fallback to a similar one:

*   `AI.Model.OpenAI_GPT4`, `AI.Model["OpenAI_GPT4-turbo"]`, and `AI.Model.OpenAI_GPT4o` -\> `AI.Model["OpenAI_GPT4o-mini"]`
    
*   `AI.Model["OpenAI_o1-preview"]`, `AI.Model["OpenAI_o1-mini"]`, and `AI.Model.OpenAI_o1` -\> `AI.Model["OpenAI_GPT4o-mini"]`
    
*   `AI.Model.Anthropic_Claude_Opus` and `AI.Model.Anthropic_Claude_Sonnet` -\> `AI.Model.Anthropic_Claude_Haiku`
    
*   `AI.Model.Perplexity_Sonar_Pro` -\> `AI.Model.Perplexity_Sonar`
    
*   `AI.Model.Mistral_Large` -\> `AI.Model.Mistral_Nemo`
    
*   `AI.Model["Llama3.1_405B"]` -\> `AI.Model["Llama3.3_70B"]`
    
*   `AI.Model["Google_Gemini_1.5_Pro"]` -\> `AI.Model["Google_Gemini_1.5_Flash"]`
    
*   `AI.Model.DeepSeek_R1` -\> `AI.Model["DeepSeek_R1_Distill_Llama_3.3_70B"]`
    
*   `AI.Model.xAI_Grok_2` -\> `AI.Model["OpenAI_GPT4o-mini"]`
    

Concrete tasks, such as fixing grammar, require less creativity while open-ended questions, such as generating ideas, require more. If a number is passed, it needs to be in the range 0-2. For larger values, 2 will be used. For lower values, 0 will be used.

The AI model to use to answer to the prompt.

Abort signal to cancel the request.

* * *