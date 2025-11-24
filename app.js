App({
    onLaunch: function () {
      this.checkLoginStatus();
    },
  
    checkLoginStatus: function() {
      const that = this;
      
      // 检查本地是否有完整的用户信息（包括后端返回的数据）
      const userInfo = wx.getStorageSync('userInfo');
      if (userInfo && userInfo.id) {
        // 已有完整用户信息，直接设置全局变量
        that.globalData.userInfo = userInfo;
        console.log('已有用户信息，直接进入');
        return;
      }
  
      // 没有完整用户信息，强制跳转到授权页面
      console.log('没有用户信息，跳转到授权页面');
      wx.redirectTo({
        url: '/pages/auth/auth'
      });
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
                  nickname: userInfo.nickName,  // 注意：微信返回的是 nickName，后端期望 nickname
                  avatarUrl: userInfo.avatarUrl
                }
              };
              
              console.log('发送登录请求:', requestData);
              
              // 调用后端登录接口
              wx.request({
                url: that.globalData.baseUrl + '/user/login',
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
                    
                    // 登录成功，跳转到首页
                    wx.switchTab({
                      url: '/pages/index/index'
                    });
                    
                    if (callback && typeof callback === 'function') {
                      callback();
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
        baseUrl: 'http://localhost:8080/api'
      }
  });