/**
 * Branch Tools
 * 分支工具
 * ===========
 *
 * MCP tools for Git branch operations.
 * MCP 工具，用于 Git 分支操作。
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { GitService } from "../services/git-service.js";
import { Schemas, PathValidation } from "../utils/validation.js";

/**
 * Registers branch tools with the MCP server
 * 向 MCP 服务器注册分支工具
 *
 * @param server - MCP server instance
 * @param server - MCP 服务器实例
 */
export function setupBranchTools(server: McpServer): void {
  // List branches
  // 列出分支
  server.tool(
    "git_branch_list",
    "列出仓库中的分支。显示本地分支和可选的远程分支，清楚地标记当前分支。",
    {
      path: z.string().min(1, "需要提供仓库路径").describe("Git 仓库的路径"),
      all: z.boolean().optional().default(false).describe("是否包含远程分支"),
    },
    async ({ path, all }: { path: string; all: boolean }) => {
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
                text: `错误：不是一个 Git 仓库：${normalizedPath}`,
              },
            ],
            isError: true,
          };
        }

        const result = await gitService.listBranches(all);

        if (!result.resultSuccessful) {
          return {
            content: [
              {
                type: "text",
                text: `错误：${result.resultError.errorMessage}`,
              },
            ],
            isError: true,
          };
        }

        // The listBranches result now contains the current branch
        // listBranches 结果现在包含当前分支
        const branchSummary = result.resultData;
        const currentBranch = branchSummary.current;
        const allBranches = branchSummary.all; // Get all branch names from the summary
        // 从摘要中获取所有分支名称

        if (allBranches.length === 0) {
          // Check the length of the derived array
          // 检查派生数组的长度
          return {
            content: [
              {
                type: "text",
                text: `在仓库路径：${normalizedPath} 中未找到分支`,
              },
            ],
          };
        }

        // Format output
        // 格式化输出
        let output = `仓库路径：${normalizedPath} 中的分支\n\n`;
        allBranches.forEach((branch) => {
          // Clean up potential remote prefixes like 'remotes/origin/' for display if needed
          // 清理可能的远程前缀，如 'remotes/origin/'，以便显示
          const displayBranch = branch.replace(/^remotes\/[^\/]+\//, "");
          if (displayBranch === currentBranch) {
            output += `* ${displayBranch} (当前)\n`;
          } else {
            output += `  ${displayBranch}\n`;
          }
        });

        return {
          content: [
            {
              type: "text",
              text: output,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `错误：${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Create branch
  // 创建分支
  server.tool(
    "git_branch_create",
    "创建新分支。在指定的引用点（提交或分支）创建新分支，并可选择检出该分支。",
    {
      path: z.string().min(1, "需要提供仓库路径").describe("Git 仓库的路径"),
      name: z
        .string()
        .min(1, "需要提供分支名称")
        .describe("要创建的新分支名称"),
      startPoint: z
        .string()
        .optional()
        .describe("创建分支的起始点（提交、分支）"),
      checkout: z
        .boolean()
        .optional()
        .default(false)
        .describe("是否检出新创建的分支"),
    },
    async ({
      path,
      name,
      startPoint,
      checkout,
    }: {
      path: string;
      name: string;
      startPoint?: string;
      checkout: boolean;
    }) => {
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
                text: `错误：不是一个 Git 仓库：${normalizedPath}`,
              },
            ],
            isError: true,
          };
        }

        const result = await gitService.createBranch({
          name,
          startPoint,
          checkout,
        });

        if (!result.resultSuccessful) {
          return {
            content: [
              {
                type: "text",
                text: `错误：${result.resultError.errorMessage}`,
              },
            ],
            isError: true,
          };
        }

        return {
          content: [
            {
              type: "text",
              text: `成功创建分支 '${name}'${checkout ? " 并已检出" : ""}${
                startPoint ? `，基于 '${startPoint}'` : ""
              }`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `错误：${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Checkout branch
  // 检出分支
  server.tool(
    "git_checkout",
    "检出分支、标签或提交。将工作目录切换到指定目标并更新 HEAD 指向。可以选择创建新分支。",
    {
      path: z.string().min(1, "需要提供仓库路径").describe("Git 仓库的路径"),
      target: z
        .string()
        .min(1, "需要提供要检出的分支或提交")
        .describe("要检出的分支名称、标签或提交哈希值"),
      createBranch: z
        .boolean()
        .optional()
        .default(false)
        .describe("是否使用指定名称创建新分支"),
    },
    async ({
      path,
      target,
      createBranch,
    }: {
      path: string;
      target: string;
      createBranch: boolean;
    }) => {
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
                text: `错误：不是一个 Git 仓库：${normalizedPath}`,
              },
            ],
            isError: true,
          };
        }

        const result = await gitService.checkout(target, createBranch);

        if (!result.resultSuccessful) {
          return {
            content: [
              {
                type: "text",
                text: `错误：${result.resultError.errorMessage}`,
              },
            ],
            isError: true,
          };
        }

        return {
          content: [
            {
              type: "text",
              text: `成功检出${createBranch ? "并创建" : ""} '${target}'`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `错误：${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Delete branch
  // 删除分支
  server.tool(
    "git_branch_delete",
    "删除分支。从仓库中移除指定的分支。默认情况下，只能删除已完全合并的分支，除非设置 force 为 true。",
    {
      path: z.string().min(1, "需要提供仓库路径").describe("Git 仓库的路径"),
      branch: z
        .string()
        .min(1, "需要提供分支名称")
        .describe("要删除的分支名称"),
      force: z
        .boolean()
        .optional()
        .default(false)
        .describe("即使分支未完全合并也强制删除"),
    },
    async ({
      path,
      branch,
      force,
    }: {
      path: string;
      branch: string;
      force: boolean;
    }) => {
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
                text: `错误：不是一个 Git 仓库：${normalizedPath}`,
              },
            ],
            isError: true,
          };
        }

        const result = await gitService.deleteBranch(branch, force);

        if (!result.resultSuccessful) {
          return {
            content: [
              {
                type: "text",
                text: `错误：${result.resultError.errorMessage}`,
              },
            ],
            isError: true,
          };
        }

        return {
          content: [
            {
              type: "text",
              text: `成功删除分支 '${branch}'`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `错误：${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Merge branch
  // 合并分支
  server.tool(
    "git_merge",
    "将分支合并到当前分支。使用可配置的合并策略将指定分支的更改合并到当前分支中。",
    {
      path: z.string().min(1, "需要提供仓库路径").describe("Git 仓库的路径"),
      branch: z
        .string()
        .min(1, "需要提供要合并的分支")
        .describe("要合并到当前分支的分支名称"),
      message: z.string().optional().describe("合并提交的自定义消息"),
      fastForwardOnly: z
        .boolean()
        .optional()
        .default(false)
        .describe("仅允许快进式合并（如果不可能则失败）"),
      noFastForward: z
        .boolean()
        .optional()
        .default(false)
        .describe("即使可以快进也创建合并提交"),
    },
    async ({
      path,
      branch,
      message,
      fastForwardOnly,
      noFastForward,
    }: {
      path: string;
      branch: string;
      message?: string;
      fastForwardOnly: boolean;
      noFastForward: boolean;
    }) => {
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
                text: `错误：不是一个 Git 仓库：${normalizedPath}`,
              },
            ],
            isError: true,
          };
        }

        // Can't have both fastForwardOnly and noFastForward
        // 不能同时设置 fastForwardOnly 和 noFastForward
        if (fastForwardOnly && noFastForward) {
          return {
            content: [
              {
                type: "text",
                text: `错误：不能同时指定 fastForwardOnly 和 noFastForward`,
              },
            ],
            isError: true,
          };
        }

        const result = await gitService.merge({
          branch,
          message,
          fastForwardOnly,
          noFastForward,
        });

        if (!result.resultSuccessful) {
          return {
            content: [
              {
                type: "text",
                text: `错误：${result.resultError.errorMessage}`,
              },
            ],
            isError: true,
          };
        }

        return {
          content: [
            {
              type: "text",
              text: `成功将分支 '${branch}' 合并到当前分支`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `错误：${
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
