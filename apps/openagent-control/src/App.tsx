import React, { useEffect, useState } from "react";
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { ChatEvent, ConnectionProfile } from "@openagent/client-core";
import { ConnectionScreen } from "./screens/ConnectionScreen";
import { ChatScreen, type ConversationState } from "./screens/ChatScreen";
import { ToolsScreen } from "./screens/ToolsScreen";
import { MemoryScreen } from "./screens/MemoryScreen";

type Screen = "chat" | "tools" | "memory";

const initialConversation: ConversationState = {
  id: crypto.randomUUID(),
  title: "New chat",
  draftAssistant: "",
  items: [],
};

export default function App() {
  const [screen, setScreen] = useState<Screen>("chat");
  const [connection, setConnection] = useState<ConnectionProfile | null>(null);
  const [conversations, setConversations] = useState<ConversationState[]>([initialConversation]);
  const [selectedConversationId, setSelectedConversationId] = useState<string>(initialConversation.id);

  useEffect(() => {
    if (conversations.length === 0) {
      const nextConversation = {
        id: crypto.randomUUID(),
        title: "New chat",
        draftAssistant: "",
        items: [],
      };
      setConversations([nextConversation]);
      setSelectedConversationId(nextConversation.id);
    }
  }, [conversations]);

  if (!connection) {
    return <ConnectionScreen onConnect={setConnection} />;
  }

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.sidebar}>
        <Text style={styles.sidebarTitle}>OpenAgent</Text>
        <Text style={styles.sidebarMeta}>{connection.label}</Text>
        {(["chat", "tools", "memory"] as Screen[]).map((item) => (
          <TouchableOpacity
            key={item}
            style={[styles.navButton, screen === item && styles.navButtonActive]}
            onPress={() => setScreen(item)}
          >
            <Text style={styles.navButtonText}>{item.toUpperCase()}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={styles.disconnectButton} onPress={() => setConnection(null)}>
          <Text style={styles.disconnectText}>Disconnect</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.content}>
        {screen === "chat" ? (
          <ChatScreen
            baseUrl={connection.baseUrl}
            conversations={conversations}
            selectedConversationId={selectedConversationId}
            onSelectConversation={setSelectedConversationId}
            onCreateConversation={() => {
              const nextConversation: ConversationState = {
                id: crypto.randomUUID(),
                title: "New chat",
                draftAssistant: "",
                items: [],
              };
              setConversations((current) => [nextConversation, ...current]);
              setSelectedConversationId(nextConversation.id);
            }}
            onConversationsChange={setConversations}
          />
        ) : null}
        {screen === "tools" ? <ToolsScreen baseUrl={connection.baseUrl} /> : null}
        {screen === "memory" ? <MemoryScreen baseUrl={connection.baseUrl} /> : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "#0c1117",
  },
  sidebar: {
    width: 220,
    backgroundColor: "#101822",
    borderRightWidth: 1,
    borderRightColor: "#1d2938",
    padding: 18,
    gap: 10,
  },
  sidebarTitle: {
    color: "#f7fafc",
    fontSize: 24,
    fontWeight: "700",
  },
  sidebarMeta: {
    color: "#94a3b8",
    marginBottom: 20,
  },
  navButton: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: "#162231",
  },
  navButtonActive: {
    backgroundColor: "#24597e",
  },
  navButtonText: {
    color: "#f8fafc",
    fontWeight: "700",
    letterSpacing: 0.6,
  },
  disconnectButton: {
    marginTop: "auto",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: "#3a1f25",
  },
  disconnectText: {
    color: "#fecaca",
    fontWeight: "700",
  },
  content: {
    flex: 1,
  },
});
