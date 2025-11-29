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

        // 处理每家餐厅的金额
        restaurants = restaurants.map(restaurant => {
            let dishTotal = 0;

            // 给每个菜品计算 totalPrice
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

            // 使用从购物车传递过来的配送费和打包费
            const deliveryFee = Number(restaurant.deliveryFee || 0).toFixed(2);
            const packingFee = Number(restaurant.packingFee || 0).toFixed(2);
            const discount = Number(restaurant.discount || 0).toFixed(2);
            
            // 计算小计：菜品总价 + 打包费 + 配送费 - 优惠
            const subTotal = (dishTotal + Number(packingFee) + Number(deliveryFee) - Number(discount)).toFixed(2);

            return {
                ...restaurant,
                items,
                dishSubTotal: dishTotal.toFixed(2), // 菜品小计
                packingFee,
                deliveryFee,
                discount,
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
            totalAmount: totalAmount
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
                    deliveryFee: parseFloat(restaurant.deliveryFee)
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
                        deliveryFee: parseFloat(restaurant.deliveryFee)
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

    // 判断是单个订单还是多个订单
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
            console.log('创建订单响应:', res.data);

            if (res.data.code === 200) {
                const result = res.data.data;
                
                // 清空购物车
                this.clearCartAfterOrder();

                // 多个订单和单个订单的处理
                if (isMultipleOrders) {
                    // 多个订单，跳转到订单历史页面
                    wx.showToast({
                        title: '订单提交成功',
                        icon: 'success',
                        duration: 1500,
                        success: () => {
                            setTimeout(() => {
                                wx.redirectTo({
                                    url: '/pages/order-history/order-history'
                                });
                            }, 1500);
                        }
                    });
                } else {
                    // 单个订单，显示支付确认弹窗
                    const orderId = result.id;
                    wx.showModal({
                        title: '确认支付',
                        content: `是否立即支付订单？订单金额：¥${result.totalAmount}`,
                        confirmText: '确认支付',
                        cancelText: '取消支付',
                        success: (res) => {
                            if (res.confirm) {
                                // 用户确认支付，调用支付接口
                                this.payOrder(orderId);
                            } else {
                                // 用户取消支付，直接跳转到订单详情页面
                                wx.redirectTo({
                                    url: `/pages/order-detail/order-detail?orderId=${orderId}`
                                });
                            }
                        }
                    });
                }
            } else {
                wx.showToast({
                    title: '创建订单失败: ' + (res.data.message || '未知错误'),
                    icon: 'none',
                    duration: 3000
                });
                this.setData({ loading: false });
            }
        },
        fail: (err) => {
            wx.hideLoading();
            console.error('创建订单请求失败:', err);
            wx.showToast({
                title: '网络错误，请重试',
                icon: 'none'
            });
            this.setData({ loading: false });
        }
    });
},

// 支付订单
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
                    duration: 1500,
                    success: () => {
                        // 跳转到订单详情页面
                        setTimeout(() => {
                            wx.redirectTo({
                                url: `/pages/order-detail/order-detail?orderId=${orderId}`
                            });
                        }, 1500);
                    }
                });
            } else {
                wx.showToast({
                    title: '支付失败: ' + (res.data.message || '未知错误'),
                    icon: 'none',
                    duration: 3000
                });
                // 支付失败也跳转到订单详情页面
                setTimeout(() => {
                    wx.redirectTo({
                        url: `/pages/order-detail/order-detail?orderId=${orderId}`
                    });
                }, 1500);
            }
        },
        fail: (err) => {
            wx.hideLoading();
            console.error('支付请求失败:', err);
            wx.showToast({
                title: '网络错误，请重试',
                icon: 'none'
            });
            // 网络错误也跳转到订单详情页面
            setTimeout(() => {
                wx.redirectTo({
                    url: `/pages/order-detail/order-detail?orderId=${orderId}`
                });
            }, 1500);
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