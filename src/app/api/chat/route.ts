import type { FileNode } from "@/lib/file-system";
import { VirtualFileSystem } from "@/lib/file-system";
import { streamText, convertToModelMessages, UIMessage, stepCountIs } from "ai";
import { buildStrReplaceTool } from "@/lib/tools/str-replace";
import { buildFileManagerTool } from "@/lib/tools/file-manager";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getLanguageModel } from "@/lib/provider";
import { generationPrompt } from "@/lib/prompts/generation";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log("[chat] request body keys:", Object.keys(body));

    const {
      messages,
      files,
      projectId,
    }: { messages: UIMessage[]; files: Record<string, FileNode>; projectId?: string } = body;

    console.log("[chat] messages count:", messages?.length);
    console.log("[chat] files keys:", files ? Object.keys(files).length : "none");

    // Reconstruct the VirtualFileSystem from serialized data
    const fileSystem = new VirtualFileSystem();
    if (files) {
      fileSystem.deserializeFromNodes(files);
    }

    const tools = {
      str_replace_editor: buildStrReplaceTool(fileSystem),
      file_manager: buildFileManagerTool(fileSystem),
    } as any;

    let modelMessages;
    try {
      modelMessages = convertToModelMessages(messages);
    } catch (e) {
      console.error("[chat] convertToModelMessages failed:", e);
      throw e;
    }

    const model = getLanguageModel() as any;
    const isMockProvider = !process.env.ANTHROPIC_API_KEY;

    const result = streamText({
      model,
      system: generationPrompt,
      messages: modelMessages,
      maxOutputTokens: 10_000,
      stopWhen: stepCountIs(isMockProvider ? 4 : 40),
      onError: (err: any) => {
        console.error("[chat] streamText error:", err);
      },
      tools,
      onFinish: async () => {
        if (projectId) {
          try {
            const session = await getSession();
            if (!session) return;
            await prisma.project.update({
              where: { id: projectId, userId: session.userId },
              data: {
                messages: JSON.stringify(messages),
                data: JSON.stringify(fileSystem.serialize()),
              },
            });
          } catch (error) {
            console.error("[chat] Failed to save project:", error);
          }
        }
      },
    });

    return result.toUIMessageStreamResponse();
  } catch (err) {
    console.error("[chat] Unhandled error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export const maxDuration = 120;
