/**
 * MCP Tool Handlers
 * MCP 工具处理器
 * ================
 *
 * Entry point for all MCP tool implementations.
 * 所有 MCP 工具实现的入口点。
 * This module registers all tool handlers with the MCP server.
 * 此模块向 MCP 服务器注册所有工具处理器。
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { setupRepositoryTools } from "./repository.js";
import { setupBranchTools } from "./branch.js";
import { setupWorkdirTools } from "./workdir.js";
import { setupRemoteTools } from "./remote.js";
import { setupAdvancedTools } from "./advanced.js";

/**
 * Registers all Git MCP tools with the server
 * 向服务器注册所有 Git MCP 工具
 *
 * @param server - MCP server instance
 *                 MCP 服务器实例
 */
export function registerAllTools(server: McpServer): void {
  // Repository operations (init, clone, status)
  // 仓库操作（初始化、克隆、状态）
  setupRepositoryTools(server);

  // Branch operations (create, checkout, merge, etc.)
  // 分支操作（创建、检出、合并等）
  setupBranchTools(server);

  // Working directory operations (stage, unstage, commit, etc.)
  // 工作目录操作（暂存、取消暂存、提交等）
  setupWorkdirTools(server);

  // Remote operations (add, fetch, pull, push, etc.)
  // 远程操作（添加、获取、拉取、推送等）
  setupRemoteTools(server);

  // Advanced operations (stash, cherry-pick, rebase, etc.)
  // 高级操作（存储、挑选、变基等）
  setupAdvancedTools(server);
}
