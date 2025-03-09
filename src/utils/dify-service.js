"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveHistory = saveHistory;
exports.getHistories = getHistories;
exports.clearHistories = clearHistories;
exports.deleteConversation = deleteConversation;
exports.updateConversation = updateConversation;
exports.askDify = askDify;
exports.analyzeUserQuery = analyzeUserQuery;
const api_1 = require("@raycast/api");
const types_1 = require("./types");
const node_fetch_1 = __importDefault(require("node-fetch"));
// Save history
async function saveHistory(history) {
    const histories = await getHistories();
    histories.unshift(history);
    await api_1.LocalStorage.setItem("dify-history", JSON.stringify(histories));
}
// Get history records
async function getHistories() {
    const historiesStr = await api_1.LocalStorage.getItem("dify-history");
    return typeof historiesStr === "string" ? JSON.parse(historiesStr) : [];
}
// Clear history records
async function clearHistories() {
    await api_1.LocalStorage.removeItem("dify-history");
}
// Delete a single conversation by its ID
async function deleteConversation(conversationId) {
    const histories = await getHistories();
    const filteredHistories = histories.filter((history) => history.conversation_id !== conversationId);
    await api_1.LocalStorage.setItem("dify-history", JSON.stringify(filteredHistories));
}
// Update a conversation's text content
async function updateConversation(conversationId, conversationText) {
    const histories = await getHistories();
    const updatedHistories = histories.map((history) => {
        if (history.conversation_id === conversationId) {
            return { ...history, conversation_text: conversationText };
        }
        return history;
    });
    await api_1.LocalStorage.setItem("dify-history", JSON.stringify(updatedHistories));
}
// Core request function
async function askDify(query, appName, options) {
    console.log("askDify called with:", { query, appName, options });
    // If no app name is provided, try to detect it from the query
    let usedApp = appName;
    let finalQuery = query;
    if (!usedApp) {
        console.log("No app name provided, analyzing query to detect app...");
        const analyzed = await analyzeUserQuery(query);
        usedApp = analyzed.appName || "Auto-detected app";
        console.log(`App detection result: ${usedApp}`);
        // Only use the extracted query if an app was detected
        if (analyzed.appName) {
            finalQuery = analyzed.query;
            console.log(`Modified query: ${finalQuery}`);
        }
    }
    // Load app details to get the app type and API key
    console.log("Loading app details from storage...");
    const appsJson = await api_1.LocalStorage.getItem("dify-apps");
    const apps = appsJson ? JSON.parse(appsJson) : [];
    console.log(`Loaded ${apps.length} apps from storage`);
    // Log all available apps for debugging
    if (apps.length > 0) {
        console.log("Available apps:", apps.map((app) => ({ name: app.name, type: app.type })));
    }
    else {
        console.log("No apps found in storage");
    }
    const appDetails = apps.find((app) => app.name === usedApp);
    console.log(`App details for "${usedApp}": ${appDetails ? "found" : "not found"}`);
    if (!appDetails) {
        throw new Error(`App "${usedApp}" not found. Please check your app name or add this app first.`);
    }
    console.log(`Using app: ${appDetails.name} (${appDetails.type})`);
    console.log(`Endpoint: ${appDetails.endpoint}`);
    console.log(`API Key: ${appDetails.apiKey ? "******" : "missing"}`);
    console.log(`Inputs: ${JSON.stringify(appDetails.inputs)}`);
    // Prepare request data
    const user = options?.user || `user_${Math.random().toString(36).substring(2, 10)}`;
    const conversationId = options?.conversationId || "";
    // Determine the endpoint based on app type
    let endpoint = "";
    let requestBody = {};
    if (appDetails.type === types_1.DifyAppType.ChatflowAgent) {
        // For chatflow/agent apps
        endpoint = `${appDetails.endpoint}/chat-messages`;
        requestBody = {
            query: finalQuery,
            user,
            inputs: options?.inputs || {},
            response_mode: options?.responseMode || "blocking", // Use provided responseMode or default to blocking
        };
        // 添加 conversation_id，但只有当它是有效的 UUID 时才传递
        if (conversationId) {
            // 检查是否是有效的 UUID
            const isValidUUID = (id) => {
                if (!id)
                    return false;
                const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                return uuidRegex.test(id);
            };
            // 只有当 ID 是有效的 UUID 时才传递
            if (isValidUUID(conversationId)) {
                requestBody.conversation_id = conversationId;
                console.log(`Using valid conversation_id: ${conversationId}`);
            }
            else {
                console.log(`Ignoring invalid conversation_id: ${conversationId}`);
            }
        }
    }
    else if (appDetails.type === types_1.DifyAppType.Workflow) {
        // For workflow apps
        endpoint = `${appDetails.endpoint}/workflows/run`;
        requestBody = {
            query: finalQuery,
            user,
            inputs: options?.inputs || {},
        };
    }
    else if (appDetails.type === types_1.DifyAppType.TextGenerator) {
        // For text completion apps
        endpoint = `${appDetails.endpoint}/completion-messages`;
        requestBody = {
            inputs: {
                ...(options?.inputs || {}),
                query: finalQuery,
            },
            user,
            response_mode: options?.responseMode || "blocking", // Use provided responseMode or default to blocking
        };
    }
    else {
        throw new Error(`Unsupported app type: ${appDetails.type}`);
    }
    try {
        // Make the API request with a timeout of 120 seconds
        console.log(`Making API request to: ${endpoint}`);
        console.log(`Request body: ${JSON.stringify(requestBody)}`);
        // Create a timeout signal
        const timeoutSignal = AbortSignal.timeout(120000);
        let response;
        try {
            response = await (0, node_fetch_1.default)(endpoint, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${appDetails.apiKey}`,
                },
                body: JSON.stringify(requestBody),
                signal: timeoutSignal,
            });
            console.log(`Response status: ${response.status} ${response.statusText}`);
        }
        catch (fetchError) {
            console.error("Fetch error:", fetchError);
            if (fetchError instanceof Error && (fetchError.name === "AbortError" || fetchError.name === "TimeoutError")) {
                throw new Error("Request timed out after 120 seconds");
            }
            throw fetchError;
        }
        if (!response.ok) {
            console.error(`API error: ${response.status} ${response.statusText}`);
            let errorMessage = response.statusText;
            try {
                const errorData = (await response.json());
                errorMessage = errorData.message || response.statusText;
                console.error("Error response data:", errorData);
            }
            catch (parseError) {
                console.error("Could not parse error response as JSON", parseError);
                try {
                    errorMessage = await response.text();
                    console.error("Error response text:", errorMessage);
                }
                catch (textError) {
                    console.error("Could not get response text:", textError);
                    errorMessage = `HTTP error ${response.status}`;
                }
            }
            throw new Error(`Dify API error: ${errorMessage}`);
        }
        // Process the response based on app type and response mode
        let result;
        // Check if we're in streaming mode
        if (options?.responseMode === "streaming") {
            // For streaming mode, we need to handle SSE (Server-Sent Events) format
            // We'll collect the full answer from the stream
            let fullAnswer = "";
            let conversationId = "";
            let messageId = "";
            let metadata = {};
            // Handle streaming response using fetch's native stream handling
            if (!response.body) {
                throw new Error("Response body is null");
            }
            // Use a TextDecoder to convert chunks to text
            const decoder = new TextDecoder();
            let buffer = "";
            // 直接使用响应体作为流读取器
            const reader = response.body;
            // 处理流数据
            try {
                // 处理流
                for await (const chunk of reader) {
                    const text = typeof chunk === 'string' ? chunk : decoder.decode(chunk, { stream: true });
                    buffer += text;
                    // Process complete events in the buffer
                    // SSE format: each event starts with "data: " and ends with "\n\n"
                    const events = buffer.split("\n\n");
                    // Keep the last incomplete event in the buffer
                    buffer = events.pop() || "";
                    for (const event of events) {
                        if (!event.trim() || !event.startsWith("data: "))
                            continue;
                        try {
                            // Extract the JSON part (remove "data: " prefix)
                            const jsonStr = event.substring(6);
                            const eventData = JSON.parse(jsonStr);
                            console.log("Streaming event:", eventData.event);
                            if (eventData.event === "message") {
                                // Append to the answer
                                const messageText = eventData.answer || "";
                                fullAnswer += messageText;
                                // Call the streaming callback if provided with the full accumulated answer
                                if (options?.onStreamingMessage) {
                                    options.onStreamingMessage(fullAnswer, false);
                                }
                                // 如果存在全局回调函数，也调用它，传递完整累积内容
                                // @ts-expect-error - 使用全局回调函数
                                if (global.handleStreamingMessage) {
                                    // @ts-expect-error - 调用全局回调函数
                                    global.handleStreamingMessage(fullAnswer, false);
                                }
                                // Save conversation and message IDs if not already set
                                if (!conversationId && eventData.conversation_id) {
                                    conversationId = eventData.conversation_id;
                                }
                                if (!messageId && eventData.message_id) {
                                    messageId = eventData.message_id;
                                }
                            }
                            else if (eventData.event === "message_end") {
                                // End of message, save metadata
                                if (eventData.metadata) {
                                    metadata = eventData.metadata;
                                }
                                if (!conversationId && eventData.conversation_id) {
                                    conversationId = eventData.conversation_id;
                                }
                                if (!messageId && eventData.id) {
                                    messageId = eventData.id;
                                }
                                // Signal completion to the callback
                                if (options?.onStreamingMessage) {
                                    options.onStreamingMessage(fullAnswer, true);
                                }
                                // 如果存在全局回调函数，也调用它
                                // @ts-expect-error - 使用全局回调函数
                                if (global.handleStreamingMessage) {
                                    // @ts-expect-error - 调用全局回调函数
                                    global.handleStreamingMessage(fullAnswer, true);
                                }
                            }
                            else if (eventData.event === "error") {
                                throw new Error(`Stream error: ${eventData.message || "Unknown error"}`);
                            }
                        }
                        catch (parseError) {
                            console.error("Error parsing SSE event:", parseError, "\nEvent data:", event);
                        }
                    }
                }
            }
            catch (error) {
                console.error("Error processing stream:", error);
            }
            // 打印流处理结果，用于调试
            console.log(`Stream processing result - fullAnswer: ${fullAnswer ? "received" : "empty"}, messageId: ${messageId || "not set"}`);
            // 如果没有收到任何消息但有消息 ID，仍然返回空结果
            if (!fullAnswer && !messageId) {
                console.log("No message content received, but continuing anyway");
                // 不抛出错误，而是返回空结果
                fullAnswer = "";
                messageId = `msg_${Math.random().toString(36).substring(2, 10)}`;
            }
            // Create result from collected data
            result = {
                message: fullAnswer,
                conversation_id: conversationId || `stream_${Math.random().toString(36).substring(2, 10)}`,
                message_id: messageId || `msg_${Math.random().toString(36).substring(2, 10)}`,
                used_app: usedApp,
                app_type: appDetails.type.toString(),
                ...metadata
            };
        }
        else {
            // For blocking mode, process the JSON response
            if (appDetails.type === types_1.DifyAppType.ChatflowAgent) {
                const data = (await response.json());
                result = {
                    message: data.answer,
                    conversation_id: data.conversation_id,
                    message_id: data.message_id,
                    used_app: usedApp,
                    app_type: appDetails.type.toString(),
                    ...(data.metadata || {}),
                };
            }
            else if (appDetails.type === types_1.DifyAppType.Workflow) {
                const data = (await response.json());
                result = {
                    message: data.outputs?.answer || data.outputs?.result || JSON.stringify(data.outputs || {}),
                    conversation_id: `workflow_${data.id}`,
                    message_id: data.id,
                    used_app: usedApp,
                    app_type: appDetails.type.toString(),
                    workflow_id: data.workflow_id,
                    status: data.status,
                };
            }
            else {
                // TextGenerator
                const data = (await response.json());
                result = {
                    message: data.text,
                    conversation_id: `completion_${Math.random().toString(36).substring(2, 10)}`,
                    message_id: data.id || `msg_${Math.random().toString(36).substring(2, 10)}`,
                    used_app: usedApp,
                    app_type: appDetails.type.toString(),
                    ...(data.metadata || {}),
                };
            }
        }
        return result;
    }
    catch (error) {
        console.error("Error calling Dify API:", error);
        if ((error instanceof Error && error.name === "TimeoutError") ||
            (error instanceof Error && error.name === "AbortError")) {
            throw new Error("Request timed out after 120 seconds");
        }
        throw error;
    }
}
/**
 * Analyzes a user query to extract the app name and the actual query content
 * @param userInput The raw user input string
 * @returns An object containing the extracted appName and query
 */
async function analyzeUserQuery(userInput) {
    // Load all available apps for matching
    const appsJson = await api_1.LocalStorage.getItem("dify-apps");
    const apps = appsJson ? JSON.parse(appsJson) : [];
    // Initialize result
    const result = {
        appName: null,
        query: userInput,
    };
    if (apps.length === 0) {
        return result; // No apps to match against
    }
    // Pattern 1: "Using [AppName], ..." or "With [AppName], ..."
    const usingPattern = /^(using|with)\s+([\w\s-]+?)[,:]\s*(.+)$/i;
    const usingMatch = userInput.match(usingPattern);
    if (usingMatch) {
        const potentialAppName = usingMatch[2].trim();
        const matchedApp = findBestMatchingApp(potentialAppName, apps);
        if (matchedApp) {
            result.appName = matchedApp.name;
            result.query = usingMatch[3].trim();
            return result;
        }
    }
    // Pattern 2: "[AppName]: ..."
    const colonPattern = /^([\w\s-]+?):\s*(.+)$/i;
    const colonMatch = userInput.match(colonPattern);
    if (colonMatch) {
        const potentialAppName = colonMatch[1].trim();
        const matchedApp = findBestMatchingApp(potentialAppName, apps);
        if (matchedApp) {
            result.appName = matchedApp.name;
            result.query = colonMatch[2].trim();
            return result;
        }
    }
    // Pattern 3: "Ask [AppName] ..."
    const askPattern = /^ask\s+([\w\s-]+?)\s+(.+)$/i;
    const askMatch = userInput.match(askPattern);
    if (askMatch) {
        const potentialAppName = askMatch[1].trim();
        const matchedApp = findBestMatchingApp(potentialAppName, apps);
        if (matchedApp) {
            result.appName = matchedApp.name;
            result.query = askMatch[2].trim();
            return result;
        }
    }
    // If no pattern matches, try to find app name mentions within the query
    for (const app of apps) {
        // Check if the app name is mentioned in the query
        const appNameLower = app.name.toLowerCase();
        const queryLower = userInput.toLowerCase();
        if (queryLower.includes(appNameLower)) {
            // Found an app name mention, but we need to be careful not to extract common words
            // Only consider it a match if the app name is at least 4 characters or a unique name
            if (app.name.length >= 4 || isUniqueAppName(app.name, apps)) {
                result.appName = app.name;
                // Don't modify the query in this case, as the app name is embedded in context
                break;
            }
        }
    }
    return result;
}
/**
 * Finds the best matching app from a list based on a potential app name
 * @param potentialName The potential app name to match
 * @param apps List of available Dify apps
 * @returns The best matching app or null if no good match
 */
function findBestMatchingApp(potentialName, apps) {
    // Exact match
    const exactMatch = apps.find((app) => app.name.toLowerCase() === potentialName.toLowerCase());
    if (exactMatch)
        return exactMatch;
    // Partial match (app name contains the potential name or vice versa)
    const partialMatches = apps.filter((app) => {
        const appNameLower = app.name.toLowerCase();
        const potentialLower = potentialName.toLowerCase();
        return appNameLower.includes(potentialLower) || potentialLower.includes(appNameLower);
    });
    if (partialMatches.length === 1) {
        return partialMatches[0];
    }
    // If multiple partial matches, find the closest one
    if (partialMatches.length > 1) {
        // Sort by similarity (length of common substring)
        partialMatches.sort((a, b) => {
            const aCommon = commonSubstringLength(a.name.toLowerCase(), potentialName.toLowerCase());
            const bCommon = commonSubstringLength(b.name.toLowerCase(), potentialName.toLowerCase());
            return bCommon - aCommon; // Descending order
        });
        return partialMatches[0];
    }
    return null;
}
/**
 * Calculates the length of the longest common substring between two strings
 * @param str1 First string
 * @param str2 Second string
 * @returns Length of the longest common substring
 */
function commonSubstringLength(str1, str2) {
    const m = str1.length;
    const n = str2.length;
    let maxLength = 0;
    // Create a table to store lengths of longest common suffixes
    const dp = Array(m + 1)
        .fill(0)
        .map(() => Array(n + 1).fill(0));
    // Fill the dp table
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            if (str1[i - 1] === str2[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1] + 1;
                maxLength = Math.max(maxLength, dp[i][j]);
            }
        }
    }
    return maxLength;
}
/**
 * Checks if an app name is unique enough to be considered a match
 * @param appName The app name to check
 * @param apps List of all apps
 * @returns True if the app name is unique enough
 */
function isUniqueAppName(appName, apps) {
    // Common words that shouldn't be considered unique app names
    const commonWords = ["app", "chat", "assistant", "bot", "help", "ai", "dify"];
    if (commonWords.includes(appName.toLowerCase())) {
        return false;
    }
    // Check if this app name is significantly different from others
    const similarApps = apps.filter((app) => {
        if (app.name === appName)
            return false; // Skip the app itself
        const similarity = commonSubstringLength(app.name.toLowerCase(), appName.toLowerCase()) / Math.max(app.name.length, appName.length);
        return similarity > 0.7; // 70% similarity threshold
    });
    return similarApps.length === 0; // Unique if no similar apps
}
