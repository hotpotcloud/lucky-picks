/** AI 对话面板：基于 assistant-ui 运行时，接入项目自有对话接口。 */

import {
  AssistantRuntimeProvider,
  ComposerPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
  useLocalRuntime,
} from '@assistant-ui/react';
import type { ChatModelAdapter, ThreadMessage } from '@assistant-ui/react';
import { MarkdownTextPrimitive } from '@assistant-ui/react-markdown';
import {
  Bot,
  KeyRound,
  LoaderCircle,
  Send,
  Settings,
  Sparkles,
  Square,
  Trash2,
} from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { fetchAiChat } from '../../api/client';
import type { ChatMessageDto } from '../../api/types';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { useChatSettings } from './useChatSettings';

/** 从 assistant-ui 消息中提取文本内容。 */
const collectMessageText = (message: ThreadMessage): string =>
  message.content
    .filter((part) => part.type === 'text')
    .map((part) => part.text)
    .join('\n')
    .trim();

/** 助手消息 Markdown 渲染。 */
const AssistantMarkdown = () => (
  <MarkdownTextPrimitive className="chat-markdown" smooth defer={false} />
);

/** 用户消息纯文本渲染。 */
const UserText = () => (
  <MessagePrimitive.Parts
    components={{
      Text: ({ text }) => <p className="m-0 whitespace-pre-wrap break-words">{text}</p>,
    }}
  />
);

/** 助手消息内容渲染。 */
const AssistantText = () => (
  <MessagePrimitive.Parts components={{ Text: AssistantMarkdown }} />
);

/** 空会话快捷提问。 */
const QUICK_PROMPTS = ['解读最近 50 期的冷热分布', '奇偶与大小比例如何配置？', '说明复式与胆拖的区别'];

/**
 * AI 对话主面板。
 */
