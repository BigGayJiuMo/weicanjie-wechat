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
        success: (res) => {
          // 如果返回401（token 失效），跳转到登录页
          if (res.statusCode === 401) {
            wx.redirectTo({
              url: '/pages/auth/auth',  // 跳转到登录页面
            });
          } else {
            resolve(res.data);
          }
        },
        fail: (err) => reject(err),
      });
    });
  };
  
  export default request;
  