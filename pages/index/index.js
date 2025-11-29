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
          // 如果后端失败，使用模拟数据
          this.loadMockData();
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

  // 加载模拟数据
  loadMockData: function() {
    const mockRestaurants = [
      {
        id: 1,
        name: '美味餐厅',
        description: '用心做好每一道菜，给您家的感觉',
        logoUrl: '/images/restaurant1.jpg',
        avgRating: 4.8,
        monthlySales: 1560,
        minOrderAmount: 20.00,
        deliveryFee: 3.00,
        deliveryTime: '30-45分钟',
        businessStatus: 1,
        address: '北京市朝阳区光华路1号'
      },
      {
        id: 2,
        name: '鲜味小馆',
        description: '新鲜食材，健康烹饪',
        logoUrl: '/images/restaurant2.jpg',
        avgRating: 4.6,
        monthlySales: 980,
        minOrderAmount: 25.00,
        deliveryFee: 4.00,
        deliveryTime: '35-50分钟',
        businessStatus: 1,
        address: '上海市浦东新区张江高科技园区'
      },
      {
        id: 3,
        name: '川湘菜馆',
        description: '正宗川湘风味，辣得过瘾',
        logoUrl: '/images/restaurant3.jpg',
        avgRating: 4.9,
        monthlySales: 2100,
        minOrderAmount: 15.00,
        deliveryFee: 5.00,
        deliveryTime: '25-40分钟',
        businessStatus: 1,
        address: '广州市天河区天河路385号'
      }
    ];

    this.setData({
      restaurants: mockRestaurants,
      loading: false
    });
    
    wx.showToast({
      title: '使用模拟数据',
      icon: 'none',
      duration: 2000
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
      url: app.globalData.baseUrl + '/restaurant/all',
      method: 'GET',
      success: (res) => {
        wx.hideLoading();
        if (res.data.code === 200) {
          this.handleSearchResults(res.data.data, keyword);
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
  handleSearchResults: function(restaurants, keyword) {
    const filteredRestaurants = restaurants.filter(restaurant => 
      restaurant.name.includes(keyword) || 
      (restaurant.description && restaurant.description.includes(keyword))
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

  // 开发环境模拟搜索结果
  mockSearchResults: function(keyword) {
    // 模拟过滤餐厅
    const filteredRestaurants = this.data.restaurants.filter(restaurant => 
      restaurant.name.includes(keyword) || 
      (restaurant.description && restaurant.description.includes(keyword))
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
  }
});