import { j as jsxRuntimeExports, r as reactExports } from "./react-vendor.js";
import { S as SettingsStorage, G as GeminiAPIClient } from "./shared-core.js";
import "./shared-errors.js";
const Button = ({
  children,
  onClick,
  variant = "primary",
  size = "md",
  disabled = false,
  loading = false,
  className = "",
  type = "button",
  title
}) => {
  const baseClasses = "inline-flex items-center justify-center font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2";
  const variantClasses = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500",
    secondary: "bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-500",
    danger: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500"
  };
  const sizeClasses = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base"
  };
  const disabledClasses = disabled || loading ? "opacity-50 cursor-not-allowed" : "";
  const combinedClasses = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${disabledClasses} ${className}`;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "button",
    {
      type,
      onClick,
      disabled: disabled || loading,
      className: combinedClasses,
      title,
      children: [
        loading && /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "svg",
          {
            className: "animate-spin -ml-1 mr-2 h-4 w-4 text-current",
            fill: "none",
            viewBox: "0 0 24 24",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "circle",
                {
                  className: "opacity-25",
                  cx: "12",
                  cy: "12",
                  r: "10",
                  stroke: "currentColor",
                  strokeWidth: "4"
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "path",
                {
                  className: "opacity-75",
                  fill: "currentColor",
                  d: "M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                }
              )
            ]
          }
        ),
        children
      ]
    }
  );
};
const Input = ({
  label,
  placeholder,
  value,
  onChange,
  type = "text",
  disabled = false,
  error,
  className = "",
  required = false
}) => {
  const inputClasses = `
    w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 
    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
    ${error ? "border-red-300" : "border-gray-300"}
    ${disabled ? "bg-gray-50 text-gray-500 cursor-not-allowed" : "bg-white text-gray-900"}
    ${className}
  `.trim();
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", flexDirection: "column", gap: "8px" }, children: [
    label && /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { style: { display: "block", fontSize: "14px", fontWeight: "500", color: "#374151" }, children: [
      label,
      required && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { color: "#EF4444", marginLeft: "4px" }, children: "*" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "input",
      {
        type,
        value,
        onChange: (e) => onChange(e.target.value),
        placeholder,
        disabled,
        className: inputClasses,
        required
      }
    ),
    error && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { style: { fontSize: "14px", color: "#DC2626", margin: "0" }, children: error })
  ] });
};
const useStorage = () => {
  const [apiKey, setApiKeyState] = reactExports.useState(null);
  const [userSettings, setUserSettingsState] = reactExports.useState({});
  const [isLoading, setIsLoading] = reactExports.useState(true);
  const [error, setError] = reactExports.useState(null);
  reactExports.useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const [loadedApiKey, loadedSettings] = await Promise.all([
          SettingsStorage.getApiKey(),
          SettingsStorage.getUserSettings()
        ]);
        setApiKeyState(loadedApiKey);
        setUserSettingsState(loadedSettings);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load settings");
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);
  const setApiKey = reactExports.useCallback(async (newApiKey) => {
    try {
      setError(null);
      await SettingsStorage.setApiKey(newApiKey);
      setApiKeyState(newApiKey);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save API key");
      throw err;
    }
  }, []);
  const setUserSettings = reactExports.useCallback(async (newSettings) => {
    try {
      setError(null);
      await SettingsStorage.setUserSettings(newSettings);
      setUserSettingsState(newSettings);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings");
      throw err;
    }
  }, []);
  const clearError = reactExports.useCallback(() => {
    setError(null);
  }, []);
  return {
    apiKey,
    userSettings,
    isLoading,
    error,
    setApiKey,
    setUserSettings,
    clearError
  };
};
class GeminiService {
  static async generateReply(messages, config) {
    return GeminiAPIClient.generateReply(messages, config);
  }
  /**
   * Generate reply from conversation text
   */
  static async generateReplyFromText(conversationText, config) {
    return GeminiAPIClient.generateReplyFromText(conversationText, config);
  }
  /**
   * Generate reply from service messages
   */
  static async generateContextualReply(messages, config) {
    return GeminiAPIClient.generateContextualReply(messages, config);
  }
  static validateApiKey(apiKey) {
    return GeminiAPIClient.validateApiKey(apiKey);
  }
  /**
   * Test API connection
   */
  static async testConnection(apiKey) {
    return GeminiAPIClient.testConnection(apiKey);
  }
  static handleApiError(error) {
    if (error instanceof Error) {
      return {
        message: error.message,
        details: error
      };
    }
    return {
      message: "Unknown error occurred while calling Gemini API",
      details: error
    };
  }
}
const SettingsForm = () => {
  const { apiKey, isLoading, error, setApiKey, clearError } = useStorage();
  const [inputValue, setInputValue] = reactExports.useState("");
  const [isSaving, setIsSaving] = reactExports.useState(false);
  const [saveSuccess, setSaveSuccess] = reactExports.useState(false);
  const [validationError, setValidationError] = reactExports.useState("");
  reactExports.useEffect(() => {
    if (apiKey) {
      setInputValue(apiKey);
    }
  }, [apiKey]);
  const handleSave = async () => {
    clearError();
    setValidationError("");
    setSaveSuccess(false);
    if (!inputValue.trim()) {
      setValidationError("APIキーを入力してください");
      return;
    }
    if (!GeminiService.validateApiKey(inputValue.trim())) {
      setValidationError("無効なAPIキー形式です。Google AI StudioでAIzaで始まるキーを取得してください");
      return;
    }
    try {
      setIsSaving(true);
      await setApiKey(inputValue.trim());
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3e3);
    } catch (err) {
      console.error("Failed to save API key:", err);
    } finally {
      setIsSaving(false);
    }
  };
  const handleClear = async () => {
    if (confirm("APIキーを削除しますか？この操作は元に戻せません。")) {
      try {
        setIsSaving(true);
        await setApiKey("");
        setInputValue("");
        setSaveSuccess(false);
      } catch (err) {
        console.error("Failed to clear API key:", err);
      } finally {
        setIsSaving(false);
      }
    }
  };
  if (isLoading) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-center py-8", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "ml-2 text-gray-600", children: "設定を読み込み中..." })
    ] });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", flexDirection: "column", gap: "24px" }, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", flexDirection: "column", gap: "16px" }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { marginBottom: "8px" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { style: { fontSize: "18px", fontWeight: "600", color: "#111827", margin: "0 0 8px 0", lineHeight: "1.5" }, children: "Gemini API設定" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { style: { fontSize: "14px", color: "#6B7280", margin: "0", lineHeight: "1.5" }, children: "AI返信機能を使用するには、Google AI StudioでGemini APIキーを取得してください。" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: {
        backgroundColor: "#EFF6FF",
        border: "1px solid #DBEAFE",
        borderRadius: "12px",
        padding: "20px",
        marginBottom: "8px",
        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)"
      }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", alignItems: "center", marginBottom: "20px" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: {
            width: "36px",
            height: "36px",
            backgroundColor: "#DBEAFE",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginRight: "16px",
            flexShrink: 0
          }, children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontSize: "18px" }, children: "🔑" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { flex: 1 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { style: { fontSize: "15px", fontWeight: "600", color: "#1E3A8A", margin: "0 0 4px 0", lineHeight: "1.4" }, children: "APIキー設定" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { style: { fontSize: "13px", color: "#3730A3", margin: "0", lineHeight: "1.4" }, children: "セキュアな接続でAI機能を有効化" })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { marginBottom: "20px" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          Input,
          {
            label: "Gemini APIキー",
            type: "password",
            value: inputValue,
            onChange: setInputValue,
            placeholder: "AIzaで始まるAPIキーを入力",
            error: validationError || error || void 0,
            required: true
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", gap: "12px", flexWrap: "wrap" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            Button,
            {
              onClick: handleSave,
              disabled: isSaving || isLoading,
              loading: isSaving,
              children: "保存"
            }
          ),
          apiKey && /* @__PURE__ */ jsxRuntimeExports.jsx(
            Button,
            {
              onClick: handleClear,
              variant: "danger",
              disabled: isSaving || isLoading,
              children: "削除"
            }
          )
        ] })
      ] }),
      saveSuccess && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: {
        padding: "12px",
        backgroundColor: "#F0FDF4",
        border: "1px solid #BBF7D0",
        borderRadius: "6px",
        marginBottom: "16px"
      }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { style: {
        fontSize: "14px",
        color: "#15803D",
        display: "flex",
        alignItems: "center",
        margin: "0"
      }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("svg", { style: { width: "16px", height: "16px", marginRight: "8px" }, fill: "currentColor", viewBox: "0 0 20 20", children: /* @__PURE__ */ jsxRuntimeExports.jsx("path", { fillRule: "evenodd", d: "M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z", clipRule: "evenodd" }) }),
        "APIキーが保存されました"
      ] }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { borderTop: "1px solid #E5E7EB", paddingTop: "20px", marginTop: "16px", marginBottom: "20px" }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { style: { fontSize: "16px", fontWeight: "600", color: "#111827", margin: "0 0 16px 0", lineHeight: "1.5" }, children: "APIキーの取得方法" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", flexDirection: "column", gap: "12px", fontSize: "14px", color: "#4B5563", lineHeight: "1.6" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { style: { margin: "0", paddingLeft: "4px" }, children: [
          "1. ",
          /* @__PURE__ */ jsxRuntimeExports.jsx("a", { href: "https://aistudio.google.com/app/apikey", target: "_blank", rel: "noopener noreferrer", style: { color: "#2563EB", textDecoration: "underline", fontWeight: "500" }, children: "Google AI Studio" }),
          " にアクセス"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { style: { margin: "0", paddingLeft: "4px" }, children: "2. 「Create API Key」をクリック" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { style: { margin: "0", paddingLeft: "4px" }, children: "3. 生成されたAPIキー（AIzaで始まる文字列）をコピー" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { style: { margin: "0", paddingLeft: "4px" }, children: "4. 上記の入力欄にペーストして保存" })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { borderTop: "1px solid #E5E7EB", paddingTop: "20px", marginBottom: "20px" }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { style: { fontSize: "16px", fontWeight: "600", color: "#111827", margin: "0 0 16px 0", lineHeight: "1.5" }, children: "使用方法" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", flexDirection: "column", gap: "12px", fontSize: "14px", color: "#4B5563", lineHeight: "1.6" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { style: { margin: "0", paddingLeft: "4px" }, children: "• Gmail、Chatwork、Google Chatの返信エリアに🤖ボタンが表示されます" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { style: { margin: "0", paddingLeft: "4px" }, children: "• ボタンをクリックすると会話の文脈に基づいた返信案が生成されます" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { style: { margin: "0", paddingLeft: "4px" }, children: "• 生成された返信案は編集してから送信できます" })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { borderTop: "1px solid #E5E7EB", paddingTop: "20px", paddingBottom: "0" }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { style: { fontSize: "16px", fontWeight: "600", color: "#111827", margin: "0 0 16px 0", lineHeight: "1.5" }, children: "注意事項" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", flexDirection: "column", gap: "12px", fontSize: "14px", color: "#4B5563", lineHeight: "1.6" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { style: { margin: "0", paddingLeft: "4px" }, children: "• APIキーはブラウザ内に安全に保存され、外部に送信されません" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { style: { margin: "0", paddingLeft: "4px" }, children: "• Gemini APIの利用には料金が発生する場合があります" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { style: { margin: "0", paddingLeft: "4px" }, children: "• 機密情報を含む会話での使用は避けてください" })
      ] })
    ] })
  ] });
};
export {
  SettingsForm
};
