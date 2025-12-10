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
      
            let list = res.data.data || [];
      
            // ⭐ 按 sortOrder 排序（没有 sortOrder 的默认为 999）
            list = list.sort((a, b) => {
              return (a.sortOrder ?? 999) - (b.sortOrder ?? 999);
            });
      
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
            
                        // 处理营业状态 - 添加手动状态逻辑
                        if (r.status === 0) {
                            // 已停业（最高优先级）
                            r.statusText = "已停业";
                            r.statusClass = "status-closed";
                            r.businessStatus = 0;
                        } else if (r.manualBusinessStatus != null && r.manualBusinessStatus !== 0) {
                            // 手动设置状态（第二优先级）
                            if (r.manualBusinessStatus === 1) {
                                r.statusText = "营业中";
                                r.statusClass = "status-open";
                                r.businessStatus = 1;
                            } else if (r.manualBusinessStatus === 2) {
                                r.statusText = "休息中";
                                r.statusClass = "status-break";
                                r.businessStatus = 3; // 注意：手动未营业对应的是 3
                            }
                        } else if (r.businessStatusText && r.businessStatusClass) {
                            // 后台已计算好的自动状态
                            r.statusText = r.businessStatusText;
                            r.statusClass = r.businessStatusClass;
                        } else {
                            // 后台没有返回文本，则按 businessStatus 数字推断
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
                    
                    // 排序：营业中的在前
                    restaurants.sort((a, b) => {
                        const order = { 1: 1, 2: 2, 3: 3, 0: 4 };
                        return (order[a.businessStatus] || 4) - (order[b.businessStatus] || 4);
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