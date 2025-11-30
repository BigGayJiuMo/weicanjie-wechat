Page({
    data: {
      historyList: []
    },
  
    onLoad() {
      this.loadHistory();
    },
  
    loadHistory() {
      const app = getApp();
      const userId = app.globalData.userInfo.id;
  
      wx.request({
        url: app.globalData.baseUrl + '/user/history',
        method: 'GET',
        data: { userId },
        success: (res) => {
          if (res.data.code === 200) {
            this.setData({
              historyList: res.data.data || []
            });
          }
        }
      });
    }
  });
  