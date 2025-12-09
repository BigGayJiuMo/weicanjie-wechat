// pages/profile/profile.js
Page({
    data: {
      userInfo: {},            // 用户信息
      isGuest: true,           // 是否为游客模式
      favoriteCount: 0,        // 收藏数量
      orderCount: 0,           // 订单数量
      reviewCount: 0,          // 评价数量
      showServiceModal: false  // 控制客服弹窗的显示
    },
  
    /**
     * 页面加载时，初始化用户信息
     */
    onLoad: function () {
      this.loadUserInfo();
    },
  
    /**
     * 页面展示时加载用户信息和统计数据
     */
    onShow: function () {
      this.loadUserInfo();
      this.loadUserStats();
    },
  
    /**
     * 加载用户信息
     * 如果是游客模式，则显示游客信息；如果已登录，显示用户的个人信息
     */
    loadUserInfo: function () {
      const app = getApp();
      const userInfo = app.globalData.userInfo;
      
      if (userInfo) {
        // 处理手机号脱敏显示
        const processedUserInfo = this.processUserInfo(userInfo);
        this.setData({
          userInfo: processedUserInfo,
          isGuest: false
        });
      } else {
        // 游客模式
        this.setData({
          userInfo: {},
          isGuest: true
        });
      }
    },
  
    /**
     * 处理用户信息，包括手机号脱敏显示
     */
    processUserInfo: function(userInfo) {
      if (!userInfo) return userInfo;
      
      // 创建用户信息的副本，避免修改原始数据
      const processedInfo = {...userInfo};
      
      // 如果有手机号，进行脱敏处理
      if (processedInfo.phone) {
        processedInfo.displayPhone = this.maskPhoneNumber(processedInfo.phone);
      } else {
        processedInfo.displayPhone = '未绑定手机号';
      }
      
      return processedInfo;
    },
  
    /**
     * 手机号脱敏处理（前3后4，中间4位星号）
     */
    maskPhoneNumber: function(phone) {
      if (phone && phone.length === 11) {
        return phone.substring(0, 3) + '****' + phone.substring(7);
      }
      return phone;
    },
  
    /**
     * 加载用户的统计数据（如收藏数、订单数、评价数等）
     * 如果是游客模式，跳过统计数据加载
     */
    loadUserStats: function () {
      if (this.data.isGuest) {
        return;
      }
    
      const app = getApp();
      const userId = this.data.userInfo.id;
    
      if (!userId) {
        console.error('用户ID为空，无法获取统计数据');
        this.setMockStats();
        return;
      }
    
      console.log('请求用户统计数据，userId:', userId);
    
      wx.request({
        url: app.globalData.baseUrl + '/user/stats',
        method: 'GET',
        data: {
          userId: userId
        },
        header: {
          'Authorization': 'Bearer ' + wx.getStorageSync('token'),  // 确保携带 token
          'content-type': 'application/json'
        },
        success: (res) => {
          console.log('用户统计数据响应:', res.data);
    
          if (res.data.code === 200) {
            const data = res.data.data || {};
            this.setData({
              favoriteCount: data.favoriteCount || 0,
              orderCount: data.orderCount || 0,
              reviewCount: data.reviewCount || 0
            });
          } else {
            console.error('获取统计数据失败:', res.data.message);
            this.setMockStats();
          }
        },
        fail: (err) => {
          console.error('请求用户统计数据失败:', err);
        }
      });
    },
  
    /**
     * 点击头像 - 跳转到编辑资料页面
     * 如果是游客，则提示登录
     */
    onAvatarTap: function () {
      if (this.data.isGuest) {
          this.showLoginTip();
          return;
      }
      
      // 跳转到编辑资料页面
      wx.navigateTo({
          url: '/pages/edit-profile/edit-profile'
      });
    },
  
    /**
     * 跳转到我的收藏页面
     * 如果是游客，则提示登录
     */
    onMyFavorites: function () {
      if (this.data.isGuest) {
        this.showLoginTip();
        return;
      }
  
      wx.navigateTo({
        url: '/pages/favorites/favorites'
      });
    },
  
    /**
     * 跳转到订单历史页面
     * 如果是游客，则提示登录
     */
    onOrderHistory: function () {
      if (this.data.isGuest) {
        this.showLoginTip();
        return;
      }
  
      wx.navigateTo({
        url: '/pages/orders/orders'
      });
    },
  
    /**
     * 显示联系客服弹窗
     */
    onCustomerService: function () {
      this.setData({
        showServiceModal: true
      });
    },
  
    /**
     * 跳转到我的评价页面
     * 如果是游客，则提示登录
     */
    onMyReviews: function () {
      if (this.data.isGuest) {
        this.showLoginTip();
        return;
      }
  
      wx.navigateTo({
        url: '/pages/reviews/reviews'
      });
    },
  
    /**
     * 跳转到历史浏览页面
     * 如果是游客，则提示登录
     */
    onHistoryBrowse: function () {
      if (this.data.isGuest) {
        this.showLoginTip();
        return;
      }
    
      wx.navigateTo({
        url: '/pages/history/history'
      });
    },
  
    /**
     * 跳转到用户协议和隐私政策页面
     */
    onUserAgreementTap: function(e) {
      const type = e.currentTarget.dataset.type;
      let url = '';
    
      if (type === 'user') {
        url = '/pages/agreement/user-agreement';
      } else if (type === 'privacy') {
        url = '/pages/agreement/privacy-policy';
      }
    
      if (!url) return;
    
      wx.navigateTo({
        url: url
      });
    },
  
    /**
     * 显示登录页面
     */
    onLogin: function () {
      wx.navigateTo({
        url: '/pages/auth/auth'
      });
    },
  
    /**
     * 显示退出登录确认弹窗
     */
    onLogout: function () {
      wx.showModal({
        title: '提示',
        content: '确定要退出登录吗？',
        confirmColor: '#ff6b35',
        success: (res) => {
          if (res.confirm) {
            this.doLogout();
          }
        }
      });
    },
  
    /**
     * 执行退出登录
     * 清除本地存储的用户信息和 token
     */
    doLogout: function () {
      const app = getApp();
      
      // 清除本地存储的 userInfo 和 token
      wx.removeStorageSync('userInfo');
      wx.removeStorageSync('token');
      
      // 重置全局数据
      app.globalData.userInfo = null;
      app.globalData.isGuest = true;
      
      // 更新页面数据
      this.setData({
        userInfo: {},
        isGuest: true,
        favoriteCount: 0,
        orderCount: 0,
        reviewCount: 0
      });
      
      wx.showToast({
        title: '已退出登录',
        icon: 'success'
      });
    },
  
    /**
     * 隐藏客服弹窗
     */
    hideServiceModal: function () {
      this.setData({
        showServiceModal: false
      });
    },
  
    /**
     * 阻止事件冒泡
     */
    stopPropagation: function () {
      return;
    },
  
    /**
     * 拨打客服电话
     */
    onCallService: function () {
      this.hideServiceModal();
      
      wx.makePhoneCall({
        phoneNumber: '4001234567',
        success: () => {
          console.log('拨打客服电话成功');
        },
        fail: () => {
          wx.showToast({
            title: '拨打失败',
            icon: 'none'
          });
        }
      });
    },
  
    /**
     * 显示登录提示弹窗
     */
    showLoginTip: function () {
      wx.showModal({
          title: '登录提示',
          content: `此功能需要登录后才能使用，是否立即登录？`,
          confirmText: '去登录',
          cancelText: '稍后再说',
          confirmColor: '#ff6b35',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({
              url: '/pages/auth/auth'
            });
          }
        }
      });
    }
  });
  