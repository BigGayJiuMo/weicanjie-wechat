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
      // 新增：记录初始加载是否完成，避免重复加载
      initialLoaded: false
    },
  
    onLoad: function () {
      const app = getApp();
      this.setData({
        isGuest: app.globalData.isGuest
      });
      // 首次加载数据（只执行一次）
      this.loadRestaurants(true, false);
    },
  
    onShow: function () {
      const app = getApp();
      // 仅更新登录状态，不刷新餐厅列表（保留原有加载好的数据）
      this.setData({
        isGuest: app.globalData.isGuest
      });
      // 注意：不再调用 loadRestaurants，避免每次返回页面都重置列表
    },
  
    // 下拉刷新（独立实现，避免破坏现有数据）
    onRefresh() {
      // 如果已经在刷新或加载更多，则跳过
      if (this.data.refreshing || this.data.loadingMore) {
        this.setData({ refreshing: false });
        return;
      }
  
      this.setData({ refreshing: true });
  
      const app = getApp();
      // 保存当前数据快照，用于刷新失败时恢复
      const oldRestaurants = [...this.data.restaurants];
      const oldPageNum = this.data.pageNum;
      const oldHasMore = this.data.hasMore;
  
      wx.request({
        url: app.globalData.baseUrl + '/restaurant/page',
        method: 'GET',
        data: {
          pageNum: 1,
          pageSize: this.data.pageSize
        },
        success: (res) => {
          if (res.data.code === 200) {
            const pageResult = res.data.data;
            let newList = pageResult.records || [];
            
            // 处理营业状态和评分
            newList.forEach(r => {
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
                  case 1: r.statusText = "营业中"; r.statusClass = "status-open"; break;
                  case 2: r.statusText = "未营业"; r.statusClass = "status-break"; break;
                  case 3: r.statusText = "休息中"; r.statusClass = "status-break"; break;
                  default: r.statusText = "未知状态"; r.statusClass = "status-closed";
                }
              }
            });
  
            const hasMoreData = newList.length >= this.data.pageSize;
            this.setData({
              restaurants: newList,
              pageNum: 2,
              hasMore: hasMoreData,
              refreshing: false,
              loading: false
            });
          } else {
            // 请求失败，恢复原有数据
            this.setData({
              restaurants: oldRestaurants,
              pageNum: oldPageNum,
              hasMore: oldHasMore,
              refreshing: false
            });
            wx.showToast({ title: '刷新失败', icon: 'none' });
          }
        },
        fail: (err) => {
          console.error('刷新请求失败', err);
          // 恢复原有数据
          this.setData({
            restaurants: oldRestaurants,
            pageNum: oldPageNum,
            hasMore: oldHasMore,
            refreshing: false
          });
          wx.showToast({ title: '网络错误，刷新失败', icon: 'none' });
        }
      });
    },
  
    /** 
     * 加载餐厅列表（用于初次加载和加载更多）
     * @param {boolean} fromRefresh - 是否来自刷新操作（实际只用于初次加载时的重置）
     * @param {boolean} isLoadMore - 是否为加载更多
     */
    loadRestaurants: function (fromRefresh = false, isLoadMore = false) {
      const app = getApp();
      let { pageNum, pageSize, restaurants, hasMore, loadingMore, refreshing } = this.data;
  
      // 如果是加载更多，检查状态
      if (isLoadMore) {
        if (!hasMore || loadingMore) return;
        this.setData({ loadingMore: true });
      } else {
        // 初次加载或强制刷新（仅用于 onLoad）
        if (this.data.loading && !fromRefresh) return;
        this.setData({ loading: true });
      }
  
      // 如果是初次加载（fromRefresh = true），重置分页参数，但不清空现有数据（避免闪烁）
      let requestPageNum = pageNum;
      if (fromRefresh) {
        requestPageNum = 1;
      }
  
      wx.request({
        url: app.globalData.baseUrl + '/restaurant/page',
        method: 'GET',
        data: {
          pageNum: requestPageNum,
          pageSize: pageSize
        },
        success: (res) => {
          if (res.data.code === 200) {
            const pageResult = res.data.data;
            let newList = pageResult.records || [];
            
            // 处理营业状态和评分
            newList.forEach(r => {
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
                  case 1: r.statusText = "营业中"; r.statusClass = "status-open"; break;
                  case 2: r.statusText = "未营业"; r.statusClass = "status-break"; break;
                  case 3: r.statusText = "休息中"; r.statusClass = "status-break"; break;
                  default: r.statusText = "未知状态"; r.statusClass = "status-closed";
                }
              }
            });
  
            // 关键：保留原有加载好的数据，仅拼接新数据（刷新场景除外）
            let updatedRestaurants;
            let newPageNum;
            let hasMoreData;
  
            if (fromRefresh) {
              // 初次加载：直接替换（此时原数据为空，安全）
              updatedRestaurants = newList;
              newPageNum = 2;
              hasMoreData = newList.length >= pageSize;
            } else if (isLoadMore) {
              // 加载更多：拼接数据
              updatedRestaurants = restaurants.concat(newList);
              newPageNum = pageNum + 1;
              hasMoreData = newList.length >= pageSize;
            } else {
              // 其他情况（兼容），不处理
              updatedRestaurants = restaurants;
              newPageNum = pageNum;
              hasMoreData = hasMore;
            }
  
            this.setData({
              restaurants: updatedRestaurants,
              pageNum: newPageNum,
              hasMore: hasMoreData,
              loading: false,
              refreshing: false,
              loadingMore: false,
              initialLoaded: true
            });
          } else {
            // 接口返回错误，保留原数据，仅提示
            this.setData({ loading: false, refreshing: false, loadingMore: false });
            wx.showToast({ title: '加载失败', icon: 'none' });
          }
        },
        fail: (err) => {
          console.error('请求失败', err);
          // 失败时不清空现有数据，仅提示错误
          this.setData({ loading: false, refreshing: false, loadingMore: false });
          wx.showToast({ title: '网络请求失败', icon: 'none' });
        }
      });
    },
  
    /** 加载更多（上拉触底） */
    loadMore() {
      // 避免在刷新或已无更多数据时触发
      if (this.data.refreshing || !this.data.hasMore || this.data.loadingMore) return;
      this.loadRestaurants(false, true);
    },
  
    /** 搜索相关（保持原有逻辑，但不会影响首页列表的持久化） */
    onSearchInput: function (e) {
      this.setData({ searchKeyword: e.detail.value });
    },
  
    onSearchConfirm: function () {
      const keyword = this.data.searchKeyword.trim();
      if (!keyword) {
        wx.showToast({ title: '请输入搜索内容', icon: 'none' });
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
            wx.showToast({ title: '搜索失败', icon: 'none' });
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
            case 1: r.statusText = "营业中"; r.statusClass = "status-open"; break;
            case 2: r.statusText = "休息中"; r.statusClass = "status-break"; break;
            case 3: r.statusText = "休息中"; r.statusClass = "status-break"; break;
            default: r.statusText = "未知状态"; r.statusClass = "status-closed";
          }
        }
      });
  
      if (filtered.length > 0) {
        this.setData({ restaurants: filtered });
        wx.showToast({ title: `找到 ${filtered.length} 家餐厅`, icon: 'success' });
      } else {
        wx.showToast({ title: '未找到相关餐厅', icon: 'none' });
      }
    },
  
    /** 跳转餐厅详情 */
    onRestaurantTap: function (e) {
      const restaurant = e.currentTarget.dataset.restaurant;
      wx.navigateTo({ url: `/pages/restaurant-detail/restaurant-detail?id=${restaurant.id}` });
    },
  
    goSearchPage() {
      wx.navigateTo({ url: "/pages/search-restaurant/search-restaurant" });
    },
  
    /** 模拟数据（备用） */
    loadMockData() {
      // 仅用于调试，不覆盖已有数据
      if (this.data.restaurants.length === 0) {
        this.setData({
          restaurants: [],
          loading: false,
          refreshing: false,
          loadingMore: false,
          hasMore: false
        });
      }
    }
  });