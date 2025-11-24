Page({
    onGetUserInfo: function(e) {
      const userInfo = e.detail.userInfo;
      
      if (userInfo) {
        // 用户同意授权
        const app = getApp();
        
        wx.showLoading({
          title: '登录中...',
        });
        
        // 调用登录处理
        app.handleUserInfo(userInfo, () => {
          // 回调函数，登录成功后的处理
          console.log('登录成功回调');
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
  
    onLoad: function() {
      console.log('授权页面加载，等待用户操作');
      // 完全移除自动跳转逻辑
    }
  });