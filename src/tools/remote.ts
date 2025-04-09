/**
 * Remote Tools
 * ===========
 *
 * MCP tools for Git remote operations.
 * MCP 工具，用于 Git 远程操作。
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { GitService } from "../services/git-service.js";
import { Schemas, PathValidation } from "../utils/validation.js";

/**
 * Registers remote operation tools with the MCP server
 * 向 MCP 服务器注册远程操作工具
 *
 * @param server - MCP server instance
 * @param server - MCP 服务器实例
 */
export function setupRemoteTools(server: McpServer): void {
  // Add a remote
  // 添加远程
  server.tool(
    "git_remote_add",
    "添加新的远程仓库引用。创建与远程仓库的连接，设置名称和 URL，允许从该仓库获取和推送更改。",
    {
      path: z.string().min(1, "需要提供仓库路径").describe("Git 仓库的路径"),
      name: z
        .string()
        .min(1, "需要提供远程名称")
        .describe("远程仓库的名称（例如：'origin'）"),
      url: z.string().url("URL 格式无效").describe("远程仓库的 URL"),
    },
    async ({ path, name, url }) => {
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

        const result = await gitService.addRemote({
          name,
          url,
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
              text: `成功添加远程仓库 '${name}'，URL 为 '${url}'`,
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

  // List remotes
  // 列出远程
  server.tool(
    "git_remote_list",
    "列出所有配置的远程仓库。显示与仓库关联的所有远程仓库的名称和 URL，包括获取和推送 URL。",
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
                text: `错误：不是一个 Git 仓库：${normalizedPath}`,
              },
            ],
            isError: true,
          };
        }

        const result = await gitService.listRemotes();

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

        if (result.resultData.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: `在仓库路径：${normalizedPath} 中未找到远程仓库`,
              },
            ],
          };
        }

        // Format output
        // 格式化输出
        let output = `仓库路径：${normalizedPath} 中的远程仓库\n\n`;
        result.resultData.forEach((remote) => {
          output += `${remote.name}\n`;
          output += `  获取：${remote.refs.fetch}\n`;
          output += `  推送：${remote.refs.push}\n\n`;
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

  // Fetch from remote
  // 从远程获取
  server.tool(
    "git_fetch",
    "从远程仓库获取更改。下载远程仓库的对象和引用，但不合并到本地分支。",
    {
      path: z.string().min(1, "需要提供仓库路径").describe("Git 仓库的路径"),
      remote: z
        .string()
        .optional()
        .default("origin")
        .describe("要获取的远程仓库名称（默认为 'origin'）"),
      branch: z
        .string()
        .optional()
        .describe("要获取的特定分支（如果省略则获取所有分支）"),
    },
    async ({ path, remote, branch }) => {
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

        const result = await gitService.fetch(remote, branch);

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
              text: `成功从远程仓库 '${remote}'${
                branch ? ` 分支 '${branch}'` : ""
              } 获取更改`,
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

  // Pull from remote
  // 从远程拉取
  server.tool(
    "git_pull",
    "从远程仓库拉取更改。从远程仓库获取并将更改集成到当前分支，可以通过合并或变基方式进行。",
    {
      path: z.string().min(1, "需要提供仓库路径").describe("Git 仓库的路径"),
      remote: z
        .string()
        .optional()
        .describe("要拉取的远程仓库名称（默认为 origin）"),
      branch: z
        .string()
        .optional()
        .describe("要拉取的分支（默认为当前跟踪分支）"),
      rebase: z
        .boolean()
        .optional()
        .default(false)
        .describe("拉取时是否使用变基而不是合并"),
    },
    async ({ path, remote, branch, rebase }) => {
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

        const result = await gitService.pull({
          remote,
          branch,
          rebase,
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
              text: `成功拉取更改${remote ? ` 从远程仓库 '${remote}'` : ""}${
                branch ? ` 分支 '${branch}'` : ""
              }${rebase ? "（使用变基）" : ""}`,
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

  // Push to remote
  // 推送到远程
  server.tool(
    "git_push",
    "推送本地更改到远程仓库。上传本地分支提交到远程仓库，更新远程引用。",
    {
      path: z.string().min(1, "需要提供仓库路径").describe("Git 仓库的路径"),
      remote: z
        .string()
        .optional()
        .default("origin")
        .describe("要推送到的远程仓库名称（默认为 'origin'）"),
      branch: z.string().optional().describe("要推送的分支（默认为当前分支）"),
      force: z
        .boolean()
        .optional()
        .default(false)
        .describe("是否强制推送更改，覆盖远程历史"),
      setUpstream: z
        .boolean()
        .optional()
        .default(false)
        .describe("是否为推送的分支设置上游跟踪"),
    },
    async ({ path, remote, branch, force, setUpstream }) => {
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

        const result = await gitService.push({
          remote,
          branch,
          force,
          setUpstream,
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
              text: `成功推送更改到远程仓库 '${remote}'${
                branch ? ` 分支 '${branch}'` : ""
              }${force ? "（强制推送）" : ""}${
                setUpstream ? "（设置上游）" : ""
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
}
