#!/usr/bin/env node

/**
 * Git MCP Server Entry Point
 * Git MCP 服务器入口点
 * =========================
 *
 * This is the main entry point for the Git MCP server.
 * It creates a server instance and connects it to a stdio transport.
 *
 * 这是 Git MCP 服务器的主入口点。
 * 它创建一个服务器实例并将其连接到标准输入输出传输层。
 */

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { GitMcpServer } from "./server.js";
import dotenv from "dotenv";

// Load environment variables from .env file if it exists
// 如果存在 .env 文件，则从中加载环境变量
dotenv.config();

/**
 * Main function to start the server
 * 启动服务器的主函数
 */
async function main(): Promise<void> {
  console.error("Starting Git MCP Server...");
  console.error("正在启动 Git MCP 服务器...");

  try {
    // Create server instance
    // 创建服务器实例
    const server = new GitMcpServer();

    // Use stdio transport for communication
    // 使用标准输入输出进行通信
    const transport = new StdioServerTransport();

    // Connect the server to the transport
    // 将服务器连接到传输层
    await server.connect(transport);

    console.error("Git MCP Server running on stdio transport");
    console.error("Git MCP 服务器正在标准输入输出传输层上运行");

    // Handle interruption signals
    // 处理中断信号
    process.on("SIGINT", async () => {
      console.error("Received SIGINT, shutting down Git MCP Server");
      console.error("收到 SIGINT 信号，正在关闭 Git MCP 服务器");
      process.exit(0);
    });

    process.on("SIGTERM", async () => {
      console.error("Received SIGTERM, shutting down Git MCP Server");
      console.error("收到 SIGTERM 信号，正在关闭 Git MCP 服务器");
      process.exit(0);
    });
  } catch (error) {
    console.error("Failed to start Git MCP Server:");
    console.error("启动 Git MCP 服务器失败：");
    console.error(error instanceof Error ? error.message : String(error));

    if (error instanceof Error && error.stack) {
      console.error(error.stack);
    }

    process.exit(1);
  }
}

// Start the server
// 启动服务器
main().catch((error) => {
  console.error("Unhandled error in main process:");
  console.error("主进程中未处理的错误：");
  console.error(error instanceof Error ? error.message : String(error));

  if (error instanceof Error && error.stack) {
    console.error(error.stack);
  }

  process.exit(1);
});
