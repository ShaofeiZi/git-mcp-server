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
    "List branches in a repository. Displays both local and optionally remote branches, clearly marking the current branch.",
    {
      path: z
        .string()
        .min(1, "Repository path is required")
        .describe("Path to the Git repository"),
      all: z
        .boolean()
        .optional()
        .default(false)
        .describe("Whether to include remote branches in the list"),
    },
    async ({ path, all }: { path: string; all: boolean }) => {
      try {
        const normalizedPath = PathValidation.normalizePath(path);
        const gitService = new GitService(normalizedPath);

        // Check if this is a git repository
        // 检查这是否是一个 Git 仓库
        const isRepo = await gitService.isGitRepository();
        if (!isRepo) {
          return {
            content: [
              {
                type: "text",
                text: `Error: Not a Git repository: ${normalizedPath}`,
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
                text: `Error: ${result.resultError.errorMessage}`,
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
                text: `No branches found in repository at: ${normalizedPath}`,
              },
            ],
          };
        }

        // Format output
        // 格式化输出
        let output = `Branches in repository at: ${normalizedPath}\n\n`;
        allBranches.forEach((branch) => {
          // Clean up potential remote prefixes like 'remotes/origin/' for display if needed
          // 清理可能的远程前缀，如 'remotes/origin/'，以便显示
          const displayBranch = branch.replace(/^remotes\/[^\/]+\//, "");
          if (displayBranch === currentBranch) {
            output += `* ${displayBranch} (current)\n`;
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
              text: `Error: ${
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
    "Create a new branch. Creates a new branch at the specified reference point (commit or branch) and optionally checks it out.",
    {
      path: z
        .string()
        .min(1, "Repository path is required")
        .describe("Path to the Git repository"),
      name: z
        .string()
        .min(1, "Branch name is required")
        .describe("Name of the new branch to create"),
      startPoint: z
        .string()
        .optional()
        .describe("Reference (commit, branch) to create the branch from"),
      checkout: z
        .boolean()
        .optional()
        .default(false)
        .describe("Whether to checkout the newly created branch"),
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
        // 检查这是否是一个 Git 仓库
        const isRepo = await gitService.isGitRepository();
        if (!isRepo) {
          return {
            content: [
              {
                type: "text",
                text: `Error: Not a Git repository: ${normalizedPath}`,
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
                text: `Error: ${result.resultError.errorMessage}`,
              },
            ],
            isError: true,
          };
        }

        return {
          content: [
            {
              type: "text",
              text: `Successfully created branch '${name}'${
                checkout ? " and checked it out" : ""
              }`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error: ${
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
    "Checkout a branch, tag, or commit. Switches the working directory to the specified target and updates HEAD to point to it. Can optionally create a new branch.",
    {
      path: z
        .string()
        .min(1, "Repository path is required")
        .describe("Path to the Git repository"),
      target: z
        .string()
        .min(1, "Branch or commit to checkout is required")
        .describe("Branch name, tag, or commit hash to checkout"),
      createBranch: z
        .boolean()
        .optional()
        .default(false)
        .describe("Whether to create a new branch with the specified name"),
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
        // 检查这是否是一个 Git 仓库
        const isRepo = await gitService.isGitRepository();
        if (!isRepo) {
          return {
            content: [
              {
                type: "text",
                text: `Error: Not a Git repository: ${normalizedPath}`,
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
                text: `Error: ${result.resultError.errorMessage}`,
              },
            ],
            isError: true,
          };
        }

        return {
          content: [
            {
              type: "text",
              text: `Successfully checked out '${target}'${
                createBranch ? " (new branch)" : ""
              }`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error: ${
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
    "Delete a branch. Removes the specified branch from the repository. By default, only fully merged branches can be deleted unless force is set to true.",
    {
      path: z
        .string()
        .min(1, "Repository path is required")
        .describe("Path to the Git repository"),
      branch: z
        .string()
        .min(1, "Branch name is required")
        .describe("Name of the branch to delete"),
      force: z
        .boolean()
        .optional()
        .default(false)
        .describe("Force deletion even if branch is not fully merged"),
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
        // 检查这是否是一个 Git 仓库
        const isRepo = await gitService.isGitRepository();
        if (!isRepo) {
          return {
            content: [
              {
                type: "text",
                text: `Error: Not a Git repository: ${normalizedPath}`,
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
                text: `Error: ${result.resultError.errorMessage}`,
              },
            ],
            isError: true,
          };
        }

        return {
          content: [
            {
              type: "text",
              text: `Successfully deleted branch '${branch}'`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error: ${
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
    "Merge a branch into the current branch. Combines changes from the specified branch into the current branch with configurable merge strategies.",
    {
      path: z
        .string()
        .min(1, "Repository path is required")
        .describe("Path to the Git repository"),
      branch: z
        .string()
        .min(1, "Branch to merge is required")
        .describe("Name of the branch to merge into the current branch"),
      message: z
        .string()
        .optional()
        .describe("Custom commit message for the merge commit"),
      fastForwardOnly: z
        .boolean()
        .optional()
        .default(false)
        .describe("Only allow fast-forward merges (fail if not possible)"),
      noFastForward: z
        .boolean()
        .optional()
        .default(false)
        .describe("Create a merge commit even when fast-forward is possible"),
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
        // 检查这是否是一个 Git 仓库
        const isRepo = await gitService.isGitRepository();
        if (!isRepo) {
          return {
            content: [
              {
                type: "text",
                text: `Error: Not a Git repository: ${normalizedPath}`,
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
                text: `Error: Cannot specify both fastForwardOnly and noFastForward`,
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
                text: `Error: ${result.resultError.errorMessage}`,
              },
            ],
            isError: true,
          };
        }

        return {
          content: [
            {
              type: "text",
              text: `Successfully merged branch '${branch}' into current branch`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error: ${
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
