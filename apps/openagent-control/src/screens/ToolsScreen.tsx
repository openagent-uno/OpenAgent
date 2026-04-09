import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { OpenAgentClient } from "@openagent/client-core";

interface Props {
  baseUrl: string;
}

export function ToolsScreen({ baseUrl }: Props) {
  const client = new OpenAgentClient(baseUrl);
  const [status, setStatus] = useState("Loading...");
  const [config, setConfig] = useState<Record<string, any>>({});
  const [rawYaml, setRawYaml] = useState("");
  const [selectedMcp, setSelectedMcp] = useState<Record<string, any> | null>(null);
  const [mcpDraft, setMcpDraft] = useState("{}");

  async function reload() {
    const [runtime, parsed, raw, mcps] = await Promise.all([
      client.runtime(),
      client.getConfig(),
      client.getRawConfig(),
      client.listMcps(),
    ]);
    setStatus(runtime.serviceStatus);
    setConfig(parsed);
    setRawYaml(raw.content);
    const first = mcps.items[0] ?? null;
    setSelectedMcp((first as Record<string, any>) || null);
    setMcpDraft(first ? JSON.stringify(first, null, 2) : "{}");
  }

  useEffect(() => {
    void reload();
  }, [baseUrl]);

  const model = config.model ?? {};

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Tools & Config</Text>
      <Text style={styles.subtitle}>Service status: {status}</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Common Settings</Text>
        <Text style={styles.label}>System prompt</Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          multiline
          value={String(config.system_prompt ?? "")}
          onChangeText={(value) => setConfig((current) => ({ ...current, system_prompt: value }))}
          placeholder="You are My Agent..."
          placeholderTextColor="#64748b"
        />
        <Text style={styles.label}>Model provider</Text>
        <TextInput
          style={styles.input}
          value={String(model.provider ?? "")}
          onChangeText={(value) =>
            setConfig((current) => ({
              ...current,
              model: { ...(current.model ?? {}), provider: value },
            }))
          }
          placeholder="claude-cli"
          placeholderTextColor="#64748b"
        />
        <Text style={styles.label}>Model id</Text>
        <TextInput
          style={styles.input}
          value={String(model.model_id ?? "")}
          onChangeText={(value) =>
            setConfig((current) => ({
              ...current,
              model: { ...(current.model ?? {}), model_id: value },
            }))
          }
          placeholder="claude-sonnet-4-6"
          placeholderTextColor="#64748b"
        />
        <Text style={styles.label}>Disabled MCPs (comma separated)</Text>
        <TextInput
          style={styles.input}
          value={Array.isArray(config.mcp_disable) ? config.mcp_disable.join(", ") : ""}
          onChangeText={(value) =>
            setConfig((current) => ({
              ...current,
              mcp_disable: value.split(",").map((item) => item.trim()).filter(Boolean),
            }))
          }
          placeholder="computer-control"
          placeholderTextColor="#64748b"
        />
        <Pressable
          style={styles.primaryButton}
          onPress={async () => {
            await client.putConfig(config);
            await reload();
          }}
        >
          <Text style={styles.buttonText}>Save Common Settings</Text>
        </Pressable>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>MCP Entries</Text>
        <ScrollView horizontal contentContainerStyle={styles.mcpTabs}>
          {((config.mcp as Record<string, any>[]) ?? []).map((entry) => (
            <Pressable
              key={String(entry.name)}
              style={[
                styles.mcpChip,
                selectedMcp?.name === entry.name && styles.mcpChipActive,
              ]}
              onPress={() => {
                setSelectedMcp(entry);
                setMcpDraft(JSON.stringify(entry, null, 2));
              }}
            >
              <Text style={styles.buttonText}>{String(entry.name)}</Text>
            </Pressable>
          ))}
        </ScrollView>
        <TextInput
          style={[styles.input, styles.codeInput]}
          multiline
          value={mcpDraft}
          onChangeText={setMcpDraft}
          placeholder='{"name":"github","command":["github-mcp-server","stdio"]}'
          placeholderTextColor="#64748b"
        />
        <View style={styles.buttonRow}>
          <Pressable
            style={styles.primaryButton}
            onPress={async () => {
              const parsed = JSON.parse(mcpDraft);
              await client.upsertMcp(String(parsed.name), parsed);
              await reload();
            }}
          >
            <Text style={styles.buttonText}>Save MCP Entry</Text>
          </Pressable>
          {selectedMcp ? (
            <Pressable
              style={styles.secondaryButton}
              onPress={async () => {
                await client.deleteMcp(String(selectedMcp.name));
                setSelectedMcp(null);
                setMcpDraft("{}");
                await reload();
              }}
            >
              <Text style={styles.buttonText}>Delete Selected</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Raw YAML</Text>
        <TextInput
          style={[styles.input, styles.yamlInput]}
          multiline
          value={rawYaml}
          onChangeText={setRawYaml}
          placeholder="name: my-agent"
          placeholderTextColor="#64748b"
        />
        <Pressable
          style={styles.primaryButton}
          onPress={async () => {
            await client.putRawConfig(rawYaml);
            await reload();
          }}
        >
          <Text style={styles.buttonText}>Save Raw YAML</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0d131b" },
  content: { padding: 24, gap: 18 },
  title: { color: "#f8fafc", fontSize: 28, fontWeight: "800" },
  subtitle: { color: "#94a3b8" },
  section: {
    borderRadius: 18,
    backgroundColor: "#101822",
    borderWidth: 1,
    borderColor: "#1f2937",
    padding: 18,
    gap: 10,
  },
  sectionTitle: { color: "#f8fafc", fontWeight: "800", fontSize: 18 },
  label: { color: "#cbd5e1", fontWeight: "700", fontSize: 13 },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#263346",
    backgroundColor: "#0b1320",
    color: "#f8fafc",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  multiline: { minHeight: 120, textAlignVertical: "top" as const },
  codeInput: {
    minHeight: 220,
    textAlignVertical: "top" as const,
    fontFamily: "Menlo",
  },
  yamlInput: {
    minHeight: 320,
    textAlignVertical: "top" as const,
    fontFamily: "Menlo",
  },
  buttonRow: { flexDirection: "row", gap: 12, flexWrap: "wrap" },
  primaryButton: {
    alignSelf: "flex-start",
    backgroundColor: "#24597e",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  secondaryButton: {
    alignSelf: "flex-start",
    backgroundColor: "#42232b",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  buttonText: { color: "#f8fafc", fontWeight: "700" },
  mcpTabs: { gap: 10 },
  mcpChip: {
    backgroundColor: "#172230",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  mcpChipActive: { backgroundColor: "#24597e" },
});
