"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DifyAppType = void 0;
exports.getAppTypeText = getAppTypeText;
exports.getAppTypeColor = getAppTypeColor;
// Define app types enum
var DifyAppType;
(function (DifyAppType) {
    DifyAppType["ChatflowAgent"] = "Chatflow/Agent";
    DifyAppType["Workflow"] = "Workflow";
    DifyAppType["TextGenerator"] = "Text Generator";
})(DifyAppType || (exports.DifyAppType = DifyAppType = {}));
// Helper function to get readable app type text
function getAppTypeText(type) {
    switch (type) {
        case DifyAppType.ChatflowAgent:
            return "Chatflow/Agent";
        case DifyAppType.Workflow:
            return "Workflow";
        case DifyAppType.TextGenerator:
            return "Text Generator";
        default:
            return "Unknown";
    }
}
// Helper function to get color for app type
function getAppTypeColor(type) {
    switch (type) {
        case DifyAppType.ChatflowAgent:
            return "#007AFF"; // Blue
        case DifyAppType.Workflow:
            return "#FF9500"; // Orange
        case DifyAppType.TextGenerator:
            return "#34C759"; // Green
        default:
            return "#8E8E93"; // Gray
    }
}
