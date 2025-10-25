// server.js
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const SSO_CONFIG = require('./config');

const app = express();
const PORT = process.env.PORT || 3006;

app.use(cookieParser());
app.use(express.static('public'));

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
    // 验证JWT令牌 - 使用公钥和RS256算法
    const decoded = jwt.verify(token, SSO_CONFIG.publicKey, {
      algorithms: ['RS256'],
      ignoreExpiration: false,
      issuer: process.env.JWT_ISSUER
    });

    // 验证client_id
    if (decoded.client_id !== SSO_CONFIG.clientId) {
      return res.status(400).send('无效的客户端ID');
    }
  } catch (err) {
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).send('JWT验证失败: ' + err.message);
    }
    return res.status(500).send('服务器内部错误');
  }

  // 设置HttpOnly Cookie
  res.cookie('sso_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000
  });

  // 重定向到首页
  res.redirect('/');
});

// API路由 - 获取当前用户信息
app.get('/api/user', (req, res) => {
  const token = req.cookies.sso_token;

  if (!token) {
    return res.status(401).json({ error: '未登录' });
  }

  try {
    const decoded = jwt.verify(token, SSO_CONFIG.publicKey, {
      algorithms: ['RS256']
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
