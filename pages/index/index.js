// index.js
Page({
  data: {
    banners: [
      { id: 1, imageUrl: '/images/banner1.jpg' },
      { id: 2, imageUrl: '/images/banner2.jpg' }
    ],
    isGuest: false,
    searchKeyword: '' // 搜索关键词
  },

  onLoad: function () {
    // 检查是否是游客模式
    const app = getApp();
    this.setData({
      isGuest: app.globalData.isGuest
    });
    
    this.loadRestaurantInfo();
  },
  
  onShow: function() {
    // 每次页面显示时检查登录状态
    const app = getApp();
    this.setData({
      isGuest: app.globalData.isGuest
    });
  },
  
  loadRestaurantInfo: function () {
    const app = getApp();
    wx.request({
      url: app.globalData.baseUrl + '/weicanjie/info',
      method: 'GET',
      success: (res) => {
        if (res.data.code === 200) {
          this.setData({
            restaurantInfo: res.data.data
          });
        }
      }
    });
  },
  
  // 搜索输入事件
  onSearchInput: function(e) {
    this.setData({
      searchKeyword: e.detail.value
    });
  },
  
  // 搜索确认事件（键盘搜索按钮或点击搜索图标）
  onSearchConfirm: function() {
    const keyword = this.data.searchKeyword.trim();
    
    if (!keyword) {
      wx.showToast({
        title: '请输入搜索内容',
        icon: 'none'
      });
      return;
    }
    
    // 检查登录状态
    const app = getApp();
    if (app.globalData.isGuest) {
      this.onNeedLogin();
      return;
    }
    
    // 执行搜索
    this.performSearch(keyword);
  },
  
  // 搜索框点击事件（聚焦输入框）
  onSearchTap: function() {
    // 这里可以添加一些点击效果或逻辑
    // 输入框会自动获得焦点
  },
  
  // 执行搜索
  performSearch: function(keyword) {
    console.log('搜索关键词:', keyword);
    
    // 显示搜索中提示
    wx.showLoading({
      title: '搜索中...',
    });
    
    // 调用搜索API
    const app = getApp();
    wx.request({
      url: app.globalData.baseUrl + '/search',
      method: 'GET',
      data: {
        keyword: keyword,
        type: 'all' // 搜索餐厅和菜品
      },
      success: (res) => {
        wx.hideLoading();
        
        if (res.data.code === 200) {
          // 处理搜索结果
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
        
        // 开发环境模拟搜索结果
        this.mockSearchResults(keyword);
      }
    });
  },
  
  // 处理搜索结果
  handleSearchResults: function(results) {
    // 这里可以根据需要跳转到搜索结果页面或显示搜索结果
    wx.navigateTo({
      url: '/pages/search/search?keyword=' + this.data.searchKeyword + '&results=' + JSON.stringify(results)
    });
  },
  
  // 开发环境模拟搜索结果
  mockSearchResults: function(keyword) {
    // 模拟搜索结果数据
    const mockResults = {
      dishes: [
        { id: 1, name: '红烧肉', price: 38, image: '/images/dish1.jpg' },
        { id: 2, name: '宫保鸡丁', price: 32, image: '/images/dish2.jpg' }
      ],
      restaurants: [
        { id: 1, name: '美味餐厅', rating: 4.5, address: '北京市朝阳区' }
      ]
    };
    
    wx.showToast({
      title: '搜索完成(模拟数据)',
      icon: 'success'
    });
    
    // 跳转到搜索结果页面
    setTimeout(() => {
      wx.navigateTo({
        url: '/pages/search/search?keyword=' + keyword + '&results=' + JSON.stringify(mockResults)
      });
    }, 1000);
  },
  
  // 游客模式下点击需要登录的功能
  onNeedLogin: function() {
    const app = getApp();
    if (app.globalData.isGuest) {
      wx.showModal({
        title: '提示',
        content: '此功能需要登录后才能使用',
        confirmText: '去登录',
        cancelText: '取消',
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