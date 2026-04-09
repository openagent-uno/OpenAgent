from __future__ import annotations

import tempfile
import unittest
import importlib.util
from pathlib import Path

HAS_YAML = importlib.util.find_spec("yaml") is not None

if HAS_YAML:
    from openagent.api.memory import MemoryStore
else:  # pragma: no cover - env guard
    MemoryStore = None


@unittest.skipUnless(HAS_YAML, "PyYAML is not installed in this environment")
class MemoryStoreTests(unittest.TestCase):
    def test_graph_extracts_nodes_and_edges_from_wikilinks(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "alpha.md").write_text(
                "---\n"
                "title: Alpha\n"
                "tags: [core]\n"
                "---\n\n"
                "Links to [[beta]]\n",
                encoding="utf-8",
            )
            (root / "beta.md").write_text("# Beta\n", encoding="utf-8")

            store = MemoryStore(root)
            graph = store.graph()

            node_ids = {node["id"] for node in graph["nodes"]}
            self.assertEqual(node_ids, {"alpha.md", "beta.md"})
            self.assertEqual(graph["edges"][0]["source"], "alpha.md")
            self.assertEqual(graph["edges"][0]["target"], "beta.md")


if __name__ == "__main__":
    unittest.main()
