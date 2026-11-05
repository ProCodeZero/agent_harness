import type { ModelMessage } from "ai";

export function addCacheControl(messages: ModelMessage[]): ModelMessage[] {
  return messages.map((msg, i) => {
    if (i === 0 || i === messages.length - 1) {
      return {
        ...msg,
        providerOptions: {
          ...msg.providerOptions,
          anthropic: { cacheControl: { type: "ephemeral" } },
        },
      };
    }
    return msg;
  });
}
