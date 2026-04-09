import React, { useEffectEvent, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { OpenAgentClient, type ChatEvent } from "@openagent/client-core";

export type TranscriptItem =
  | { id: string; kind: "user"; content: string }
  | { id: string; kind: "assistant"; content: string }
  | { id: string; kind: "status"; content: string }
  | {
      id: string;
      kind: "tool";
      toolName: string;
      state: "started" | "finished" | "failed";
      argumentsText?: string;
      resultText?: string;
      errorText?: string;
    };

export interface ConversationState {
  id: string;
  title: string;
  items: TranscriptItem[];
  draftAssistant: string;
}

interface Props {
  baseUrl: string;
  conversations: ConversationState[];
  selectedConversationId: string;
  onSelectConversation(id: string): void;
  onCreateConversation(): void;
  onConversationsChange(next: ConversationState[]): void;
}

export function ChatScreen({
  baseUrl,
  conversations,
  selectedConversationId,
  onSelectConversation,
  onCreateConversation,
  onConversationsChange,
}: Props) {
  const [input, setInput] = useState("");
  const [busyConversationId, setBusyConversationId] = useState<string | null>(null);
  const client = new OpenAgentClient(baseUrl);

  const selectedConversation =
    conversations.find((conversation) => conversation.id === selectedConversationId) ?? conversations[0];

  const updateConversation = useEffectEvent((conversationId: string, updater: (conversation: ConversationState) => ConversationState) => {
    onConversationsChange(
      conversations.map((conversation) =>
        conversation.id === conversationId ? updater(conversation) : conversation,
      ),
    );
  });

  const handleEvent = useEffectEvent((event: ChatEvent) => {
    const conversationId = String(event.conversationId || selectedConversationId);
    updateConversation(conversationId, (conversation) => {
      const next = { ...conversation, items: [...conversation.items] };
      if (event.type === "status") {
        next.items.push({
          id: crypto.randomUUID(),
          kind: "status",
          content: String(event.status || ""),
        });
      } else if (event.type === "tool_started") {
        next.items.push({
          id: String(event.tool_call_id || crypto.randomUUID()),
          kind: "tool",
          toolName: String(event.tool_name || "tool"),
          state: "started",
          argumentsText: JSON.stringify(event.arguments ?? {}, null, 2),
        });
      } else if (event.type === "tool_finished" || event.type === "tool_failed") {
        const targetId = String(event.tool_call_id || "");
        const existing = next.items.find(
          (item) => item.kind === "tool" && (targetId ? item.id === targetId : item.toolName === event.tool_name),
        );
        if (existing && existing.kind === "tool") {
          existing.state = event.type === "tool_failed" ? "failed" : "finished";
          existing.resultText = String(event.result || "");
          existing.errorText = String(event.error || "");
        } else {
          next.items.push({
            id: targetId || crypto.randomUUID(),
            kind: "tool",
            toolName: String(event.tool_name || "tool"),
            state: event.type === "tool_failed" ? "failed" : "finished",
            argumentsText: JSON.stringify(event.arguments ?? {}, null, 2),
            resultText: String(event.result || ""),
            errorText: String(event.error || ""),
          });
        }
      } else if (event.type === "assistant_delta") {
        next.draftAssistant = String(event.delta || "");
      } else if (event.type === "assistant_message") {
        next.items.push({
          id: crypto.randomUUID(),
          kind: "assistant",
          content: String(event.content || next.draftAssistant || ""),
        });
        next.draftAssistant = "";
      }
      return next;
    });

    if (event.type === "run_finished" || event.type === "run_error") {
      setBusyConversationId(null);
    }
  });

  async function sendMessage() {
    if (!selectedConversation || !input.trim()) {
      return;
    }
    const message = input.trim();
    setInput("");
    setBusyConversationId(selectedConversation.id);
    updateConversation(selectedConversation.id, (conversation) => ({
      ...conversation,
      title: conversation.items.length === 0 ? message.slice(0, 36) : conversation.title,
      items: [
        ...conversation.items,
        {
          id: crypto.randomUUID(),
          kind: "user",
          content: message,
        },
      ],
    }));

    try {
      await client.runChat({
        conversationId: selectedConversation.id,
        message,
        onEvent: handleEvent,
      });
    } catch (error) {
      handleEvent({
        type: "run_error",
        conversationId: selectedConversation.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return (
    <View style={styles.root}>
      <View style={styles.conversationRail}>
        <Pressable style={styles.newChatButton} onPress={onCreateConversation}>
          <Text style={styles.newChatText}>+ New conversation</Text>
        </Pressable>
        <ScrollView contentContainerStyle={styles.conversationList}>
          {conversations.map((conversation) => (
            <Pressable
              key={conversation.id}
              style={[
                styles.conversationButton,
                conversation.id === selectedConversationId && styles.conversationButtonActive,
              ]}
              onPress={() => onSelectConversation(conversation.id)}
            >
              <Text style={styles.conversationTitle}>{conversation.title}</Text>
              <Text style={styles.conversationMeta}>{conversation.items.length} events</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <View style={styles.chatPanel}>
        <ScrollView contentContainerStyle={styles.chatStream}>
          {selectedConversation.items.map((item) => {
            if (item.kind === "tool") {
              return (
                <View key={item.id} style={styles.toolCard}>
                  <Text style={styles.toolTitle}>
                    {item.toolName} · {item.state.toUpperCase()}
                  </Text>
                  {item.argumentsText ? <Text style={styles.toolBlock}>{item.argumentsText}</Text> : null}
                  {item.resultText ? <Text style={styles.toolBlock}>{item.resultText}</Text> : null}
                  {item.errorText ? <Text style={styles.toolError}>{item.errorText}</Text> : null}
                </View>
              );
            }

            return (
              <View
                key={item.id}
                style={[
                  styles.messageBubble,
                  item.kind === "user" ? styles.userBubble : null,
                  item.kind === "assistant" ? styles.assistantBubble : null,
                  item.kind === "status" ? styles.statusBubble : null,
                ]}
              >
                <Text style={styles.messageLabel}>{item.kind.toUpperCase()}</Text>
                <Text style={styles.messageText}>{item.content}</Text>
              </View>
            );
          })}
          {selectedConversation.draftAssistant ? (
            <View style={[styles.messageBubble, styles.assistantBubble]}>
              <Text style={styles.messageLabel}>ASSISTANT</Text>
              <Text style={styles.messageText}>{selectedConversation.draftAssistant}</Text>
            </View>
          ) : null}
        </ScrollView>

        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            multiline
            value={input}
            onChangeText={setInput}
            placeholder="Message OpenAgent..."
            placeholderTextColor="#64748b"
          />
          <Pressable
            style={[styles.sendButton, busyConversationId === selectedConversation.id && styles.sendButtonBusy]}
            disabled={busyConversationId === selectedConversation.id}
            onPress={() => {
              void sendMessage();
            }}
          >
            <Text style={styles.sendText}>
              {busyConversationId === selectedConversation.id ? "Running..." : "Send"}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, flexDirection: "row", backgroundColor: "#0d131b" },
  conversationRail: {
    width: 280,
    borderRightWidth: 1,
    borderRightColor: "#1f2937",
    padding: 16,
    gap: 16,
  },
  newChatButton: {
    backgroundColor: "#23415c",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  newChatText: { color: "#eff6ff", fontWeight: "700" },
  conversationList: { gap: 10 },
  conversationButton: {
    borderRadius: 14,
    backgroundColor: "#141c26",
    borderWidth: 1,
    borderColor: "#1d2938",
    padding: 12,
    gap: 6,
  },
  conversationButtonActive: { borderColor: "#4ea8de" },
  conversationTitle: { color: "#f8fafc", fontWeight: "700" },
  conversationMeta: { color: "#94a3b8", fontSize: 12 },
  chatPanel: { flex: 1, padding: 20, gap: 16 },
  chatStream: { gap: 12, paddingBottom: 18 },
  messageBubble: {
    borderRadius: 16,
    padding: 14,
    gap: 6,
  },
  userBubble: { backgroundColor: "#173040", alignSelf: "flex-end", maxWidth: "78%" },
  assistantBubble: { backgroundColor: "#162231", maxWidth: "78%" },
  statusBubble: { backgroundColor: "#141b24", borderWidth: 1, borderColor: "#273549" },
  messageLabel: { color: "#93c5fd", fontSize: 11, fontWeight: "800", letterSpacing: 0.7 },
  messageText: { color: "#f8fafc", lineHeight: 22 },
  toolCard: {
    borderRadius: 16,
    backgroundColor: "#111827",
    borderWidth: 1,
    borderColor: "#354155",
    padding: 14,
    gap: 8,
  },
  toolTitle: { color: "#f8fafc", fontWeight: "800" },
  toolBlock: {
    color: "#cbd5e1",
    backgroundColor: "#0a0f16",
    borderRadius: 10,
    padding: 10,
    fontFamily: "Menlo",
  },
  toolError: { color: "#fecaca" },
  inputRow: { flexDirection: "row", gap: 12, alignItems: "flex-end" },
  input: {
    flex: 1,
    minHeight: 84,
    backgroundColor: "#0a1118",
    color: "#f8fafc",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#223042",
    padding: 14,
  },
  sendButton: {
    backgroundColor: "#24597e",
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  sendButtonBusy: { opacity: 0.6 },
  sendText: { color: "#f8fafc", fontWeight: "800" },
});
