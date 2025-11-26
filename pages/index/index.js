// index.js
Page({
  data: {
    banners: [
      { id: 1, imageUrl: '/images/banner1.jpg' },
      { id: 2, imageUrl: '/images/banner2.jpg' }
    ],
    isGuest: false,
    searchKeyword: '',
    restaurants: [],
    loading: true
  },

  onLoad: function () {
    // 检查是否是游客模式
    const app = getApp();
    this.setData({
      isGuest: app.globalData.isGuest
    });
    
    // 加载餐厅列表
    this.loadRestaurants();
  },

  onShow: function() {
    // 每次页面显示时检查登录状态
    const app = getApp();
    this.setData({
      isGuest: app.globalData.isGuest
    });
  },

  // 加载餐厅列表
  loadRestaurants: function () {
    const app = getApp();
    this.setData({ loading: true });
    
    // 获取所有餐厅
    wx.request({
      url: app.globalData.baseUrl + '/restaurant/all',
      method: 'GET',
      success: (res) => {
        console.log('餐厅列表响应:', res.data);
        if (res.data.code === 200) {
          this.setData({
            restaurants: res.data.data || [],
            loading: false
          });
        } else {
          console.error('获取餐厅列表失败:', res.data.message);
          this.setData({ loading: false });
          wx.showToast({
            title: '加载失败',
            icon: 'none'
          });
        }
      },
      fail: (err) => {
        console.error('请求餐厅列表失败:', err);
        this.setData({ loading: false });
        // 开发环境使用模拟数据
        this.loadMockData();
      }
    });
  },

  // 获取营业状态文本
  getStatusText: function(status) {
    const statusMap = {
      1: '营业中',
      2: '休息中',
      3: '已打烊'
    };
    return statusMap[status] || '未知状态';
  },

  // 获取营业状态样式类
  getStatusClass: function(status) {
    const classMap = {
      1: 'status-open',
      2: 'status-break',
      3: 'status-closed'
    };
    return classMap[status] || 'status-closed';
  },

  // 餐厅点击事件 - 跳转到餐厅详情页
  onRestaurantTap: function(e) {
    const restaurant = e.currentTarget.dataset.restaurant;
    console.log('点击餐厅:', restaurant);
    
    // 跳转到餐厅详情页
    wx.navigateTo({
      url: `/pages/restaurant-detail/restaurant-detail?id=${restaurant.id}`
    });
  },

  // 搜索输入事件
  onSearchInput: function(e) {
    this.setData({
      searchKeyword: e.detail.value
    });
  },

  // 搜索确认事件
  onSearchConfirm: function() {
    const keyword = this.data.searchKeyword.trim();
    if (!keyword) {
      wx.showToast({
        title: '请输入搜索内容',
        icon: 'none'
      });
      return;
    }
  
    // 直接执行搜索，游客也可以搜索
    this.performSearch(keyword);
  },

  // 搜索框点击事件
  onSearchTap: function() {
    // 输入框会自动获得焦点
  },

  // 执行搜索
  performSearch: function(keyword) {
    console.log('搜索餐厅关键词:', keyword);
    wx.showLoading({
      title: '搜索中...',
    });

    const app = getApp();
    wx.request({
      url: app.globalData.baseUrl + '/search/restaurants',
      method: 'GET',
      data: {
        keyword: keyword
      },
      success: (res) => {
        wx.hideLoading();
        if (res.data.code === 200) {
          this.handleSearchResults(res.data.data);
        } else {
          wx.showToast({
            title: '搜索失败: ' + (res.data.message || '未知错误'),
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

  // 处理搜索结果
  handleSearchResults: function(results) {
    if (results && results.length > 0) {
      // 显示搜索结果
      this.setData({
        restaurants: results
      });
    } else {
      wx.showToast({
        title: '未找到相关餐厅',
        icon: 'none'
      });
    }
  },

  // 开发环境模拟搜索结果
  mockSearchResults: function(keyword) {
    // 模拟过滤餐厅
    const filteredRestaurants = this.data.restaurants.filter(restaurant => 
      restaurant.name.includes(keyword) || 
      restaurant.description.includes(keyword)
    );

    if (filteredRestaurants.length > 0) {
      this.setData({
        restaurants: filteredRestaurants
      });
      wx.showToast({
        title: `找到${filteredRestaurants.length}家餐厅`,
        icon: 'success'
      });
    } else {
      wx.showToast({
        title: '未找到相关餐厅',
        icon: 'none'
      });
    }
  },

  // 游客模式下点击需要登录的功能
  onNeedLogin: function() {
    const app = getApp();
    if (app.globalData.isGuest) {
      wx.showModal({
        title: '登录提示',
        content: `此功能需要登录后才能使用，是否立即登录？`,
        confirmText: '去登录',
        cancelText: '稍后再说',
        confirmColor: '#ff6b35',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({
              url: '/pages/auth/auth'
            });
          }
        }
      });
    }
  }
});