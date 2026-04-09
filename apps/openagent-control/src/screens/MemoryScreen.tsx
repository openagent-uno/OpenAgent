import React, { startTransition, useEffect, useDeferredValue, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { OpenAgentClient, type MemoryGraphEdge, type MemoryGraphNode } from "@openagent/client-core";

interface Props {
  baseUrl: string;
}

interface TreeNode {
  name: string;
  path: string;
  type: "directory" | "file";
  children?: TreeNode[];
}

function GraphView({
  nodes,
  edges,
  onSelect,
}: {
  nodes: MemoryGraphNode[];
  edges: MemoryGraphEdge[];
  onSelect(path: string): void;
}) {
  const radius = 170;
  const centerX = 220;
  const centerY = 220;
  const layout = new Map<string, { x: number; y: number }>();
  nodes.forEach((node, index) => {
    const angle = (index / Math.max(nodes.length, 1)) * Math.PI * 2;
    layout.set(node.id, {
      x: centerX + Math.cos(angle) * radius,
      y: centerY + Math.sin(angle) * radius,
    });
  });

  return (
    <View style={styles.graphCard}>
      <Text style={styles.panelTitle}>Vault Graph</Text>
      <svg width="440" height="440" viewBox="0 0 440 440">
        {edges.map((edge, index) => {
          const source = layout.get(edge.source);
          const target = layout.get(edge.target);
          if (!source || !target) {
            return null;
          }
          return (
            <line
              key={`${edge.source}-${edge.target}-${index}`}
              x1={source.x}
              y1={source.y}
              x2={target.x}
              y2={target.y}
              stroke="#263346"
              strokeWidth="1"
            />
          );
        })}
        {nodes.map((node) => {
          const point = layout.get(node.id)!;
          return (
            <g key={node.id} onClick={() => onSelect(node.path)}>
              <circle cx={point.x} cy={point.y} r="10" fill="#4ea8de" />
              <text x={point.x + 14} y={point.y + 4} fill="#e2e8f0" fontSize="12">
                {node.label}
              </text>
            </g>
          );
        })}
      </svg>
    </View>
  );
}

export function MemoryScreen({ baseUrl }: Props) {
  const client = new OpenAgentClient(baseUrl);
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [graph, setGraph] = useState<{ nodes: MemoryGraphNode[]; edges: MemoryGraphEdge[] }>({
    nodes: [],
    edges: [],
  });
  const [selectedPath, setSelectedPath] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [renamePath, setRenamePath] = useState("");
  const [newPath, setNewPath] = useState("inbox/new-note.md");
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<Record<string, any>[]>([]);
  const deferredSearch = useDeferredValue(search);

  async function reload() {
    const [treeResponse, graphResponse] = await Promise.all([
      client.memoryTree(),
      client.memoryGraph(),
    ]);
    setTree(treeResponse.items as unknown as TreeNode[]);
    setGraph(graphResponse);
  }

  async function openNote(path: string) {
    const note = await client.readNote(path);
    setSelectedPath(path);
    setRenamePath(path);
    setNoteContent(String(note.content ?? ""));
  }

  useEffect(() => {
    void reload();
  }, [baseUrl]);

  useEffect(() => {
    if (!deferredSearch.trim()) {
      setSearchResults([]);
      return;
    }
    void client.searchMemory(deferredSearch).then((result) => {
      startTransition(() => setSearchResults(result.items as Record<string, any>[]));
    });
  }, [deferredSearch, baseUrl]);

  function renderNode(node: TreeNode, depth = 0): React.ReactNode {
    return (
      <View key={node.path || node.name}>
        <Pressable
          style={[styles.treeNode, { paddingLeft: 12 + depth * 16 }]}
          onPress={() => {
            if (node.type === "file") {
              void openNote(node.path);
            }
          }}
        >
          <Text style={styles.treeText}>
            {node.type === "directory" ? "▸" : "•"} {node.name}
          </Text>
        </Pressable>
        {node.children?.map((child) => renderNode(child, depth + 1))}
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.leftRail}>
        <Text style={styles.panelTitle}>Memory Browser</Text>
        <TextInput
          style={styles.input}
          value={search}
          onChangeText={setSearch}
          placeholder="Search notes"
          placeholderTextColor="#64748b"
        />
        {searchResults.length > 0 ? (
          <ScrollView style={styles.resultsCard}>
            {searchResults.map((result) => (
              <Pressable key={String(result.path)} style={styles.resultItem} onPress={() => void openNote(String(result.path))}>
                <Text style={styles.resultTitle}>{String(result.path)}</Text>
                <Text style={styles.resultSnippet}>{String(result.snippet ?? "")}</Text>
              </Pressable>
            ))}
          </ScrollView>
        ) : null}
        <ScrollView style={styles.treeCard}>{tree.map((node) => renderNode(node))}</ScrollView>
      </View>

      <View style={styles.editorPanel}>
        <View style={styles.editorHeader}>
          <Text style={styles.panelTitle}>{selectedPath || "Select a note"}</Text>
          <Pressable
            style={styles.primaryButton}
            onPress={async () => {
              if (!selectedPath) {
                await client.writeNote(newPath, "# New note\n");
                await reload();
                await openNote(newPath);
                return;
              }
              await client.writeNote(selectedPath, noteContent);
              await reload();
            }}
          >
            <Text style={styles.buttonText}>{selectedPath ? "Save Note" : "Create Note"}</Text>
          </Pressable>
        </View>

        <TextInput
          style={[styles.input, styles.editorInput]}
          multiline
          value={noteContent}
          onChangeText={setNoteContent}
          placeholder="# Markdown note"
          placeholderTextColor="#64748b"
        />
        <View style={styles.inlineRow}>
          <TextInput
            style={[styles.input, styles.inlineInput]}
            value={renamePath}
            onChangeText={setRenamePath}
            placeholder="folder/note.md"
            placeholderTextColor="#64748b"
          />
          <Pressable
            style={styles.secondaryButton}
            onPress={async () => {
              if (!selectedPath) {
                return;
              }
              const renamed = await client.renameNote(selectedPath, renamePath);
              setSelectedPath(String(renamed.path ?? renamePath));
              await reload();
            }}
          >
            <Text style={styles.buttonText}>Rename</Text>
          </Pressable>
          <Pressable
            style={styles.dangerButton}
            onPress={async () => {
              if (!selectedPath) {
                return;
              }
              await client.deleteNote(selectedPath);
              setSelectedPath("");
              setRenamePath("");
              setNoteContent("");
              await reload();
            }}
          >
            <Text style={styles.buttonText}>Delete</Text>
          </Pressable>
        </View>
        <TextInput
          style={[styles.input, styles.inlineInput]}
          value={newPath}
          onChangeText={setNewPath}
          placeholder="inbox/new-note.md"
          placeholderTextColor="#64748b"
        />
      </View>

      <ScrollView style={styles.graphPanel}>
        <GraphView
          nodes={graph.nodes}
          edges={graph.edges}
          onSelect={(path) => {
            void openNote(path);
          }}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, flexDirection: "row", backgroundColor: "#0d131b" },
  leftRail: {
    width: 320,
    borderRightWidth: 1,
    borderRightColor: "#1f2937",
    padding: 18,
    gap: 12,
  },
  editorPanel: { flex: 1, padding: 18, gap: 12 },
  graphPanel: {
    width: 500,
    borderLeftWidth: 1,
    borderLeftColor: "#1f2937",
    padding: 18,
  },
  panelTitle: { color: "#f8fafc", fontWeight: "800", fontSize: 18 },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#263346",
    backgroundColor: "#0b1320",
    color: "#f8fafc",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  editorInput: {
    flex: 1,
    minHeight: 320,
    textAlignVertical: "top" as const,
    fontFamily: "Menlo",
  },
  treeCard: { flex: 1, borderRadius: 14, backgroundColor: "#101822", paddingVertical: 8 },
  resultsCard: { maxHeight: 180, borderRadius: 14, backgroundColor: "#101822", paddingVertical: 8 },
  treeNode: { paddingVertical: 10, paddingRight: 12 },
  treeText: { color: "#cbd5e1" },
  resultItem: { paddingHorizontal: 12, paddingVertical: 10, gap: 4 },
  resultTitle: { color: "#f8fafc", fontWeight: "700" },
  resultSnippet: { color: "#94a3b8", fontSize: 12 },
  editorHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  inlineRow: { flexDirection: "row", gap: 12, alignItems: "center" },
  inlineInput: { flex: 1 },
  primaryButton: {
    alignSelf: "flex-start",
    backgroundColor: "#24597e",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  secondaryButton: {
    backgroundColor: "#1d2938",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dangerButton: {
    backgroundColor: "#42232b",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  buttonText: { color: "#f8fafc", fontWeight: "700" },
  graphCard: {
    borderRadius: 18,
    backgroundColor: "#101822",
    borderWidth: 1,
    borderColor: "#1f2937",
    padding: 18,
    gap: 10,
  },
});
