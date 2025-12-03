Page({
    data: {
      favorites: [],
      userId: null
    },
  
    onLoad() {
      const app = getApp();
      const user = app.globalData.userInfo;
  
      if (!user) {
        wx.showToast({ title: '请先登录', icon: 'none' });
        return;
      }
  
      this.setData({ userId: user.id });
      this.loadFavorites();
    },
  
    /** 加载收藏列表 */
    loadFavorites() {
        const app = getApp();
      
        wx.request({
          url: app.globalData.baseUrl + "/favorite/list",
          method: "GET",
          data: { userId: this.data.userId },
          success: (res) => {
      
            if (res.data.code !== 200) {
              this.setData({ favorites: [] });
              return;
            }
      
            const favRaw = res.data.data || [];
      
            if (favRaw.length === 0) {
              this.setData({ favorites: [] });
              return;
            }
            const ids = favRaw.map(item => item.restaurant_id || item.restaurantId);
      
            this.loadRestaurantDetails(ids);
          }
        });
      },
  
    /** 获取餐厅信息 */
    loadRestaurantDetails(ids) {
        const app = getApp();
      
        wx.request({
          url: app.globalData.baseUrl + "/restaurant/all",
          method: "GET",
          success: (res) => {
            if (res.data.code !== 200) {
              this.setData({ favorites: [] });
              return;
            }
      
            let list = res.data.data.filter(r => ids.includes(r.id));
      
            // ⭐ 保留 1 位小数
            list = list.map(r => {
              if (r.avgRating === undefined || r.avgRating === null || r.avgRating === -1) {
                r.avgRating = null;
              } else {
                r.avgRating = Number(r.avgRating).toFixed(1);
              }
              return r;
            });
      
            this.setData({ favorites: list });
          }
        });
      },
  
    /** 点击取消收藏 */
    onCancelFavorite(e) {
      const restaurantId = e.currentTarget.dataset.id;
      const userId = this.data.userId;
      const app = getApp();
  
      wx.showModal({
        title: "提示",
        content: '确认取消收藏吗？',
        confirmColor: "#ff6b35",
        success: (res) => {
          if (!res.confirm) return;
  
          wx.request({
            url: app.globalData.baseUrl + "/favorite/remove",
            method: "POST",
            data: { userId, restaurantId },
            success: (res) => {
              if (res.data.code === 200) {
                wx.showToast({ title: "已取消收藏", icon: "success" });
                this.loadFavorites();
              }
            }
          });
        }
      });
    },
  
    /** 跳转详情 */
    goDetail(e) {
      wx.navigateTo({
        url: `/pages/restaurant-detail/restaurant-detail?id=${e.currentTarget.dataset.id}`
      });
    },
  
    onBack() {
      wx.navigateBack();
    }
  });
  