import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { OpenAgentClient, type ConnectionProfile } from "@openagent/client-core";

interface Props {
  onConnect(profile: ConnectionProfile): void;
}

export function ConnectionScreen({ onConnect }: Props) {
  const [mode, setMode] = useState<"local" | "remote">("local");
  const [label, setLabel] = useState("Local OpenAgent");
  const [baseUrl, setBaseUrl] = useState("http://127.0.0.1:8765");
  const [host, setHost] = useState("");
  const [user, setUser] = useState("");
  const [port, setPort] = useState("22");
  const [localPort, setLocalPort] = useState("8765");
  const [remotePort, setRemotePort] = useState("8765");
  const [identityFile, setIdentityFile] = useState("");
  const [status, setStatus] = useState<string>("");

  const isDesktop = Boolean(window.openAgentDesktop?.isDesktop);

  async function waitForHealth(baseUrl: string) {
    const client = new OpenAgentClient(baseUrl);
    let lastError: unknown;
    for (let attempt = 0; attempt < 20; attempt += 1) {
      try {
        return await client.health();
      } catch (error) {
        lastError = error;
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
    }
    throw lastError instanceof Error ? lastError : new Error(String(lastError ?? "Connection failed"));
  }

  async function verifyAndConnect(profile: ConnectionProfile) {
    const health = await waitForHealth(profile.baseUrl);
    setStatus(`Connected to ${health.configPath}`);
    onConnect(profile);
  }

  async function handleLocalConnect() {
    try {
      await verifyAndConnect({
        label,
        mode: "local",
        baseUrl,
      });
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
    }
  }

  async function handleRemoteConnect() {
    let tunnelId: string | undefined;
    try {
      let nextBaseUrl = baseUrl;
      const ssh = mode === "remote" ? window.openAgentDesktop?.ssh : undefined;
      if (ssh && host) {
        const result = await ssh.openTunnel({
          host,
          user: user || undefined,
          port: Number(port || "22"),
          localPort: Number(localPort || "8765"),
          remotePort: Number(remotePort || "8765"),
          identityFile: identityFile || undefined,
        });
        tunnelId = result.id;
        nextBaseUrl = `http://127.0.0.1:${result.localPort}`;
        setStatus(`SSH tunnel ready on ${nextBaseUrl}`);
      }
      await verifyAndConnect({
        label: label || `Remote ${host}`,
        mode: "remote",
        baseUrl: nextBaseUrl,
        tunnelId,
        ssh: host
          ? {
              host,
              user: user || undefined,
              port: Number(port || "22"),
              localPort: Number(localPort || "8765"),
              remotePort: Number(remotePort || "8765"),
              identityFile: identityFile || undefined,
            }
          : undefined,
      });
    } catch (error) {
      if (tunnelId && window.openAgentDesktop?.ssh) {
        try {
          await window.openAgentDesktop.ssh.closeTunnel(tunnelId);
        } catch {
          // Ignore tunnel cleanup failures after a connect error.
        }
      }
      setStatus(error instanceof Error ? error.message : String(error));
    }
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Connect To OpenAgent</Text>
      <Text style={styles.subtitle}>
        Pick a local service or route through SSH to a remote OpenAgent API.
      </Text>

      <View style={styles.modeRow}>
        {(["local", "remote"] as const).map((value) => (
          <Pressable
            key={value}
            style={[styles.modeCard, mode === value && styles.modeCardActive]}
            onPress={() => setMode(value)}
          >
            <Text style={styles.modeTitle}>{value === "local" ? "Local machine" : "Remote machine"}</Text>
            <Text style={styles.modeBody}>
              {value === "local"
                ? "Use the localhost OpenAgent API and manage the local service from Electron."
                : "Use an SSH tunnel in Electron, or connect to an already-open tunnel in the browser."}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.panel}>
        <Text style={styles.label}>Connection label</Text>
        <TextInput style={styles.input} value={label} onChangeText={setLabel} placeholder="My OpenAgent" placeholderTextColor="#64748b" />
        <Text style={styles.label}>Base URL</Text>
        <TextInput style={styles.input} value={baseUrl} onChangeText={setBaseUrl} placeholder="http://127.0.0.1:8765" placeholderTextColor="#64748b" />

        {mode === "remote" ? (
          <>
            <Text style={styles.sectionTitle}>SSH Tunnel</Text>
            <TextInput style={styles.input} value={host} onChangeText={setHost} placeholder="host.example.com" placeholderTextColor="#64748b" />
            <TextInput style={styles.input} value={user} onChangeText={setUser} placeholder="user" placeholderTextColor="#64748b" />
            <TextInput style={styles.input} value={port} onChangeText={setPort} placeholder="22" placeholderTextColor="#64748b" />
            <TextInput style={styles.input} value={localPort} onChangeText={setLocalPort} placeholder="8765" placeholderTextColor="#64748b" />
            <TextInput style={styles.input} value={remotePort} onChangeText={setRemotePort} placeholder="8765" placeholderTextColor="#64748b" />
            <TextInput style={styles.input} value={identityFile} onChangeText={setIdentityFile} placeholder="~/.ssh/id_ed25519" placeholderTextColor="#64748b" />
          </>
        ) : null}

        <View style={styles.buttonRow}>
          {mode === "local" && isDesktop ? (
            <>
              <Pressable
                style={styles.secondaryButton}
                onPress={async () => setStatus(await window.openAgentDesktop!.service.status())}
              >
                <Text style={styles.buttonText}>Check Local Status</Text>
              </Pressable>
              <Pressable
                style={styles.secondaryButton}
                onPress={async () => setStatus(await window.openAgentDesktop!.service.start())}
              >
                <Text style={styles.buttonText}>Start Local Service</Text>
              </Pressable>
            </>
          ) : null}
          <Pressable
            style={styles.primaryButton}
            onPress={() => {
              void (mode === "local" ? handleLocalConnect() : handleRemoteConnect());
            }}
          >
            <Text style={styles.buttonText}>Connect</Text>
          </Pressable>
        </View>

        <Text style={styles.status}>{status || "Waiting for connection details."}</Text>
        {!isDesktop ? (
          <Text style={styles.help}>
            Browser mode is connect-only. For SSH tunneling or local service management, use the Electron shell.
          </Text>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0c1117" },
  content: { padding: 32, gap: 18 },
  title: { color: "#f8fafc", fontSize: 34, fontWeight: "800" },
  subtitle: { color: "#94a3b8", fontSize: 16, maxWidth: 760 },
  modeRow: { flexDirection: "row", gap: 16, flexWrap: "wrap" },
  modeCard: {
    width: 340,
    borderRadius: 20,
    backgroundColor: "#141c26",
    borderWidth: 1,
    borderColor: "#213043",
    padding: 20,
    gap: 8,
  },
  modeCardActive: {
    borderColor: "#4ea8de",
    backgroundColor: "#132938",
  },
  modeTitle: { color: "#f8fafc", fontWeight: "800", fontSize: 18 },
  modeBody: { color: "#94a3b8", lineHeight: 21 },
  panel: {
    maxWidth: 760,
    borderRadius: 20,
    backgroundColor: "#101822",
    borderWidth: 1,
    borderColor: "#1e293b",
    padding: 24,
    gap: 12,
  },
  label: { color: "#cbd5e1", fontSize: 13, fontWeight: "700" },
  sectionTitle: { color: "#f8fafc", fontSize: 16, fontWeight: "700", marginTop: 8 },
  input: {
    backgroundColor: "#0b1320",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#263346",
    color: "#f8fafc",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  buttonRow: { flexDirection: "row", gap: 12, flexWrap: "wrap", marginTop: 10 },
  primaryButton: {
    backgroundColor: "#24597e",
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  secondaryButton: {
    backgroundColor: "#1c2836",
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  buttonText: { color: "#f8fafc", fontWeight: "700" },
  status: { color: "#93c5fd", marginTop: 10 },
  help: { color: "#f59e0b", lineHeight: 20 },
});
