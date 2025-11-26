// pages/auth/auth.js
Page({
  data: {
    showPhoneModal: false,
    showOtherPhoneModal: false,
    tempUserInfo: null,
    tempOtherPhoneInfo: null, // 新增：临时存储其他手机号登录信息
    mockPhoneNumber: '',
    displayPhoneNumber: '',
    
    // 协议勾选状态
    agreementChecked: false,
    
    // 其他手机号登录相关
    otherPhoneNumber: '',
    otherVerifyCode: '',
    otherGeneratedCode: '',
    otherCountdown: 0,
    otherCountdownTimer: null,
    canGetOtherCode: false,
    canConfirmOtherPhone: false,
    otherPhoneFocus: false
  },

  onLoad: function() {
    console.log('授权页面加载，等待用户操作');
  },

  onUnload: function() {
    // 清除计时器
    if (this.data.otherCountdownTimer) {
      clearInterval(this.data.otherCountdownTimer);
    }
  },

  // 返回上一页
  onBack: function() {
    wx.navigateBack();
  },

  onGetUserInfo: function(e) {
    // 检查是否勾选协议
    if (!this.data.agreementChecked) {
      wx.showToast({
        title: '请阅读并勾选用户协议',
        icon: 'none',
        duration: 2000
      });
      return;
    }

    const userInfo = e.detail.userInfo;
    
    if (userInfo) {
      // 用户同意授权用户信息，临时存储但不立即登录
      const app = getApp();
      
      wx.showLoading({
        title: '获取用户信息...',
      });
      
      // 临时存储用户信息，但不保存到全局和数据库
      this.setData({
        tempUserInfo: userInfo
      });
      
      // 模拟获取微信登录code（实际项目中应该调用微信API）
      setTimeout(() => {
        wx.hideLoading();
        console.log('获取用户信息成功，准备手机号授权');
        
        // 显示手机号授权弹窗
        this.showPhoneAuthModal();
      }, 1000);
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

  // 其他手机号登录
  onOtherPhoneLogin: function() {
    // 检查是否勾选协议
    if (!this.data.agreementChecked) {
      wx.showToast({
        title: '请阅读并勾选用户协议',
        icon: 'none',
        duration: 2000
      });
      return;
    }

    this.setData({
      showOtherPhoneModal: true,
      otherPhoneNumber: '',
      otherVerifyCode: '',
      otherGeneratedCode: '',
      otherPhoneFocus: true,
      canGetOtherCode: false,
      canConfirmOtherPhone: false,
      tempOtherPhoneInfo: null // 重置临时信息
    });
  },

  // 切换到其他手机号登录（从一键登录弹窗）
  onSwitchToOtherPhone: function() {
    this.setData({
      showPhoneModal: false,
      showOtherPhoneModal: true,
      otherPhoneNumber: '',
      otherVerifyCode: '',
      otherGeneratedCode: '',
      otherPhoneFocus: true,
      canGetOtherCode: false,
      canConfirmOtherPhone: false,
      tempOtherPhoneInfo: null // 重置临时信息
    });
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

  // 切换协议勾选状态
  toggleAgreement: function() {
    this.setData({
      agreementChecked: !this.data.agreementChecked
    });
  },

  // 点击用户协议链接
  onUserAgreementTap: function(e) {
    const type = e.currentTarget.dataset.type;
    let url = '';
    
    if (type === 'user') {
      url = '/pages/agreement/user-agreement';
    } else if (type === 'privacy') {
      url = '/pages/agreement/privacy-policy';
    }
    
    if (url) {
      wx.navigateTo({
        url: url
      });
    }
  },

  // 其他手机号输入
  onOtherPhoneInput: function(e) {
    const value = e.detail.value;
    const canGetCode = value.length === 11 && /^1[3-9]\d{9}$/.test(value);
    
    this.setData({
      otherPhoneNumber: value,
      canGetOtherCode: canGetCode,
      canConfirmOtherPhone: canGetCode && this.data.otherVerifyCode.length === 4
    });
  },

  // 其他验证码输入
  onOtherVerifyCodeInput: function(e) {
    const value = e.detail.value;
    const canConfirm = value.length === 4 && this.data.otherPhoneNumber.length === 11;
    
    this.setData({
      otherVerifyCode: value,
      canConfirmOtherPhone: canConfirm
    });
  },

  // 获取其他验证码
  getOtherVerifyCode: function() {
    if (!this.data.canGetOtherCode || this.data.otherCountdown > 0) {
      return;
    }

    // 生成4位随机验证码
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    
    console.log('生成的其他手机号验证码:', code); // 在控制台输出验证码，方便测试
    
    this.setData({
      otherGeneratedCode: code,
      canGetOtherCode: false,
      otherCountdown: 60
    });

    // 开始倒计时
    this.startOtherCountdown();
    
    // 模拟发送验证码
    wx.showToast({
      title: '验证码已发送: ' + code,
      icon: 'none',
      duration: 3000
    });
  },

  // 开始其他手机号倒计时
  startOtherCountdown: function() {
    const timer = setInterval(() => {
      if (this.data.otherCountdown > 1) {
        this.setData({
          otherCountdown: this.data.otherCountdown - 1
        });
      } else {
        // 倒计时结束
        clearInterval(timer);
        this.setData({
          otherCountdown: 0,
          canGetOtherCode: this.data.otherPhoneNumber.length === 11
        });
      }
    }, 1000);
    
    this.setData({
      otherCountdownTimer: timer
    });
  },

  // 确认其他手机号登录 - 验证验证码后临时存储，不立即登录
  onConfirmOtherPhone: function() {
    if (!this.data.canConfirmOtherPhone) {
      return;
    }

    const phone = this.data.otherPhoneNumber.trim();
    const verifyCode = this.data.otherVerifyCode.trim();

    // 验证验证码
    if (verifyCode !== this.data.otherGeneratedCode) {
      wx.showToast({
        title: '验证码错误',
        icon: 'none'
      });
      return;
    }

    // 临时存储手机号信息，但不立即登录
    const tempOtherPhoneInfo = {
      phone: phone,
      nickname: '手机用户_' + phone.substring(7),
      avatarUrl: '/images/default-avatar.png'
    };
    
    this.setData({
      tempOtherPhoneInfo: tempOtherPhoneInfo
    });

    // 显示确认登录弹窗
    wx.showModal({
      title: '确认登录',
      content: `您将使用手机号 ${phone} 登录微餐捷`,
      confirmText: '确认登录',
      cancelText: '取消',
      confirmColor: '#07c160',
      success: (res) => {
        if (res.confirm) {
          // 用户确认登录，开始登录流程
          wx.showLoading({
            title: '登录中...',
          });
          this.loginWithPhone(phone);
        } else {
          // 用户取消，清除临时信息
          this.setData({
            tempOtherPhoneInfo: null
          });
        }
      }
    });
  },

  // 使用手机号登录并保存到数据库
  loginWithPhone: function(phone) {
    const app = getApp();
    const that = this;
    
    // 生成模拟的微信登录code（用于开发环境）
    const mockCode = 'phone_login_' + phone + '_' + Date.now();
    
    // 构建完整的用户数据
    const completeUserData = {
      code: mockCode,
      userInfo: {
        nickname: that.data.tempOtherPhoneInfo.nickname,
        avatarUrl: that.data.tempOtherPhoneInfo.avatarUrl
      },
      phone: phone
    };
    
    console.log('手机号登录完整用户数据:', completeUserData);
    
    // 调用后端登录接口
    wx.request({
      url: app.globalData.baseUrl + '/user/login',
      method: 'POST',
      header: {
        'content-type': 'application/json'
      },
      data: completeUserData,
      success: (res) => {
        wx.hideLoading();
        console.log('手机号登录响应:', res.data);
        
        if (res.data.code === 200) {
          // 登录成功，保存用户信息
          wx.setStorageSync('userInfo', res.data.data);
          app.globalData.userInfo = res.data.data;
          app.globalData.isGuest = false;
          
          // 关闭弹窗
          this.setData({
            showOtherPhoneModal: false,
            tempOtherPhoneInfo: null // 清除临时信息
          });
          
          wx.showToast({
            title: '登录成功',
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
            title: '登录失败: ' + (res.data.message || '未知错误'),
            icon: 'none',
            duration: 3000
          });
        }
      },
      fail: (err) => {
        wx.hideLoading();
        console.error('手机号登录请求失败:', err);
        
        // 开发环境模拟登录成功并保存到数据库
        this.mockLoginWithPhone(phone);
      }
    });
  },

  // 开发环境模拟手机号登录并保存到数据库
  mockLoginWithPhone: function(phone) {
    const app = getApp();
    
    // 创建模拟用户信息
    const mockUserInfo = {
      id: Date.now(),
      nickname: '手机用户_' + phone.substring(7),
      avatarUrl: '/images/default-avatar.png',
      phone: phone,
      openid: 'mock_openid_phone_' + phone
    };
    
    // 保存用户信息到本地
    wx.setStorageSync('userInfo', mockUserInfo);
    app.globalData.userInfo = mockUserInfo;
    app.globalData.isGuest = false;
    
    // 模拟保存到数据库
    console.log('模拟保存用户数据到MySQL:', mockUserInfo);
    
    // 关闭弹窗
    this.setData({
      showOtherPhoneModal: false,
      tempOtherPhoneInfo: null // 清除临时信息
    });
    
    wx.showToast({
      title: '登录成功',
      icon: 'success',
      success: () => {
        setTimeout(() => {
          wx.switchTab({
            url: '/pages/index/index'
          });
        }, 1500);
      }
    });
  },

  // 取消其他手机号登录
  onCancelOtherPhone: function() {
    this.setData({
      showOtherPhoneModal: false,
      tempOtherPhoneInfo: null // 清除临时信息
    });
    
    // 清除倒计时
    if (this.data.otherCountdownTimer) {
      clearInterval(this.data.otherCountdownTimer);
      this.setData({
        otherCountdown: 0,
        canGetOtherCode: this.data.otherPhoneNumber.length === 11
      });
    }
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

  // 确认授权手机号 - 只有点击允许才会保存用户数据到数据库
  onConfirmPhoneAuth: function() {
    const app = getApp();
    const that = this;
    
    wx.showLoading({
      title: '登录中...',
    });
    
    console.log('用户确认授权，开始保存数据到数据库');
    
    // 模拟获取微信登录code（实际项目中应该调用微信API）
    wx.login({
      success: (loginRes) => {
        if (loginRes.code) {
          // 构建完整的用户数据（包括手机号）
          const completeUserData = {
            code: loginRes.code,
            userInfo: {
              nickname: that.data.tempUserInfo.nickName,
              avatarUrl: that.data.tempUserInfo.avatarUrl
            },
            phone: that.data.mockPhoneNumber
          };
          
          console.log('完整的用户数据:', completeUserData);
          
          // 调用后端接口注册/登录用户并保存到数据库
          wx.request({
            url: app.globalData.baseUrl + '/user/login',
            method: 'POST',
            header: {
              'content-type': 'application/json'
            },
            data: completeUserData,
            success: (res) => {
              wx.hideLoading();
              console.log('用户数据保存响应:', res.data);
              
              // 关闭弹窗
              that.setData({
                showPhoneModal: false
              });
              
              if (res.data.code === 200) {
                // 保存完整的用户信息到本地存储
                const userInfo = res.data.data;
                wx.setStorageSync('userInfo', userInfo);
                app.globalData.userInfo = userInfo;
                app.globalData.isGuest = false;
                
                wx.showToast({
                  title: '登录成功',
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
                  title: '登录失败: ' + (res.data.message || '未知错误'),
                  icon: 'none',
                  duration: 3000
                });
              }
            },
            fail: (err) => {
              wx.hideLoading();
              console.error('用户数据保存请求失败:', err);
              
              // 开发环境模拟保存到数据库
              that.mockSaveUserToDatabase();
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

  // 开发环境模拟保存用户数据到数据库
  mockSaveUserToDatabase: function() {
    const app = getApp();
    const that = this;
    
    // 创建完整的用户信息
    const completeUserInfo = {
      id: Date.now(),
      openid: 'mock_openid_' + Date.now(),
      nickname: this.data.tempUserInfo.nickName,
      avatarUrl: this.data.tempUserInfo.avatarUrl,
      phone: this.data.mockPhoneNumber,
      createdTime: new Date().toISOString(),
      updatedTime: new Date().toISOString()
    };
    
    console.log('模拟保存用户数据到MySQL:', completeUserInfo);
    
    // 保存用户信息到本地存储
    wx.setStorageSync('userInfo', completeUserInfo);
    app.globalData.userInfo = completeUserInfo;
    app.globalData.isGuest = false;
    
    // 关闭弹窗
    this.setData({
      showPhoneModal: false
    });
    
    wx.showToast({
      title: '登录成功',
      icon: 'success',
      success: () => {
        setTimeout(() => {
          wx.switchTab({
            url: '/pages/index/index'
          });
        }, 1500);
      }
    });
  },

  // 取消授权手机号 - 点击不允许显示授权失败，不保存数据
  onCancelPhoneAuth: function() {
    this.setData({
      showPhoneModal: false
    });
    
    // 清除临时存储的用户信息
    this.setData({
      tempUserInfo: null
    });
    
    wx.showToast({
      title: '授权失败，请授权手机号后登录',
      icon: 'none',
      duration: 3000
    });
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