# Dify AI Extension for Raycast

Seamlessly integrate all Dify AI applications into Raycast with a single click, enabling instant access and execution within Raycast.

## 功能特点

- 无缝集成Dify AI应用
- 安全存储API密钥和应用配置
- 便捷管理所有Dify应用
- 直接在Raycast中与AI应用交互
- 支持会话连续性和用户标识

## 使用指南

### 添加Dify应用

1. 在Raycast中使用 `Add Dify App` 工具
2. 输入以下必要信息:
   - 应用名称 (用于在Raycast中标识)
   - API端点 (Dify应用的API URL)
   - API密钥 (从Dify获取的API Key)
3. 可选配置输入参数 (作为JSON对象)

示例:
```
@dify Create a new Dify app called MyTestApp with endpoint https://api.dify.ai/v1 and API key dify-sk-******
```

### 使用Dify应用

1. 在Raycast中使用 `Ask Dify` 工具
2. 提供:
   - 应用名称 (之前添加的应用)
   - 查询内容 (您想问的问题)
3. 可选参数:
   - 会话ID (继续之前的对话)
   - 用户标识 (定制身份)

示例:
```
@dify Ask my GeneralAssistant about the recent AI developments
```

### 管理Dify应用

使用 `List Dify` 命令查看、编辑或删除已添加的Dify应用。

## 技术说明

- 使用Raycast LocalStorage API安全存储应用信息
- 实现确认机制增强安全性和用户体验
- 支持Dify API的核心功能，包括会话连续性

## 开发

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 测试AI交互
npm run evals
```

## 许可证

MIT License

---

> 注意：请在发布前添加实际截图至 `metadata/screenshot.png`，以展示扩展的使用界面。# dify-raycast
