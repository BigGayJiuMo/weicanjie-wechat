const config = require('./utils/config.js');

App({
  onLaunch: function () {
    this.checkLoginStatus();
  },

  checkLoginStatus: function() {
    const that = this;
    
    // 检查本地是否有完整的用户信息
    const userInfo = wx.getStorageSync('userInfo');
    if (userInfo && userInfo.id) {
      // 已有完整用户信息，直接设置全局变量
      that.globalData.userInfo = userInfo;
      console.log('已有用户信息，设置全局变量');
    } else {
      console.log('无用户信息，以游客模式进入');
      // 没有用户信息，设置为游客模式，不进行任何跳转
      that.globalData.isGuest = true;
    }
    
    // 不再强制跳转到授权页面，允许游客直接进入首页
  },

  handleUserInfo: function(userInfo, callback) {
    const that = this;
    
    wx.showLoading({
      title: '登录中...',
    });
    
    // 先获取微信登录code
    wx.login({
      success: (loginRes) => {
        if (loginRes.code) {
          // 构建符合后端接口的数据结构
          const requestData = {
            code: loginRes.code,
            userInfo: {
              nickname: userInfo.nickName,
              avatarUrl: userInfo.avatarUrl
            }
          };
          
          console.log('发送登录请求:', requestData);
          
          // 调用后端微信登录接口
          wx.request({
            url: that.globalData.baseUrl + '/user/loginByWeChat',
            method: 'POST',
            header: {
              'content-type': 'application/json'
            },
            data: requestData,
            success: (res) => {
              wx.hideLoading();
              console.log('登录响应:', res.data);
              
              if (res.data.code === 200) {
                // 存储完整的用户信息
                wx.setStorageSync('userInfo', res.data.data);
                that.globalData.userInfo = res.data.data;
                that.globalData.isGuest = false; // 登录成功，不再是游客
                
                // 执行回调，传递用户数据
                if (callback && typeof callback === 'function') {
                  callback(res.data.data);
                }
              } else {
                wx.showToast({
                  title: '登录失败：' + (res.data.message || '未知错误'),
                  icon: 'none',
                  duration: 3000
                });
              }
            },
            fail: (err) => {
              wx.hideLoading();
              console.error('登录请求失败:', err);
              wx.showToast({
                title: '网络错误，请检查后端服务是否启动',
                icon: 'none',
                duration: 3000
              });
            }
          });
        } else {
          wx.hideLoading();
          wx.showToast({
            title: '获取登录code失败',
            icon: 'none'
          });
        }
      }
    });
  },

  globalData: {
    userInfo: null,
    isGuest: true, // 默认是游客模式
    baseUrl: config.BASE_URL, // 后端地址见 utils/config.js(真机预览改为局域网IP)
    cartCache: null,
    shouldRestoreCart: false
  }
});