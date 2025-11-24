// index.js
Page({
  data: {
    banners: [
      { id: 1, imageUrl: '/images/banner1.jpg' },
      { id: 2, imageUrl: '/images/banner2.jpg' }
    ]
  },

  onLoad: function () {
    this.loadRestaurantInfo();
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
  }
});