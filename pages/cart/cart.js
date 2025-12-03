// pages/cart/cart.js
Page({
    data: {
      cartData: [],
      allSelected: false,
      totalPrice: '0.00',
      selectedCount: 0
    },
  
    onLoad: function(options) {
      this.loadCartData();
    },
  
    onShow: function() {
      this.loadCartData();
    },
  
    // 修复购物车数据加载方法
    loadCartData: function() {
        const userId = wx.getStorageSync('userId') || 1;
        const that = this;
    
        wx.showLoading({
            title: '加载中...',
        });
    
        wx.request({
            url: `http://localhost:8080/api/cart/user/${userId}/list`,
            method: 'GET',
            success(res) {
                wx.hideLoading();
    
                if (res.data.code !== 200) {
                    wx.showToast({ title: '加载失败', icon: 'none' });
                    return;
                }
    
                const cartList = res.data.data || [];
                console.log('原始购物车数据:', cartList);
    
                // 按餐厅分组并处理数据
                that.processCartData(cartList);
            },
            fail(err) {
                wx.hideLoading();
                console.error('加载购物车失败:', err);
                wx.showToast({ title: '网络错误', icon: 'none' });
            }
        });
      },
  
      processCartData: function(cartList) {
        const that = this;
        const restaurantMap = {};
        const restaurantsToLoad = new Set();
    
        // 第一遍：分组并识别需要加载餐厅信息的餐厅
        cartList.forEach(item => {
            const restaurantId = item.restaurantId;
            
            if (!restaurantMap[restaurantId]) {
                restaurantMap[restaurantId] = {
                    restaurantId: restaurantId,
                    restaurantName: '加载中...',
                    deliveryFee: 0,
                    packingFee: 0,
                    selected: false,
                    items: []
                };
                
                // 如果后端没有返回餐厅信息，标记需要加载
                if (!item.restaurant) {
                    restaurantsToLoad.add(restaurantId);
                } else {
                    // 使用后端返回的餐厅信息
                    restaurantMap[restaurantId].restaurantName = item.restaurant.name || '未知餐厅';
                    restaurantMap[restaurantId].deliveryFee = item.restaurant.deliveryFee || 0;
                    restaurantMap[restaurantId].packingFee = item.restaurant.packingFee || 0;
                }
            }
    
            // 处理菜品信息
            const price = parseFloat(item.dishPrice || (item.dish ? item.dish.price : 0) || 0);
            const quantity = parseInt(item.quantity || 1);
            const totalPrice = (price * quantity).toFixed(2);
    
            restaurantMap[restaurantId].items.push({
                id: item.id,
                cartId: item.id,
                dishId: item.dishId,
                dishName: item.dishName || (item.dish ? item.dish.name : '未知菜品'),
                dishPrice: price,
                dishImageUrl: item.dishImageUrl || (item.dish ? item.dish.imageUrl : '/images/default-dish.png'),
                quantity: quantity,
                restaurantId: restaurantId,
                selected: false,
                totalPrice: totalPrice
            });
        });
    
        // 设置初始数据
        const cartData = Object.values(restaurantMap);
        that.setData({ cartData });
        that.calculateTotal();
        that.updateRestaurantSelection();
        that.updateAllSelectedState();
    
        // 加载缺失的餐厅信息
        if (restaurantsToLoad.size > 0) {
            that.loadMissingRestaurantInfo(Array.from(restaurantsToLoad));
        }
      },

      // 加载缺失的餐厅信息
  loadMissingRestaurantInfo: function(restaurantIds) {
    const that = this;
    let loadedCount = 0;

    restaurantIds.forEach(restaurantId => {
      that.loadRestaurantDetail(restaurantId, (restaurantInfo) => {
        if (restaurantInfo) {
          that.updateRestaurantInfoInCart(restaurantId, restaurantInfo);
        } else {
          // 如果加载失败，设置为未知餐厅
          that.updateRestaurantInfoInCart(restaurantId, {
            name: '未知餐厅',
            deliveryFee: 0,
            packingFee: 0
          });
        }
        
        loadedCount++;
        // 所有餐厅信息加载完成后重新计算
        if (loadedCount === restaurantIds.length) {
          that.calculateTotal();
        }
      });
    });
  },

    // 加载餐厅详细信息
  loadRestaurantDetail: function(restaurantId, callback) {
    wx.request({
      url: `http://localhost:8080/api/restaurant/${restaurantId}`,
      method: 'GET',
      success: (res) => {
        if (res.data.code === 200 && res.data.data) {
          callback(res.data.data);
        } else {
          callback(null);
        }
      },
      fail: () => {
        callback(null);
      }
    });
  },
  
    // 更新本地购物车中的餐厅信息
  updateRestaurantInfoInCart: function(restaurantId, restaurantInfo) {
    const cartData = this.data.cartData;
    const restaurantIndex = cartData.findIndex(r => r.restaurantId === restaurantId);
    
    if (restaurantIndex !== -1) {
      cartData[restaurantIndex].restaurantName = restaurantInfo.name || '未知餐厅';
      cartData[restaurantIndex].deliveryFee = restaurantInfo.deliveryFee || 0;
      cartData[restaurantIndex].packingFee = restaurantInfo.packingFee || 0;
      
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
    updateRestaurantSelection: function() {
      const cartData = this.data.cartData;
      
      cartData.forEach(restaurant => {
        if (restaurant.items && restaurant.items.length > 0) {
          const allItemsSelected = restaurant.items.every(item => item.selected);
          restaurant.selected = allItemsSelected;
        } else {
          restaurant.selected = false;
        }
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
    updateAllSelectedState: function() {
      const cartData = this.data.cartData;
      const allSelected = cartData.length > 0 && cartData.every(restaurant => restaurant.selected);
      
      this.setData({ allSelected });
    },
  
    // 计算总价和选中数量
    calculateTotal: function() {
      const cartData = this.data.cartData;
      let totalPrice = 0;
      let selectedCount = 0;
      
      cartData.forEach(restaurant => {
        if (restaurant.items && restaurant.items.length > 0) {
          restaurant.items.forEach(item => {
            if (item.selected) {
              const price = parseFloat(item.dishPrice) || 0;
              const quantity = parseInt(item.quantity) || 0;
              totalPrice += price * quantity;
              selectedCount += quantity;
            }
          });
        }
      });
      
      this.setData({
        totalPrice: totalPrice.toFixed(2),
        selectedCount: selectedCount
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
    updateCartQuantity: function(item, newQuantity) {
      const that = this;
      const userId = wx.getStorageSync('userId') || 1;
      
      // 先更新本地数据
      this.updateLocalCartItem(item, newQuantity);
      
      // 然后更新后端
      wx.request({
        url: "http://localhost:8080/api/cart/update",
        method: "POST",
        header: {
          'content-type': 'application/json'
        },
        data: {
          userId: userId,
          restaurantId: item.restaurantId,
          dishId: item.dishId,
          quantity: newQuantity
        },
        success: (res) => {
          console.log('更新数量响应:', res.data);
          if (res.data.code !== 200) {
            wx.showToast({ 
              title: '更新失败: ' + (res.data.message || '未知错误'), 
              icon: 'none' 
            });
            // 恢复原来的数量
            that.updateLocalCartItem(item, item.quantity);
          }
        },
        fail: (err) => {
          console.error('更新数量请求失败:', err);
          wx.showToast({ title: '网络错误', icon: 'none' });
          // 恢复原来的数量
          that.updateLocalCartItem(item, item.quantity);
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
      selectedItems.forEach(item => {
          if (!checkoutRestaurants[item.restaurantId]) {
              checkoutRestaurants[item.restaurantId] = {
                  restaurantId: item.restaurantId,
                  restaurantName: item.restaurantName,
                  deliveryFee: item.deliveryFee || 0,
                  packingFee: item.packingFee || 0,
                  discount: 0,
                  items: []
              };
          }
          checkoutRestaurants[item.restaurantId].items.push(item);
      });
      
      // 计算每个餐厅的小计和总金额
      let totalAmount = 0;
      const restaurants = Object.values(checkoutRestaurants).map(restaurant => {
          const dishSubTotal = restaurant.items.reduce((sum, item) => {
              return sum + (parseFloat(item.price) * parseInt(item.quantity));
          }, 0);
          
          const deliveryFee = parseFloat(restaurant.deliveryFee) || 0;
          const packingFee = parseFloat(restaurant.packingFee) || 0;
          const discount = parseFloat(restaurant.discount) || 0;
          
          const subTotal = dishSubTotal + deliveryFee + packingFee - discount;
          totalAmount += subTotal;
          
          return {
              ...restaurant,
              dishSubTotal: dishSubTotal.toFixed(2),
              subTotal: subTotal.toFixed(2),
              deliveryFee: deliveryFee.toFixed(2),
              packingFee: packingFee.toFixed(2),
              discount: discount.toFixed(2)
          };
      });
      
      // 准备订单数据
      const orderData = {
          restaurants: restaurants,
          subTotal: parseFloat(this.data.totalPrice).toFixed(2),
          deliveryFee: Object.values(checkoutRestaurants).reduce((sum, r) => sum + parseFloat(r.deliveryFee), 0).toFixed(2),
          packingFee: Object.values(checkoutRestaurants).reduce((sum, r) => sum + parseFloat(r.packingFee), 0).toFixed(2),
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
    }
  });