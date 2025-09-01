// 配置信息 - 需要替换为实际的SSO服务地址和Client ID
const SSO_CONFIG = {
    ssoBaseUrl: 'http://localhost:3005', // SSO系统地址
    clientId: 'example_client_id', // 替换为实际的Client ID
    redirectUri: 'http://localhost:3006/sso/callback' // 当前应用的回调地址
};

// 生成随机状态值
function generateState() {
    return Math.random().toString(36).substring(2, 15) +
           Math.random().toString(36).substring(2, 15);
}

// 重定向到SSO登录
function loginWithSSO() {
    const state = generateState();
    // 将state存储到localStorage，用于后续验证
    localStorage.setItem('sso_state', state);

    const params = new URLSearchParams({
        client_id: SSO_CONFIG.clientId,
        redirect_uri: SSO_CONFIG.redirectUri,
        state: state
    });

    window.location.href = `${SSO_CONFIG.ssoBaseUrl}/sso/login?${params}`;
}

// 显示用户信息
function showUserInfo(userInfo) {
    document.getElementById('login-section').style.display = 'none';
    document.getElementById('loading').style.display = 'none';
    document.getElementById('user-section').style.display = 'block';

    document.getElementById('user-info').innerHTML = `
        <p><strong>用户ID:</strong> ${userInfo.id}</p>
        <p><strong>邮箱:</strong> ${userInfo.email}</p>
        <p><strong>用户名:</strong> ${userInfo.username || '未设置'}</p>
        <p><strong>角色:</strong> ${userInfo.role}</p>
    `;
}

// 显示登录界面
function showLogin() {
    document.getElementById('user-section').style.display = 'none';
    document.getElementById('loading').style.display = 'none';
    document.getElementById('login-section').style.display = 'block';
}

// 退出登录
function logout() {
    fetch('/api/logout', {
        method: 'POST',
        credentials: 'include'
    })
    .then(() => {
        showLogin();
    })
    .catch(error => {
        console.error('退出登录失败:', error);
        showLogin(); // 即使API调用失败，也显示登录界面
    });
}

// 检查用户登录状态
function checkLoginStatus() {
    document.getElementById('login-section').style.display = 'none';
    document.getElementById('user-section').style.display = 'none';
    document.getElementById('loading').style.display = 'block';

    fetch('/api/user', {
        credentials: 'include' // 包含Cookie
    })
    .then(response => {
        if (response.ok) {
            return response.json();
        } else {
            throw new Error('未登录');
        }
    })
    .then(data => {
        showUserInfo(data.user);
    })
    .catch(error => {
        console.error('检查登录状态失败:', error);
        showLogin();
    });
}

// 页面加载时检查登录状态
window.onload = function() {
    // 显示clientId
    document.getElementById('client-id-display').innerText = SSO_CONFIG.clientId;

    checkLoginStatus();
};
