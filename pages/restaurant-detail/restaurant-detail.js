// pages/restaurant-detail/restaurant-detail.js
Page({
    data: {

      restaurantId: null,
      restaurant: null,
      categories: [],
      activeCategoryId: null,
      loading: true,
      swiperIndex: 0,
      statusText: "",
      statusClass: "",
        
      cartItems: {},
      totalQuantity: 0,
      totalPrice: 0,
      subTotal: 0,
      packingFee: 0,
  
      isGuest: true,
      userInfo: null,
  
      showOrderPanel: false,
      orderItems: [],
      showCheckoutPanel: false,
      checkoutItems: [],
  
      saveCartTimer: null,
      lastCartState: null,
  
      activeTab: 'menu',
      scrollIntoViewId: '', 
      isFavorite: false,
      activeCategoryId: null,
      activeTab: 'menu',
      scrollLocked: false,
      categoryPositions: [],

      ratingTags: ["味道赞", "包装很好", "配送快", "分量足"],
      ratingSort: "latest",   // 当前排序方式
      isLatest: false,
      avgShopRating: 0,
      avgTaste: 0,
      avgPack: 0,
      ratingList: [],
      originalRatingList: [],

      eatType: 2,
    },
    
    onLoad(options) {
      this.checkLoginStatus();
  
      const { id } = options;
  
      if (id) {
        this.setData({ restaurantId: id });
        this.loadRestaurantDetail(id);
        this.loadRatings(id);
        this.setData({
            originalRatingList: [...this.data.ratingList]
          });
          this.calculateRatings();
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
  
    onShow() {
        this.checkLoginStatus();
        if (this.data.restaurantId && !this.data.isGuest) {
          this.loadUserCart();
        }
      },
  
    onUnload() {
      if (this.data.saveCartTimer) {
        clearTimeout(this.data.saveCartTimer);
      }
    },
  
    switchTab(e) {
      const tab = e.currentTarget.dataset.tab;
      this.setData({ activeTab: tab });
    },
  
    checkLoginStatus() {
      const app = getApp();
      const userInfo = app.globalData.userInfo;
  
      if (userInfo) {
        this.setData({
          userInfo,
          isGuest: false
        });
      } else {
        this.setData({
          userInfo: null,
          isGuest: true
        });
      }
    },
  
    showLoginTip(action = '此功能') {
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
  
    uploadHistoryToServer(restaurantId) {
        if (this.data.isGuest) return;
      
        const app = getApp();
        const userId = this.data.userInfo.id;
      
        wx.request({
          url: app.globalData.baseUrl + '/history/record',
          method: 'POST',
          header: {
            'content-type': 'application/json'
          },
          data: {
            userId: Number(userId),
            restaurantId: Number(restaurantId)
          },
          success(res) {
            console.log("历史记录上传成功:", res.data);
          },
          fail(err) {
            console.error("历史记录上传失败:", err);
          }
        });
      },

    onPageScroll(e) {
        if (this.data.scrollLocked) return;
    
        const scrollTop = e.detail.scrollTop;
        this.setData({ scrollTop });
    
        for (let i = 0; i < this.categoryPositions.length; i++) {
          const start = this.categoryPositions[i];
          const end = this.categoryPositions[i + 1] ?? Infinity;
    
          if (scrollTop >= start && scrollTop < end) {
            const id = this.data.categories[i].id;
            if (id !== this.data.activeCategoryId) {
              this.setData({ activeCategoryId: id });
            }
            break;
          }
        }
      },
      loadRestaurantDetail(id) {
        const app = getApp();
        this.setData({ loading: true });
      
        wx.request({
          url: app.globalData.baseUrl + '/restaurant/' + id,
          method: 'GET',
          success: (res) => {
            if (res.data.code === 200) {
              const restaurant = res.data.data;
              const categories = restaurant.categories || [];
              if (restaurant.avgRating !== null && restaurant.avgRating !== undefined) {
                restaurant.avgRating = Number(restaurant.avgRating).toFixed(1);
              }
              /* ----------- ⭐ 自动计算营业状态（去掉剩余时间） ----------- */
              restaurant.packingFee = Number(restaurant.packingFee || 0);
                restaurant.packingFeeText = restaurant.packingFee.toFixed(2);
              let statusText = "营业状态未知";
              let statusClass = "status-closed";
      
              if (Array.isArray(restaurant.businessHours) && restaurant.businessHours.length > 0) {
                let today = new Date().getDay();
                if (today === 0) today = 7; // 周日=7
      
                const todayHours = restaurant.businessHours.find(h => h.dayOfWeek == today);
      
                if (!todayHours || todayHours.isOpen !== 1) {
                  statusText = "今日不营业";
                  statusClass = "status-closed";
                } else {
                  const open = todayHours.openTime;
                  const close = todayHours.closeTime;
      
                  const [oH, oM] = open.split(":").map(Number);
                  const [cH, cM] = close.split(":").map(Number);
      
                  const openMin = oH * 60 + oM;
                  const closeMin = cH * 60 + cM;
      
                  const now = new Date();
                  const nowMin = now.getHours() * 60 + now.getMinutes();
      
                  if (nowMin >= openMin && nowMin < closeMin) {
                    statusText = "营业中";
                    statusClass = "status-open";
                  } else if (nowMin < openMin) {
                    statusText = "未营业";
                    statusClass = "status-break";
                  } else {
                    statusText = "已打烊";
                    statusClass = "status-closed";
                  }
      
                  restaurant.businessHoursText = `${open} - ${close}`;
                }
      
              } else {
                restaurant.businessHoursText = "暂无营业时间";
                statusText = "今日不营业";
                statusClass = "status-closed";
              }
      
              /* ----------- END 营业状态 ----------- */
      
      
              // 处理菜品格式化价格
              categories.forEach(category => {
                if (category.dishes && category.dishes.length > 0) {
                  category.dishes.forEach(dish => {
                    dish.formattedPrice = Number(dish.price).toFixed(2);
                  });
                }
              });
      
              const activeCategoryId = categories.length > 0 ? categories[0].id : null;
              const avgRating = restaurant.avgRating !== null ? restaurant.avgRating : null;
              // 设置数据
              this.setData({
                restaurant,
                categories,
                activeCategoryId,
                statusText,
                statusClass,
                avgRating,
                loading: false
              }, () => {
                this.checkFavoriteStatus(id);
      
                if (!this.data.isGuest) {
                  this.uploadHistoryToServer(id);
                }
      
                setTimeout(() => {
                  this.calcCategoryPositions();
                }, 500);
              });
      
            } else {
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
          }
        });
      },      
      goDishDetail(e) {
        const id = e.currentTarget.dataset.id;
        wx.navigateTo({
          url: `/pages/dish-detail/dish-detail?id=${id}`
        });
      },
      calcBusinessStatus(businessHoursList) {
        if (!businessHoursList || businessHoursList.length === 0) {
          return {
            statusText: "今日不营业",
            statusClass: "status-closed"
          };
        }
      
        const now = new Date();
        const currentMinutes = now.getHours() * 60 + now.getMinutes();
      
        let isOpen = false;
        let minutesToClose = null;
        let minutesToOpen = null;
      
        businessHoursList.forEach(period => {
          const [startH, startM] = period.start.split(":").map(Number);
          const [endH, endM] = period.end.split(":").map(Number);
      
          const startMin = startH * 60 + startM;
          const endMin = endH * 60 + endM;
      
          if (currentMinutes >= startMin && currentMinutes < endMin) {
            // 营业中
            isOpen = true;
            minutesToClose = endMin - currentMinutes;
          } else if (currentMinutes < startMin) {
            // 未营业，记录距离开业的最小值
            const diff = startMin - currentMinutes;
            if (minutesToOpen === null || diff < minutesToOpen) {
              minutesToOpen = diff;
            }
          }
        });
      
        // 状态文本生成
        if (isOpen) {
          return {
            statusText: minutesToClose > 0
              ? `营业中 · 距离打烊还有 ${minutesToClose} 分钟`
              : "营业中",
            statusClass: "status-open"
          };
        }
      
        if (minutesToOpen !== null) {
          return {
            statusText: `未营业 · 距离开业还有 ${minutesToOpen} 分钟`,
            statusClass: "status-break"
          };
        }
      
        return {
          statusText: "已打烊",
          statusClass: "status-closed"
        };
      },

    calcCategoryPositions() {
        const query = wx.createSelectorQuery().in(this);
    
        // 计算导航栏 + tabs 的固定高度
        query.select('.navbar').boundingClientRect();
        query.select('.main-tabs').boundingClientRect();
        query.selectAll('.category-section').boundingClientRect();
    
        query.exec(res => {
            const navbarH = res[0].height || 0;
            const tabsH = res[1].height || 0;
            const offsetTop = navbarH + tabsH;   // 关键偏移量
    
            const rects = res[2];
            this.categoryPositions = rects.map(r => r.top - offsetTop);
        });
    },
    checkFavoriteStatus(restaurantId) {
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
          userId,
          restaurantId
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
  
    toggleFavorite() {
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
          userId,
          restaurantId
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
    
    
    getStatusText(status) {
      const statusMap = {
        1: '营业中',
        2: '休息中',
        3: '已打烊'
      };
      return statusMap[status] || '未知状态';
    },
  
    getStatusClass(status) {
      const classMap = {
        1: 'status-open',
        2: 'status-break',
        3: 'status-closed'
      };
      return classMap[status] || 'status-closed';
    },
  
    // 左侧分类点击：通过 scroll-into-view 滚动到对应分类
    onCategoryTap(e) {
        const id = e.currentTarget.dataset.id;
        const index = this.data.categories.findIndex(c => c.id == id);
        if (index === -1) return;
    
        const targetTop = this.categoryPositions[index];
    
        this.setData({
            activeCategoryId: id,
            scrollLocked: true   // 点击分类时锁住自动更新
        });
    
        const query = wx.createSelectorQuery().in(this);
        query.select('#pageScroll')
            .fields({ node: true, scrollOffset: true })
            .exec(res => {
                const scrollView = res[0].node;
    
                scrollView.scrollTo({
                    top: targetTop,
                    duration: 300
                });
                setTimeout(() => {
                    this.updateActiveCategoryByScroll(targetTop);
                    this.setData({
                        scrollLocked: false
                    });
                }, 350);
            });
    },
    updateActiveCategoryByScroll(scrollTop) {
        for (let i = 0; i < this.categoryPositions.length; i++) {
            const start = this.categoryPositions[i];
            const end = this.categoryPositions[i + 1] ?? Infinity;
    
            if (scrollTop >= start && scrollTop < end) {
                const id = this.data.categories[i].id;
    
                if (id !== this.data.activeCategoryId) {
                    this.setData({ activeCategoryId: id });
                }
                break;
            }
        }
    },
  
    onIncreaseQuantity(e) {
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
  
    onDecreaseQuantity(e) {
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
  
    findDishById(dishId) {
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
  
    onCartBarTap() {
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
  
    showOrderPanel() {
      const orderItems = this.generateOrderItems();
      this.setData({
        showOrderPanel: true,
        orderItems
      });
    },
  
    hideOrderPanel() {
      this.setData({
        showOrderPanel: false
      });
    },
  
    stopPropagation() {
      return;
    },
  
    generateOrderItems() {
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
            quantity,
            subtotal: (dish.price * quantity).toFixed(2)
          });
        }
      });
  
      return orderItems;
    },
  
    generateCheckoutItems() {
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
            quantity,
            subtotal: (dish.price * quantity).toFixed(2)
          });
        }
      });
  
      return checkoutItems;
    },
  
    onOrderIncreaseQuantity(e) {
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
        orderItems
      });
    },
  
    onOrderDecreaseQuantity(e) {
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
        orderItems
      });
  
      if (this.data.totalQuantity === 0) {
        this.hideOrderPanel();
      }
    },
  
    clearCart() {
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
  
    updateCart(cartItems) {
        let totalQuantity = 0;
        let subTotal = 0;
      
        Object.keys(cartItems).forEach(dishId => {
          const quantity = cartItems[dishId];
          const dish = this.findDishById(dishId);
      
          if (dish && quantity > 0) {
            totalQuantity += quantity;
            subTotal += dish.price * quantity;
          }
        });
      
        const restaurant = this.data.restaurant;
        const packingFeeNumber = Number(restaurant ? restaurant.packingFee : 0);
      
        /** ⭐ 根据用餐方式计算价格 */
        const isEatIn = this.data.eatType == 1;   // 1 = 堂食
        const finalPackingFee = isEatIn ? 0 : packingFeeNumber;
        const totalAmount = subTotal + finalPackingFee;
      
        this.setData({
          cartItems,
          totalQuantity,
          subTotal,
          packingFee: finalPackingFee.toFixed(2),
          totalPrice: totalAmount,
          formattedSubTotal: subTotal.toFixed(2),
          formattedTotalPrice: totalAmount.toFixed(2),
          showPackingFee: !isEatIn 
        });
      
        /** 保存购物车到服务器 */
        if (this.data.saveCartTimer) {
          clearTimeout(this.data.saveCartTimer);
        }
      
        this.data.saveCartTimer = setTimeout(() => {
          const currentCartState = JSON.stringify(cartItems);
          if (currentCartState !== this.data.lastCartState) {
            this.saveCartToServer(cartItems);
            this.setData({ lastCartState: currentCartState });
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
          quantity,
          price: dish.price
        });
      });
  
      wx.request({
        url: app.globalData.baseUrl + "/cart/save",
        method: "POST",
        header: {
          "content-type": "application/json"
        },
        data: cartList
      });
    },
  
    onCheckout() {
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
  
    showCheckoutPanel() {
      const checkoutItems = this.generateCheckoutItems();
      this.setData({
        showCheckoutPanel: true,
        checkoutItems
      });
    },
  
    hideCheckoutPanel() {
      this.setData({
        showCheckoutPanel: false
      });
    },
  
    onSubmitOrder() {
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
  
    prepareOrderData() {
      const orderItems = this.generateOrderItemsForSubmit();
  
      return {
        order: {
          userId: this.data.userInfo.id,
          restaurantId: this.data.restaurantId,
          totalAmount: this.data.totalPrice,
          packingFee: this.data.packingFee,
          eatType: this.data.eatType || 2
        },
        items: orderItems,
        restaurant: this.data.restaurant,
        orderItems,
        subTotal: this.data.subTotal,
        packingFee: this.data.packingFee,
        totalAmount: this.data.totalPrice
      };
    },
  
    generateOrderItemsForSubmit() {
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
            quantity,
            subtotal: dish.price * quantity
          });
        }
      });
  
      return orderItems;
    },
  
    createOrderAndShowPayment(orderData) {
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
  
          if (res.data.code === 200) {
            const order = res.data.data;
  
            this.clearCartAfterOrder();
  
            wx.showModal({
              title: '确认支付',
              content: `是否立即支付订单？\n订单金额：¥${order.totalAmount}`,
              confirmText: '确认支付',
              cancelText: '取消支付',
              confirmColor: '#ff6b35',
              success: (modalRes) => {
                if (modalRes.confirm) {
                  this.payOrder(order.id);
                } else {
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
          wx.showToast({
            title: '网络错误，请重试',
            icon: 'none'
          });
        }
      });
    },
  
    navigateToOrderDetail(orderId) {
      if (!orderId) {
        wx.showToast({
          title: '订单信息错误',
          icon: 'none'
        });
        return;
      }
  
      wx.navigateTo({
        url: `/pages/order-detail/order-detail?orderId=${orderId}`,
        fail: () => {
          wx.redirectTo({
            url: `/pages/order-detail/order-detail?orderId=${orderId}`,
            fail: () => {
              wx.showToast({
                title: '页面跳转失败',
                icon: 'none'
              });
            }
          });
        }
      });
    },
  
    payOrder(orderId) {
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
  
          if (res.data.code === 200) {
            wx.showToast({
              title: '支付成功',
              icon: 'success',
              duration: 2000,
              success: () => {
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
                setTimeout(() => {
                  this.navigateToOrderDetail(orderId);
                }, 3000);
              }
            });
          }
        },
        fail: () => {
          wx.hideLoading();
          wx.showToast({
            title: '网络错误，请重试',
            icon: 'none',
            duration: 3000,
            success: () => {
              setTimeout(() => {
                this.navigateToOrderDetail(orderId);
              }, 3000);
            }
          });
        }
      });
    },
  
    clearCartAfterOrder() {
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
    },
  
    loadUserCart() {
      if (this.data.isGuest) return;
  
      const app = getApp();
      const userId = this.data.userInfo.id;
      const restaurantId = this.data.restaurantId;
  
      wx.request({
        url: app.globalData.baseUrl + `/cart/map/user/${userId}/restaurant/${restaurantId}`,
        method: 'GET',
        success: (res) => {
          if (res.data.code === 200) {
            const cartMap = res.data.data || {};
            this.setData({
              cartItems: cartMap
            });
            this.updateCart(cartMap);
          }
        }
      });
    },
  
    clearServerCart() {
      if (this.data.isGuest) return;
  
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
          userId,
          restaurantId
        }
      });
    },
    toggleLatest() {
        const isLatest = !this.data.isLatest;
        this.setData({ isLatest });
      
        if (isLatest) {
          const sorted = [...this.data.originalRatingList].sort(
            (a, b) => new Date(b.time) - new Date(a.time)
          );
          this.setData({ ratingList: sorted });
        } else {
          this.setData({ ratingList: [...this.data.originalRatingList] });
        }
      
        //  排序后重新计算评分
        this.calculateRatings();
      },
      
      calcStars(score) {
        const s = Math.round(score || 0);
        return new Array(s).fill(0);
      },
      previewImage(e) {
        const urls = e.currentTarget.dataset.urls;
        const url = e.currentTarget.dataset.url;
      
        wx.previewImage({
          urls: urls,
          current: url
        });
      },
      calculateRatings() {
        const list = this.data.ratingList;
        if (!list || list.length === 0) {
          this.setData({
            avgShopRating: 5.0,
            avgTaste: 5.0,
            avgPack: 5.0
          });
          return;
        }
      
        let totalShop = 0;
        let totalTaste = 0;
        let totalPack = 0;
      
        list.forEach(item => {
          totalShop += (item.satisfaction || 5);
          totalTaste += (item.taste || 5);
          totalPack += (item.pack || 5);
        });
      
        const count = list.length;
      
        // 计算平均值并四舍五入到1位小数
        const avgShop = (totalShop / count).toFixed(1);
        const avgTaste = (totalTaste / count).toFixed(1);
        const avgPack = (totalPack / count).toFixed(1);
      
        this.setData({
          avgShopRating: avgShop,
          avgTaste: avgTaste,
          avgPack: avgPack
        });
      },      
      loadRatings(restaurantId) {
        const app = getApp();
      
        wx.request({
            url: app.globalData.baseUrl + '/review/list',
            method: 'GET',
            data: { restaurantId },
            success: (res) => {
                if (res.data.code === 200) {
      
                    const list = res.data.data || [];
      
                    list.forEach(item => {
      
                        item.score = item.rating;
                        item.satisfaction = item.rating;
                        item.taste = item.taste || 5;
                        item.pack = item.pack || 5;
      
                        item.username = item.username || '匿名用户';
                        item.avatar = item.avatar || '/images/default-avatar.png';
                        item.time = item.created_time?.substring(0, 10);
      
                        //  商家回复字段
                        item.replyContent = item.reply_content || item.replyContent;
                        item.replyTime = item.reply_time?.substring(0, 10);
      
                        // 图片
                        if (item.image_urls) {
                            try {
                                item.images = JSON.parse(item.image_urls);
                            } catch (e) {
                                item.images = [];
                            }
                        } else {
                            item.images = [];
                        }
                    });
      
                    this.setData({
                        ratingList: list,
                        originalRatingList: [...list]
                    });
      
                    this.calculateRatings();
      
                } else {
                    this.setData({
                        ratingList: [],
                        originalRatingList: []
                    });
                    this.calculateRatings();
                }
            }
        });
      },
      selectEatType(e) {
        const type = e.currentTarget.dataset.type;
        this.setData({ eatType: type });
      
        this.updateCart(this.data.cartItems);
      },
      onReport(e) {
        const app = getApp();
        if (!app.globalData.userInfo) {
          wx.showToast({ title: "请先登录", icon: "none" });
          return;
        }
      
        const reviewId = e.currentTarget.dataset.id;
        wx.navigateTo({
          url: `/pages/review-report/review-report?reviewId=${reviewId}`
        });
      },
    onBack() {
      wx.navigateBack();
    }
  });
  