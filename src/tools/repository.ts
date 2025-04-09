/**
 * Repository Tools
 * ===============
 *
 * MCP tools for Git repository operations.
 * MCP 工具，用于 Git 仓库操作。
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { GitService } from "../services/git-service.js";
import { Schemas, PathValidation } from "../utils/validation.js";

/**
 * Registers repository tools with the MCP server
 * 向 MCP 服务器注册仓库工具
 *
 * @param server - MCP server instance
 * @param server - MCP 服务器实例
 */
export function setupRepositoryTools(server: McpServer): void {
  // Initialize a new Git repository
  // 初始化一个新的 Git 仓库
  server.tool(
    "git_init",
    "初始化一个新的 Git 仓库。在指定路径创建必要的目录结构和 Git 元数据。可以创建一个带有工作目录的标准仓库或一个裸仓库（通常用于集中式仓库）。默认创建一个 'main' 分支。",
    {
      path: z
        .string()
        .min(1, "需要提供仓库路径")
        .describe("初始化 Git 仓库的路径"),
      bare: z
        .boolean()
        .optional()
        .default(false)
        .describe("是否创建一个没有工作目录的裸仓库"),
      initialBranch: z
        .string()
        .optional()
        .default("main")
        .describe("初始分支的名称（默认为 'main'）"),
    },
    async ({ path, bare, initialBranch }) => {
      try {
        const normalizedPath = PathValidation.normalizePath(path);
        const gitService = new GitService(normalizedPath);

        const result = await gitService.initRepo(bare, initialBranch);

        if (!result.resultSuccessful) {
          return {
            content: [
              {
                type: "text",
                text: `错误: ${result.resultError.errorMessage}`,
              },
            ],
            isError: true,
          };
        }

        return {
          content: [
            {
              type: "text",
              text: `成功初始化 ${
                bare ? "裸 " : ""
              }Git 仓库，初始分支为 '${initialBranch}'，路径为: ${normalizedPath}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `错误: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Clone a Git repository
  // 克隆一个 Git 仓库
  server.tool(
    "git_clone",
    "克隆一个 Git 仓库。从远程位置下载一个仓库并创建一个包含所有历史记录的本地副本。支持指定分支、创建浅克隆等。",
    {
      url: z.string().url("无效的仓库 URL").describe("要克隆的 Git 仓库的 URL"),
      path: z
        .string()
        .min(1, "需要提供目标路径")
        .describe("克隆仓库的本地路径"),
      branch: z.string().optional().describe("克隆后要检出的特定分支"),
      depth: z
        .number()
        .positive()
        .optional()
        .describe("创建具有指定提交数量的浅克隆"),
    },
    async ({ url, path, branch, depth }) => {
      try {
        const normalizedPath = PathValidation.normalizePath(path);
        const gitService = new GitService(normalizedPath);

        const options: any = {};
        if (branch) options.branch = branch;
        if (depth) options.depth = depth;

        const result = await gitService.cloneRepo(url, options);

        if (!result.resultSuccessful) {
          return {
            content: [
              {
                type: "text",
                text: `错误: ${result.resultError.errorMessage}`,
              },
            ],
            isError: true,
          };
        }

        return {
          content: [
            {
              type: "text",
              text: `成功从 ${url} 克隆仓库到 ${normalizedPath}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `错误: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Get repository status
  // 获取仓库状态
  server.tool(
    "git_status",
    "获取仓库状态。显示工作树状态，包括已跟踪/未跟踪的文件、修改、暂存的更改和当前分支信息。",
    {
      path: z.string().min(1, "需要提供仓库路径").describe("Git 仓库的路径"),
    },
    async ({ path }) => {
      try {
        const normalizedPath = PathValidation.normalizePath(path);
        const gitService = new GitService(normalizedPath);

        // Check if this is a git repository
        // 检查这是否是一个 git 仓库
        const isRepo = await gitService.isGitRepository();
        if (!isRepo) {
          return {
            content: [
              {
                type: "text",
                text: `错误: 这不是一个 Git 仓库: ${normalizedPath}`,
              },
            ],
            isError: true,
          };
        }

        const result = await gitService.getStatus();

        if (!result.resultSuccessful) {
          return {
            content: [
              {
                type: "text",
                text: `错误: ${result.resultError.errorMessage}`,
              },
            ],
            isError: true,
          };
        }

        const status = result.resultData;
        const isClean = status.isClean();

        let statusOutput = `仓库路径: ${normalizedPath} 的状态\n当前分支: ${status.current}\n`;

        if (status.tracking) {
          statusOutput += `Tracking: ${status.tracking}\n`;
        }

        if (isClean) {
          statusOutput += `\nWorking directory clean`;
        } else {
          // Show untracked files
          // 显示未跟踪的文件
          if (status.not_added && status.not_added.length > 0) {
            statusOutput += `\n未跟踪的文件:\n  ${status.not_added.join(
              "\n  "
            )}\n`;
          }

          if (status.created.length > 0) {
            statusOutput += `\n新文件:\n  ${status.created.join("\n  ")}\n`;
          }

          if (status.modified.length > 0) {
            statusOutput += `\n修改的文件:\n  ${status.modified.join(
              "\n  "
            )}\n`;
          }

          if (status.deleted.length > 0) {
            statusOutput += `\n删除的文件:\n  ${status.deleted.join("\n  ")}\n`;
          }

          if (status.renamed.length > 0) {
            statusOutput += `\n重命名的文件:\n  ${status.renamed.join(
              "\n  "
            )}\n`;
          }

          if (status.conflicted.length > 0) {
            statusOutput += `\n冲突的文件:\n  ${status.conflicted.join(
              "\n  "
            )}\n`;
          }
        }

        return {
          content: [
            {
              type: "text",
              text: statusOutput,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `错误: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
