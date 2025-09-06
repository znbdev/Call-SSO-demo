const express = require('express');
const jwt = require('jsonwebtoken');
const path = require('path');
const cookieParser = require('cookie-parser');
const fs = require('fs');
require('dotenv').config(); // 这一行将加载 .env 文件

const app = express();
const PORT = process.env.PORT || 3006;

// 中间件
app.use(cookieParser());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// 获取公钥路径的函数
function getPublicKeyPath() {
  const envPath = process.env.JWT_PUBLIC_KEY_PATH;
  const defaultPath = path.join(__dirname, 'key', 'public_key.pem');

  // 添加调试日志
  console.log(`process.cwd(): ${process.cwd()}`);
  console.log(`__dirname: ${__dirname}`);
  console.log(`defaultPath: ${defaultPath}`);

  // 如果环境变量设置了路径且文件存在，则使用环境变量路径
  if (envPath && fs.existsSync(envPath)) {
    console.log(`使用环境变量指定的公钥路径: ${envPath}`);
    return envPath;
  }

  // 否则使用默认路径（如果存在）
  if (fs.existsSync(defaultPath)) {
    console.log(`使用默认公钥路径: ${defaultPath}`);
    return defaultPath;
  }

  // 如果环境变量路径存在但文件不存在，仍然返回环境变量路径（会报错，但错误信息更明确）
  if (envPath) {
    console.log(`环境变量路径文件不存在，但仍使用环境变量指定的路径: ${envPath}`);
    return envPath;
  }

  // 最后返回默认路径
  console.log(`使用默认公钥路径（兜底）: ${defaultPath}`);
  return defaultPath;
}

// 模拟的客户端配置（实际应该从配置文件或数据库获取）
const SSO_CONFIG = {
  clientId: 'example_client_id',
  // 使用RSA公钥，优先使用环境变量路径，文件不存在时使用默认路径
  publicKeyPath: getPublicKeyPath()
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
    // 验证JWT令牌 - 使用RSA公钥
    console.log(`正在尝试读取公钥文件: ${SSO_CONFIG.publicKeyPath}`);

    // 检查文件是否存在
    if (!fs.existsSync(SSO_CONFIG.publicKeyPath)) {
      console.error(`公钥文件不存在: ${SSO_CONFIG.publicKeyPath}`);
      return res.status(500).send('服务器配置错误：公钥文件不存在');
    }

    const publicKey = fs.readFileSync(SSO_CONFIG.publicKeyPath);
    const decoded = jwt.verify(token, publicKey, {
      algorithms: ['RS256']
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
    if (error.code === 'ENOENT') {
      res.status(500).send('服务器配置错误：无法找到公钥文件');
    } else if (error.name === 'JsonWebTokenError') {
      res.status(401).send('令牌验证失败：JWT无效');
    } else {
      res.status(500).send('服务器内部错误');
    }
  }
});

// API路由 - 获取当前用户信息
app.get('/api/user', (req, res) => {
  const token = req.cookies.sso_token;
  
  if (!token) {
    return res.status(401).json({ error: '未登录' });
  }
  
  try {
    // 使用RSA公钥进行验证
    console.log(`正在尝试读取公钥文件: ${SSO_CONFIG.publicKeyPath}`);

    // 检查文件是否存在
    if (!fs.existsSync(SSO_CONFIG.publicKeyPath)) {
      console.error(`公钥文件不存在: ${SSO_CONFIG.publicKeyPath}`);
      return res.status(500).json({ error: '服务器配置错误：公钥文件不存在' });
    }

    const publicKey = fs.readFileSync(SSO_CONFIG.publicKeyPath);
    const decoded = jwt.verify(token, publicKey, {
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
    if (error.code === 'ENOENT') {
      res.status(500).json({ error: '服务器配置错误：无法找到公钥文件' });
    } else {
      res.status(401).json({ error: '令牌无效' });
    }
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
  console.log(`最终使用的公钥路径: ${SSO_CONFIG.publicKeyPath}`);

  // 检查公钥文件是否存在
  if (fs.existsSync(SSO_CONFIG.publicKeyPath)) {
    console.log('✓ 公钥文件存在');
  } else {
    console.log('✗ 公钥文件不存在');
  }
});
