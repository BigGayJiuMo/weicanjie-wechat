// pages/restaurant-detail/restaurant-detail.js
Page({
  data: {
    restaurantId: null,
    restaurant: null,
    categories: [],
    activeCategoryId: null,
    loading: true,
    cartItems: {},
    totalQuantity: 0,
    totalPrice: 0,
    categoryPositions: [],
    scrollTimer: null, 
    dishesScrollTop: 0, 
    isManualScroll: false,
    isGuest: true, // 默认为游客
    userInfo: null
  },

  onLoad: function (options) {
    const { id } = options;
    
    if (id) {
      this.setData({ restaurantId: id });
      this.loadRestaurantDetail(id);
    } else {
      wx.showToast({
        title: '餐厅ID不存在',
        icon: 'none',
        success: () => {
          setTimeout(() => {
            wx.navigateBack();
          }, 1500);
        }
      });
    }
  },

  onShow: function() {
    // 每次页面显示时检查登录状态
    this.checkLoginStatus();
    
    if (this.data.categories && this.data.categories.length > 0) {
      this.setData({ isManualScroll: true });
      setTimeout(() => {
        this.calculateCategoryPositions();
      }, 500);
    }
  },

  // 检查登录状态
  checkLoginStatus: function() {
    const app = getApp();
    const userInfo = app.globalData.userInfo;
    
    if (userInfo) {
      this.setData({
        userInfo: userInfo,
        isGuest: false
      });
    } else {
      this.setData({
        userInfo: null,
        isGuest: true
      });
    }
  },

  // 显示登录提示
  showLoginTip: function(action = '此功能') {
    wx.showModal({
      title: '登录提示',
      content: `${action}需要登录后才能使用，是否立即登录？`,
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
  },

  // 加载餐厅详情
  loadRestaurantDetail: function (id) {
    const app = getApp();
    this.setData({ loading: true });
    
    wx.request({
      url: app.globalData.baseUrl + '/restaurant/' + id,
      method: 'GET',
      success: (res) => {
        console.log('餐厅详情响应:', res.data);
        if (res.data.code === 200) {
          const restaurant = res.data.data;
          const categories = restaurant.categories || [];
          const activeCategoryId = categories.length > 0 ? categories[0].id : null;
          
          this.setData({
            restaurant: restaurant,
            categories: categories,
            activeCategoryId: activeCategoryId,
            loading: false
          }, () => {
            // 数据加载完成后，计算分类位置
            setTimeout(() => {
              this.calculateCategoryPositions();
            }, 300);
          });
        } else {
          console.error('获取餐厅详情失败:', res.data.message);
          this.setData({ loading: false });
          wx.showToast({
            title: '加载失败',
            icon: 'none'
          });
        }
      },
      fail: (err) => {
        console.error('请求餐厅详情失败:', err);
        this.setData({ loading: false });
        // 开发环境使用模拟数据
        this.loadMockData(id);
      }
    });
  },

  // 计算每个分类的位置信息
  calculateCategoryPositions: function() {
    const query = wx.createSelectorQuery();
    const { categories } = this.data;
    
    if (categories.length === 0) return;
    
    query.select('#dishes-scroll').boundingClientRect();
    
    categories.forEach((category, index) => {
      query.select(`#category-${category.id}`).boundingClientRect();
    });
    
    query.exec((res) => {
      if (!res || res.length === 0) return;
      
      const scrollViewRect = res[0]; // 滚动容器位置
      const categoryPositions = [];
      
      // 从索引1开始，因为索引0是滚动容器
      for (let i = 1; i < res.length; i++) {
        const categoryRect = res[i];
        if (categoryRect) {
          categoryPositions.push({
            categoryId: categories[i-1].id,
            top: categoryRect.top - scrollViewRect.top // 相对滚动容器的位置
          });
        }
      }
      
      this.setData({ categoryPositions });
      console.log('分类位置信息:', categoryPositions);
    });
  },

  // 右侧菜品列表滚动事件
  onDishesScroll: function(e) {
    const scrollTop = e.detail.scrollTop;
    const { categoryPositions, categories, isManualScroll } = this.data;
    
    if (!categoryPositions || categoryPositions.length === 0 || !isManualScroll) return;
    
    // 防抖处理
    if (this.data.scrollTimer) {
      clearTimeout(this.data.scrollTimer);
    }
    
    const scrollTimer = setTimeout(() => {
      let activeCategoryId = categories[0].id; // 默认第一个分类
      
      // 从后往前查找，找到第一个 scrollTop 大于等于分类位置的分类
      for (let i = categoryPositions.length - 1; i >= 0; i--) {
        if (scrollTop >= categoryPositions[i].top - 50) { // 提前50rpx切换
          activeCategoryId = categoryPositions[i].categoryId;
          break;
        }
      }
      
      // 更新激活的分类
      if (this.data.activeCategoryId !== activeCategoryId) {
        this.setData({ activeCategoryId });
      }
    }, 50);
    
    this.setData({ scrollTimer });
  },

  // 分类点击事件 - 直接跳转而不是滚动
  onCategoryTap: function(e) {
    const category = e.currentTarget.dataset.category;
    if (!category || !category.id) {
      console.error('分类数据错误:', category);
      return;
    }
    
    const { categoryPositions } = this.data;
    const position = categoryPositions.find(item => item.categoryId === category.id);
    
    if (position) {
      // 设置手动滚动标志为false，防止滚动事件触发分类切换
      this.setData({ 
        isManualScroll: false,
        activeCategoryId: category.id,
        dishesScrollTop: position.top
      });
      
      // 300ms后恢复手动滚动检测
      setTimeout(() => {
        this.setData({ isManualScroll: true });
      }, 300);
    } else {
      // 如果没有找到位置信息，直接切换分类
      this.setData({ 
        activeCategoryId: category.id,
        isManualScroll: true
      });
    }
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

  // 增加菜品数量 - 添加登录检查
  onIncreaseQuantity: function(e) {
    const dish = e.currentTarget.dataset.dish;
    
    // 检查登录状态
    if (this.data.isGuest) {
      this.showLoginTip('添加菜品');
      return;
    }
    
    const { cartItems } = this.data;
    const currentQuantity = cartItems[dish.id] || 0;
    
    if (currentQuantity >= dish.stock) {
      wx.showToast({
        title: '库存不足',
        icon: 'none'
      });
      return;
    }
    
    cartItems[dish.id] = currentQuantity + 1;
    this.updateCart(cartItems);
  },

  // 减少菜品数量 - 游客也可以减少（从购物车移除）
  onDecreaseQuantity: function(e) {
    const dish = e.currentTarget.dataset.dish;
    const { cartItems } = this.data;
    const currentQuantity = cartItems[dish.id] || 0;
    
    if (currentQuantity <= 0) return;
    
    if (currentQuantity === 1) {
      delete cartItems[dish.id];
    } else {
      cartItems[dish.id] = currentQuantity - 1;
    }
    this.updateCart(cartItems);
  },

  // 根据ID查找菜品
  findDishById: function(dishId) {
    const { categories } = this.data;
    const id = parseInt(dishId);
    for (let category of categories) {
      for (let dish of category.dishes) {
        if (parseInt(dish.id) === id) {
          return dish;
        }
      }
    }
    return null;
  },

  // 更新购物车状态
  updateCart: function(cartItems) {
    let totalQuantity = 0;
    let totalPrice = 0;
    
    // 计算总数量和总价格
    Object.keys(cartItems).forEach(dishId => {
      const quantity = cartItems[dishId];
      const dish = this.findDishById(dishId);
      if (dish) {
        totalQuantity += quantity;
        totalPrice += dish.price * quantity;
      }
    });

    // 格式化价格
    const formattedTotalPrice = totalPrice.toFixed(2);
    
    this.setData({
      cartItems: cartItems,
      totalQuantity: totalQuantity,
      totalPrice: totalPrice, // 保留原始数值，可能后续计算会用到
      formattedTotalPrice: formattedTotalPrice // 新增：存储格式化后的字符串
    });
  },

  // 去结算 - 修复登录检查
  onCheckout: function() {
    if (this.data.totalQuantity === 0) {
      wx.showToast({
        title: '请先选择菜品',
        icon: 'none'
      });
      return;
    }
    
    // 检查登录状态
    if (this.data.isGuest) {
      this.showLoginTip('下单结算');
      return;
    }
    
    const orderData = {
      restaurant: this.data.restaurant,
      cartItems: this.data.cartItems,
      totalPrice: this.data.totalPrice,
      totalQuantity: this.data.totalQuantity
    };
    
    wx.navigateTo({
      url: `/pages/checkout/checkout?data=${encodeURIComponent(JSON.stringify(orderData))}`
    });
  },

  // 返回上一页
  onBack: function() {
    wx.navigateBack();
  },

  // 页面准备好后初始化
  onReady: function() {
    this.setData({ isManualScroll: true });
  },
});