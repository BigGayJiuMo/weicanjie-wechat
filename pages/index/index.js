// index.js
Page({
  data: {
    banners: [
      { id: 1, imageUrl: '/images/banner1.jpg' },
      { id: 2, imageUrl: '/images/banner2.jpg' }
    ],
    isGuest: false
  },

  onLoad: function () {
    // 检查是否是游客模式
    const app = getApp();
    this.setData({
      isGuest: app.globalData.isGuest
    });
    
    this.loadRestaurantInfo();
  },
  
  onShow: function() {
    // 每次页面显示时检查登录状态
    const app = getApp();
    this.setData({
      isGuest: app.globalData.isGuest
    });
  },
  
  loadRestaurantInfo: function () {
    const app = getApp();
    wx.request({
      url: app.globalData.baseUrl + '/weicanjie/info',
      method: 'GET',
      success: (res) => {
        if (res.data.code === 200) {
          this.setData({
            restaurantInfo: res.data.data
          });
        }
      }
    });
  },
  
  // 游客模式下点击需要登录的功能
  onNeedLogin: function() {
    const app = getApp();
    if (app.globalData.isGuest) {
      wx.showModal({
        title: '提示',
        content: '此功能需要登录后才能使用',
        confirmText: '去登录',
        cancelText: '取消',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({
              url: '/pages/auth/auth'
            });
          }
        }
      });
    }
  }
});