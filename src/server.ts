/**
 * Git MCP Server
 * Git MCP 服务器
 * =============
 *
 * Main implementation of the Git MCP server.
 * Git MCP 服务器的主要实现。
 */

import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
// Get the directory path of the current module
// 获取当前模块的目录路径
import { fileURLToPath } from "url";
import { registerAllResources } from "./resources/index.js";
import { registerAllTools } from "./tools/index.js";
import { resourceDescriptors } from "./resources/descriptors.js";

/**
 * Git MCP Server class
 * Git MCP 服务器类
 *
 * This class creates and manages an MCP server that exposes Git functionality
 * through the Model Context Protocol, making it accessible to AI assistants
 * and other MCP clients.
 *
 * 这个类创建并管理一个 MCP 服务器，通过模型上下文协议暴露 Git 功能，
 * 使其可以被 AI 助手和其他 MCP 客户端访问。
 */
export class GitMcpServer {
  private server: McpServer;

  /**
   * Reads the package.json file to get metadata
   * 读取 package.json 文件以获取元数据
   */
  private getPackageInfo() {
    // Get current file's directory and navigate to the project root
    // 获取当前文件的目录并导航到项目根目录
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const packagePath = path.resolve(__dirname, "../package.json");
    const packageContent = fs.readFileSync(packagePath, "utf8");
    return JSON.parse(packageContent);
  }

  /**
   * Creates a new GitMcpServer instance
   * 创建一个新的 GitMcpServer 实例
   */
  constructor() {
    // Set up git config with global user settings
    // 使用全局用户设置配置 git
    this.setupGitConfig();

    // Get package info
    // 获取包信息
    const pkg = this.getPackageInfo();

    // Initialize MCP server
    // 初始化 MCP 服务器
    this.server = new McpServer({
      name: pkg.name,
      version: pkg.version,
      description: pkg.description,
    });

    // Register all resources and tools
    // 注册所有资源和工具
    this.registerHandlers();

    // Set up error handling
    // 设置错误处理
    this.setupErrorHandling();
  }

  /**
   * Sets up git config by setting environment variables for consistent author identity
   * This ensures all git operations use the global git configuration
   *
   * 通过设置环境变量来配置 git，确保作者身份一致
   * 这确保所有 git 操作都使用全局 git 配置
   */
  private setupGitConfig(): void {
    try {
      // Get global git config values
      // 获取全局 git 配置值
      const globalUserName = execSync("git config --global user.name")
        .toString()
        .trim();
      const globalUserEmail = execSync("git config --global user.email")
        .toString()
        .trim();

      // Set environment variables for git to use
      // These variables will override any other configuration
      // 设置 git 使用的环境变量
      // 这些变量将覆盖任何其他配置
      process.env.GIT_AUTHOR_NAME = globalUserName;
      process.env.GIT_AUTHOR_EMAIL = globalUserEmail;
      process.env.GIT_COMMITTER_NAME = globalUserName;
      process.env.GIT_COMMITTER_EMAIL = globalUserEmail;

      console.error(
        `[Git MCP Server] Setting up git author identity: ${globalUserName} <${globalUserEmail}>`
      );
      console.error(
        `[Git MCP 服务器] 设置 git 作者身份: ${globalUserName} <${globalUserEmail}>`
      );
    } catch (error) {
      console.error("Failed to set up git config:", error);
      console.error("设置 git 配置失败:", error);
    }
  }

  /**
   * Registers all resource and tool handlers with the server
   * 向服务器注册所有资源和工具处理器
   */
  private registerHandlers(): void {
    // Register all resources (for providing Git data)
    // 注册所有资源（用于提供 Git 数据）
    registerAllResources(this.server);

    // Register all tools (for executing Git commands)
    // 注册所有工具（用于执行 Git 命令）
    registerAllTools(this.server);

    // Register resource descriptions
    // 注册资源描述
    this.registerResourceDescriptions();
  }

  /**
   * Registers resource descriptions for better client displays
   * 注册资源描述以提供更好的客户端显示
   */
  private registerResourceDescriptions(): void {
    // This is a placeholder for resource descriptions
    // In MCP SDK, descriptions need to be specified at resource registration time
    // The actual descriptions are now defined in descriptors.ts and can be used
    // by the individual resource registration methods
    //
    // 这是资源描述的占位符
    // 在 MCP SDK 中，描述需要在资源注册时指定
    // 实际的描述现在定义在 descriptors.ts 中，可以被各个资源注册方法使用
    console.error(
      "Resource descriptions are provided during resource registration"
    );
    console.error("资源描述在资源注册期间提供");
  }

  /**
   * Sets up global error handling for the server
   * 为服务器设置全局错误处理
   */
  private setupErrorHandling(): void {
    // Error handling will be done with try-catch in methods that can fail
    // 错误处理将在可能失败的方法中使用 try-catch 完成
    process.on("uncaughtException", (error: Error) => {
      console.error(`[Git MCP Server Uncaught Exception] ${error.message}`);
      console.error(`[Git MCP 服务器未捕获的异常] ${error.message}`);
      console.error(error.stack);
    });

    process.on("unhandledRejection", (reason: any) => {
      console.error(
        `[Git MCP Server Unhandled Rejection] ${
          reason instanceof Error ? reason.message : String(reason)
        }`
      );
      console.error(
        `[Git MCP 服务器未处理的拒绝] ${
          reason instanceof Error ? reason.message : String(reason)
        }`
      );
      if (reason instanceof Error && reason.stack) {
        console.error(reason.stack);
      }
    });
  }

  /**
   * Connects the server to a transport
   * 将服务器连接到传输层
   *
   * @param transport - MCP transport to connect to
   * @param transport - 要连接的 MCP 传输层
   * @returns Promise that resolves when connected
   * @returns 连接完成时解析的 Promise
   */
  async connect(transport: any): Promise<void> {
    await this.server.connect(transport);
  }
}
