// pages/restaurant-detail/restaurant-detail.js
Page({
  data: {
    restaurantId: null,
    restaurant: null,
    categories: [],
    activeCategoryId: null,
    scrollToView: '',
    categoryScrollTop: 0,
    loading: true,
    cartItems: {}, // 购物车商品 {dishId: quantity}
    totalQuantity: 0,
    totalPrice: 0
    // 删除 bannerImages 相关代码
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

  // 加载餐厅详情
  loadRestaurantDetail: function (id) {
    const app = getApp();
    this.setData({ loading: true });
    
    // 获取餐厅详情（包含分类和菜品）
    wx.request({
      url: app.globalData.baseUrl + '/restaurant/' + id,
      method: 'GET',
      success: (res) => {
        console.log('餐厅详情响应:', res.data);
        if (res.data.code === 200) {
          const restaurant = res.data.data;
          const categories = restaurant.categories || [];
          // 调试：打印第一个分类的第一个菜品，检查数据结构
            if (categories.length > 0 && categories[0].dishes && categories[0].dishes.length > 0) {
                console.log('菜品数据结构:', categories[0].dishes[0]);
            }
          const activeCategoryId = categories.length > 0 ? categories[0].id : null;
          
          this.setData({
            restaurant: restaurant,
            categories: categories,
            activeCategoryId: activeCategoryId,
            loading: false
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

  // 分类点击事件
  onCategoryTap: function(e) {
    const category = e.currentTarget.dataset.category;
    this.setData({
      activeCategoryId: category.id,
      scrollToView: 'category-' + category.id
    });
  },

  // 菜品点击事件
  onDishTap: function(e) {
    const dish = e.currentTarget.dataset.dish;
    wx.showModal({
      title: dish.name,
      content: dish.description || '暂无描述',
      showCancel: false,
      confirmText: '知道了',
      confirmColor: '#ff6b35'
    });
  },

  
  // 增加菜品数量
  onIncreaseQuantity: function(e) {
    const dish = e.currentTarget.dataset.dish;
    const { cartItems } = this.data;
    const currentQuantity = cartItems[dish.id] || 0;
    
    if (currentQuantity >= dish.stock) {
      wx.showToast({
        title: '库存不足',
        icon: 'none'
      });
      return;
    }
    
    // 更新购物车
    cartItems[dish.id] = currentQuantity + 1;
    this.updateCart(cartItems);
  },

  // 减少菜品数量
  onDecreaseQuantity: function(e) {
    const dish = e.currentTarget.dataset.dish;
    const { cartItems } = this.data;
    const currentQuantity = cartItems[dish.id] || 0;
    
    if (currentQuantity <= 0) return;
    
    // 更新购物车
    if (currentQuantity === 1) {
      delete cartItems[dish.id];
    } else {
      cartItems[dish.id] = currentQuantity - 1;
    }
    this.updateCart(cartItems);
  },

  // 获取菜品数量
  getDishQuantity: function(dishId) {
    // 确保 dishId 是字符串，因为对象的键通常是字符串
    const key = dishId.toString();
    return this.data.cartItems[key] || 0;
  },
  // 根据ID查找菜品
findDishById: function(dishId) {
    const { categories } = this.data;
    // 将 dishId 转换为数字进行比较
    const id = parseInt(dishId);
    for (let category of categories) {
      for (let dish of category.dishes) {
        // 确保比较时类型一致
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
      const dish = this.findDishById(dishId); // 直接传递字符串
      if (dish) {
        totalQuantity += quantity;
        totalPrice += dish.price * quantity;
      }
    });
    
    this.setData({
      cartItems: cartItems,
      totalQuantity: totalQuantity,
      totalPrice: totalPrice
    });
  },
  // 去结算
  onCheckout: function() {
    if (this.data.totalQuantity === 0) {
      wx.showToast({
        title: '请先选择菜品',
        icon: 'none'
      });
      return;
    }
    
    // 检查登录状态
    const app = getApp();
    if (app.globalData.isGuest) {
      wx.showModal({
        title: '提示',
        content: '需要登录后才能下单',
        confirmText: '去登录',
        cancelText: '取消',
        confirmColor: '#ff6b35',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({
              url: '/pages/auth/auth'
            });
          }
        }
      });
      return;
    }
    
    // 跳转到结算页面
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
  }
});