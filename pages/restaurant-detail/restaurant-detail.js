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
      packingFee: 0,
      categoryPositions: [],
      scrollTimer: null, 
      dishesScrollTop: 0, 
      isManualScroll: false,
      isGuest: true,
      userInfo: null,
      showOrderPanel: false,
      orderItems: [],
      showCheckoutPanel: false,
      checkoutItems: [],
      saveCartTimer: null,
      lastCartState: null
    },
  
    onLoad: function (options) {
        this.checkLoginStatus();

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
        this.checkLoginStatus();
        if (!this.data.isGuest && this.data.restaurant) {
            this.uploadHistoryToServer(this.data.restaurant.id);
        }
    
        if (this.data.categories && this.data.categories.length > 0) {
            this.setData({ isManualScroll: true });
            setTimeout(() => {
                this.calculateCategoryPositions();
            }, 500);
        }
    },
    
    onUnload: function() {
      if (this.data.saveCartTimer) {
        clearTimeout(this.data.saveCartTimer);
      }
    },
    
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
    uploadHistoryToServer: function (restaurantId) {
        if (this.data.isGuest) {
            // 未登录不记录历史
            return;
        }
    
        const app = getApp();
        const userId = this.data.userInfo.id;
    
        wx.request({
            url: app.globalData.baseUrl + '/history/record',
            method: 'POST',
            header: {
                // 用表单方式传，配合后端 @RequestParam
                'content-type': 'application/x-www-form-urlencoded'
            },
            data: {
                userId: userId,
                restaurantId: restaurantId
            },
            success: (res) => {
                console.log('浏览历史已记录到服务器:', res.data);
            },
            fail: (err) => {
                console.error('记录浏览历史失败:', err);
            }
        });
    },
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
              
              categories.forEach(category => {
                if (category.dishes && category.dishes.length > 0) {
                  category.dishes.forEach(dish => {
                    dish.formattedPrice = Number(dish.price).toFixed(2);
                  });
                }
              });
              
              const activeCategoryId = categories.length > 0 ? categories[0].id : null;
              
              this.setData({
                restaurant: restaurant,
                categories: categories,
                activeCategoryId: activeCategoryId,
                loading: false
              }, () => {
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
            this.loadMockData(id);
          }
        });
    },
      checkFavoriteStatus: function(restaurantId) {
        const app = getApp();
        if (this.data.isGuest) {
            this.setData({ isFavorite: false });
            return;
        }
    
        const userId = this.data.userInfo.id;
    
        wx.request({
            url: app.globalData.baseUrl + `/favorite/check`,
            method: 'GET',
            data: {
                userId: userId,
                restaurantId: restaurantId
            },
            success: (res) => {
                if (res.data.code === 200) {
                    this.setData({
                        isFavorite: res.data.data === true
                    });
                }
            }
        });
    },
    toggleFavorite: function() {
        if (this.data.isGuest) {
            this.showLoginTip('收藏餐厅');
            return;
        }
    
        const app = getApp();
        const userId = this.data.userInfo.id;
        const restaurantId = this.data.restaurantId;
    
        const isCurrentlyFav = this.data.isFavorite;
    
        wx.request({
            url: app.globalData.baseUrl + (isCurrentlyFav ? '/favorite/remove' : '/favorite/add'),
            method: 'POST',
            header: {
                "content-type": "application/json"
            },
            data: {
                userId: userId,
                restaurantId: restaurantId
            },
            success: (res) => {
                if (res.data.code === 200) {
                    this.setData({
                        isFavorite: !isCurrentlyFav
                    });
    
                    wx.showToast({
                        title: isCurrentlyFav ? '已取消收藏' : '收藏成功',
                        icon: 'success'
                    });
                } else {
                    wx.showToast({
                        title: res.data.message || '操作失败',
                        icon: 'none'
                    });
                }
            }
        });
    },
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
        
        const scrollViewRect = res[0];
        const categoryPositions = [];
        
        for (let i = 1; i < res.length; i++) {
          const categoryRect = res[i];
          if (categoryRect) {
            categoryPositions.push({
              categoryId: categories[i-1].id,
              top: categoryRect.top - scrollViewRect.top
            });
          }
        }
        
        this.setData({ categoryPositions });
        console.log('分类位置信息:', categoryPositions);
      });
    },
  
    onDishesScroll: function(e) {
      const scrollTop = e.detail.scrollTop;
      const { categoryPositions, categories, isManualScroll } = this.data;
      
      if (!categoryPositions || categoryPositions.length === 0 || !isManualScroll) return;
      
      if (this.data.scrollTimer) {
        clearTimeout(this.data.scrollTimer);
      }
      
      const scrollTimer = setTimeout(() => {
        let activeCategoryId = categories[0].id;
        
        for (let i = categoryPositions.length - 1; i >= 0; i--) {
          if (scrollTop >= categoryPositions[i].top - 50) {
            activeCategoryId = categoryPositions[i].categoryId;
            break;
          }
        }
        
        if (this.data.activeCategoryId !== activeCategoryId) {
          this.setData({ activeCategoryId });
        }
      }, 50);
      
      this.setData({ scrollTimer });
    },
  
    onCategoryTap: function(e) {
      const category = e.currentTarget.dataset.category;
      if (!category || !category.id) {
        console.error('分类数据错误:', category);
        return;
      }
      
      const { categoryPositions } = this.data;
      const position = categoryPositions.find(item => item.categoryId === category.id);
      
      if (position) {
        this.setData({ 
          isManualScroll: false,
          activeCategoryId: category.id,
          dishesScrollTop: position.top
        });
        
        setTimeout(() => {
          this.setData({ isManualScroll: true });
        }, 300);
      } else {
        this.setData({ 
          activeCategoryId: category.id,
          isManualScroll: true
        });
      }
    },
  
    getStatusText: function(status) {
      const statusMap = {
        1: '营业中',
        2: '休息中',
        3: '已打烊'
      };
      return statusMap[status] || '未知状态';
    },
  
    getStatusClass: function(status) {
      const classMap = {
        1: 'status-open',
        2: 'status-break',
        3: 'status-closed'
      };
      return classMap[status] || 'status-closed';
    },
  
    onIncreaseQuantity: function(e) {
      const dish = e.currentTarget.dataset.dish;
      
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
  
    onCartBarTap: function() {
      if (this.data.totalQuantity === 0) {
        wx.showToast({
          title: '请先选择商品',
          icon: 'none'
        });
        return;
      }
      
      if (this.data.showOrderPanel) {
        this.hideOrderPanel();
      } else {
        this.showOrderPanel();
      }
    },
    
    showOrderPanel: function() {
      const orderItems = this.generateOrderItems();
      this.setData({
        showOrderPanel: true,
        orderItems: orderItems
      });
    },
    
    hideOrderPanel: function() {
      this.setData({
        showOrderPanel: false
      });
    },
    
    stopPropagation: function() {
      return;
    },
    
    generateOrderItems: function() {
        const { cartItems } = this.data;
        const orderItems = [];
    
        Object.keys(cartItems).forEach(dishId => {
            const quantity = cartItems[dishId];
            const dish = this.findDishById(dishId);
    
            if (dish && quantity > 0) {
                orderItems.push({
                    id: dish.id,
                    name: dish.name,
                    price: dish.price,
                    formattedPrice: Number(dish.price).toFixed(2),
                    imageUrl: dish.imageUrl,
                    stock: dish.stock,
                    quantity: quantity,
                    subtotal: (dish.price * quantity).toFixed(2)
                });
            }
        });
    
        return orderItems;
    },
    
    generateCheckoutItems: function() {
        const { cartItems } = this.data;
        const checkoutItems = [];
    
        Object.keys(cartItems).forEach(dishId => {
            const quantity = cartItems[dishId];
            const dish = this.findDishById(dishId);
    
            if (dish && quantity > 0) {
                checkoutItems.push({
                    id: dish.id,
                    name: dish.name,
                    price: dish.price,
                    formattedPrice: Number(dish.price).toFixed(2),
                    imageUrl: dish.imageUrl,
                    quantity: quantity,
                    subtotal: (dish.price * quantity).toFixed(2)
                });
            }
        });
    
        return checkoutItems;
    },
    
    onOrderIncreaseQuantity: function(e) {
      const dish = e.currentTarget.dataset.dish;
      
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
      
      const orderItems = this.generateOrderItems();
      this.setData({
        orderItems: orderItems
      });
    },
    
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
        
        const orderItems = this.generateOrderItems();
        this.setData({
          orderItems: orderItems
        });
        
        if (this.data.totalQuantity === 0) {
          this.hideOrderPanel();
        }
      },
    
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
  
    updateCart: function(cartItems) {
      console.log('更新购物车状态:', cartItems);
      
      let totalQuantity = 0;
      let totalPrice = 0;
      
      Object.keys(cartItems).forEach(dishId => {
        const quantity = cartItems[dishId];
        const dish = this.findDishById(dishId);
        if (dish && quantity > 0) {
          totalQuantity += quantity;
          totalPrice += dish.price * quantity;
          console.log(`菜品 ${dish.name}: 数量 ${quantity}, 单价 ${dish.price}, 小计 ${dish.price * quantity}`);
        }
      });
      
      const restaurant = this.data.restaurant;
      const deliveryFee = restaurant ? (restaurant.deliveryFee || 0) : 0;
      const packingFee = restaurant ? (restaurant.packingFee || 0) : 0;
      
      const totalAmountWithFees = totalPrice + deliveryFee + packingFee;
      
      const formattedTotalPrice = totalAmountWithFees.toFixed(2);
      const formattedSubTotal = totalPrice.toFixed(2);
      
      this.setData({
        cartItems: cartItems,
        totalQuantity: totalQuantity,
        totalPrice: totalAmountWithFees,
        subTotal: totalPrice,
        deliveryFee: deliveryFee,
        packingFee: packingFee,
        formattedTotalPrice: formattedTotalPrice,
        formattedSubTotal: formattedSubTotal
      });
      
      console.log('购物车更新完成:', {
        totalQuantity: totalQuantity,
        totalPrice: totalAmountWithFees,
        subTotal: totalPrice
      });
      
      if (this.data.saveCartTimer) {
        clearTimeout(this.data.saveCartTimer);
      }
      
      this.data.saveCartTimer = setTimeout(() => {
        const currentCartState = JSON.stringify(cartItems);
        if (currentCartState !== this.data.lastCartState) {
          console.log('购物车状态变化，保存到服务器');
          this.saveCartToServer(cartItems);
          this.setData({
            lastCartState: currentCartState
          });
        } else {
          console.log('购物车状态未变化，跳过保存');
        }
      }, 500);
    },

    saveCartToServer(cartItems) {
        if (this.data.isGuest) return;
    
        const app = getApp();
        const userId = this.data.userInfo.id;
        const restaurantId = this.data.restaurantId;
    
        const cartList = [];
    
        Object.keys(cartItems).forEach(dishId => {
            const quantity = cartItems[dishId];
            const dish = this.findDishById(dishId);
    
            if (!dish || quantity <= 0) return;
    
            cartList.push({
                userId,
                restaurantId,
                dishId: Number(dishId),
                quantity: quantity,
                price: dish.price
            });
        });
    
        wx.request({
            url: app.globalData.baseUrl + "/cart/save",
            method: "POST",
            header: {
                "content-type": "application/json"
            },
            data: cartList,
            success: res => {
                console.log("覆盖式保存购物车成功:", res.data);
            },
            fail: err => {
                console.error("保存购物车失败:", err);
            }
        });
    },
    
    
    onCheckout: function() {
        if (this.data.totalQuantity === 0) {
            wx.showToast({
                title: '请先选择菜品',
                icon: 'none'
            });
            return;
        }
        
        if (this.data.isGuest) {
            this.showLoginTip('下单结算');
            return;
        }
        
        this.showCheckoutPanel();
    },
    
    showCheckoutPanel: function() {
        const checkoutItems = this.generateCheckoutItems();
        this.setData({
            showCheckoutPanel: true,
            checkoutItems: checkoutItems
        });
    },
    
    hideCheckoutPanel: function() {
        this.setData({
            showCheckoutPanel: false
        });
    },
    
    generateCheckoutItems: function() {
      const { cartItems } = this.data;
      const checkoutItems = [];

      Object.keys(cartItems).forEach(dishId => {
          const quantity = cartItems[dishId];
          const dish = this.findDishById(dishId);

          if (dish && quantity > 0) {
              checkoutItems.push({
                  id: dish.id,
                  name: dish.name,
                  price: dish.price,
                  imageUrl: dish.imageUrl,
                  quantity: quantity,
                  subtotal: (dish.price * quantity).toFixed(2)
              });
          }
      });

      return checkoutItems;
    },
    
    onSubmitOrder: function() {
      if (this.data.totalQuantity === 0) {
          wx.showToast({
              title: '请先选择菜品',
              icon: 'none'
          });
          return;
      }
      
      if (this.data.isGuest) {
          this.showLoginTip('下单结算');
          return;
      }
      
      if (this.data.restaurant.businessStatus !== 1) {
          wx.showToast({
              title: '餐厅当前不在营业中',
              icon: 'none'
          });
          return;
      }
      
      const orderData = this.prepareOrderData();
      this.createOrderAndShowPayment(orderData);
    },
    
    prepareOrderData: function() {
      const app = getApp();
      const orderItems = this.generateOrderItemsForSubmit();
      
      return {
          order: {
              userId: this.data.userInfo.id,
              restaurantId: this.data.restaurantId,
              totalAmount: this.data.totalPrice,
              packingFee: this.data.packingFee,
              deliveryFee: this.data.deliveryFee
          },
          items: orderItems,
          restaurant: this.data.restaurant,
          orderItems: orderItems,
          subTotal: this.data.subTotal,
          deliveryFee: this.data.deliveryFee,
          packingFee: this.data.packingFee,
          totalAmount: this.data.totalPrice
      };
    },
    
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
                    dishImageUrl: dish.imageUrl,
                    quantity: quantity,
                    subtotal: dish.price * quantity
                });
            }
        });
        
        return orderItems;
    },
    
    createOrderAndShowPayment: function(orderData) {
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
                    
                    this.clearCartAfterOrder();
                    
                    // 显示支付确认弹窗
                    wx.showModal({
                        title: '确认支付',
                        content: `是否立即支付订单？订单金额：¥${order.totalAmount}`,
                        confirmText: '确认支付',
                        cancelText: '取消支付',
                        confirmColor: '#ff6b35',
                        success: (modalRes) => {
                            if (modalRes.confirm) {
                                // 确认支付
                                this.payOrder(order.id);
                            } else {
                                // 取消支付，跳转到订单详情
                                console.log('用户选择稍后支付，跳转到订单详情，订单ID:', order.id);
                                this.navigateToOrderDetail(order.id);
                            }
                        }
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

    // 新增跳转到订单详情的专用方法
    navigateToOrderDetail: function(orderId) {
        if (!orderId) {
            console.error('订单ID为空，无法跳转');
            wx.showToast({
                title: '订单信息错误',
                icon: 'none'
            });
            return;
        }
        
        console.log('准备跳转到订单详情，订单ID:', orderId);
        
        // 如果订单详情是普通页面
        wx.navigateTo({
            url: `/pages/order-detail/order-detail?orderId=${orderId}`,
            success: () => {
                console.log('跳转到订单详情成功');
            },
            fail: (err) => {
                console.error('跳转到订单详情失败:', err);
                // 如果 navigateTo 失败，尝试 redirectTo
                wx.redirectTo({
                    url: `/pages/order-detail/order-detail?orderId=${orderId}`,
                    fail: (redirectErr) => {
                        console.error('redirectTo 也失败:', redirectErr);
                        wx.showToast({
                            title: '页面跳转失败',
                            icon: 'none'
                        });
                    }
                });
            }
        });
    },
        
payOrder: function(orderId) {
    const app = getApp();
    
    wx.showLoading({
        title: '支付中...',
        mask: true
    });

    wx.request({
        url: app.globalData.baseUrl + `/order/pay/${orderId}`,
        method: 'POST',
        success: (res) => {
            wx.hideLoading();
            console.log('支付响应:', res.data);

            if (res.data.code === 200) {
                wx.showToast({
                    title: '支付成功',
                    icon: 'success',
                    duration: 2000,
                    success: () => {
                        // 支付成功，延迟跳转让用户看到成功提示
                        setTimeout(() => {
                            this.navigateToOrderDetail(orderId);
                        }, 2000);
                    }
                });
            } else {
                wx.showToast({
                    title: '支付失败: ' + (res.data.message || '未知错误'),
                    icon: 'none',
                    duration: 3000,
                    success: () => {
                        // 支付失败也要跳转到订单详情
                        setTimeout(() => {
                            this.navigateToOrderDetail(orderId);
                        }, 3000);
                    }
                });
            }
        },
        fail: (err) => {
            wx.hideLoading();
            console.error('支付请求失败:', err);
            wx.showToast({
                title: '网络错误，请重试',
                icon: 'none',
                duration: 3000,
                success: () => {
                    // 网络错误也要跳转到订单详情
                    setTimeout(() => {
                        this.navigateToOrderDetail(orderId);
                    }, 3000);
                }
            });
        }
    });
},
    
    clearCartAfterOrder: function() {
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
        
        this.clearServerCart();
        
        console.log('创建订单成功，购物车已清空');
    },
    
    clearCart: function() {
        this.setData({
          cartItems: {},
          totalQuantity: 0,
          totalPrice: 0,
          subTotal: 0,
          checkoutItems: [],
          orderItems: []
        });
        
        this.clearServerCart();
      },
      
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
            this.updateCart(cartMap);
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
    
    onBack: function() {
      wx.navigateBack();
    },
    
    onReady: function() {
      this.setData({ isManualScroll: true });
    },
});