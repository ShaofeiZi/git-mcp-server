/**
 * Resource Handlers
 * 资源处理器
 * ===============
 *
 * Entry point for all MCP resource implementations.
 * MCP 资源实现的入口点。
 * This module registers all resource handlers with the MCP server.
 * 该模块向 MCP 服务器注册所有资源处理器。
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { setupRepositoryResources } from "./repository.js";
import { setupFileResources } from "./file.js";
import { setupDiffResources } from "./diff.js";
import { setupHistoryResources } from "./history.js";
import { resourceDescriptors } from "./descriptors.js";

/**
 * Metadata for resource descriptions
 * 资源描述的元数据
 */
export const resourceMetadata = {
  // Repository resources
  // 仓库资源
  "repository-info": {
    name: "Repository Information",
    description:
      "Returns basic Git repository information including current branch, status, and reference details",
    mimeType: "application/json",
  },
  "repository-branches": {
    name: "Repository Branches",
    description:
      "Returns a list of all branches in the repository with current branch indicator",
    mimeType: "application/json",
  },
  "repository-remotes": {
    name: "Repository Remotes",
    description:
      "Returns a list of all configured remote repositories with their URLs",
    mimeType: "application/json",
  },
  "repository-tags": {
    name: "Repository Tags",
    description:
      "Returns a list of all tags in the repository with their references",
    mimeType: "application/json",
  },

  // File resources
  // 文件资源
  "file-at-ref": {
    name: "File Content",
    description:
      "Returns the content of a specific file at a given Git reference",
    mimeType: "text/plain",
  },
  "directory-listing": {
    name: "Directory Listing",
    description:
      "Returns a list of files and directories at a specific path and reference",
    mimeType: "application/json",
  },

  // Diff resources
  // 差异资源
  "diff-refs": {
    name: "Reference Diff",
    description:
      "Returns a diff between two Git references (commits, branches, tags)",
    mimeType: "text/plain",
  },
  "diff-unstaged": {
    name: "Unstaged Changes Diff",
    description:
      "Returns a diff of all unstaged changes in the working directory",
    mimeType: "text/plain",
  },
  "diff-staged": {
    name: "Staged Changes Diff",
    description: "Returns a diff of all staged changes in the index",
    mimeType: "text/plain",
  },

  // History resources
  // 历史资源
  "commit-log": {
    name: "Commit History",
    description:
      "Returns the commit history log with author, date, and message details",
    mimeType: "application/json",
  },
  "file-blame": {
    name: "File Blame",
    description:
      "Returns line-by-line attribution showing which commit last modified each line",
    mimeType: "text/plain",
  },
  "commit-show": {
    name: "Commit Details",
    description:
      "Returns detailed information about a specific commit including diff changes",
    mimeType: "text/plain",
  },
};

/**
 * Registers all Git MCP resources with the server
 * 向服务器注册所有 Git MCP 资源
 *
 * @param server - MCP server instance
 *                 MCP 服务器实例
 */
export function registerAllResources(server: McpServer): void {
  // Repository info resources (status, branches, remotes, etc.)
  // 仓库信息资源（状态、分支、远程等）
  setupRepositoryResources(server, resourceDescriptors);

  // File resources (file content, directory listings)
  // 文件资源（文件内容、目录列表）
  setupFileResources(server, resourceDescriptors);

  // Diff resources (changes between refs, unstaged, staged)
  // 差异资源（引用之间的变更、未暂存、已暂存）
  setupDiffResources(server, resourceDescriptors);

  // History resources (log, blame, show commit)
  // 历史资源（日志、追溯、显示提交）
  setupHistoryResources(server, resourceDescriptors);

  // Note: Metadata for resources is defined in the resourceMetadata object,
  // which can be used when registering resources in their respective handlers.
  // The MCP protocol exposes this metadata through the registered resources.
  // 注意：资源的元数据在 resourceMetadata 对象中定义，
  // 可以在各自的处理器中注册资源时使用。
  // MCP 协议通过注册的资源公开此元数据。
}
