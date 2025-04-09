/**
 * Resource Descriptors
 * 资源描述符
 * ===================
 *
 * This module defines descriptors for Git MCP resources.
 * 此模块定义 Git MCP 资源的描述符。
 * These descriptions help both users and LLMs understand
 * 这些描述帮助用户和大型语言模型理解
 * what each resource does and what data it returns.
 * 每个资源的功能及其返回的数据。
 */

/**
 * Descriptor object for each resource
 * 每个资源的描述符对象
 */
export type ResourceDescriptor = {
  name: string;
  description: string;
  mimeType: string;
};

/**
 * Map of resource descriptors keyed by resource ID
 * 按资源 ID 键控的资源描述符映射
 */
export const resourceDescriptors: Record<string, ResourceDescriptor> = {
  // Repository resources
  // 仓库资源
  "repository-info": {
    name: "Repository Information",
    description:
      "Basic Git repository information including current branch, status, and reference details",
    mimeType: "application/json",
  },
  "repository-branches": {
    name: "Repository Branches",
    description:
      "List of all branches in the repository with current branch indicator",
    mimeType: "application/json",
  },
  "repository-remotes": {
    name: "Repository Remotes",
    description: "List of all configured remote repositories with their URLs",
    mimeType: "application/json",
  },
  "repository-tags": {
    name: "Repository Tags",
    description: "List of all tags in the repository with their references",
    mimeType: "application/json",
  },

  // File resources
  // 文件资源
  "file-at-ref": {
    name: "File Content",
    description: "The content of a specific file at a given Git reference",
    mimeType: "text/plain",
  },
  "directory-listing": {
    name: "Directory Listing",
    description:
      "List of files and directories at a specific path and reference",
    mimeType: "application/json",
  },

  // Diff resources
  // 差异资源
  "diff-refs": {
    name: "Reference Diff",
    description: "Diff between two Git references (commits, branches, tags)",
    mimeType: "text/plain",
  },
  "diff-unstaged": {
    name: "Unstaged Changes Diff",
    description: "Diff of all unstaged changes in the working directory",
    mimeType: "text/plain",
  },
  "diff-staged": {
    name: "Staged Changes Diff",
    description: "Diff of all staged changes in the index",
    mimeType: "text/plain",
  },

  // History resources
  // 历史资源
  "commit-log": {
    name: "Commit History",
    description: "Commit history log with author, date, and message details",
    mimeType: "application/json",
  },
  "file-blame": {
    name: "File Blame",
    description:
      "Line-by-line attribution showing which commit last modified each line",
    mimeType: "text/plain",
  },
  "commit-show": {
    name: "Commit Details",
    description:
      "Detailed information about a specific commit including diff changes",
    mimeType: "text/plain",
  },
};
