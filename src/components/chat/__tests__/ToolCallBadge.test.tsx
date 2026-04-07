import { test, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

afterEach(() => {
  cleanup();
});
import { ToolCallBadge } from "../ToolCallBadge";

function makeInvocation(
  toolName: string,
  args: Record<string, unknown>,
  state: string = "call",
  result?: unknown
) {
  return { toolCallId: "test-id", toolName, args, state, result };
}

// str_replace_editor — label derivation
test("shows 'Creating' label for str_replace_editor create command", () => {
  render(
    <ToolCallBadge
      toolInvocation={makeInvocation("str_replace_editor", { command: "create", path: "/App.jsx" })}
    />
  );
  expect(screen.getByText("Creating App.jsx")).toBeDefined();
});

test("shows 'Editing' label for str_replace_editor str_replace command", () => {
  render(
    <ToolCallBadge
      toolInvocation={makeInvocation("str_replace_editor", { command: "str_replace", path: "/App.jsx" })}
    />
  );
  expect(screen.getByText("Editing App.jsx")).toBeDefined();
});

test("shows 'Editing' label for str_replace_editor insert command", () => {
  render(
    <ToolCallBadge
      toolInvocation={makeInvocation("str_replace_editor", { command: "insert", path: "/Card.jsx" })}
    />
  );
  expect(screen.getByText("Editing Card.jsx")).toBeDefined();
});

test("shows 'Editing' label for str_replace_editor undo_edit command", () => {
  render(
    <ToolCallBadge
      toolInvocation={makeInvocation("str_replace_editor", { command: "undo_edit", path: "/Card.jsx" })}
    />
  );
  expect(screen.getByText("Editing Card.jsx")).toBeDefined();
});

test("shows 'Reading' label for str_replace_editor view command", () => {
  render(
    <ToolCallBadge
      toolInvocation={makeInvocation("str_replace_editor", { command: "view", path: "/App.jsx" })}
    />
  );
  expect(screen.getByText("Reading App.jsx")).toBeDefined();
});

// file_manager — label derivation
test("shows 'Renaming' label for file_manager rename command", () => {
  render(
    <ToolCallBadge
      toolInvocation={makeInvocation("file_manager", { command: "rename", path: "/Card.jsx", new_path: "/Card2.jsx" })}
    />
  );
  expect(screen.getByText("Renaming Card.jsx")).toBeDefined();
});

test("shows 'Deleting' label for file_manager delete command", () => {
  render(
    <ToolCallBadge
      toolInvocation={makeInvocation("file_manager", { command: "delete", path: "/Card.jsx" })}
    />
  );
  expect(screen.getByText("Deleting Card.jsx")).toBeDefined();
});

// Fallback
test("shows raw tool name when tool is unknown", () => {
  render(
    <ToolCallBadge
      toolInvocation={makeInvocation("some_unknown_tool", {})}
    />
  );
  expect(screen.getByText("some_unknown_tool")).toBeDefined();
});

// basename extraction
test("uses only the filename, not the full path", () => {
  render(
    <ToolCallBadge
      toolInvocation={makeInvocation("str_replace_editor", { command: "create", path: "/src/components/Button.tsx" })}
    />
  );
  expect(screen.getByText("Creating Button.tsx")).toBeDefined();
});

// State — in progress
test("shows spinner when state is not 'result'", () => {
  const { container } = render(
    <ToolCallBadge
      toolInvocation={makeInvocation("str_replace_editor", { command: "create", path: "/App.jsx" }, "call")}
    />
  );
  expect(container.querySelector(".animate-spin")).toBeDefined();
  expect(container.querySelector(".bg-emerald-500")).toBeNull();
});

// State — done
test("shows green dot and no spinner when state is 'result'", () => {
  const { container } = render(
    <ToolCallBadge
      toolInvocation={makeInvocation("str_replace_editor", { command: "create", path: "/App.jsx" }, "result", "ok")}
    />
  );
  expect(container.querySelector(".bg-emerald-500")).toBeDefined();
  expect(container.querySelector(".animate-spin")).toBeNull();
});
