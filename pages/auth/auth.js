// pages/auth/auth.js
Page({
    data: {
      showPhoneModal: false,
      showOtherPhoneModal: false,
      tempUserInfo: null,
      tempOtherPhoneInfo: null,
      mockPhoneNumber: '',
      displayPhoneNumber: '',
  
      agreementChecked: false,
  
      otherPhoneNumber: '',
      otherVerifyCode: '',
      otherGeneratedCode: '',
      otherCountdown: 0,
      otherCountdownTimer: null,
      canGetOtherCode: false,
      canConfirmOtherPhone: false,
      otherPhoneFocus: false,
      weChatLoginLoading: false,
    },
  
    onLoad() {
      console.log('授权页面加载，等待用户操作');
    },
  
    onUnload() {
      if (this.data.otherCountdownTimer) {
        clearInterval(this.data.otherCountdownTimer);
      }
    },
  
    onBack() {
      wx.navigateBack();
    },
  
    onGetUserInfo(e) {
      if (!this.data.agreementChecked) {
        wx.showToast({
          title: '请阅读并勾选用户协议',
          icon: 'none'
        });
        return;
      }
  
      const userInfo = e.detail.userInfo;
  
      if (userInfo) {
        wx.showLoading({ title: '获取用户信息...' });
  
        this.setData({ tempUserInfo: userInfo });
  
        setTimeout(() => {
          wx.hideLoading();
          this.showPhoneAuthModal();
        }, 1000);
      } else {
        wx.showModal({
          title: '授权提示',
          content: '需要授权才能继续使用，请点击上方按钮重新授权',
          showCancel: false
        });
      }
    },
  
    onOtherPhoneLogin() {
      if (!this.data.agreementChecked) {
        wx.showToast({
          title: '请阅读并勾选用户协议',
          icon: 'none'
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
        tempOtherPhoneInfo: null
      });
    },
  
    onSwitchToOtherPhone() {
      this.setData({
        showPhoneModal: false,
        showOtherPhoneModal: true,
        otherPhoneNumber: '',
        otherVerifyCode: '',
        otherGeneratedCode: '',
        otherPhoneFocus: true,
        canGetOtherCode: false,
        canConfirmOtherPhone: false,
        tempOtherPhoneInfo: null
      });
    },
  
    onGuestMode() {
      const app = getApp();
      app.globalData.isGuest = true;
  
      wx.showToast({
        title: '以游客身份进入',
        icon: 'success',
        success: () => {
          setTimeout(() => {
            wx.switchTab({ url: '/pages/index/index' });
          }, 1000);
        }
      });
    },
  
    toggleAgreement() {
      this.setData({
        agreementChecked: !this.data.agreementChecked
      });
    },
  
    onUserAgreementTap(e) {
      const type = e.currentTarget.dataset.type;
      const url =
        type === 'user'
          ? '/pages/agreement/user-agreement'
          : '/pages/agreement/privacy-policy';
  
      wx.navigateTo({ url });
    },
  
    // 手机号输入（过滤版）
    onOtherPhoneInput(e) {
      const value = e.detail.value.replace(/\D/g, '');
      const canGetCode = value.length === 11 && /^1[3-9]\d{9}$/.test(value);
  
      this.setData({
        otherPhoneNumber: value,
        canGetOtherCode: canGetCode,
        canConfirmOtherPhone: canGetCode && this.data.otherVerifyCode.length === 4
      });
    },
  
    // 验证码输入（过滤版）
    onOtherVerifyCodeInput(e) {
      const value = e.detail.value.replace(/\D/g, '');
      const canConfirm = value.length === 4 && this.data.otherPhoneNumber.length === 11;
  
      this.setData({
        otherVerifyCode: value,
        canConfirmOtherPhone: canConfirm
      });
    },
  
    getOtherVerifyCode() {
      if (!this.data.canGetOtherCode || this.data.otherCountdown > 0) return;
  
      const code = Math.floor(1000 + Math.random() * 9000).toString();
      console.log('验证码:', code);
  
      this.setData({
        otherGeneratedCode: code,
        canGetOtherCode: false,
        otherCountdown: 60
      });
  
      this.startOtherCountdown();
  
      wx.showToast({
        title: '验证码已发送: ' + code,
        icon: 'none'
      });
    },
  
    startOtherCountdown() {
      const timer = setInterval(() => {
        if (this.data.otherCountdown > 1) {
          this.setData({ otherCountdown: this.data.otherCountdown - 1 });
        } else {
          clearInterval(timer);
          this.setData({
            otherCountdown: 0,
            canGetOtherCode: this.data.otherPhoneNumber.length === 11
          });
        }
      }, 1000);
  
      this.setData({ otherCountdownTimer: timer });
    },
  
    onConfirmOtherPhone() {
      if (!this.data.canConfirmOtherPhone) return;
  
      const phone = this.data.otherPhoneNumber.trim();
  
      if (this.data.otherVerifyCode !== this.data.otherGeneratedCode) {
        wx.showToast({
          title: '验证码错误',
          icon: 'none'
        });
        return;
      }
  
      const tempOtherPhoneInfo = {
        phone,
        nickname: '手机用户_' + phone.substring(7),
        avatarUrl: '/images/default-avatar.png'
      };
  
      this.setData({ tempOtherPhoneInfo });
  
      wx.showModal({
        title: '确认登录',
        content: `您将使用手机号 ${phone} 登录微餐捷`,
        confirmText: '确认登录',
        cancelText: '取消',
        confirmColor: '#ff6b35',
        success: res => {
          if (res.confirm) {
            wx.showLoading({ title: '登录中...' });
            this.loginWithPhone(phone);
          } else {
            this.setData({ tempOtherPhoneInfo: null });
          }
        }
      });
    },
  
    loginWithPhone(phone) {
      const app = getApp();
  
      const completeUserData = {
        code: 'phone_login_' + phone + '_' + Date.now(),
        userInfo: {
          nickname: '手机用户_' + phone.substring(7),
          avatarUrl: '/images/default-avatar.png'
        },
        phone
      };
  
      wx.request({
        url: app.globalData.baseUrl + '/user/loginByPhone',
        method: 'POST',
        header: { 'content-type': 'application/json' },
        data: completeUserData,
        success: res => {
          wx.hideLoading();
  
          if (res.data.code === 200) {
            wx.setStorageSync('userInfo', res.data.data);
            app.globalData.userInfo = res.data.data;
            app.globalData.isGuest = false;
  
            this.setData({
              showOtherPhoneModal: false,
              tempOtherPhoneInfo: null
            });
  
            wx.showToast({
              title: '登录成功',
              icon: 'success'
            });
  
            setTimeout(() => wx.navigateBack(), 1500);
          } else {
            wx.showToast({
              title: '登录失败: ' + res.data.message,
              icon: 'none'
            });
          }
        },
        fail: () => {
          wx.hideLoading();
          this.mockLoginWithPhone(phone);
        }
      });
    },
  
    mockLoginWithPhone(phone) {
      const app = getApp();
  
      const mockUserInfo = {
        id: Date.now(),
        nickname: '手机用户_' + phone.substring(7),
        avatarUrl: '/images/default-avatar.png',
        phone,
        openid: 'mock_openid_' + phone
      };
  
      wx.setStorageSync('userInfo', mockUserInfo);
      app.globalData.userInfo = mockUserInfo;
      app.globalData.isGuest = false;
  
      this.setData({ showOtherPhoneModal: false, tempOtherPhoneInfo: null });
  
      wx.showToast({
        title: '登录成功',
        icon: 'success'
      });
  
      setTimeout(() => wx.switchTab({ url: '/pages/index/index' }), 1500);
    },
  
    onCancelOtherPhone() {
      this.setData({
        showOtherPhoneModal: false,
        tempOtherPhoneInfo: null
      });
  
      if (this.data.otherCountdownTimer) {
        clearInterval(this.data.otherCountdownTimer);
        this.setData({
          otherCountdown: 0,
          canGetOtherCode: this.data.otherPhoneNumber.length === 11
        });
      }
    },
  
    // ---------- 一键登录手机号授权 ----------
    showPhoneAuthModal() {
      const phone = this.generateMockPhoneNumber();
      const display = this.maskPhoneNumber(phone);
  
      this.setData({
        showPhoneModal: true,
        mockPhoneNumber: phone,
        displayPhoneNumber: display
      });
    },
  
    onConfirmPhoneAuth() {
      wx.showLoading({ title: '登录中...' });
  
      const phone = this.data.mockPhoneNumber;
      const nickname = '手机用户_' + phone.substring(7);
      const avatar = this.data.tempUserInfo.avatarUrl;
  
      wx.login({
        success: loginRes => {
          const completeUserData = {
            code: loginRes.code,
            userInfo: {
              nickname, // 统一昵称格式
              avatarUrl: avatar
            },
            phone
          };
  
          console.log('一键登录最终提交数据：', completeUserData);
  
          const app = getApp();
  
          wx.request({
            url: app.globalData.baseUrl + '/user/loginByPhone',
            method: 'POST',
            header: { 'content-type': 'application/json' },
            data: completeUserData,
            success: res => {
              wx.hideLoading();
              this.setData({ showPhoneModal: false });
  
              if (res.data.code === 200) {
                wx.setStorageSync('userInfo', res.data.data);
                app.globalData.userInfo = res.data.data;
                app.globalData.isGuest = false;
  
                wx.showToast({
                  title: '登录成功',
                  icon: 'success'
                });
  
                setTimeout(() => wx.navigateBack(), 1500);
              } else {
                wx.showToast({
                  title: '登录失败: ' + res.data.message,
                  icon: 'none'
                });
              }
            },
            fail: () => {
              wx.hideLoading();
              this.mockSaveUserToDatabase();
            }
          });
        }
      });
    },
  
    mockSaveUserToDatabase() {
      const app = getApp();
  
      const phone = this.data.mockPhoneNumber;
      const nickname = '手机用户_' + phone.substring(7);
  
      const completeUserInfo = {
        id: Date.now(),
        openid: 'mock_openid_' + Date.now(),
        nickname, // 统一格式
        avatarUrl: this.data.tempUserInfo.avatarUrl,
        phone,
        createdTime: new Date().toISOString(),
        updatedTime: new Date().toISOString()
      };
  
      console.log('模拟保存用户数据:', completeUserInfo);
  
      wx.setStorageSync('userInfo', completeUserInfo);
      app.globalData.userInfo = completeUserInfo;
      app.globalData.isGuest = false;
  
      this.setData({ showPhoneModal: false });
  
      wx.showToast({
        title: '登录成功',
        icon: 'success'
      });
  
      setTimeout(() => wx.navigateBack(), 1500);
    },
  
    onCancelPhoneAuth() {
      this.setData({
        showPhoneModal: false,
        tempUserInfo: null
      });
  
      wx.showToast({
        title: '授权失败，请重新登录',
        icon: 'none'
      });
    },
  
    generateMockPhoneNumber() {
      return '138' + Array.from({ length: 8 }, () => Math.floor(Math.random() * 10)).join('');
    },
  
    maskPhoneNumber(phone) {
      return phone.substring(0, 3) + '****' + phone.substring(7);
    },
    onWeChatLogin() {

        if (this.data.weChatLoginLoading) return; 
        this.setData({ weChatLoginLoading: true });
      
        if (!this.data.agreementChecked) {
          wx.showToast({ title: '请先勾选用户协议', icon: 'none' });
          this.setData({ weChatLoginLoading: false });
          return;
        }
      
        wx.getUserProfile({
          desc: "用于完善资料",
          success: profile => {
      
            wx.login({
              success: res => {
      
                const code = res.code;
                const app = getApp();
      
                wx.request({
                  url: app.globalData.baseUrl + '/user/loginByWeChat',
                  method: 'POST',
                  header: { 'content-type': 'application/json' },
                  data: {
                    code,
                    userInfo: {
                      nickname: profile.userInfo.nickName,
                      avatarUrl: profile.userInfo.avatarUrl
                    }
                  },
                  success: resp => {
                    this.setData({ weChatLoginLoading: false });
      
                    if (resp.data.code === 200) {
                      wx.setStorageSync('userInfo', resp.data.data);
                      app.globalData.userInfo = resp.data.data;
      
                      wx.showToast({ title: '登录成功', icon: 'success' });
      
                      setTimeout(() => wx.navigateBack(), 1500);
      
                    } else {
                      wx.showToast({ title: resp.data.message, icon: 'none' });
                    }
                  },
                  fail: () => {
                    this.setData({ weChatLoginLoading: false }); 
                    wx.showToast({ title: '网络错误，请稍后再试', icon: 'none' });
                  }
                });
      
              }
            });
      
          },
          fail: () => {
            this.setData({ weChatLoginLoading: false }); 
            wx.showToast({ title: '用户取消授权', icon: 'none' });
          }
        });
      
      }

  });
  