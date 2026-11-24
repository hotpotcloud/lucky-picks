/** AI 对话配置：模型与提示词本地保存，用户 Key 仅保存在会话存储。 */

import { useCallback, useEffect, useState } from 'react';

/** 默认模型，与服务端统计分析的默认模型保持一致。 */
export const DEFAULT_CHAT_MODEL = 'deepseek-v4.1-flash';

/** 配置存储键（模型/提示词）。 */
const SETTINGS_KEY = 'lucky-picks:chat-settings';

/** 用户 Key 存储键，只写入 sessionStorage，关闭标签页即清除。 */
const API_KEY_STORAGE = 'lucky-picks:chat-key';

export interface ChatSettings {
  /** 模型名称。 */
  model: string;
  /** 是否使用服务端 PWKEY。 */
  useServerKey: boolean;
  /** 用户自带 Key。 */
  apiKey: string;
  /** 自定义系统提示词。 */
  systemPrompt: string;
}

/** 默认配置。 */
const DEFAULT_SETTINGS: ChatSettings = {
  model: DEFAULT_CHAT_MODEL,
  useServerKey: true,
  apiKey: '',
  systemPrompt: '',
};

/**
 * 读取本地配置。
 * @returns 合并默认值后的配置
 */
const readSettings = (): ChatSettings => {
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    const parsed = raw ? (JSON.parse(raw) as Partial<ChatSettings>) : {};
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      apiKey: window.sessionStorage.getItem(API_KEY_STORAGE) ?? '',
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
};

/**
 * 对话配置 Hook。
 * @returns 当前配置、更新方法与重置方法
 */
export const useChatSettings = () => {
  const [settings, setSettings] = useState<ChatSettings>(readSettings);

  useEffect(() => {
    try {
      const { apiKey, ...persisted } = settings;
      window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(persisted));
      if (apiKey) {
        window.sessionStorage.setItem(API_KEY_STORAGE, apiKey);
      } else {
        window.sessionStorage.removeItem(API_KEY_STORAGE);
      }
    } catch {
      // 存储不可用时保持内存状态，不阻断对话功能。
    }
  }, [settings]);

  const updateSettings = useCallback((patch: Partial<ChatSettings>) => {
    setSettings((previous) => ({ ...previous, ...patch }));
  }, []);

  const resetSettings = useCallback(() => {
    setSettings({ ...DEFAULT_SETTINGS });
  }, []);

  return { settings, updateSettings, resetSettings };
};
