# 第三方应用SSO集成示例

这是一个使用HttpOnly Cookie存储JWT令牌的第三方应用SSO集成示例。

## 功能特点

1. 使用HttpOnly Cookie安全存储JWT令牌
2. 通过服务器端验证JWT令牌
3. 实现完整的登录/登出流程
4. 安全的状态参数验证

## 运行方式

### 1. 安装依赖

```bash
npm install
```

### 2. 配置SSO客户端

在 [server.js](file:///Users/znb/workspace/next/SSO/third-party-demo/server.js) 文件中配置您的SSO客户端信息：

```javascript
const SSO_CONFIG = {
  clientId: 'your_client_id_here',
  publicKey: `-----BEGIN PUBLIC KEY-----
YOUR_PUBLIC_KEY_HERE
-----END PUBLIC KEY-----`
};
```

### 3. 启动应用

开发模式：
```bash
npm run dev
# 指定端口运行App
npm run dev  -- -p 3006
```

# 端口配置

server.js

```javascript
const PORT = process.env.PORT || 3006;
```

生产模式：
```bash
npm start
```

应用将运行在 http://localhost:3006

## 安全特性

1. **HttpOnly Cookie**: JWT令牌存储在HttpOnly Cookie中，防止XSS攻击
2. **SameSite保护**: 设置SameSite属性防止CSRF攻击
3. **服务端验证**: 所有JWT令牌都在服务端验证，确保安全性
4. **状态验证**: 使用state参数防止CSRF攻击

## 工作流程

1. 用户点击"使用SSO登录"按钮
2. 应用生成state参数并重定向到SSO登录页面
3. 用户在SSO系统中完成身份验证
4. SSO系统重定向回应用的回调URL (`/sso/callback`)
5. 服务端验证JWT令牌并设置HttpOnly Cookie
6. 用户在应用中保持登录状态，直到主动退出或令牌过期