export const ChatPanel = () => {
  const { settings, updateSettings } = useChatSettings();
  const [showSettings, setShowSettings] = useState(false);

  // 适配器只创建一次，运行时通过 ref 读取最新配置，避免修改配置时重置会话。
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const adapter = useMemo<ChatModelAdapter>(
    () => ({
      async run({ messages, abortSignal }) {
        const current = settingsRef.current;
        const payload: ChatMessageDto[] = [];
        if (current.systemPrompt.trim()) {
          payload.push({ role: 'system', content: current.systemPrompt.trim() });
        }
        for (const message of messages) {
          if (message.role === 'system') {
            continue;
          }
          const content = collectMessageText(message);
          if (content) {
            payload.push({ role: message.role, content });
          }
        }

        const reply = await fetchAiChat(
          payload,
          current.model,
          current.useServerKey ? '' : current.apiKey,
          abortSignal,
        );
        return {
          content: [{ type: 'text', text: reply.content }],
          status: { type: 'complete', reason: 'stop' },
        };
      },
    }),
    [],
  );

  const runtime = useLocalRuntime(adapter);

  /**
   * 清空会话并中断正在生成的回复。
   */
  const handleClear = () => {
    runtime.thread.cancelRun();
    runtime.thread.reset();
  };

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <section className="chat-shell">
        <header className="chat-toolbar">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-[var(--border)] bg-[var(--card-raised)] text-cyan-300">
              <Bot className="size-4" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h2 className="m-0 text-base font-semibold text-foreground">AI 对话</h2>
              <p className="m-0 truncate text-xs text-muted-foreground">
                {settings.useServerKey ? '服务端密钥' : '专属密钥'} · {settings.model}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              aria-expanded={showSettings}
              onClick={() => setShowSettings((value) => !value)}
            >
              <Settings className="size-4" aria-hidden="true" />
              配置
            </Button>
            <Button variant="ghost" size="sm" onClick={handleClear} title="清空会话">
              <Trash2 className="size-4" aria-hidden="true" />
              清空
            </Button>
          </div>
        </header>

        {showSettings && (
          <div className="chat-settings">
            <label className="chat-field">
              <span>模型</span>
              <Input
                list="chat-model-options"
                value={settings.model}
                placeholder="deepseek-v4.1-flash"
                onChange={(event) => updateSettings({ model: event.target.value })}
              />
              <datalist id="chat-model-options">
                <option value="deepseek-v4.1-flash" />
                <option value="deepseek-v3.2" />
                <option value="glm-4.6" />
              </datalist>
            </label>

            <div className="chat-field">
              <span>密钥来源</span>
              <div className="chat-key-toggle" role="group" aria-label="密钥来源">
                <button
                  type="button"
                  aria-pressed={settings.useServerKey}
                  className={settings.useServerKey ? 'is-active' : undefined}
                  onClick={() => updateSettings({ useServerKey: true })}
                >
                  <Sparkles className="size-4" aria-hidden="true" />
                  服务端
                </button>
                <button
                  type="button"
                  aria-pressed={!settings.useServerKey}
                  className={!settings.useServerKey ? 'is-active' : undefined}
                  onClick={() => updateSettings({ useServerKey: false })}
                >
                  <KeyRound className="size-4" aria-hidden="true" />
                  自带
                </button>
              </div>
            </div>

            {!settings.useServerKey && (
              <label className="chat-field">
                <span>你的 Key</span>
                <Input
                  type="password"
                  autoComplete="off"
                  value={settings.apiKey}
                  placeholder="仅保存在当前标签页"
                  onChange={(event) => updateSettings({ apiKey: event.target.value })}
                />
              </label>
            )}

            <label className="chat-field chat-field-wide">
              <span>系统提示词</span>
              <textarea
                className="chat-textarea"
                rows={2}
                value={settings.systemPrompt}
                placeholder="可选，例如：回答尽量简短"
                onChange={(event) => updateSettings({ systemPrompt: event.target.value })}
              />
            </label>
          </div>
        )}

        <ThreadPrimitive.Root className="chat-thread">
          <ThreadPrimitive.Viewport autoScroll className="chat-viewport">
            <ThreadPrimitive.Empty>
              <div className="chat-empty">
                <Bot className="size-10 text-cyan-300/80" aria-hidden="true" />
                <div className="flex flex-wrap justify-center gap-2">
                  {QUICK_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      className="chat-quick-prompt"
                      onClick={() =>
                        runtime.thread.append({
                          role: 'user',
                          content: [{ type: 'text', text: prompt }],
                          startRun: true,
                        })
                      }
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            </ThreadPrimitive.Empty>

            <ThreadPrimitive.Messages>
              {({ message }) =>
                message.role === 'user' ? (
                  <MessagePrimitive.Root className="chat-message chat-message-user">
                    <UserText />
                  </MessagePrimitive.Root>
                ) : (
                  <MessagePrimitive.Root className="chat-message chat-message-assistant">
                    <AssistantText />
                    {message.status?.type === 'running' && (
                      <span className="chat-thinking" aria-label="正在生成">
                        <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" />
                        生成中
                      </span>
                    )}
                  </MessagePrimitive.Root>
                )
              }
            </ThreadPrimitive.Messages>
          </ThreadPrimitive.Viewport>

          <ComposerPrimitive.Root className="chat-composer">
            <ComposerPrimitive.Input
              className="chat-composer-input"
              placeholder="输入问题，Enter 发送，Shift + Enter 换行"
              minRows={1}
              maxRows={6}
              submitMode="enter"
            />
            <div className="chat-composer-actions">
              <ThreadPrimitive.If running>
                <ComposerPrimitive.Cancel asChild>
                  <Button variant="outline" size="sm" title="停止生成">
                    <Square className="size-3.5" aria-hidden="true" />
                    停止
                  </Button>
                </ComposerPrimitive.Cancel>
              </ThreadPrimitive.If>
              <ComposerPrimitive.Send asChild>
                <Button size="sm" title="发送">
                  <Send className="size-4" aria-hidden="true" />
                  发送
                </Button>
              </ComposerPrimitive.Send>
            </div>
          </ComposerPrimitive.Root>
        </ThreadPrimitive.Root>
      </section>
    </AssistantRuntimeProvider>
  );
};

export default ChatPanel;
