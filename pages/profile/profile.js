// pages/profile/profile.js
Page({
    data: {
      userInfo: null,
      hasUserInfo: false
    },
  
    onLoad: function () {
      this.checkLoginStatus();
    },
  
    onShow: function () {
      this.checkLoginStatus();
    },
  
    // 检查登录状态
    checkLoginStatus: function () {
      const userInfo = wx.getStorageSync('userInfo');
      if (userInfo) {
        this.setData({
          userInfo: userInfo,
          hasUserInfo: true
        });
      }
    },
  
    // 微信登录
    handleLogin: function () {
      wx.login({
        success: (res) => {
          if (res.code) {
            const app = getApp();
            wx.request({
              url: app.globalData.baseUrl + '/user/login',
              method: 'POST',
              data: {
                code: res.code
              },
              success: (res) => {
                if (res.data.code === 200) {
                  // 登录成功
                  wx.setStorageSync('userInfo', res.data.data);
                  this.setData({
                    userInfo: res.data.data,
                    hasUserInfo: true
                  });
                  wx.showToast({
                    title: '登录成功',
                    icon: 'success'
                  });
                } else {
                  wx.showToast({
                    title: '登录失败',
                    icon: 'none'
                  });
                }
              },
              fail: () => {
                wx.showToast({
                  title: '网络错误',
                  icon: 'none'
                });
              }
            });
          } else {
            wx.showToast({
              title: '登录失败',
              icon: 'none'
            });
          }
        }
      });
    },
  
    // 更新用户信息
    updateUserInfo: function () {
      const app = getApp();
      wx.request({
        url: app.globalData.baseUrl + '/user/update',
        method: 'PUT',
        data: this.data.userInfo,
        success: (res) => {
          if (res.data.code === 200) {
            wx.setStorageSync('userInfo', res.data.data);
            wx.showToast({
              title: '更新成功',
              icon: 'success'
            });
          } else {
            wx.showToast({
              title: '更新失败',
              icon: 'none'
            });
          }
        }
      });
    },
  
    // 绑定手机号
    bindPhone: function () {
      wx.authorize({
        scope: 'scope.phoneNumber',
        success: () => {
          wx.login({
            success: (res) => {
              if (res.code) {
                // 获取手机号（实际开发中需要加密处理）
                // 这里简化处理
                const app = getApp();
                wx.request({
                  url: app.globalData.baseUrl + '/user/bindPhone',
                  method: 'POST',
                  data: {
                    userId: this.data.userInfo.id,
                    phone: '13800138000' // 实际应该从微信获取加密数据
                  },
                  success: (res) => {
                    if (res.data.code === 200) {
                      wx.showToast({
                        title: '绑定成功',
                        icon: 'success'
                      });
                    } else {
                      wx.showToast({
                        title: res.data.message || '绑定失败',
                        icon: 'none'
                      });
                    }
                  }
                });
              }
            }
          });
        },
        fail: () => {
          wx.showToast({
            title: '授权失败',
            icon: 'none'
          });
        }
      });
    }
  });