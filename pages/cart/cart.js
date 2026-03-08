// pages/cart/cart.js
Page({
    data: {
      cartData: [],
      allSelected: false,
      totalPrice: '0.00',
      selectedCount: 0,
      restaurantStatusMap: {}
    },
  
    onLoad: function(options) {
    },
  
    onShow() {
        const app = getApp();
        
        // 只有 shouldRestoreCart = true 时才恢复
        if (app.globalData.shouldRestoreCart && app.globalData.cartCache) {
            console.log("恢复购物车缓存数据（用户未下单返回）");
            this.setData({
                cartData: app.globalData.cartCache
            });
            this.updateRestaurantSelection();
            this.updateAllSelectedState();
            this.calculateTotal();
            // 恢复时也需要检查餐厅状态（过滤后的餐厅可能处于休息中等状态）
            this.checkRestaurantStatus();
            return;
        }
        
        // 从后端拉取最新购物车（已过滤停业餐厅）
        this.loadCartData();
    },

    // 检查所有餐厅状态
    checkRestaurantStatus() {
        const cartData = this.data.cartData;
        const restaurantIds = [];
        const restaurantStatusMap = {};
        
        // 收集所有餐厅ID
        cartData.forEach(restaurant => {
            restaurantIds.push(restaurant.restaurantId);
            // 初始化状态为未知
            restaurantStatusMap[restaurant.restaurantId] = {
                status: 1, // 默认营业中
                statusText: "营业中",
                disabled: false
            };
        });
        
        this.setData({ restaurantStatusMap });
        
        // 批量获取餐厅状态
        if (restaurantIds.length > 0) {
            this.loadRestaurantStatuses(restaurantIds);
        }
    },
    
    // 批量加载餐厅状态
    loadRestaurantStatuses(restaurantIds) {
        const requests = restaurantIds.map(id => {
            return new Promise((resolve, reject) => {
                wx.request({
                    url: `http://localhost:8080/api/restaurant/status/${id}`,
                    method: "GET",
                    success: (res) => {
                        if (res.data.code === 200) {
                            resolve({
                                restaurantId: id,
                                status: res.data.data
                            });
                        } else {
                            resolve({
                                restaurantId: id,
                                status: 1 // 默认营业中
                            });
                        }
                    },
                    fail: () => {
                        resolve({
                            restaurantId: id,
                            status: 1 // 默认营业中
                        });
                    }
                });
            });
        });
        
        Promise.all(requests).then(results => {
            // 避免使用展开运算符，使用 Object.assign 替代
            const restaurantStatusMap = Object.assign({}, this.data.restaurantStatusMap);
            let hasChanged = false;
            
            results.forEach(result => {
                const status = result.status;
                let statusText = "营业中";
                let statusClass = "status-open";
                let disabled = false;
                
                // 根据状态设置（注意：这里不会有status=0的情况，因为已过滤）
                if (status === 2) {
                    statusText = "未营业";
                    statusClass = "status-break";
                    disabled = true;
                } else if (status === 3) {
                    statusText = "休息中";
                    statusClass = "status-break";
                    disabled = true; // 休息中时禁用选择
                }
                // status=1: 营业中，保持默认值
                // status=0: 已停业，不会出现，因为已过滤
                
                restaurantStatusMap[result.restaurantId] = {
                    status: status,
                    statusText: statusText,
                    statusClass: statusClass,
                    disabled: disabled
                };
                
                hasChanged = true;
            });
            
            if (hasChanged) {
                this.setData({ restaurantStatusMap });
                // 排序购物车数据：营业中的餐厅在前，休息中的在后
                this.sortCartDataByStatus();
                // 更新选择状态（主要是禁用休息中的餐厅）
                this.updateRestaurantSelection();
                this.updateAllSelectedState();
                this.calculateTotal();
            }
        });
    },
    
    // 新增：按餐厅状态排序购物车数据
    sortCartDataByStatus() {
        // 避免使用展开运算符，使用 slice() 创建新数组
        const cartData = this.data.cartData.slice();
        const restaurantStatusMap = this.data.restaurantStatusMap;
        
        cartData.sort((a, b) => {
            const statusA = restaurantStatusMap[a.restaurantId] ? restaurantStatusMap[a.restaurantId].status : 1;
            const statusB = restaurantStatusMap[b.restaurantId] ? restaurantStatusMap[b.restaurantId].status : 1;
            
            // 详细排序规则：
            // 1. 营业中(status=1)的餐厅排在最前面
            // 2. 未营业(status=2)的餐厅排在中间
            // 3. 休息中(status=3)的餐厅排在最后面
            
            if (statusA === statusB) {
                // 状态相同，按餐厅名称字母顺序排序（可选）
                return a.restaurantName.localeCompare(b.restaurantName);
            }
            
            // 自定义优先级顺序
            const priority = {
                1: 1, // 营业中 - 优先级最高
                2: 2, // 未营业 - 优先级中等
                3: 3  // 休息中 - 优先级最低
            };
            
            return priority[statusA] - priority[statusB];
        });
        
        this.setData({ cartData });
    },
    
    // 修复购物车数据加载方法
    loadCartData() {
        const app = getApp();
        const user = app.globalData.userInfo;
    
        if (!user || !user.id) {
            wx.showToast({
                title: "请先登录后查看购物车",
                icon: "none"
            });
            this.setData({ cartData: [] });
            return;
        }
    
        const userId = user.id;
    
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
                
                // 如果购物车为空，显示提示信息
                if (cartList.length === 0) {
                    wx.showToast({
                        title: "购物车为空",
                        icon: "none",
                        duration: 1500
                    });
                }
                
                console.log("已过滤的购物车数据:", cartList);
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
                    restaurantId: restaurantId,
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
    
            const price = parseFloat(item.dishPrice || (item.dish ? item.dish.price : 0) || 0);
            const quantity = item.quantity || 1;
    
            restaurantMap[restaurantId].items.push({
                id: item.id,
                cartId: item.id,
                dishId: item.dishId,
                dishName: item.dishName || (item.dish ? item.dish.name : "未知菜品"),
                dishPrice: price.toFixed(2),
                dishImageUrl:
                    item.dishImageUrl || (item.dish ? item.dish.imageUrl : "/images/default-dish.png"),
                quantity: quantity,
                restaurantId: restaurantId,
                selected: false,
                totalPrice: (price * quantity).toFixed(2)
            });
        });
    
        const cartData = [];
        for (const key in restaurantMap) {
            cartData.push(restaurantMap[key]);
        }
        
        this.setData({ cartData });
    
        this.calculateTotal();
        this.updateRestaurantSelection();
        this.updateAllSelectedState();
    
        // 加载餐厅信息后检查状态
        if (restaurantsToLoad.size > 0) {
            // 避免使用 Array.from，使用 forEach 替代
            const idsArray = [];
            restaurantsToLoad.forEach(id => idsArray.push(id));
            
            this.loadMissingRestaurantInfo(idsArray, () => {
                // 所有餐厅信息加载完成后，检查状态
                this.checkRestaurantStatus();
            });
        } else {
            // 直接检查状态
            this.checkRestaurantStatus();
        }
    },

      // 加载缺失的餐厅信息
      loadMissingRestaurantInfo(restaurantIds, callback) {
        let loaded = 0;
        const total = restaurantIds.length;
    
        restaurantIds.forEach((id) => {
            this.loadRestaurantDetail(id, (info) => {
                if (info) {
                    this.updateRestaurantInfoInCart(id, info);
                }
                loaded++;
                if (loaded === total && callback) {
                    callback();
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
        
        // 检查餐厅是否禁用（休息中或已停业）
        const statusInfo = this.data.restaurantStatusMap[restaurantId];
        if (statusInfo && statusInfo.disabled) {
            wx.showToast({
                title: restaurant.restaurantName + statusInfo.statusText + "，无法选择",
                icon: "none"
            });
            return;
        }
        
        const cartData = this.data.cartData;
        const restaurantIndex = cartData.findIndex(r => r.restaurantId === restaurantId);
        
        if (restaurantIndex !== -1) {
            const newSelectedState = !cartData[restaurantIndex].selected;
            cartData[restaurantIndex].selected = newSelectedState;
            
            if (cartData[restaurantIndex].items && cartData[restaurantIndex].items.length > 0) {
                cartData[restaurantIndex].items.forEach(item => {
                    // 只有餐厅可用时才选中商品
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
        
        // 检查餐厅是否禁用
        const statusInfo = this.data.restaurantStatusMap[restaurantId];
        if (statusInfo && statusInfo.disabled) {
            wx.showToast({
                title: "餐厅" + statusInfo.statusText + "，无法选择商品",
                icon: "none"
            });
            return;
        }
        
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
        const restaurantStatusMap = this.data.restaurantStatusMap;
        
        cartData.forEach((restaurant) => {
            // 如果餐厅禁用，则不能选中
            const statusInfo = restaurantStatusMap[restaurant.restaurantId];
            if (statusInfo && statusInfo.disabled) {
                restaurant.selected = false;
                // 同时禁用所有商品的选择
                if (restaurant.items && restaurant.items.length > 0) {
                    restaurant.items.forEach(item => {
                        item.selected = false;
                    });
                }
            } else {
                // 正常逻辑
                restaurant.selected =
                    restaurant.items.length > 0 &&
                    restaurant.items.every((item) => item.selected);
            }
        });
        this.setData({ cartData });
    },
  
    // 切换全选状态
    toggleAllSelection: function() {
        const newAllSelectedState = !this.data.allSelected;
        const cartData = this.data.cartData;
        const restaurantStatusMap = this.data.restaurantStatusMap;
        
        cartData.forEach(restaurant => {
            // 跳过禁用状态的餐厅
            const statusInfo = restaurantStatusMap[restaurant.restaurantId];
            if (statusInfo && statusInfo.disabled) {
                restaurant.selected = false;
                if (restaurant.items && restaurant.items.length > 0) {
                    restaurant.items.forEach(item => {
                        item.selected = false;
                    });
                }
                return;
            }
            
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
        const cartData = this.data.cartData;
        const restaurantStatusMap = this.data.restaurantStatusMap;
        
        // 只计算可选的餐厅
        const selectableRestaurants = cartData.filter(restaurant => {
            const statusInfo = restaurantStatusMap[restaurant.restaurantId];
            return !(statusInfo && statusInfo.disabled);
        });
        
        const allSelected =
            selectableRestaurants.length > 0 &&
            selectableRestaurants.every((r) => r.selected);
        this.setData({ allSelected });
    },
  
    // 计算总价和选中数量
    calculateTotal() {
        let total = 0;
        let count = 0;
        const restaurantStatusMap = this.data.restaurantStatusMap;
      
        this.data.cartData.forEach(r => {
            // 检查餐厅是否可用
            const statusInfo = restaurantStatusMap[r.restaurantId];
            if (statusInfo && statusInfo.disabled) {
                return; // 跳过禁用状态的餐厅
            }
            
            const packing = (r.eatType === 2 ? r.packingFee : 0);
            let restaurantHasSelected = false;
      
            r.items.forEach(item => {
                if (item.selected) {
                    total += parseFloat(item.dishPrice) * item.quantity;
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
        
        // 检查餐厅状态
        const statusInfo = this.data.restaurantStatusMap[item.restaurantId];
        if (statusInfo && statusInfo.disabled) {
            wx.showToast({
                title: "餐厅" + statusInfo.statusText + "，无法操作商品",
                icon: "none"
            });
            return;
        }
        
        const newQuantity = item.quantity + 1;
        console.log('增加数量:', item.dishId, '新数量:', newQuantity);
        this.updateCartQuantity(item, newQuantity);
    },

    // 减少商品数量（修改）
    decreaseQuantity: function(e) {
        const item = e.currentTarget.dataset.item;
        
        // 检查餐厅状态
        const statusInfo = this.data.restaurantStatusMap[item.restaurantId];
        if (statusInfo && statusInfo.disabled) {
            wx.showToast({
                title: "餐厅" + statusInfo.statusText + "，无法操作商品",
                icon: "none"
            });
            return;
        }
        
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
      
        const oldQuantity = item.quantity; //  保存旧值
      
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
        content: '确定要删除' + restaurant.restaurantName + '的所有商品吗？',
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

        // 检查是否有选中的商品来自禁用状态的餐厅
        const cartData = this.data.cartData;
        const restaurantStatusMap = this.data.restaurantStatusMap;
        let hasDisabledRestaurantItems = false;
        let disabledRestaurantName = "";
        
        cartData.forEach(restaurant => {
            const statusInfo = restaurantStatusMap[restaurant.restaurantId];
            if (statusInfo && statusInfo.disabled) {
                // 检查该餐厅是否有选中的商品
                const hasSelected = restaurant.items.some(item => item.selected);
                if (hasSelected) {
                    hasDisabledRestaurantItems = true;
                    disabledRestaurantName = restaurant.restaurantName;
                }
            }
        });
        
        if (hasDisabledRestaurantItems) {
            const statusText = restaurantStatusMap[disabledRestaurantName] ? 
                restaurantStatusMap[disabledRestaurantName].statusText : "";
            wx.showToast({
                title: disabledRestaurantName + statusText + "，无法结算",
                icon: "none"
            });
            return;
        }

        const app = getApp();
        // 使用 JSON 序列化/反序列化来深度复制对象
        app.globalData.cartCache = JSON.parse(JSON.stringify(this.data.cartData));
        app.globalData.shouldRestoreCart = true;
        
        // 收集选中的商品
        const selectedItems = [];
        
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
        const restaurants = [];
        for (const key in checkoutRestaurants) {
            const restaurant = checkoutRestaurants[key];
            const dishSubTotal = restaurant.items.reduce(function(sum, item) {
                return sum + (parseFloat(item.dishPrice) * parseInt(item.quantity));
            }, 0);
            
            const packingFee = parseFloat(restaurant.packingFee) || 0;
            
            const subTotal = dishSubTotal + packingFee;
            totalAmount += subTotal;
            
            // 避免使用展开运算符
            const restaurantData = {
                restaurantId: restaurant.restaurantId,
                restaurantName: restaurant.restaurantName,
                eatType: restaurant.eatType,
                packingFee: packingFee,
                items: restaurant.items,
                dishSubTotal: dishSubTotal.toFixed(2),
                subTotal: subTotal.toFixed(2),
                packingFee: packingFee.toFixed(2)
            };
            
            restaurants.push(restaurantData);
        }
        
        // 准备订单数据
        const orderData = {
            restaurants: restaurants,
            totalAmount: totalAmount.toFixed(2),
            selectedCount: this.data.selectedCount
        };
        
        console.log('结算数据:', orderData);
        
        // 跳转到提交订单页面
        wx.navigateTo({
            url: '/pages/submitOrder/submitOrder?data=' + encodeURIComponent(JSON.stringify(orderData))
        });
    },
  
    goDishDetail(e) {
        const dishId = e.currentTarget.dataset.id;
        const restaurantId = e.currentTarget.dataset.restaurant;
      
        wx.navigateTo({
          url: '/pages/dish-detail/dish-detail?id=' + dishId + '&restaurantId=' + restaurantId
        });
      },
    // 去逛逛
    goToRestaurants: function() {
      wx.switchTab({
        url: '/pages/index/index'
      });
    },
    // 点击餐厅名称跳转到餐厅详情页
    goToRestaurant(e) {
        const restaurantId = e.currentTarget.dataset.restaurantid;
        wx.navigateTo({
            url: `/pages/restaurant-detail/restaurant-detail?id=${restaurantId}`
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