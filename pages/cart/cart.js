// pages/cart/cart.js
Page({
    data: {
      cartData: [],
      allSelected: false,
      totalPrice: '0.00',
      selectedCount: 0
    },
  
    onLoad: function(options) {
    },
  
    onShow() {
        const app = getApp();
    
        if (app.globalData.cartCache) {
    
            const cached = app.globalData.cartCache;
    
            this.setData({
                cartData: cached,
            });
    
            //  恢复选中状态和价格
            this.updateRestaurantSelection();
            this.updateAllSelectedState();
            this.calculateTotal();
    
            //  清空缓存（仅一次有效）
            app.globalData.cartCache = null;
            return;
        }
    
        // 默认加载
        this.loadCartData();
    },
  
    // 修复购物车数据加载方法
    loadCartData() {
        const app = getApp();
        const user = app.globalData.userInfo;
    
        //  如果用户没有登录
        if (!user || !user.id) {
          wx.showToast({
            title: "请先登录后查看购物车",
            icon: "none"
          });
          this.setData({ cartData: [] });
          return;
        }
    
        const userId = user.id; //  正确 userId
    
        wx.showLoading({ title: "加载中..." });
    
        wx.request({
          url: `http://localhost:8080/api/cart/user/${userId}/list`,
          method: "GET",
          success: (res) => {
            wx.hideLoading();
            if (res.data.code !== 200) {
              wx.showToast({ title: "加载失败", icon: "none" });
              return;
            }
    
            const cartList = res.data.data || [];
            console.log("原始购物车数据:", cartList);
    
            this.processCartData(cartList);
          },
          fail: () => {
            wx.hideLoading();
            wx.showToast({ title: "网络错误", icon: "none" });
          }
        });
      },
  
      processCartData(cartList) {
        const restaurantMap = {};
        const restaurantsToLoad = new Set();
    
        cartList.forEach((item) => {
          const restaurantId = item.restaurantId;
    
          if (!restaurantMap[restaurantId]) {
            restaurantMap[restaurantId] = {
              restaurantId,
              restaurantName: "加载中...",
              deliveryFee: 0,
              packingFee: 0,
              selected: false,
              eatType: 2,
              items: []
            };
    
            if (!item.restaurant) {
              restaurantsToLoad.add(restaurantId);
            } else {
              restaurantMap[restaurantId].restaurantName =
                item.restaurant.name || "未知餐厅";
              restaurantMap[restaurantId].deliveryFee =
                item.restaurant.deliveryFee || 0;
              restaurantMap[restaurantId].packingFee =
                item.restaurant.packingFee || 0;
            }
          }
    
          const price = parseFloat(item.dishPrice || item?.dish?.price || 0);
          const quantity = item.quantity || 1;
    
          restaurantMap[restaurantId].items.push({
            id: item.id,
            cartId: item.id,
            dishId: item.dishId,
            dishName: item.dishName || item?.dish?.name || "未知菜品",
            dishPrice: price,
            dishImageUrl:
              item.dishImageUrl || item?.dish?.imageUrl || "/images/default-dish.png",
            quantity,
            restaurantId,
            selected: false,
            totalPrice: (price * quantity).toFixed(2)
          });
        });
    
        const cartData = Object.values(restaurantMap);
        this.setData({ cartData });
    
        this.calculateTotal();
        this.updateRestaurantSelection();
        this.updateAllSelectedState();
    
        if (restaurantsToLoad.size > 0) {
          this.loadMissingRestaurantInfo(Array.from(restaurantsToLoad));
        }
      },

      // 加载缺失的餐厅信息
      loadMissingRestaurantInfo(restaurantIds) {
        let loaded = 0;
    
        restaurantIds.forEach((id) => {
          this.loadRestaurantDetail(id, (info) => {
            if (info) {
              this.updateRestaurantInfoInCart(id, info);
            }
            loaded++;
            if (loaded === restaurantIds.length) {
              this.calculateTotal();
            }
          });
        });
      },

    // 加载餐厅详细信息
    loadRestaurantDetail(restaurantId, callback) {
        wx.request({
          url: `http://localhost:8080/api/restaurant/${restaurantId}`,
          method: "GET",
          success: (res) => {
            callback(res.data.code === 200 ? res.data.data : null);
          },
          fail: () => callback(null)
        });
      },
  
    // 更新本地购物车中的餐厅信息
    updateRestaurantInfoInCart(restaurantId, restaurantInfo) {
        const cartData = this.data.cartData;
        const index = cartData.findIndex((r) => r.restaurantId === restaurantId);
        if (index !== -1) {
          cartData[index].restaurantName = restaurantInfo.name || "未知餐厅";
          cartData[index].deliveryFee = restaurantInfo.deliveryFee || 0;
          cartData[index].packingFee = restaurantInfo.packingFee || 0;
          this.setData({ cartData });
        }
      },
  
    // 切换餐厅全选状态
    toggleRestaurantSelection: function(e) {
      const restaurant = e.currentTarget.dataset.restaurant;
      const restaurantId = restaurant.restaurantId;
      
      const cartData = this.data.cartData;
      const restaurantIndex = cartData.findIndex(r => r.restaurantId === restaurantId);
      
      if (restaurantIndex !== -1) {
        const newSelectedState = !cartData[restaurantIndex].selected;
        cartData[restaurantIndex].selected = newSelectedState;
        
        if (cartData[restaurantIndex].items && cartData[restaurantIndex].items.length > 0) {
          cartData[restaurantIndex].items.forEach(item => {
            item.selected = newSelectedState;
          });
        }
        
        this.setData({ cartData });
        this.calculateTotal();
        this.updateAllSelectedState();
      }
    },
  
    // 切换单个商品选中状态
    toggleItemSelection: function(e) {
      const item = e.currentTarget.dataset.item;
      const restaurantId = e.currentTarget.dataset.restaurant;
      
      const cartData = this.data.cartData;
      const restaurantIndex = cartData.findIndex(r => r.restaurantId === restaurantId);
      
      if (restaurantIndex !== -1) {
        const itemIndex = cartData[restaurantIndex].items.findIndex(i => i.id === item.id);
        
        if (itemIndex !== -1) {
          cartData[restaurantIndex].items[itemIndex].selected = !cartData[restaurantIndex].items[itemIndex].selected;
          
          this.setData({ cartData });
          this.updateRestaurantSelection();
          this.calculateTotal();
          this.updateAllSelectedState();
        }
      }
    },
  
    // 更新餐厅选中状态
    updateRestaurantSelection() {
        const cartData = this.data.cartData;
        cartData.forEach((restaurant) => {
          restaurant.selected =
            restaurant.items.length > 0 &&
            restaurant.items.every((item) => item.selected);
        });
        this.setData({ cartData });
      },
  
    // 切换全选状态
    toggleAllSelection: function() {
      const newAllSelectedState = !this.data.allSelected;
      const cartData = this.data.cartData;
      
      cartData.forEach(restaurant => {
        restaurant.selected = newAllSelectedState;
        if (restaurant.items && restaurant.items.length > 0) {
          restaurant.items.forEach(item => {
            item.selected = newAllSelectedState;
          });
        }
      });
      
      this.setData({
        cartData: cartData,
        allSelected: newAllSelectedState
      });
      
      this.calculateTotal();
    },
  
    // 更新全选状态
    updateAllSelectedState() {
        const allSelected =
          this.data.cartData.length > 0 &&
          this.data.cartData.every((r) => r.selected);
        this.setData({ allSelected });
      },
  
    // 计算总价和选中数量
    calculateTotal() {
        let total = 0;
        let count = 0;
      
        this.data.cartData.forEach(r => {
          const packing = (r.eatType === 2 ? r.packingFee : 0);
      
          let restaurantHasSelected = false;
      
          r.items.forEach(item => {
            if (item.selected) {
              total += item.dishPrice * item.quantity;
              count += item.quantity;
              restaurantHasSelected = true;
            }
          });
      
          if (restaurantHasSelected) {
            total += packing;
          }
        });
      
        this.setData({
          totalPrice: total.toFixed(2),
          selectedCount: count
        });
      },
  
    // 增加商品数量
    increaseQuantity: function(e) {
      const item = e.currentTarget.dataset.item;
      const newQuantity = item.quantity + 1;
      
      console.log('增加数量:', item.dishId, '新数量:', newQuantity);
      
      this.updateCartQuantity(item, newQuantity);
    },
  
    // 减少商品数量
    decreaseQuantity: function(e) {
      const item = e.currentTarget.dataset.item;
      
      if (item.quantity > 1) {
        const newQuantity = item.quantity - 1;
        console.log('减少数量:', item.dishId, '新数量:', newQuantity);
        this.updateCartQuantity(item, newQuantity);
      } else {
        // 数量为1，减少会变为0，删除商品
        wx.showModal({
          title: '提示',
          content: '确定要删除这个商品吗？',
          success: (res) => {
            if (res.confirm) {
              this.deleteCartItem(item);
            }
          }
        });
      }
    },
  
    // 更新购物车数量
    updateCartQuantity(item, newQuantity) {
        const userId = getApp().globalData.userInfo.id;
      
        const oldQuantity = item.quantity; // ⭐ 保存旧值
      
        // 本地更新
        this.updateLocalCartItem(item, newQuantity);
      
        wx.request({
          url: "http://localhost:8080/api/cart/update",
          method: "POST",
          header: { "content-type": "application/json" },
          data: {
            userId: userId,
            restaurantId: item.restaurantId,
            dishId: item.dishId,
            quantity: newQuantity
          },
          success: (res) => {
            if (res.data.code !== 200) {
              wx.showToast({ title: "更新失败", icon: "none" });
      
              // ⭐ 恢复旧数量
              this.updateLocalCartItem(item, oldQuantity);
            }
          },
          fail: () => {
            wx.showToast({ title: "网络错误", icon: "none" });
      
            // ⭐ 恢复旧数量
            this.updateLocalCartItem(item, oldQuantity);
          }
        });
      },
  
    // 更新本地购物车项
    updateLocalCartItem: function(item, newQuantity) {
      const cartData = this.data.cartData;
      let updated = false;
      
      for (let i = 0; i < cartData.length; i++) {
        const restaurant = cartData[i];
        if (restaurant.restaurantId === item.restaurantId) {
          for (let j = 0; j < restaurant.items.length; j++) {
            const cartItem = restaurant.items[j];
            if (cartItem.id === item.id) {
              cartItem.quantity = newQuantity;
              cartItem.totalPrice = (cartItem.dishPrice * newQuantity).toFixed(2);
              updated = true;
              break;
            }
          }
          if (updated) break;
        }
      }
      
      if (updated) {
        this.setData({ cartData });
        this.calculateTotal();
      }
    },
  
    // 删除购物车项
    deleteCartItem: function(item) {
      const that = this;
      const userId = wx.getStorageSync('userId') || 1;
      
      // 先更新本地数据
      this.removeLocalCartItem(item);
      
      wx.request({
        url: "http://localhost:8080/api/cart/remove",
        method: "POST",
        header: {
          'content-type': 'application/json'
        },
        data: {
          userId: userId,
          restaurantId: item.restaurantId,
          dishId: item.dishId
        },
        success: (res) => {
          console.log('删除响应:', res.data);
          if (res.data.code !== 200) {
            wx.showToast({ 
              title: '删除失败: ' + (res.data.message || '未知错误'), 
              icon: 'none' 
            });
            that.loadCartData();
          } else {
            wx.showToast({ title: '删除成功', icon: 'success' });
            that.checkAndRemoveEmptyRestaurant(item.restaurantId);
          }
        },
        fail: (err) => {
          console.error('删除请求失败:', err);
          wx.showToast({ title: '网络错误', icon: 'none' });
          that.loadCartData();
        }
      });
    },
  
    // 从本地数据中移除购物车项
    removeLocalCartItem: function(item) {
      const cartData = this.data.cartData;
      
      for (let i = 0; i < cartData.length; i++) {
        const restaurant = cartData[i];
        if (restaurant.restaurantId === item.restaurantId) {
          restaurant.items = restaurant.items.filter(cartItem => cartItem.id !== item.id);
          
          if (restaurant.items.length === 0) {
            cartData.splice(i, 1);
          }
          
          this.setData({ cartData });
          this.calculateTotal();
          this.updateAllSelectedState();
          break;
        }
      }
    },
  
    // 检查并移除空的餐厅
    checkAndRemoveEmptyRestaurant: function(restaurantId) {
      const cartData = this.data.cartData;
      const restaurantIndex = cartData.findIndex(r => r.restaurantId === restaurantId);
      
      if (restaurantIndex !== -1 && cartData[restaurantIndex].items.length === 0) {
        cartData.splice(restaurantIndex, 1);
        this.setData({ cartData });
      }
    },
  
    // 删除整个餐厅的购物车
    deleteRestaurantCart: function(e) {
      const restaurant = e.currentTarget.dataset.restaurant;
      const userId = wx.getStorageSync('userId') || 1;
      const that = this;
    
      wx.showModal({
        title: '提示',
        content: `确定要删除${restaurant.restaurantName}的所有商品吗？`,
        success(res) {
          if (res.confirm) {
            that.removeLocalRestaurantCart(restaurant.restaurantId);
            
            wx.request({
              url: "http://localhost:8080/api/cart/restaurant/remove",
              method: "POST",
              header: {
                'content-type': 'application/json'
              },
              data: {
                userId: userId,
                restaurantId: restaurant.restaurantId
              },
              success(resp) {
                console.log('删除餐厅响应:', resp.data);
                if (resp.data.code !== 200) {
                  wx.showToast({ 
                    title: "删除失败: " + (resp.data.message || '未知错误'), 
                    icon: "none" 
                  });
                  that.loadCartData();
                } else {
                  wx.showToast({ title: "删除成功", icon: "success" });
                }
              },
              fail() {
                wx.showToast({ title: "网络异常", icon: "none" });
                that.loadCartData();
              }
            });
          }
        }
      });
    },  
  
    // 从本地数据中移除整个餐厅的购物车
    removeLocalRestaurantCart: function(restaurantId) {
      const cartData = this.data.cartData;
      const updatedCartData = cartData.filter(restaurant => restaurant.restaurantId !== restaurantId);
      
      this.setData({ cartData: updatedCartData });
      this.calculateTotal();
      this.updateAllSelectedState();
    },
  
    // 一键结算
    onCheckout: function() {
      if (parseFloat(this.data.totalPrice) === 0) {
          wx.showToast({
              title: '请选择要结算的商品',
              icon: 'none'
          });
          return;
      }
      const app = getApp();
      app.globalData.cartCache = JSON.parse(JSON.stringify(this.data.cartData));
      // 收集选中的商品
      const selectedItems = [];
      const cartData = this.data.cartData;
      
      cartData.forEach(restaurant => {
          if (restaurant.items && restaurant.items.length > 0) {
              restaurant.items.forEach(item => {
                  if (item.selected) {
                      selectedItems.push({
                          dishId: item.dishId,
                          name: item.dishName,
                          price: item.dishPrice,
                          quantity: item.quantity,
                          imageUrl: item.dishImageUrl,
                          restaurantId: item.restaurantId,
                          restaurantName: restaurant.restaurantName,
                          deliveryFee: restaurant.deliveryFee,
                          packingFee: restaurant.packingFee
                      });
                  }
              });
          }
      });
      
      if (selectedItems.length === 0) {
          wx.showToast({
              title: '请选择要结算的商品',
              icon: 'none'
          });
          return;
      }
      
      // 按餐厅分组选中的商品
      const checkoutRestaurants = {};
      cartData.forEach(restaurant => {
        restaurant.items.forEach(item => {
            if (item.selected) {
                if (!checkoutRestaurants[restaurant.restaurantId]) {
                    checkoutRestaurants[restaurant.restaurantId] = {
                        restaurantId: restaurant.restaurantId,
                        restaurantName: restaurant.restaurantName,
                        eatType: restaurant.eatType, 
                        packingFee: restaurant.packingFee,
                        items: []
                    };
                }
    
                checkoutRestaurants[restaurant.restaurantId].items.push(item);
            }
        });
    });
      
      // 计算每个餐厅的小计和总金额
      let totalAmount = 0;
      const restaurants = Object.values(checkoutRestaurants).map(restaurant => {
        const dishSubTotal = restaurant.items.reduce((sum, item) => {
            return sum + (parseFloat(item.dishPrice) * parseInt(item.quantity));
        }, 0);
          
          const packingFee = parseFloat(restaurant.packingFee) || 0;
          
          const subTotal = dishSubTotal + packingFee ;
          totalAmount += subTotal;
          
          return {
              ...restaurant,
              dishSubTotal: dishSubTotal.toFixed(2),
              subTotal: subTotal.toFixed(2),
              packingFee: packingFee.toFixed(2)
          };
      });
      
      // 准备订单数据
      const orderData = {
        restaurants: restaurants,
        totalAmount: totalAmount.toFixed(2),
        selectedCount: this.data.selectedCount
      };
      
      console.log('结算数据:', orderData);
      
      // 跳转到提交订单页面
      wx.navigateTo({
          url: `/pages/submitOrder/submitOrder?data=${encodeURIComponent(JSON.stringify(orderData))}`
      });
    },
  
    goDishDetail(e) {
        const dishId = e.currentTarget.dataset.id;
        const restaurantId = e.currentTarget.dataset.restaurant;
      
        wx.navigateTo({
          url: `/pages/dish-detail/dish-detail?id=${dishId}&restaurantId=${restaurantId}`
        });
      },
    // 去逛逛
    goToRestaurants: function() {
      wx.switchTab({
        url: '/pages/index/index'
      });
    },
    selectEatType(e) {
        const type = Number(e.currentTarget.dataset.type);
        const restaurantId = e.currentTarget.dataset.restaurant;
    
        const cartData = this.data.cartData;
        const index = cartData.findIndex(r => r.restaurantId === restaurantId);
    
        if (index !== -1) {
            cartData[index].eatType = type;
            this.setData({ cartData });
            this.calculateTotal(); 
        }
    },
  });