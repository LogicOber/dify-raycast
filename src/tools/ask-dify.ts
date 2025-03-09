import { askDify } from "../utils/dify-service";
import { LocalStorage, AI, environment } from "@raycast/api";
import { DifyApp, DifyConversationType } from "../utils/types";
import os from "os";

// 存储最近的对话ID的键名
const RECENT_CONVERSATION_KEY = "dify-recent-conversations";

type Input = {
  /** User query content */
  query: string;
  /** Target Dify application name */
  appName: string;
  /** Application endpoint (from list-dify-apps tool) */
  endpoint?: string;
  /** Application type (from list-dify-apps tool) */
  appType?: string;
  /** Application input format or custom inputs (JSON string) */
  inputsFormat?: string;
  /** User identifier */
  user?: string;
  /** Response mode: blocking or streaming */
  responseMode?: string;
  /** Wait mode: whether to wait for full response */
  waitForResponse?: boolean;
  /** Conversation ID for continuing an existing conversation */
  conversationId?: string;
};

/**
 * Dify Query Tool - Send queries to a specified Dify application and get responses
 * 
 * This tool needs to be used in conjunction with the list-dify-apps tool,
 * first get application information, then send the query
 */
export default async function askDifyTool(input: Input): Promise<string> {
  console.log("===== ASK DIFY TOOL CALLED =====");
  console.log("Input:", input);
  
  // 用于存储AI判断结果
  let shouldCreateNewConversation = false;
  
  try {
    // Validate required parameters
    if (!input.query || input.query.trim() === "") {
      console.error("Empty query received");
      return JSON.stringify({
        error: "Query content cannot be empty. Please provide a valid query.",
        message: "Query content cannot be empty. Please provide a valid query."
      });
    }
    
    if (!input.appName || input.appName.trim() === "") {
      console.error("No app name provided");
      return JSON.stringify({
        error: "No application name provided. Please use the list-dify-apps tool first to get application information.",
        message: "No application name provided. Please use the list-dify-apps tool first to get application information."
      });
    }
    
    // Extract parameters
    const query = input.query.trim();
    const appName = input.appName.trim();
    
    // Get system username for consistent user ID
    const systemUsername = os.userInfo().username;
    const user = input.user || `Raycast_${systemUsername}`;
    
    const responseMode = input.responseMode || "blocking";
    // If wait mode is explicitly specified in the input, use that value
    // Otherwise, we'll get it from the app details later
    const inputWaitForResponse = input.waitForResponse;
    
    // Get conversation ID if provided in the input
    let conversationId = input.conversationId || "";
    
    console.log(`Query: ${query}`);
    console.log(`App name: ${appName}`);
    console.log(`User ID: ${user}`);
    console.log(`Response mode: ${responseMode}`);
    console.log(`Wait mode from input: ${inputWaitForResponse === false ? "Non-Wait Mode" : inputWaitForResponse === true ? "Wait Mode" : "Using app default"}`);
    console.log(`Conversation ID: ${conversationId || "New conversation"}`);
    
    // Get application details
    const appDetails = await getAppDetails(appName);
    
    if (!appDetails) {
      console.error(`App not found: ${appName}`);
      return JSON.stringify({
        error: `Could not find application named "${appName}". Please check the application name or add this application.`,
        message: `Could not find application named "${appName}". Please check the application name or add this application.`
      });
    }
    
    console.log(`Found app details: ${appDetails.name} (${appDetails.type})`);
    console.log(`Endpoint: ${appDetails.endpoint}`);
    console.log(`API Key: ${appDetails.apiKey ? "******" : "missing"}`);
    console.log(`Conversation Type: ${appDetails.conversationType || "default (continuous)"}`); 
    
    // 获取应用的对话类型
    const conversationType = appDetails.conversationType || DifyConversationType.Continuous;
    
    // 如果是连续对话类型，且没有提供对话ID，尝试获取最近的对话ID
    if (conversationType === DifyConversationType.Continuous && !conversationId) {
      try {
        // 从本地存储获取最近的对话
        const recentConversationsJson = await LocalStorage.getItem<string>(RECENT_CONVERSATION_KEY);
        const recentConversations = recentConversationsJson ? JSON.parse(recentConversationsJson) : {};
        
        // 获取特定应用的最近对话ID
        const recentConversationId = recentConversations[appName];
        if (recentConversationId) {
          console.log(`Found recent conversation ID for ${appName}: ${recentConversationId}`);
          conversationId = recentConversationId;
        }
      } catch (error) {
        console.error("Error retrieving recent conversation ID:", error);
      }
    }
    
    // 如果是连续对话模式且有对话ID，使用AI判断是否需要开始新对话
    if (conversationType === DifyConversationType.Continuous && conversationId && environment.canAccess(AI)) {
      try {
        console.log("Using AI to determine if user wants to start a new conversation...");
        const aiPrompt = `分析以下用户查询，判断用户是否想要开始一个全新的对话（而不是继续当前对话）。\n\n用户查询: "${query}"\n\n如果用户明确表示想要开始新对话（例如:"重新开始"、"新对话"、"重启"、"重新开始对话"、"换个话题"等类似表达），回复ONLY "true"。如果没有明确表示想开始新对话，回复ONLY "false"。`;
        
        const aiResponse = await AI.ask(aiPrompt, { 
          creativity: "none",
          model: AI.Model["OpenAI_GPT3.5-turbo"]
        });
        
        // 处理AI响应
        shouldCreateNewConversation = aiResponse.trim().toLowerCase() === "true";
        console.log(`AI判断结果 - 用户是否想开始新对话: ${shouldCreateNewConversation}`);
        
        // 如果用户想开始新对话，清除现有的会话ID
        if (shouldCreateNewConversation) {
          console.log("用户想要开始新对话，清除现有的会话ID");
          conversationId = "";
        } else {
          console.log("用户想要继续当前对话，使用现有的会话ID");
        }
      } catch (error) {
        console.error("Error using AI to determine conversation intent:", error);
        // 如果AI判断失败，默认继续使用现有会话ID
      }
    } else if (conversationType === DifyConversationType.SingleCall) {
      // 单次调用模式下，始终使用空的会话ID
      conversationId = "";
      console.log("Single call mode, not using conversation ID");
    }
    
    // Parse input format
    const parsedInputs: { [key: string]: string } = {};
    
    // If inputsFormat is provided, try to parse it
    if (input.inputsFormat) {
      // Check if it looks like JSON
      if (input.inputsFormat.trim().startsWith('{') && input.inputsFormat.trim().endsWith('}')) {
        try {
          const inputsTemplate = JSON.parse(input.inputsFormat);
          // Use template to create inputs
          Object.keys(inputsTemplate).forEach(key => {
            if (key.toLowerCase().includes("query") || 
                key.toLowerCase().includes("question") || 
                key.toLowerCase().includes("message")) {
              parsedInputs[key] = query;
            }
          });
        } catch (error) {
          console.error("Error parsing inputsFormat:", error);
        }
      } else {
        // Not JSON, just log it as information
        console.log("inputsFormat is not JSON, treating as informational text:", input.inputsFormat);
      }
    } else if (appDetails.inputs) {
      // If the app details have input format, try to use it
      try {
        // Use app details input format to create inputs
        Object.keys(appDetails.inputs).forEach(key => {
          if (key.toLowerCase().includes("query") || 
              key.toLowerCase().includes("question") || 
              key.toLowerCase().includes("message")) {
            parsedInputs[key] = query;
          }
        });
      } catch (error) {
        console.error("Error using app inputs format:", error);
      }
    }
    
    // Use parsed inputs as final inputs
    const mergedInputs = parsedInputs;
    
    console.log("Final inputs:", mergedInputs);
    
    // Get the wait mode from app details if not specified in input
    const waitForResponse = inputWaitForResponse !== undefined ? inputWaitForResponse : appDetails.waitForResponse;
    
    try {
      // Call Dify API with API key and endpoint to avoid duplicate lookups
      console.log(`Using wait mode: ${waitForResponse === false ? "Non-Wait Mode" : "Wait Mode"}`);
      console.log(`Final conversation ID being used: ${conversationId || "<none>"}`);
      const response = await askDify(query, appName, {
        inputs: mergedInputs,
        user: user,
        responseMode: responseMode,
        waitForResponse: waitForResponse, // Pass wait mode parameter
        apiKey: appDetails.apiKey, // Pass API key directly
        endpoint: appDetails.endpoint, // Pass endpoint directly
        conversationId: conversationId // Pass conversation ID if available
      });
      
      console.log("Dify API response received");
      
      // Build result
      const result = {
        message: response.message || "No response received from Dify.",
        used_app: response.used_app || appName,
        app_type: response.app_type || appDetails.type,
        conversation_id: response.conversation_id,
        message_id: response.message_id
      };
      
      // 如果是连续对话模式且获取到了会话ID，保存到本地存储中
      if (conversationType === DifyConversationType.Continuous && response.conversation_id) {
        try {
          // 读取现有的最近对话信息
          const recentConversationsJson = await LocalStorage.getItem<string>(RECENT_CONVERSATION_KEY);
          const recentConversations = recentConversationsJson ? JSON.parse(recentConversationsJson) : {};
          
          // 更新特定应用的最近对话ID
          recentConversations[appName] = response.conversation_id;
          
          // 保存回本地存储
          await LocalStorage.setItem(RECENT_CONVERSATION_KEY, JSON.stringify(recentConversations));
          console.log(`Saved conversation ID for ${appName}: ${response.conversation_id}`);
        } catch (error) {
          console.error("Error saving conversation ID:", error);
        }
      }
      
      console.log("Returning result to Raycast");
      return JSON.stringify(result);
    } catch (apiError) {
      // 如果是非等待模式，即使出错也返回成功响应
      if (waitForResponse === false) {
        console.log("Error occurred in non-wait mode, returning success response anyway:", apiError);
        const result = {
          message: "Your query has been sent to Dify App in non-wait mode. Note: There was an issue with the API, but your request was attempted.",
          used_app: appName,
          app_type: appDetails.type,
          conversation_id: "",
          message_id: "",
          non_wait_mode: true,
          api_error: apiError instanceof Error ? apiError.message : String(apiError)
        };
        return JSON.stringify(result);
      }
      // 如果不是非等待模式，则继续抛出错误
      throw apiError;
    }
  } catch (error) {
    console.error("Error in ask-dify tool:", error);
    
    // Ensure useful information is returned even in case of error
    const errorMessage = error instanceof Error ? error.message : String(error);
    return JSON.stringify({ 
      error: errorMessage,
      message: `Error processing query: ${errorMessage}`
    });
  }
}

/**
 * Get application details from local storage
 * @param appName Application name
 * @returns Application details, or null if not found
 */
async function getAppDetails(appName: string): Promise<DifyApp | null> {
  // Load application list from local storage
  const appsJson = await LocalStorage.getItem<string>("dify-apps");
  const apps: DifyApp[] = appsJson ? JSON.parse(appsJson) : [];
  
  // Find matching application
  const app = apps.find(app => app.name.toLowerCase() === appName.toLowerCase()) || null;
  
  // Log conversation type if found
  if (app && app.conversationType) {
    console.log(`App conversation type: ${app.conversationType}`);
  }
  
  return app;
}
