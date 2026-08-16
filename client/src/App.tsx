import { useState } from "react";
import { checkSystem, Category } from "./api.js";

// UI states: idle, loading, success, error.
type UiState = "idle" | "loading" | "success" | "error";

export default function App() {
  const [state, setState] = useState<UiState>("idle");
  const [categories, setCategories] = useState<Category[]>([]);

  async function handleCheck() {
    setState("loading");
    try {
      const result = await checkSystem();
      setCategories(result.categories);
      setState("success");
    } catch {
      setState("error");
    }
  }

  return (
    <div className="container py-5" style={{ maxWidth: 640 }}>
      <h1 className="h3 mb-4">
        TokTickIT <span className="text-success">IT Service Desk</span>
      </h1>

      <button className="btn btn-success" onClick={handleCheck} disabled={state === "loading"}>
        {state === "loading" ? "Loading…" : "Check System"}
      </button>

      {state === "loading" && <p className="mt-3 text-secondary">Loading…</p>}

      {state === "success" && (
        <div className="mt-3">
          <p className="mb-1">
            <strong>System Status:</strong> <span className="text-success">Online</span>
          </p>
          <p className="mb-1">
            <strong>Supported Request Categories:</strong>
          </p>
          <ol className="mb-0">
            {categories.map((c) => (
              <li key={c.id}>{c.name}</li>
            ))}
          </ol>
        </div>
      )}

      {state === "error" && (
        <div className="mt-3">
          <p className="mb-1">
            <strong>System Status:</strong> <span className="text-danger">Offline</span>
          </p>
          <p className="text-danger mb-0">Unable to connect to TokTickIT API</p>
        </div>
      )}
    </div>
  );
}
