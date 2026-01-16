import { describe, test, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ToolCallBadge } from "../ToolCallBadge";

afterEach(() => {
  cleanup();
});

describe("ToolCallBadge", () => {
  describe("str_replace_editor tool", () => {
    test("renders Creating message for create command", () => {
      const toolInvocation = {
        toolCallId: "1",
        toolName: "str_replace_editor",
        args: { command: "create", path: "/App.jsx" },
        state: "call" as const,
      };

      render(<ToolCallBadge toolInvocation={toolInvocation} />);
      expect(screen.getByText("Creating /App.jsx")).toBeDefined();
    });

    test("renders Viewing message for view command", () => {
      const toolInvocation = {
        toolCallId: "2",
        toolName: "str_replace_editor",
        args: { command: "view", path: "/components/Button.jsx" },
        state: "call" as const,
      };

      render(<ToolCallBadge toolInvocation={toolInvocation} />);
      expect(screen.getByText("Viewing /components/Button.jsx")).toBeDefined();
    });

    test("renders Editing message for str_replace command", () => {
      const toolInvocation = {
        toolCallId: "3",
        toolName: "str_replace_editor",
        args: { command: "str_replace", path: "/App.jsx" },
        state: "call" as const,
      };

      render(<ToolCallBadge toolInvocation={toolInvocation} />);
      expect(screen.getByText("Editing /App.jsx")).toBeDefined();
    });

    test("renders Editing message for insert command", () => {
      const toolInvocation = {
        toolCallId: "4",
        toolName: "str_replace_editor",
        args: { command: "insert", path: "/App.jsx" },
        state: "call" as const,
      };

      render(<ToolCallBadge toolInvocation={toolInvocation} />);
      expect(screen.getByText("Editing /App.jsx")).toBeDefined();
    });

    test("renders Attempting undo message for undo_edit command", () => {
      const toolInvocation = {
        toolCallId: "5",
        toolName: "str_replace_editor",
        args: { command: "undo_edit" },
        state: "call" as const,
      };

      render(<ToolCallBadge toolInvocation={toolInvocation} />);
      expect(screen.getByText("Attempting undo")).toBeDefined();
    });

    test("shows spinner when state is call", () => {
      const toolInvocation = {
        toolCallId: "6",
        toolName: "str_replace_editor",
        args: { command: "create", path: "/App.jsx" },
        state: "call" as const,
      };

      const { container } = render(
        <ToolCallBadge toolInvocation={toolInvocation} />
      );
      const spinner = container.querySelector(".animate-spin");
      expect(spinner).toBeDefined();
    });

    test("shows green dot when state is result", () => {
      const toolInvocation = {
        toolCallId: "7",
        toolName: "str_replace_editor",
        args: { command: "create", path: "/App.jsx" },
        state: "result" as const,
        result: "Success",
      };

      const { container } = render(
        <ToolCallBadge toolInvocation={toolInvocation} />
      );
      const greenDot = container.querySelector(".bg-emerald-500");
      expect(greenDot).toBeDefined();
    });
  });

  describe("file_manager tool", () => {
    test("renders Renaming message for rename command", () => {
      const toolInvocation = {
        toolCallId: "8",
        toolName: "file_manager",
        args: {
          command: "rename",
          path: "/old.jsx",
          new_path: "/new.jsx",
        },
        state: "call" as const,
      };

      render(<ToolCallBadge toolInvocation={toolInvocation} />);
      expect(screen.getByText("Renaming /old.jsx")).toBeDefined();
    });

    test("renders Deleting message for delete command", () => {
      const toolInvocation = {
        toolCallId: "9",
        toolName: "file_manager",
        args: { command: "delete", path: "/temp.jsx" },
        state: "call" as const,
      };

      render(<ToolCallBadge toolInvocation={toolInvocation} />);
      expect(screen.getByText("Deleting /temp.jsx")).toBeDefined();
    });

    test("shows spinner when state is call", () => {
      const toolInvocation = {
        toolCallId: "10",
        toolName: "file_manager",
        args: { command: "delete", path: "/temp.jsx" },
        state: "call" as const,
      };

      const { container } = render(
        <ToolCallBadge toolInvocation={toolInvocation} />
      );
      const spinner = container.querySelector(".animate-spin");
      expect(spinner).toBeDefined();
    });

    test("shows green dot when state is result", () => {
      const toolInvocation = {
        toolCallId: "11",
        toolName: "file_manager",
        args: { command: "delete", path: "/temp.jsx" },
        state: "result" as const,
        result: { success: true },
      };

      const { container } = render(
        <ToolCallBadge toolInvocation={toolInvocation} />
      );
      const greenDot = container.querySelector(".bg-emerald-500");
      expect(greenDot).toBeDefined();
    });
  });

  describe("edge cases", () => {
    test("handles unknown command gracefully", () => {
      const toolInvocation = {
        toolCallId: "12",
        toolName: "str_replace_editor",
        args: { command: "unknown_command", path: "/test.jsx" },
        state: "call" as const,
      };

      render(<ToolCallBadge toolInvocation={toolInvocation} />);
      expect(screen.getByText("Processing file")).toBeDefined();
    });

    test("handles missing path argument", () => {
      const toolInvocation = {
        toolCallId: "13",
        toolName: "str_replace_editor",
        args: { command: "create" },
        state: "call" as const,
      };

      render(<ToolCallBadge toolInvocation={toolInvocation} />);
      expect(screen.getByText(/^Creating\s*$/)).toBeDefined();
    });

    test("handles unknown tool name", () => {
      const toolInvocation = {
        toolCallId: "14",
        toolName: "unknown_tool",
        args: {},
        state: "call" as const,
      };

      render(<ToolCallBadge toolInvocation={toolInvocation} />);
      expect(screen.getByText("unknown_tool")).toBeDefined();
    });

    test("handles long file paths", () => {
      const longPath =
        "/very/long/path/to/components/nested/deeply/Component.jsx";
      const toolInvocation = {
        toolCallId: "15",
        toolName: "str_replace_editor",
        args: { command: "create", path: longPath },
        state: "call" as const,
      };

      render(<ToolCallBadge toolInvocation={toolInvocation} />);
      expect(screen.getByText(`Creating ${longPath}`)).toBeDefined();
    });
  });
});
