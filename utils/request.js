/**
 * 统一请求封装
 * - 自动携带 token
 * - 401 时清除登录态并跳转登录页
 * - 统一超时(默认 15 秒)
 */
const request = (url, options = {}) => {
    const token = wx.getStorageSync('token');  // 从本地存储获取 token

    // 判断是否需要携带 token
    if (token) {
      options.header = {
        ...options.header,
        'Authorization': `Bearer ${token}`, // 将 token 放入 Authorization header 中
      };
    }

    // 发起请求
    return new Promise((resolve, reject) => {
      wx.request({
        url: url,
        method: options.method || 'GET',
        data: options.data || {},
        header: options.header || {},
        timeout: options.timeout || 15000,
        success: (res) => {
          // 如果返回401（token 失效），清除登录态并跳转到登录页
          if (res.statusCode === 401) {
            wx.removeStorageSync('token');
            wx.removeStorageSync('userInfo');
            wx.redirectTo({
              url: '/pages/auth/auth',  // 跳转到登录页面
            });
            reject(new Error('登录已过期'));
            return;
          }
          resolve(res.data);
        },
        fail: (err) => {
          wx.showToast({
            title: '网络错误，请检查后端服务',
            icon: 'none',
          });
          reject(err);
        },
      });
    });
  };

  export default request;