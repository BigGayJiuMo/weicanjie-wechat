Page({
    data: {
      favorites: [],   // 收藏的完整餐厅列表
      userId: null,
      maxMove: 80, // 最大滑动距离
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
  
    /** 加载收藏列表（后端只返回 restaurantId，所以还要再查一次餐厅信息） */
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
  
    /** 根据收藏的 restaurantId 批量筛选餐厅详情 */
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
  
          const allRestaurants = res.data.data;
          const list = allRestaurants
            .filter(r => ids.includes(r.id))
            .map(r => ({ ...r, x: 0 }));  // 初始化左滑位置
  
          this.setData({ favorites: list });
        }
      });
    },
  
    /** 左右滑时更新 x 值 */
    onItemMove(e) {
      const id = e.currentTarget.dataset.id;
      const x = e.detail.x;  // 当前滑动的 x 值
  
      // 判断方向，左滑就显示删除按钮，右滑就回到原点
      const newX = x < -30 ? -this.data.maxMove : 0;
  
      // 更新每个项的 x 值
      const newList = this.data.favorites.map(item => {
        if (item.id === id) {
          item.x = newX;  // 实时更新滑动的值
        }
        return item;
      });
  
      this.setData({ favorites: newList });
    },
  
    /** 松手时决定吸附到哪里 */
    onTouchEnd(e) {
      const id = e.currentTarget.dataset.id;
      const item = this.data.favorites.find(i => i.id === id);
  
      // 判断滑动方向
      // 如果是左滑，显示删除按钮，设置 x 为 -160
      // 如果是右滑，回到初始状态，设置 x 为 0
      const targetX = item.x < -40 ? -this.data.maxMove : 0;
  
      // 更新每个项的 x 值
      const newList = this.data.favorites.map(i => {
        if (i.id === id) i.x = targetX;
        return i;
      });
  
      this.setData({ favorites: newList });
    },
  
    /** 删除收藏 */
    onDeleteTap(e) {
      const restaurantId = e.currentTarget.dataset.id;
      const userId = this.data.userId;
      const app = getApp();
  
      wx.showModal({
        title: "确认取消收藏？",
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
                this.loadFavorites(); // 刷新列表
              }
            }
          });
        }
      });
    },
  
    /** 详情页跳转 */
    goDetail(e) {
      const id = e.currentTarget.dataset.id;
      wx.navigateTo({
        url: `/pages/restaurant-detail/restaurant-detail?id=${id}`
      });
    },
  
    onBack() {
      wx.navigateBack();
    }
  });
  