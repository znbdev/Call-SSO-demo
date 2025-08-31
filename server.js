const express = require('express');
const jwt = require('jsonwebtoken');
const path = require('path');
const cookieParser = require('cookie-parser');

const app = express();
const PORT = process.env.PORT || 3006;

// 中间件
app.use(cookieParser());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// 模拟的客户端配置（实际应该从配置文件或数据库获取）
const SSO_CONFIG = {
  clientId: 'example_client_id',
  // 使用共享密钥而不是公钥
  secret: 'your-shared-secret-key-for-jwt-verification'
};

// 首页路由
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// SSO回调路由 - 处理来自SSO系统的JWT令牌
app.get('/sso/callback', (req, res) => {
  const { token, state } = req.query;
  
  if (!token) {
    return res.status(400).send('缺少token参数');
  }
  
  try {
    // 验证JWT令牌 - 使用共享密钥
    const decoded = jwt.verify(token, SSO_CONFIG.secret, {
      algorithms: ['HS256']
    });
    
    // 验证client_id
    if (decoded.client_id !== SSO_CONFIG.clientId) {
      return res.status(400).send('无效的客户端ID');
    }
    
    // 设置HttpOnly Cookie
    res.cookie('sso_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // 生产环境使用HTTPS
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000 // 24小时
    });
    
    // 重定向到首页，此时用户已登录
    res.redirect('/');
  } catch (error) {
    console.error('JWT验证失败:', error);
    res.status(401).send('令牌验证失败');
  }
});

// API路由 - 获取当前用户信息
app.get('/api/user', (req, res) => {
  const token = req.cookies.sso_token;
  
  if (!token) {
    return res.status(401).json({ error: '未登录' });
  }
  
  try {
    // 使用共享密钥进行验证
    const decoded = jwt.verify(token, SSO_CONFIG.secret, {
      algorithms: ['HS256']
    });
    
    res.json({
      user: {
        id: decoded.sub,
        email: decoded.email,
        username: decoded.username,
        role: decoded.role
      }
    });
  } catch (error) {
    console.error('JWT验证失败:', error);
    res.status(401).json({ error: '令牌无效' });
  }
});

// API路由 - 退出登录
app.post('/api/logout', (req, res) => {
  res.clearCookie('sso_token');
  res.json({ success: true });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`第三方应用服务器运行在端口 ${PORT}`);
  console.log(`访问 http://localhost:${PORT} 查看应用`);
});
