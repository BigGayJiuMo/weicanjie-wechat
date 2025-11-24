Page({
  data: {
    showPhoneModal: false,
    tempUserInfo: null,
    mockPhoneNumber: '',
    displayPhoneNumber: ''
  },

  onGetUserInfo: function(e) {
    const userInfo = e.detail.userInfo;
    
    if (userInfo) {
      // 用户同意授权
      const app = getApp();
      
      wx.showLoading({
        title: '登录中...',
      });
      
      // 临时存储用户信息
      this.setData({
        tempUserInfo: userInfo
      });
      
      // 调用登录处理
      app.handleUserInfo(userInfo, (userData) => {
        wx.hideLoading();
        console.log('登录成功，准备手机号授权');
        
        // 登录成功后直接显示手机号授权弹窗
        this.showPhoneAuthModal();
      });
    } else {
      // 用户拒绝授权
      wx.showModal({
        title: '授权提示',
        content: '需要您授权才能使用完整功能，请点击上方按钮授权',
        showCancel: false,
        confirmText: '知道了'
      });
    }
  },

  // 游客模式进入
  onGuestMode: function() {
    const app = getApp();
    app.globalData.isGuest = true;
    
    wx.showToast({
      title: '以游客身份进入',
      icon: 'success',
      success: () => {
        setTimeout(() => {
          wx.switchTab({
            url: '/pages/index/index'
          });
        }, 1000);
      }
    });
  },

  // 显示手机号授权弹窗
  showPhoneAuthModal: function() {
    // 生成模拟手机号
    const mockPhoneNumber = this.generateMockPhoneNumber();
    // 生成脱敏显示的手机号（前3后4，中间4位星号）
    const displayPhoneNumber = this.maskPhoneNumber(mockPhoneNumber);
    
    this.setData({
      showPhoneModal: true,
      mockPhoneNumber: mockPhoneNumber,
      displayPhoneNumber: displayPhoneNumber
    });
  },

  // 确认授权手机号
  onConfirmPhoneAuth: function() {
    const app = getApp();
    const that = this;
    
    wx.showLoading({
      title: '绑定手机号中...',
    });
    
    console.log('使用模拟手机号:', this.data.mockPhoneNumber);
    
    // 调用后端接口绑定手机号
    wx.request({
      url: app.globalData.baseUrl + '/user/bindPhone',
      method: 'POST',
      header: {
        'content-type': 'application/json'
      },
      data: {
        userId: app.globalData.userInfo.id,
        phone: this.data.mockPhoneNumber
      },
      success: (res) => {
        wx.hideLoading();
        console.log('手机号绑定响应:', res.data);
        
        // 关闭弹窗
        that.setData({
          showPhoneModal: false
        });
        
        if (res.data.code === 200) {
          // 更新本地用户信息
          const updatedUserInfo = {...app.globalData.userInfo, phone: that.data.mockPhoneNumber};
          wx.setStorageSync('userInfo', updatedUserInfo);
          app.globalData.userInfo = updatedUserInfo;
          
          wx.showToast({
            title: '授权成功',
            icon: 'success',
            success: () => {
              setTimeout(() => {
                wx.switchTab({
                  url: '/pages/index/index'
                });
              }, 1500);
            }
          });
        } else {
          wx.showToast({
            title: '手机号绑定失败: ' + (res.data.message || '未知错误'),
            icon: 'none',
            duration: 3000
          });
          // 即使绑定失败也跳转到首页
          that.goToHomePage();
        }
      },
      fail: (err) => {
        wx.hideLoading();
        console.error('手机号绑定请求失败:', err);
        // 关闭弹窗
        that.setData({
          showPhoneModal: false
        });
        wx.showToast({
          title: '网络错误',
          icon: 'none'
        });
        // 网络错误也跳转到首页
        that.goToHomePage();
      }
    });
  },

  // 取消授权手机号
  onCancelPhoneAuth: function() {
    this.setData({
      showPhoneModal: false
    });
    
    wx.showModal({
      title: '提示',
      content: '您已拒绝授权手机号，部分功能可能无法使用',
      showCancel: false,
      confirmText: '知道了',
      success: () => {
        // 用户拒绝手机号授权，仍然跳转到首页
        this.goToHomePage();
      }
    });
  },

  goToHomePage: function() {
    wx.switchTab({
      url: '/pages/index/index'
    });
  },

  onLoad: function() {
    console.log('授权页面加载，等待用户操作');
  },

  // 生成模拟手机号
  generateMockPhoneNumber: function() {
    // 生成以138开头的随机手机号
    const prefix = '138';
    let suffix = '';
    for (let i = 0; i < 8; i++) {
      suffix += Math.floor(Math.random() * 10);
    }
    return prefix + suffix;
  },

  // 手机号脱敏处理（前3后4，中间4位星号）
  maskPhoneNumber: function(phone) {
    if (phone && phone.length === 11) {
      return phone.substring(0, 3) + '****' + phone.substring(7);
    }
    return phone;
  }
});