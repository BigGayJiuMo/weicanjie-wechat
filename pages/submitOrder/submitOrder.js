Page({
    data: {
      orderList: [],
      orderCount: 0,
      totalAmount: "0.00",
      loading: false
    },
  
    onLoad(options) {
        if (options.data) {
          const decoded = decodeURIComponent(options.data);
          const orderData = JSON.parse(decoded);
      
          console.log("提交订单页面收到数据:", orderData);
          this.processOrderData(orderData);
        }
    },

    // 处理订单数据
    processOrderData(orderData) {
        let restaurants = orderData.restaurants || [];
        let count = restaurants.length;
    
        restaurants = restaurants.map(restaurant => {
            let dishTotal = 0;
    
            // 计算菜品小计
            const items = restaurant.items.map(dish => {
                const price = Number(dish.dishPrice || dish.price || 0);
                const quantity = Number(dish.quantity || 1);
                const totalPrice = (price * quantity).toFixed(2);
    
                dishTotal += price * quantity;
    
                return {
                    ...dish,
                    totalPrice
                };
            });
    
            // 🔥 重点：接收 eatType
            const eatType = restaurant.eatType || 2;
    
            // 堂食不收打包费
            const packingFee = eatType == 1 ? 0 : Number(restaurant.packingFee || 0);
    
            // ❌ 删除配送费
            // ❌ 删除优惠
    
            const subTotal = (dishTotal + packingFee).toFixed(2);
    
            return {
                ...restaurant,
                eatType,
                items,
                dishSubTotal: dishTotal.toFixed(2),
                packingFee: packingFee.toFixed(2),
                subTotal
            };
        });
    
        // 计算总金额
        const totalAmount = restaurants.reduce((sum, restaurant) => {
            return sum + Number(restaurant.subTotal || 0);
        }, 0).toFixed(2);
    
        this.setData({
            orderList: restaurants,
            orderCount: count,
            totalAmount
        });
    },

    onBack() {
      wx.navigateBack();
    },

    // 提交订单 - 修改后的核心逻辑
    // 提交订单
submitOrder() {
    if (this.data.loading) return;
    
    this.setData({ loading: true });
    wx.showLoading({ title: "提交中..." });

    const app = getApp();
    const userInfo = app.globalData.userInfo;

    // 检查登录状态
    if (!userInfo || !userInfo.id) {
        wx.hideLoading();
        this.setData({ loading: false });
        wx.showModal({
            title: '登录提示',
            content: '请先登录后再提交订单',
            confirmText: '去登录',
            cancelText: '稍后',
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

    // 准备订单数据
    const orderData = this.prepareOrderData();
    
    // 调用创建订单接口
    this.createOrderAndShowPayment(orderData);
},

    
    // 准备订单数据 - 与餐厅详情页保持一致
    prepareOrderData() {
        const app = getApp();
        const userInfo = app.globalData.userInfo;
        
        // 如果是单个餐厅，使用与餐厅详情页相同的格式
        if (this.data.orderCount === 1) {
            const restaurant = this.data.orderList[0];
            const orderItems = this.generateOrderItemsForSubmit(restaurant);
            
            return {
                order: {
                    userId: userInfo.id,
                    restaurantId: restaurant.restaurantId,
                    totalAmount: parseFloat(restaurant.subTotal),
                    packingFee: parseFloat(restaurant.packingFee),
                    eatType: restaurant.eatType
                },
                items: orderItems
            };
        } else {
            // 多个餐厅的情况
            return {
                restaurants: this.data.orderList.map(restaurant => ({
                    order: {
                        userId: userInfo.id,
                        restaurantId: restaurant.restaurantId,
                        totalAmount: parseFloat(restaurant.subTotal),
                        packingFee: parseFloat(restaurant.packingFee),
                        eatType: restaurant.eatType
                    },
                    items: this.generateOrderItemsForSubmit(restaurant)
                }))
            };
        }
    },
    
    // 生成提交订单的订单项数据 - 与餐厅详情页保持一致
    generateOrderItemsForSubmit(restaurant) {
        const orderItems = [];
        
        restaurant.items.forEach(dish => {
            orderItems.push({
                dishId: dish.dishId || dish.id,
                dishName: dish.dishName || dish.name,
                dishPrice: parseFloat(dish.dishPrice || dish.price),
                dishImageUrl: dish.dishImageUrl || dish.imageUrl,
                quantity: parseInt(dish.quantity),
                subtotal: parseFloat(dish.totalPrice)
            });
        });
        
        return orderItems;
    },
    
    // 创建订单并显示支付确认
    createOrderAndShowPayment(orderData) {
        const app = getApp();
    
        wx.showLoading({
            title: '创建订单中...',
            mask: true
        });
    
        const isMultipleOrders = orderData.restaurants;
        const url = isMultipleOrders ? '/order/create/batch' : '/order/create';
    
        wx.request({
            url: app.globalData.baseUrl + url,
            method: 'POST',
            header: {
                'content-type': 'application/json'
            },
            data: orderData,
            success: (res) => {
                wx.hideLoading();
    
                if (res.data.code !== 200) {
                    wx.showToast({
                        title: '创建订单失败',
                        icon: 'none'
                    });
                    return;
                }
    
                const data = res.data.data;
    
                // 清空购物车
                this.clearCartAfterOrder();
    
                /** ----------------------------------
                   多餐厅订单：结构为 { orders:[...] }
                   统一弹窗模拟支付 → 然后跳 pages/orders/orders
                 -----------------------------------*/
                 if (isMultipleOrders) {

                    // 后端可能返回 {orders:[...]} 或直接返回数组
                    const ordersArray = data.orders || data || [];
                    const orderCount = Array.isArray(ordersArray) ? ordersArray.length : 1;
                
                    wx.showModal({
                        title: '确认支付',
                        content: `本次共提交 ${orderCount} 单，总金额 ¥${this.data.totalAmount}`,
                        confirmText: '确认支付',
                        cancelText: '取消支付',
                        confirmColor: '#ff6b35',
                        success: (res) => {
                
                            if (!res.confirm) {
                                // 用户取消支付 → 直接跳订单列表
                                wx.redirectTo({ url: '/pages/orders/orders' });
                                return;
                            }
                
                            // -------------------------------
                            //  🔥 批量支付（逐个调用 /order/pay/{id}）
                            // -------------------------------
                            const app = getApp();
                
                            let payTasks = ordersArray.map(order =>
                                new Promise((resolve) => {
                                    wx.request({
                                        url: app.globalData.baseUrl + `/order/pay/${order.id}`,
                                        method: 'POST',
                                        success: () => resolve(true),
                                        fail: () => resolve(false)
                                    });
                                })
                            );
                
                            // 等待全部支付完成
                            Promise.all(payTasks).then(() => {
                                wx.showToast({
                                    title: '支付成功',
                                    icon: 'success',
                                    duration: 1200
                                });
                
                                setTimeout(() => {
                                    wx.redirectTo({
                                        url: '/pages/orders/orders'
                                    });
                                }, 1200);
                            });
                        }
                    });
                
                    return;
                }
    
                /** 单餐厅订单，data 结构为 Order 对象 */
                const orderId = data.id;
    
                wx.showModal({
                    title: '确认支付',
                    content: `是否立即支付订单？订单金额：¥${data.totalAmount}`,
                    confirmText: '确认支付',
                    cancelText: '取消支付',
                    confirmColor: '#ff6b35',
                    success: (modalRes) => {
                        if (modalRes.confirm) {
                            this.payOrder(orderId);
                        } else {
                            wx.redirectTo({
                                url: `/pages/order-detail/order-detail?orderId=${orderId}`
                            });
                        }
                    }
                });
            },
            fail: () => {
                wx.hideLoading();
                wx.showToast({
                    title: '网络错误',
                    icon: 'none'
                });
            }
        });
    },

// 支付订单
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
                    duration: 1500,
                    success: () => {
                        setTimeout(() => {
                            wx.redirectTo({
                                url: `/pages/order-detail/order-detail?orderId=${orderId}`
                            });
                        }, 1500);
                    }
                });
            } else {
                wx.showToast({
                    title: '支付失败',
                    icon: 'none',
                    duration: 1500,
                    success: () => {
                        setTimeout(() => {
                            wx.redirectTo({
                                url: `/pages/order-detail/order-detail?orderId=${orderId}`
                            });
                        }, 1500);
                    }
                });
            }
        },
        fail: () => {
            wx.hideLoading();
            wx.showToast({
                title: '网络错误',
                icon: 'none',
                duration: 1500,
                success: () => {
                    setTimeout(() => {
                        wx.redirectTo({
                            url: `/pages/order-detail/order-detail?orderId=${orderId}`
                        });
                    }, 1500);
                }
            });
        }
    });
},

    // 创建订单后清空购物车 - 与餐厅详情页保持一致
    clearCartAfterOrder() {
        const app = getApp();
        const userInfo = app.globalData.userInfo;
        
        if (!userInfo) return;
        
        // 清空服务器购物车
        wx.request({
            url: app.globalData.baseUrl + '/cart/clear',
            method: 'POST',
            header: {
                'content-type': 'application/json'
            },
            data: {
                userId: userInfo.id
            },
            success: (res) => {
                console.log('清空购物车响应:', res.data);
            },
            fail: (err) => {
                console.error('清空购物车失败:', err);
            }
        });
    }
});