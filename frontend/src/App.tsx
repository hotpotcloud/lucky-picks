/** 应用根组件：登录门禁与选号工作台入口。 */

import { WorkbenchApp } from './components/workbench/WorkbenchApp';
import { useAuth } from './features/auth/AuthContext';
import LoginPage from './features/auth/LoginPage';

const App = () => {
  const { user, ready } = useAuth();

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        正在加载应用...
      </div>
    );
  }

  return user ? <WorkbenchApp /> : <LoginPage />;
};

export default App;
