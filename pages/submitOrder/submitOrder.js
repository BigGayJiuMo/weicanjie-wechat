Page({
    data: {
        orderList: [],
        orderCount: 0,
        totalAmount: "0.00",
        loading: false,
        remarkDialogVisible: false,
        remarkTemp: "", 
        selectedRestaurantId: null,  
        canEditRemark: false,  
    },

    onLoad(options) {
        if (options.data) {
            const decoded = decodeURIComponent(options.data);
            const orderData = JSON.parse(decoded);

            console.log("提交订单页面收到数据:", orderData);
            this.processOrderData(orderData);
        }
    },

    /** 处理订单数据 */
    processOrderData(orderData) {
        let restaurants = orderData.restaurants || [];
        let count = restaurants.length;
    
        restaurants = restaurants.map(restaurant => {
          let dishTotal = 0;
    
          const items = restaurant.items.map(dish => {
            const price = Number(dish.dishPrice || dish.price || 0);
            const quantity = Number(dish.quantity || 1);
            const totalPrice = (price * quantity).toFixed(2);
            dishTotal += price * quantity;
    
            return { ...dish, totalPrice };
          });
    
          const eatType = restaurant.eatType || 2;
          const packingFee = eatType == 1 ? 0 : Number(restaurant.packingFee || 0);
    
          return {
            ...restaurant,
            eatType,
            items,
            dishSubTotal: dishTotal.toFixed(2),
            packingFee: packingFee.toFixed(2),
            subTotal: (dishTotal + packingFee).toFixed(2),
            remarkShort: restaurant.remark ? restaurant.remark.substring(0, 10) + '...' : '无备注',
          };
        });
    
        const totalAmount = restaurants
          .reduce((sum, r) => sum + Number(r.subTotal), 0)
          .toFixed(2);
    
        this.setData({
          orderList: restaurants,
          orderCount: count,
          totalAmount
        });
      },    

    onBack() {
        wx.navigateBack();
    },

    /** 修改备注 */
  openRemarkDialog(e) {
    const restaurantId = e.currentTarget.dataset.restaurantId;
    const remark = this.data.orderList.find(r => r.restaurantId === restaurantId).remark || '';
    this.setData({
      remarkDialogVisible: true,
      remarkTemp: remark,
      selectedRestaurantId: restaurantId
    });
  },

  /** 输入框的备注内容改变时 */
  onRemarkInputChange(e) {
    this.setData({
      remarkTemp: e.detail.value
    });
  },

  /** 关闭备注输入框 */
  closeRemarkDialog() {
    this.setData({ remarkDialogVisible: false });
  },

  /** 提交备注 */
  submitRemark() {
    const selectedRestaurantId = this.data.selectedRestaurantId;
    const newRemark = this.data.remarkTemp;

    // 更新备注
    const updatedOrderList = this.data.orderList.map(restaurant => {
      if (restaurant.restaurantId === selectedRestaurantId) {
        restaurant.remark = newRemark;
        restaurant.remarkShort = newRemark.length > 10 ? newRemark.substring(0, 10) + "..." : newRemark;
      }
      return restaurant;
    });

    this.setData({
      orderList: updatedOrderList,
      remarkDialogVisible: false
    });
  },

    /** 提交订单 */
    submitOrder() {
        if (this.data.loading) return;

        this.setData({ loading: true });
        wx.showLoading({ title: "提交中..." });

        const app = getApp();
        const userInfo = app.globalData.userInfo;

        if (!userInfo || !userInfo.id) {
            wx.hideLoading();
            this.setData({ loading: false });
            wx.showModal({
                title: "登录提示",
                content: "请先登录后再提交订单",
                confirmText: "去登录",
                success: r => {
                    if (r.confirm) wx.navigateTo({ url: "/pages/auth/auth" });
                }
            });
            return;
        }

        const orderData = this.prepareOrderData();
        this.createOrderAndShowPayment(orderData);
    },

    /** 构造订单数据 */
    prepareOrderData() {
        const userId = getApp().globalData.userInfo.id;

        if (this.data.orderCount === 1) {
            const r = this.data.orderList[0];
            return {
                order: {
                    userId,
                    restaurantId: r.restaurantId,
                    totalAmount: parseFloat(r.subTotal),
                    packingFee: parseFloat(r.packingFee),
                    eatType: r.eatType
                },
                items: this.generateOrderItemsForSubmit(r)
            };
        }

        return {
            restaurants: this.data.orderList.map(r => ({
                order: {
                    userId,
                    restaurantId: r.restaurantId,
                    totalAmount: parseFloat(r.subTotal),
                    packingFee: parseFloat(r.packingFee),
                    eatType: r.eatType
                },
                items: this.generateOrderItemsForSubmit(r)
            }))
        };
    },

    generateOrderItemsForSubmit(r) {
        return r.items.map(dish => ({
            dishId: dish.dishId || dish.id,
            dishName: dish.dishName || dish.name,
            dishPrice: parseFloat(dish.dishPrice || dish.price),
            dishImageUrl: dish.dishImageUrl || dish.imageUrl,
            quantity: parseInt(dish.quantity),
            subtotal: parseFloat(dish.totalPrice)
        }));
    },

    /** 创建订单 & 支付确认 */
    createOrderAndShowPayment(orderData) {
        const app = getApp();
        const isMultiple = orderData.restaurants;
        const url = isMultiple ? "/order/create/batch" : "/order/create";

        wx.request({
            url: app.globalData.baseUrl + url,
            method: "POST",
            header: { "content-type": "application/json" },
            data: orderData,

            success: res => {
                wx.hideLoading();

                if (res.data.code !== 200) {
                    wx.showToast({ title: "创建订单失败", icon: "none" });
                    return;
                }

                const data = res.data.data;

                // 下单成功 → 不再恢复购物车缓存
                app.globalData.shouldRestoreCart = false;

                // 删除购物车对应菜品
                this.removeOrderedItems(orderData);

                if (isMultiple) {
                    const ordersArray = data.orders || data;

                    wx.showModal({
                        title: "确认支付",
                        content: `共提交 ${ordersArray.length} 单，总金额 ¥${this.data.totalAmount}`,
                        confirmText: "确认支付",
                        success: r => {
                            if (!r.confirm) {
                                wx.redirectTo({ url: "/pages/orders/orders" });
                                return;
                            }

                            // 批量支付
                            let tasks = ordersArray.map(o =>
                                new Promise(resolve => {
                                    wx.request({
                                        url: app.globalData.baseUrl + `/order/pay/${o.id}`,
                                        method: "POST",
                                        success: () => resolve(),
                                        fail: () => resolve()
                                    });
                                })
                            );

                            Promise.all(tasks).then(() => {
                                wx.showToast({ title: "支付成功" });
                                setTimeout(() => {
                                    wx.redirectTo({ url: "/pages/orders/orders" });
                                }, 800);
                            });
                        }
                    });
                    return;
                }

                // 单订单
                const orderId = data.id;

                wx.showModal({
                    title: "确认支付",
                    content: `是否立即支付订单？\n订单金额：¥${data.totalAmount}`,
                    confirmText: "确认支付",
                    cancelText: "取消支付",
                    confirmColor: "#ff6b35",
                    success: r => {
                        if (r.confirm) this.payOrder(orderId);
                        else {
                            wx.redirectTo({
                                url: `/pages/order-detail/order-detail?orderId=${orderId}`
                            });
                        }
                    }
                });
            }
        });
    },

    /** 支付 */
    payOrder(orderId) {
        const app = getApp();

        wx.showLoading({ title: "支付中..." });

        wx.request({
            url: app.globalData.baseUrl + `/order/pay/${orderId}`,
            method: "POST",
            success: () => {
                wx.hideLoading();
                wx.showToast({ title: "支付成功" });

                setTimeout(() => {
                    wx.redirectTo({
                        url: `/pages/order-detail/order-detail?orderId=${orderId}`
                    });
                }, 800);
            }
        });
    },

    /** 删除购物车对应菜品 */
    removeOrderedItems(orderData) {
        const userId = getApp().globalData.userInfo.id;

        if (orderData.restaurants) {
            orderData.restaurants.forEach(r => {
                r.items.forEach(item => {
                    this.removeSingleCartItem(userId, r.order.restaurantId, item.dishId);
                });
            });
        } else {
            const rid = orderData.order.restaurantId;
            orderData.items.forEach(item => {
                this.removeSingleCartItem(userId, rid, item.dishId);
            });
        }
    },

    removeSingleCartItem(userId, restaurantId, dishId) {
        const app = getApp();
        wx.request({
            url: app.globalData.baseUrl + "/cart/remove",
            method: "POST",
            header: { "content-type": "application/json" },
            data: { userId, restaurantId, dishId }
        });
    }
});
