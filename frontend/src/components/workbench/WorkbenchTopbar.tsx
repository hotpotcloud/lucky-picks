import { BarChart3, Clock3, History, LogOut, MessageSquare, Sparkles } from 'lucide-react';
import { Button } from '../ui/button';
import { useAuth } from '../../features/auth/AuthContext';
import { InvitePanel } from '../../features/auth/InvitePanel';
import type { NavigationItem, WorkbenchTab } from './types';

const NAVIGATION: NavigationItem[] = [
  { label: '选号工作台', value: 'picker', icon: <Sparkles aria-hidden="true" /> },
  { label: '智能推荐', value: 'recommend', icon: <Clock3 aria-hidden="true" /> },
  { label: '历史数据', value: 'history', icon: <History aria-hidden="true" /> },
  { label: '数据分析', value: 'analysis', icon: <BarChart3 aria-hidden="true" /> },
  { label: 'AI 对话', value: 'chat', icon: <MessageSquare aria-hidden="true" /> },
];

interface WorkbenchTopbarProps {
  activeTab: WorkbenchTab;
  onTabChange: (tab: WorkbenchTab) => void;
}

export const WorkbenchTopbar = ({ activeTab, onTabChange }: WorkbenchTopbarProps) => {
  const { user, signOut } = useAuth();

  return (
    <header className="app-header">
      <div className="app-topbar">
        <button
          className="flex shrink-0 items-center gap-3 text-left"
          type="button"
          onClick={() => onTabChange('picker')}
        >
          <span className="grid size-9 place-items-center rounded-md bg-primary text-primary-foreground">
            <Sparkles className="size-4" aria-hidden="true" />
          </span>
          <strong className="hidden text-sm font-semibold text-foreground sm:block">Lucky Picks</strong>
        </button>

        <nav className="top-nav min-w-0 flex-1 overflow-x-auto" aria-label="主导航">
          {NAVIGATION.map((navigation) => (
            <button
              key={navigation.value}
              type="button"
              className="nav-item"
              aria-current={activeTab === navigation.value ? 'page' : undefined}
              onClick={() => onTabChange(navigation.value)}
            >
              <span className="[&>svg]:size-4">{navigation.icon}</span>
              <span>{navigation.label}</span>
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <InvitePanel />
        </div>
        <span className="hidden max-w-28 truncate text-xs text-muted-foreground md:block">
          {user?.username}
        </span>
        <Button
          variant="ghost"
          size="sm"
          aria-label="退出登录"
          title="退出登录"
          onClick={() => void signOut()}
        >
          <LogOut className="size-4" aria-hidden="true" />
        </Button>
      </div>
    </header>
  );
};
