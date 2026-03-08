Page({
    data: {
      banners: [
        { id: 1, imageUrl: '/images/banner1.jpg' },
        { id: 2, imageUrl: '/images/banner2.jpg' }
      ],
      isGuest: false,
      searchKeyword: '',
      restaurants: [],
      loading: true,
      refreshing: false,
    },
  
    onLoad: function () {
      const app = getApp();
      this.setData({
        isGuest: app.globalData.isGuest
      });
    },
  
    onShow: function () {
      const app = getApp();
      this.setData({
        isGuest: app.globalData.isGuest
      });
      this.loadRestaurants();
    },
    onRefresh() {
        this.setData({ refreshing: true });
        this.loadRestaurants(true); // 传入 true 表示是刷新操作
      },
    /** =======================
     *   加载餐厅列表（修复营业状态）
     *  ======================= */
    loadRestaurants: function (fromRefresh = false) {
        const app = getApp();
        if (!fromRefresh) {
            this.setData({ loading: true });
        }
    
        wx.request({
            url: app.globalData.baseUrl + '/restaurant/all',
            method: 'GET',
            success: (res) => {
                console.log('餐厅列表响应:', res.data);
                if (res.data.code === 200) {
                    let restaurants = res.data.data || [];
                    // 过滤已下架的餐厅 (status=0)
                    restaurants = restaurants.filter(r => r.status != null && r.status !== 0);
    
                    restaurants.forEach(r => {
                        // 处理评分
                        if (r.avgRating === undefined || r.avgRating === -1 || r.avgRating === null) {
                            r.avgRating = null;
                        } else {
                            r.avgRating = Number(r.avgRating).toFixed(1);
                        }
    
                        // ===== 处理营业状态显示 =====
                        if (r.businessStatusText && r.businessStatusClass) {
                            // 后台已提供文本和样式
                            r.statusText = r.businessStatusText;
                            r.statusClass = r.businessStatusClass;
                        } else {
                            // 根据 businessStatus 数字推断
                            switch (r.businessStatus) {
                                case 1:
                                    r.statusText = "营业中";
                                    r.statusClass = "status-open";
                                    break;
                                case 2:
                                    r.statusText = "未营业";
                                    r.statusClass = "status-break";
                                    break;
                                case 3:
                                    r.statusText = "休息中";
                                    r.statusClass = "status-break";
                                    break;
                                default:
                                    r.statusText = "未知状态";
                                    r.statusClass = "status-closed";
                            }
                        }
                    });
    
                    // 按营业状态排序
                    restaurants.sort((a, b) => a.businessStatus - b.businessStatus);
    
                    this.setData({
                        restaurants,
                        loading: false,
                        refreshing: false,
                    });
                } else {
                    console.error('获取餐厅列表失败:', res.data.message);
                    this.setData({ loading: false, refreshing: false });
                    this.loadMockData();
                }
            },
            fail: (err) => {
                console.error('请求餐厅列表失败:', err);
                this.setData({ loading: false, refreshing: false });
                this.loadMockData();
            }
        });
    },
  
    /** =======================
     *   搜索相关
     *  ======================= */
    onSearchInput: function (e) {
      this.setData({
        searchKeyword: e.detail.value
      });
    },
  
    onSearchConfirm: function () {
      const keyword = this.data.searchKeyword.trim();
      if (!keyword) {
        wx.showToast({
          title: '请输入搜索内容',
          icon: 'none'
        });
        return;
      }
  
      this.performSearch(keyword);
    },
  
    onSearchTap: function () {},
  
    performSearch: function (keyword) {
      console.log('搜索餐厅关键词:', keyword);
  
      wx.showLoading({ title: '搜索中...' });
      const app = getApp();
  
      wx.request({
        url: app.globalData.baseUrl + '/restaurant/all',
        method: 'GET',
        success: (res) => {
          wx.hideLoading();
  
          if (res.data.code === 200) {
            this.handleSearchResults(res.data.data, keyword);
          } else {
            wx.showToast({
              title: '搜索失败',
              icon: 'none'
            });
          }
        },
  
        fail: (err) => {
          wx.hideLoading();
          console.error('搜索请求失败:', err);
          this.mockSearchResults(keyword);
        }
      });
    },
  
    handleSearchResults(restaurants, keyword) {
      const filtered = restaurants.filter(r =>
        (r.name && r.name.includes(keyword)) ||
        (r.description && r.description.includes(keyword))
      );
  
      // 处理搜索结果中的营业状态
      filtered.forEach(r => {
        if (r.avgRating === undefined || r.avgRating === -1 || r.avgRating === null) {
          r.avgRating = null;
        } else {
          r.avgRating = Number(r.avgRating).toFixed(1);
        }
  
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
              r.statusText = "休息中";
              r.statusClass = "status-break";
              break;
            default:
              r.statusText = "未知状态";
              r.statusClass = "status-closed";
          }
        }
      });
  
      if (filtered.length > 0) {
        this.setData({ restaurants: filtered });
        wx.showToast({
          title: `找到 ${filtered.length} 家餐厅`,
          icon: 'success'
        });
      } else {
        wx.showToast({
          title: '未找到相关餐厅',
          icon: 'none'
        });
      }
    },
  
    /** =======================
     *   餐厅跳转
     *  ======================= */
    onRestaurantTap: function (e) {
      const restaurant = e.currentTarget.dataset.restaurant;
  
      wx.navigateTo({
        url: `/pages/restaurant-detail/restaurant-detail?id=${restaurant.id}`
      });
    },
    
    goSearchPage() {
      wx.navigateTo({
        url: "/pages/search-restaurant/search-restaurant"
      });
    },
  
    /** =======================
     *   模拟数据（网络失败时）
     *  ======================= */
    loadMockData() {
        this.setData({
          restaurants: [],
          loading: false,
          refreshing: false, // 确保下拉刷新关闭
        });
      }
  });