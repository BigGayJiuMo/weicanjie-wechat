Page({
    data: {
      categoryList: [],
      activeCategoryId: null,
      restaurants: [],
      loading: false
    },
  
    onLoad() {
      this.loadCategoryList();
    },
  
    /** 加载左侧分类列表 */
    loadCategoryList() {
      const app = getApp();
      this.setData({ loading: true });
  
      wx.request({
        url: app.globalData.baseUrl + "/category/list",
        method: "GET",
        success: (res) => {
          if (res.data.code !== 200) {
            wx.showToast({ title: "分类加载失败", icon: "none" });
            this.setData({ loading: false });
            return;
          }
  
          const list = res.data.data || [];
  
          if (list.length === 0) {
            this.setData({ loading: false });
            return;
          }
  
          this.setData({
            categoryList: list,
            activeCategoryId: list[0].id,
            loading: false
          });
  
          this.loadRestaurantList(list[0].id);
        },
        fail: () => {
          this.setData({ loading: false });
          wx.showToast({ title: "网络异常", icon: "none" });
        }
      });
    },
  
    /** 左侧分类点击 */
    onCategoryTap(e) {
      const id = e.currentTarget.dataset.id;
  
      this.setData({ 
        activeCategoryId: id,
        restaurants: [],
        loading: true 
      });
  
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
              let restaurants = res.data.data || [];
              
              // ⭐ 前端过滤：过滤掉 status=0 的餐厅
              restaurants = restaurants.filter(r => r.status != null && r.status !== 0);
              
              restaurants = restaurants.map(r => {
                // 处理评分
                if (r.avgRating === null || r.avgRating === undefined || r.avgRating === -1) {
                  r.avgRating = null;
                } else {
                  r.avgRating = Number(r.avgRating).toFixed(1);
                }
      
                // 处理打包费
                if (r.packingFee !== undefined && r.packingFee !== null) {
                  r.packingFee = Number(r.packingFee).toFixed(2);
                }
      
                // 处理营业状态
                if (r.businessStatusText && r.businessStatusClass) {
                  r.statusText = r.businessStatusText;
                  r.statusClass = r.businessStatusClass;
                } else {
                  switch (r.businessStatus) {
                    case 1:
                      r.statusText = "营业中";
                      r.statusClass = "status-open";
                      break;
                    case 2:
                      r.statusText = "休息中";
                      r.statusClass = "status-break";
                      break;
                    case 3:
                      r.statusText = "已打烊";
                      r.statusClass = "status-closed";
                      break;
                    default:
                      r.statusText = "未知状态";
                      r.statusClass = "status-closed";
                  }
                }
      
                return r;
              });
      
              this.setData({ 
                restaurants,
                loading: false 
              });
            } else {
              this.setData({ 
                restaurants: [],
                loading: false 
              });
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
    },
  
    goSearchPage() {
      wx.navigateTo({
        url: "/pages/search-restaurant/search-restaurant"
      });
    }
  });