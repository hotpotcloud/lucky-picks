/** 登录页：账号密码表单。 */

import { Button, Card, Form, Input, Typography, Alert } from 'antd';
import { useAuth } from './AuthContext';

/**
 * 登录页面。
 */
const LoginPage = () => {
  const { signIn, offline } = useAuth();

  return (
    <div className="login-shell">
      <Card className="login-card" title={<Typography.Title level={3}>Lucky Picks</Typography.Title>}>
        {offline && (
          <Alert
            type="info"
            showIcon
            message="离线模式"
            description="当前未配置后端服务，使用本地演示账号登录。"
          />
        )}
        <Form
          layout="vertical"
          initialValues={{ username: 'admin', password: '888888' }}
          onFinish={async (values) => {
            await signIn(String(values.username), String(values.password));
          }}
        >
          <Form.Item label="账号" name="username" rules={[{ required: true, message: '请输入账号' }]}>
            <Input autoComplete="username" />
          </Form.Item>
          <Form.Item label="密码" name="password" rules={[{ required: true, message: '请输入密码' }]}>
            <Input.Password autoComplete="current-password" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block size="large">
            登录
          </Button>
        </Form>
      </Card>
    </div>
  );
};

export default LoginPage;
