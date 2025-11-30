Page({

  data: {
    categoryList: [],
    activeCategoryId: null,
    restaurants: []
  },

  onLoad() {
    this.loadCategoryList();
  },

  /** 加载左侧分类列表 */
  loadCategoryList() {
    const app = getApp();

    wx.request({
      url: app.globalData.baseUrl + "/category/list",
      method: "GET",
      success: (res) => {
        if (res.data.code !== 200) {
          wx.showToast({ title: "分类加载失败", icon: "none" });
          return;
        }

        const list = res.data.data || [];

        if (list.length === 0) return;

        this.setData({
          categoryList: list,
          activeCategoryId: list[0].id
        });

        this.loadRestaurantList(list[0].id);
      }
    });
  },

  /** 左侧分类点击 */
  onCategoryTap(e) {
    const id = e.currentTarget.dataset.id;

    this.setData({ activeCategoryId: id });

    this.loadRestaurantList(id);
  },

  /** 根据分类加载餐厅 */
  loadRestaurantList(categoryId) {
    const app = getApp();

    wx.request({
      url: app.globalData.baseUrl + "/restaurant/listByCategory",
      method: "GET",
      data: { categoryId },
      success: (res) => {
        if (res.data.code === 200) {
          this.setData({ restaurants: res.data.data || [] });
        } else {
          this.setData({ restaurants: [] });
        }
      }
    });
  },

  /** 跳转餐厅详情 */
  goDetail(e) {
    const restaurantId = e.currentTarget.dataset.id;
  
    if (!restaurantId) {
      wx.showToast({
        title: '餐厅ID不存在',
        icon: 'none'
      });
      return;
    }
  
    wx.navigateTo({
      url: `/pages/restaurant-detail/restaurant-detail?id=${restaurantId}`
    });
  }

});
