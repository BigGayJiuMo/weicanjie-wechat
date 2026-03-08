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
      pageNum: 1,           
      pageSize: 10,         
      hasMore: true,       
      loadingMore: false,   
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
      this.loadRestaurants(true, false);
    },
    onRefresh() {
        this.setData({ refreshing: true });
        this.loadRestaurants(true, false); // 传入 true 表示是刷新操作
      },
    /** =======================
     *   加载餐厅列表
     *  ======================= */
    loadRestaurants: function (fromRefresh = false, isLoadMore = false) {
        const app = getApp();
        let { pageNum, pageSize, restaurants, hasMore } = this.data;
    
        // 如果是刷新，重置页码
        if (fromRefresh) {
            pageNum = 1;
            hasMore = true;
            restaurants = [];
        }
    
        // 如果正在加载更多且没有更多数据，则直接返回
        if (isLoadMore && (!hasMore || this.data.loadingMore)) return;
    
        // 设置加载状态
        if (isLoadMore) {
            this.setData({ loadingMore: true });
        } else {
            this.setData({ loading: true });
        }
    
        wx.request({
            url: app.globalData.baseUrl + '/restaurant/page',
            method: 'GET',
            data: {
                pageNum: pageNum,
                pageSize: pageSize
                // 如果有搜索关键词，可以添加 keyword 参数
            },
            success: (res) => {
                if (res.data.code === 200) {
                    const pageResult = res.data.data;
                    const newList = pageResult.records || [];
                    
                    // 处理营业状态
                    newList.forEach(r => {
                        if (r.avgRating === undefined || r.avgRating === -1 || r.avgRating === null) {
                            r.avgRating = null;
                        } else {
                            r.avgRating = Number(r.avgRating).toFixed(1);
                        }
                        // 沿用原有的营业状态处理逻辑
                        if (r.businessStatusText && r.businessStatusClass) {
                            r.statusText = r.businessStatusText;
                            r.statusClass = r.businessStatusClass;
                        } else {
                            switch (r.businessStatus) {
                                case 1: r.statusText = "营业中"; r.statusClass = "status-open"; break;
                                case 2: r.statusText = "未营业"; r.statusClass = "status-break"; break;
                                case 3: r.statusText = "休息中"; r.statusClass = "status-break"; break;
                                default: r.statusText = "未知状态"; r.statusClass = "status-closed";
                            }
                        }
                    });
    
                    const updatedRestaurants = fromRefresh ? newList : restaurants.concat(newList);
                    const hasMoreData = newList.length >= pageSize;
                    const nextPageNum = pageNum + 1;
    
                    this.setData({
                        restaurants: updatedRestaurants,
                        pageNum: nextPageNum,
                        hasMore: hasMoreData,
                        loading: false,
                        refreshing: false,
                        loadingMore: false
                    });
                } else {
                    wx.showToast({ title: '加载失败', icon: 'none' });
                    this.setData({ loading: false, refreshing: false, loadingMore: false });
                }
            },
            fail: (err) => {
                console.error('请求失败', err);
                this.setData({ loading: false, refreshing: false, loadingMore: false });
                this.loadMockData();
            }
        });
    },
    /** =======================
     *   加载更多餐厅
     *  ======================= */
    loadMore() {
        this.loadRestaurants(false, true); // 加载更多
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
            refreshing: false,
            loadingMore: false,
            hasMore: false
        });
    }
  });