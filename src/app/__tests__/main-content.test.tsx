import { test, expect, vi, afterEach, describe } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MainContent } from "../main-content";

// Mock complex providers
vi.mock("@/lib/contexts/file-system-context", () => ({
  FileSystemProvider: ({ children }: any) => <>{children}</>,
  useFileSystem: vi.fn().mockReturnValue({
    getAllFiles: vi.fn().mockReturnValue(new Map()),
    refreshTrigger: 0,
  }),
}));

vi.mock("@/lib/contexts/chat-context", () => ({
  ChatProvider: ({ children }: any) => <>{children}</>,
  useChat: vi.fn().mockReturnValue({
    messages: [],
    input: "",
    handleInputChange: vi.fn(),
    handleSubmit: vi.fn(),
    status: "idle",
  }),
}));

vi.mock("@/components/chat/ChatInterface", () => ({
  ChatInterface: () => <div data-testid="chat-interface">Chat</div>,
}));

vi.mock("@/components/editor/FileTree", () => ({
  FileTree: () => <div data-testid="file-tree">FileTree</div>,
}));

vi.mock("@/components/editor/CodeEditor", () => ({
  CodeEditor: () => <div data-testid="code-editor">CodeEditor</div>,
}));

vi.mock("@/components/preview/PreviewFrame", () => ({
  PreviewFrame: () => <div data-testid="preview-frame">Preview</div>,
}));

vi.mock("@/components/HeaderActions", () => ({
  HeaderActions: () => <div data-testid="header-actions">HeaderActions</div>,
}));

vi.mock("@/components/ui/resizable", () => ({
  ResizablePanelGroup: ({ children, className }: any) => (
    <div className={className}>{children}</div>
  ),
  ResizablePanel: ({ children, className }: any) => (
    <div className={className}>{children}</div>
  ),
  ResizableHandle: () => <div />,
}));

afterEach(() => {
  cleanup();
});

describe("MainContent toggle buttons", () => {
  test("renders with preview tab active by default", () => {
    render(<MainContent />);

    // Should show preview by default
    expect(screen.getByTestId("preview-frame")).toBeDefined();
    // Should not show code editor
    expect(screen.queryByTestId("code-editor")).toBeNull();
  });

  test("clicking Code tab switches to code view", async () => {
    const user = userEvent.setup();
    render(<MainContent />);

    // Initially showing preview
    expect(screen.getByTestId("preview-frame")).toBeDefined();

    // Click Code tab
    const codeTab = screen.getByRole("tab", { name: "Code" });
    await user.click(codeTab);

    // Now should show code editor, not preview
    expect(screen.getByTestId("code-editor")).toBeDefined();
    expect(screen.queryByTestId("preview-frame")).toBeNull();
  });

  test("clicking Preview tab switches back to preview view", async () => {
    const user = userEvent.setup();
    render(<MainContent />);

    // Click Code tab first
    const codeTab = screen.getByRole("tab", { name: "Code" });
    await user.click(codeTab);

    // Should be in code view
    expect(screen.getByTestId("code-editor")).toBeDefined();

    // Then click Preview tab
    const previewTab = screen.getByRole("tab", { name: "Preview" });
    await user.click(previewTab);

    // Should be back to preview
    expect(screen.getByTestId("preview-frame")).toBeDefined();
    expect(screen.queryByTestId("code-editor")).toBeNull();
  });

  test("toggle can be repeated multiple times", async () => {
    const user = userEvent.setup();
    render(<MainContent />);

    const codeTab = screen.getByRole("tab", { name: "Code" });
    const previewTab = screen.getByRole("tab", { name: "Preview" });

    // Toggle to code
    await user.click(codeTab);
    expect(screen.getByTestId("code-editor")).toBeDefined();

    // Toggle back to preview
    await user.click(previewTab);
    expect(screen.getByTestId("preview-frame")).toBeDefined();

    // Toggle to code again
    await user.click(codeTab);
    expect(screen.getByTestId("code-editor")).toBeDefined();
  });
});
