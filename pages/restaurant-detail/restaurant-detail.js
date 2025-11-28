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
      subTotal: 0,
      deliveryFee: 0,
      categoryPositions: [],
      scrollTimer: null, 
      dishesScrollTop: 0, 
      isManualScroll: false,
      isGuest: true,
      userInfo: null,
      showOrderPanel: false, // 新增：购物车面板显示状态
      orderItems: [], // 新增：购物车商品列表
      showCheckoutPanel: false, // 结算面板显示状态
      checkoutItems: [], // 结算商品列表
      saveCartTimer: null,
      lastCartState: null
    },
  
    onLoad: function (options) {
      const { id } = options;
      
      if (id) {
        this.setData({ restaurantId: id });
        this.loadRestaurantDetail(id);
        
        // 加载用户购物车数据
        setTimeout(() => {
          this.loadUserCart();
        }, 500);
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
    onUnload: function() {
      // 清除防抖定时器
      if (this.data.saveCartTimer) {
        clearTimeout(this.data.saveCartTimer);
      }
      
      // 强制保存当前购物车状态
      if (!this.data.isGuest && Object.keys(this.data.cartItems).length > 0) {
        this.saveCartToServer(this.data.cartItems);
      }
    },
    
    onHide: function() {
      // 页面隐藏时也保存购物车
      if (!this.data.isGuest && Object.keys(this.data.cartItems).length > 0) {
        this.saveCartToServer(this.data.cartItems);
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
  
    // 点击购物车底部栏
  onCartBarTap: function() {
      if (this.data.totalQuantity === 0) {
        wx.showToast({
          title: '请先选择商品',
          icon: 'none'
        });
        return;
      }
      
      // 如果购物车面板已经显示，则隐藏；否则显示
      if (this.data.showOrderPanel) {
        this.hideOrderPanel();
      } else {
        this.showOrderPanel();
      }
    },
    
    // 显示购物车面板
    showOrderPanel: function() {
      // 生成订单商品列表
      const orderItems = this.generateOrderItems();
      this.setData({
        showOrderPanel: true,
        orderItems: orderItems
      });
    },
    
    // 隐藏订单面板
    hideOrderPanel: function() {
      this.setData({
        showOrderPanel: false
      });
    },
    
    // 阻止事件冒泡
    stopPropagation: function() {
      return;
    },
    
    // 生成购物车商品列表
    generateOrderItems: function() {
      const { cartItems, categories } = this.data;
      const orderItems = [];
      
      // 遍历购物车中的商品
      Object.keys(cartItems).forEach(dishId => {
        const quantity = cartItems[dishId];
        const dish = this.findDishById(dishId);
        
        if (dish && quantity > 0) {
          orderItems.push({
            id: dish.id,
            name: dish.name,
            price: dish.price,
            imageUrl: dish.imageUrl,
            stock: dish.stock,
            quantity: quantity
          });
        }
      });
      
      return orderItems;
    },
    
    // 购物车面板中增加数量
    onOrderIncreaseQuantity: function(e) {
      const dish = e.currentTarget.dataset.dish;
      
      // 检查登录状态
      if (this.data.isGuest) {
        this.hideOrderPanel();
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
      
      // 更新订单面板显示
      const orderItems = this.generateOrderItems();
      this.setData({
        orderItems: orderItems
      });
    },
    
    // 购物车面板中减少数量
    onOrderDecreaseQuantity: function(e) {
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
      
      // 更新购物车面板显示
      const orderItems = this.generateOrderItems();
      this.setData({
        orderItems: orderItems
      });
      
      // 如果购物车为空，关闭订单面板
      if (this.data.totalQuantity === 0) {
        this.hideOrderPanel();
      }
    },
    
    // 清空购物车
    clearCart: function() {
      wx.showModal({
        title: '提示',
        content: '确定要清空购物车吗？',
        confirmColor: '#ff6b35',
        success: (res) => {
          if (res.confirm) {
            this.setData({
              cartItems: {},
              totalQuantity: 0,
              totalPrice: 0,
              subTotal: 0,
              orderItems: []
            });
            this.hideOrderPanel();
            wx.showToast({
              title: '已清空',
              icon: 'success'
            });
          }
        }
      });
    },
  
  // 更新购物车状态
  updateCart: function(cartItems) {
    let totalQuantity = 0;
    let totalPrice = 0;
    
    // 计算总数量和总价格（不含配送费）
    Object.keys(cartItems).forEach(dishId => {
      const quantity = cartItems[dishId];
      const dish = this.findDishById(dishId);
      if (dish) {
        totalQuantity += quantity;
        totalPrice += dish.price * quantity;
      }
    });
    
    // 获取配送费
    const deliveryFee = this.data.restaurant ? (this.data.restaurant.deliveryFee || 0) : 0;
    
    // 计算含配送费的总金额
    const totalAmountWithDelivery = totalPrice + deliveryFee;
    
    // 格式化价格
    const formattedTotalPrice = totalAmountWithDelivery.toFixed(2);
    const formattedSubTotal = totalPrice.toFixed(2); // 菜品小计
    
    this.setData({
      cartItems: cartItems,
      totalQuantity: totalQuantity,
      totalPrice: totalAmountWithDelivery, // 总金额包含配送费
      subTotal: totalPrice, // 新增：菜品小计（不含配送费）
      deliveryFee: deliveryFee, // 新增：配送费
      formattedTotalPrice: formattedTotalPrice,
      formattedSubTotal: formattedSubTotal // 新增：格式化的小计
    });
    
    // 防抖保存到服务器，避免频繁请求
    if (this.data.saveCartTimer) {
      clearTimeout(this.data.saveCartTimer);
    }
    
    this.data.saveCartTimer = setTimeout(() => {
      // 检查购物车状态是否发生变化
      const currentCartState = JSON.stringify(cartItems);
      if (currentCartState !== this.data.lastCartState) {
        this.saveCartToServer(cartItems);
        this.setData({
          lastCartState: currentCartState
        });
      }
    }, 500); // 500ms防抖
  },
  // 添加重试机制
  saveCartToServer: function(cartItems, retryCount = 0) {
    if (this.data.isGuest) {
      console.log('游客模式，不保存购物车');
      return;
    }
  
    const app = getApp();
    const userId = this.data.userInfo.id;
    const restaurantId = this.data.restaurantId;
  
    // 批量更新购物车
    const updates = Object.keys(cartItems).map(dishId => {
      const quantity = cartItems[dishId];
      if (quantity > 0) {
        return this.updateCartItemOnServer(userId, restaurantId, dishId, quantity)
          .catch(error => {
            console.error(`更新商品${dishId}失败:`, error);
            // 失败时重试添加
            return this.addCartItemToServer(userId, restaurantId, dishId, quantity);
          });
      } else {
        return this.removeCartItemFromServer(userId, restaurantId, dishId)
          .catch(error => {
            console.error(`移除商品${dishId}失败:`, error);
            // 移除失败也继续
            return Promise.resolve();
          });
      }
    });
  
    // 并行执行所有更新
    Promise.all(updates).then(results => {
      console.log('购物车保存完成', results);
    }).catch(error => {
      console.error('保存购物车失败:', error);
      // 重试机制
      if (retryCount < 3) {
        console.log(`第${retryCount + 1}次重试保存购物车`);
        setTimeout(() => {
          this.saveCartToServer(cartItems, retryCount + 1);
        }, 1000 * (retryCount + 1));
      }
    });
  },
  
  // 修改去结算按钮的点击事件
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
      
      // 显示结算面板
      this.showCheckoutPanel();
  },
  
  // 显示结算面板
  showCheckoutPanel: function() {
      // 生成结算商品列表
      const checkoutItems = this.generateCheckoutItems();
      this.setData({
          showCheckoutPanel: true,
          checkoutItems: checkoutItems
      });
  },
  
  // 隐藏结算面板
  hideCheckoutPanel: function() {
      this.setData({
          showCheckoutPanel: false
      });
  },
  
  // 生成结算商品列表
  generateCheckoutItems: function() {
      const { cartItems, categories } = this.data;
      const checkoutItems = [];
      
      // 遍历购物车中的商品
      Object.keys(cartItems).forEach(dishId => {
          const quantity = cartItems[dishId];
          const dish = this.findDishById(dishId);
          
          if (dish && quantity > 0) {
              checkoutItems.push({
                  id: dish.id,
                  name: dish.name,
                  price: dish.price,
                  imageUrl: dish.imageUrl,
                  quantity: quantity
              });
          }
      });
      
      return checkoutItems;
  },
  // 提交订单
  onSubmitOrder: function() {
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
      
      // 检查餐厅营业状态
      if (this.data.restaurant.businessStatus !== 1) {
          wx.showToast({
              title: '餐厅当前不在营业中',
              icon: 'none'
          });
          return;
      }
      
      // 创建订单数据
      const orderData = this.prepareOrderData();
      
      // 调用创建订单接口
      this.createOrder(orderData);
  },
  // 准备订单数据
  prepareOrderData: function() {
      const app = getApp();
      const orderItems = this.generateOrderItemsForSubmit();
      
      return {
          order: {
              userId: this.data.userInfo.id,
              restaurantId: this.data.restaurantId,
              totalAmount: this.data.totalPrice
          },
          items: orderItems,
          restaurant: this.data.restaurant,
          orderItems: orderItems,
          subTotal: this.data.subTotal,
          deliveryFee: this.data.deliveryFee,
          totalAmount: this.data.totalPrice
      };
  },
  
  // 生成提交订单的订单项数据
  generateOrderItemsForSubmit: function() {
      const { cartItems } = this.data;
      const orderItems = [];
      
      Object.keys(cartItems).forEach(dishId => {
          const quantity = cartItems[dishId];
          const dish = this.findDishById(dishId);
          
          if (dish && quantity > 0) {
              orderItems.push({
                  dishId: dish.id,
                  dishName: dish.name,
                  dishPrice: dish.price,
                  dishImageUrl: dish.imageUrl, // 添加图片URL
                  quantity: quantity,
                  subtotal: dish.price * quantity
              });
          }
      });
      
      return orderItems;
  },
  
  
  // 创建订单
createOrder: function(orderData) {
    const app = getApp();
    
    wx.showLoading({
        title: '创建订单中...',
        mask: true
    });
    
    wx.request({
        url: app.globalData.baseUrl + '/order/create',
        method: 'POST',
        header: {
            'content-type': 'application/json'
        },
        data: orderData,
        success: (res) => {
            wx.hideLoading();
            console.log('创建订单响应:', res.data);
            
            if (res.data.code === 200) {
                const order = res.data.data;
                
                // 创建订单成功后清空购物车
                this.clearCartAfterOrder();
                
                // 确保订单有创建时间
                if (!order.createdTime) {
                    order.createdTime = new Date();
                }
                
                // 跳转到支付页面，传递订单数据
                wx.navigateTo({
                    url: `/pages/payment/payment?data=${JSON.stringify({
                      orderId: order.id,
                      order: order,
                      restaurant: this.data.restaurant,
                      orderItems: orderData.orderItems,
                      subTotal: orderData.subTotal,
                      deliveryFee: orderData.deliveryFee,
                      totalAmount: orderData.totalAmount
                    })}`
                });
            } else {
                wx.showToast({
                    title: '创建订单失败: ' + (res.data.message || '未知错误'),
                    icon: 'none',
                    duration: 3000
                });
            }
        },
        fail: (err) => {
            wx.hideLoading();
            console.error('创建订单请求失败:', err);
            wx.showToast({
                title: '网络错误，请重试',
                icon: 'none'
            });
        }
    });
},
  
  // 创建订单后清空购物车
  clearCartAfterOrder: function() {
      // 清空本地购物车数据
      this.setData({
          cartItems: {},
          totalQuantity: 0,
          totalPrice: 0,
          subTotal: 0,
          checkoutItems: [],
          orderItems: [],
          showCheckoutPanel: false,
          showOrderPanel: false
      });
      
      // 清空服务器购物车
      this.clearServerCart();
      
      console.log('创建订单成功，购物车已清空');
  },
  
  // 清空购物车
  clearCart: function() {
      this.setData({
        cartItems: {},
        totalQuantity: 0,
        totalPrice: 0,
        subTotal: 0,
        checkoutItems: [],
        orderItems: []
      });
      
      // 清空服务器购物车
      this.clearServerCart();
    },
  // 加载用户购物车数据
  loadUserCart: function() {
    if (this.data.isGuest) {
      console.log('游客模式，不加载购物车');
      return;
    }
  
    const app = getApp();
    const userId = this.data.userInfo.id;
    const restaurantId = this.data.restaurantId;
  
    wx.request({
      url: app.globalData.baseUrl + `/cart/map/user/${userId}/restaurant/${restaurantId}`,
      method: 'GET',
      success: (res) => {
        console.log('加载购物车响应:', res.data);
        if (res.data.code === 200) {
          const cartMap = res.data.data || {};
          this.setData({
            cartItems: cartMap
          });
          this.updateCart(cartMap); // 更新购物车状态
          console.log('购物车数据加载成功:', cartMap);
        } else {
          console.error('加载购物车失败:', res.data.message);
        }
      },
      fail: (err) => {
        console.error('请求购物车数据失败:', err);
      }
    });
  },
  
  // 保存购物车到服务器
  saveCartToServer: function(cartItems) {
    if (this.data.isGuest) {
      console.log('游客模式，不保存购物车');
      return;
    }
  
    const app = getApp();
    const userId = this.data.userInfo.id;
    const restaurantId = this.data.restaurantId;
  
    // 批量更新购物车
    const updates = Object.keys(cartItems).map(dishId => {
      const quantity = cartItems[dishId];
      if (quantity > 0) {
        // 先检查本地购物车中是否已有该商品，如果有则更新，否则添加
        if (this.data.cartItems[dishId]) {
          return this.updateCartItemOnServer(userId, restaurantId, dishId, quantity);
        } else {
          return this.addCartItemToServer(userId, restaurantId, dishId, quantity);
        }
      } else {
        return this.removeCartItemFromServer(userId, restaurantId, dishId);
      }
    });
  
    // 并行执行所有更新
    Promise.all(updates).then(results => {
      console.log('购物车保存完成', results);
    }).catch(error => {
      console.error('保存购物车失败:', error);
    });
  },
  
  // 添加商品到购物车（服务器）
  addCartItemToServer: function(userId, restaurantId, dishId, quantity) {
    return new Promise((resolve, reject) => {
      const app = getApp();
      
      wx.request({
        url: app.globalData.baseUrl + '/cart/add',
        method: 'POST',
        header: {
          'content-type': 'application/json'
        },
        data: {
          userId: userId,
          restaurantId: restaurantId,
          dishId: dishId,
          quantity: quantity
        },
        success: (res) => {
          console.log('添加购物车响应:', res.data);
          if (res.data.code === 200) {
            resolve(res.data);
          } else {
            reject(res.data.message);
          }
        },
        fail: (err) => {
          reject(err);
        }
      });
    });
  },
  
  // 更新单个购物车商品到服务器
  updateCartItemOnServer: function(userId, restaurantId, dishId, quantity) {
    return new Promise((resolve, reject) => {
      const app = getApp();
      
      wx.request({
        url: app.globalData.baseUrl + '/cart/update',
        method: 'POST',
        header: {
          'content-type': 'application/json'
        },
        data: {
          userId: userId,
          restaurantId: restaurantId,
          dishId: dishId,
          quantity: quantity
        },
        success: (res) => {
          console.log('更新购物车响应:', res.data);
          if (res.data.code === 200) {
            resolve(res.data);
          } else {
            // 如果更新失败，尝试添加
            if (res.data.message && res.data.message.includes('不存在')) {
              console.log('商品不存在，尝试添加');
              this.addCartItemToServer(userId, restaurantId, dishId, quantity)
                .then(resolve)
                .catch(reject);
            } else {
              reject(res.data.message);
            }
          }
        },
        fail: (err) => {
          reject(err);
        }
      });
    });
  },
  
  // 从服务器移除购物车商品
  removeCartItemFromServer: function(userId, restaurantId, dishId) {
    return new Promise((resolve, reject) => {
      const app = getApp();
      
      wx.request({
        url: app.globalData.baseUrl + '/cart/remove',
        method: 'POST',
        header: {
          'content-type': 'application/json'
        },
        data: {
          userId: userId,
          restaurantId: restaurantId,
          dishId: dishId
        },
        success: (res) => {
          console.log('移除购物车响应:', res.data);
          if (res.data.code === 200) {
            resolve(res.data);
          } else {
            // 如果商品不存在，也认为是成功移除
            if (res.data.message && res.data.message.includes('不存在')) {
              console.log('商品不存在，移除成功');
              resolve({ code: 200, message: '移除成功' });
            } else {
              reject(res.data.message);
            }
          }
        },
        fail: (err) => {
          reject(err);
        }
      });
    });
  },
  
  // 清空服务器购物车
  clearServerCart: function() {
    if (this.data.isGuest) {
      return;
    }
  
    const app = getApp();
    const userId = this.data.userInfo.id;
    const restaurantId = this.data.restaurantId;
  
    wx.request({
      url: app.globalData.baseUrl + '/cart/clear',
      method: 'POST',
      header: {
        'content-type': 'application/json'
      },
      data: {
        userId: userId,
        restaurantId: restaurantId
      },
      success: (res) => {
        console.log('清空服务器购物车响应:', res.data);
      },
      fail: (err) => {
        console.error('清空服务器购物车失败:', err);
      }
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