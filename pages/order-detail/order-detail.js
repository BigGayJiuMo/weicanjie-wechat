Page({
    data: {
        orderId: null,
        order: null,
        restaurant: {},
        orderItems: [],
        subTotal: 0,
        deliveryFee: 0,
        packingFee: 0,
        loading: true,
        estimateDeliveryTime: '30-45分钟',
        statusInfo: {
            icon: '',
            text: '',
            desc: ''
        },
        showPaymentModal: false,
        isPaying: false
    },

    onLoad: function(options) {
        console.log('订单详情页面参数:', options);
        
        let orderId = null;
        
        if (options.orderId) {
            orderId = options.orderId;
        } else if (options.id) {
            orderId = options.id;
        }
        
        if (orderId) {
            this.setData({
                orderId: orderId
            });
            this.loadOrderDetail(orderId);
        } else {
            wx.showToast({
                title: '订单ID不存在',
                icon: 'none',
                success: () => {
                    setTimeout(() => {
                        wx.navigateBack();
                    }, 1500);
                }
            });
        }
    },

    // 加载订单详情
    loadOrderDetail: function(orderId) {
        const app = getApp();
        this.setData({ loading: true });
    
        wx.request({
            url: app.globalData.baseUrl + '/order/' + orderId,
            method: 'GET',
            success: (res) => {
                console.log('订单详情完整响应:', res.data);
                this.setData({ loading: false });
    
                if (res.data.code === 200 && res.data.data) {
                    this.processOrderData(res.data.data);
                } else {
                    wx.showToast({
                        title: '获取订单失败: ' + (res.data.message || '未知错误'),
                        icon: 'none'
                    });
                    console.error('订单详情接口返回错误:', res.data);
                }
            },
            fail: (err) => {
                console.error('请求订单详情失败:', err);
                this.setData({ loading: false });
                wx.showToast({
                    title: '网络错误，请重试',
                    icon: 'none'
                });
            }
        });
    },

    // 处理订单数据
    processOrderData: function(orderData) {
        console.log('完整的订单数据:', orderData);
        console.log('订单对象:', orderData.order || orderData);
        console.log('订单商品数据:', orderData.orderItems || (orderData.order && orderData.order.orderItems));
        
        const order = orderData.order || orderData;
        const restaurant = orderData.restaurant || order.restaurant || {};
        
        // 尝试多种可能的订单商品字段名
        let orderItems = [];
        if (orderData.orderItems) {
            orderItems = orderData.orderItems;
        } else if (order.orderItems) {
            orderItems = order.orderItems;
        } else if (order.items) {
            orderItems = order.items;
        } else if (orderData.items) {
            orderItems = orderData.items;
        }
        
        console.log('最终获取的订单商品:', orderItems);
        
        // 计算菜品小计
        const subTotal = orderItems.reduce((total, item) => {
            const price = parseFloat(item.dishPrice || item.price || 0);
            const quantity = parseInt(item.quantity || 0);
            return total + (price * quantity);
        }, 0);
        
        // 获取配送费和打包费
        const deliveryFee = parseFloat(order.deliveryFee || restaurant.deliveryFee || 0);
        const packingFee = parseFloat(order.packingFee || restaurant.packingFee || 0);
        
        // 确保订单有必要的字段
        if (!order.createdTime) {
            order.createdTime = new Date().toISOString();
        }
        
        if (!order.orderNumber) {
            order.orderNumber = 'ORD' + Date.now();
        }
    
        // 计算状态信息
        const statusInfo = this.calculateStatusInfo(order.status);
    
        this.setData({
            order: order,
            restaurant: restaurant,
            orderItems: orderItems,
            subTotal: subTotal.toFixed(2),
            deliveryFee: deliveryFee.toFixed(2),
            packingFee: packingFee.toFixed(2),
            statusInfo: statusInfo
        });
    
        console.log('设置到页面的数据:', {
            orderItems: this.data.orderItems,
            subTotal: this.data.subTotal
        });
    },

    // 计算状态信息
    calculateStatusInfo: function(status) {
        const statusNum = parseInt(status);
        
        const iconMap = {
            1: '/images/order-pending.png',
            2: '/images/order-processing.png',
            3: '/images/order-delivering.png',
            4: '/images/order-completed.png',
            5: '/images/order-cancelled.png'
        };
        
        const textMap = {
            1: '待支付',
            2: '待处理',
            3: '配送中',
            4: '已完成',
            5: '已取消'
        };
        
        const descMap = {
            1: '请尽快完成支付',
            2: '餐厅正在准备您的订单',
            3: '骑手正在火速配送中',
            4: '订单已完成，感谢您的惠顾',
            5: '订单已取消'
        };
        
        return {
            icon: iconMap[statusNum] || '/images/order-pending.png',
            text: textMap[statusNum] || '未知状态',
            desc: descMap[statusNum] || ''
        };
    },

    // 立即支付
    onPayNow: function() {
        if (this.data.isPaying) return;
        
        this.setData({
            showPaymentModal: true
        });
    },

    // 确认支付
    onConfirmPayment: function() {
        const that = this;
        
        this.setData({
            isPaying: true,
            showPaymentModal: false
        });
        
        wx.showLoading({
            title: '支付中...',
            mask: true
        });
        
        wx.request({
            url: getApp().globalData.baseUrl + `/order/pay/${this.data.orderId}`,
            method: 'POST',
            success: (res) => {
                wx.hideLoading();
                console.log('支付响应:', res.data);
                
                that.setData({
                    isPaying: false
                });
                
                if (res.data.code === 200) {
                    wx.showToast({
                        title: '支付成功',
                        icon: 'success',
                        duration: 1500,
                        success: () => {
                            // 刷新订单详情
                            that.loadOrderDetail(that.data.orderId);
                        }
                    });
                } else {
                    wx.showToast({
                        title: '支付失败: ' + (res.data.message || '未知错误'),
                        icon: 'none',
                        duration: 3000
                    });
                }
            },
            fail: (err) => {
                wx.hideLoading();
                console.error('支付请求失败:', err);
                
                that.setData({
                    isPaying: false
                });
                
                wx.showToast({
                    title: '网络错误，请重试',
                    icon: 'none'
                });
            }
        });
    },

    // 取消支付
    onCancelPayment: function() {
        this.setData({
            showPaymentModal: false
        });
    },

    // 隐藏支付弹窗
    hidePaymentModal: function() {
        this.setData({
            showPaymentModal: false
        });
    },

    // 返回上一页
    onBack: function() {
        wx.navigateBack();
    },

    // 联系客服/骑手
    onContactService: function() {
        wx.makePhoneCall({
            phoneNumber: '4001234567',
            success: () => {
                console.log('拨打客服电话成功');
            },
            fail: () => {
                wx.showToast({
                    title: '拨打失败',
                    icon: 'none'
                });
            }
        });
    },

    // 再次下单
    onReorder: function() {
        if (!this.data.restaurant.id) {
            wx.showToast({
                title: '餐厅信息不完整',
                icon: 'none'
            });
            return;
        }

        wx.navigateTo({
            url: `/pages/restaurant-detail/restaurant-detail?id=${this.data.restaurant.id}`
        });
    },

    // 取消订单
    onCancelOrder: function() {
        wx.showModal({
            title: '确认取消',
            content: '确定要取消这个订单吗？',
            confirmColor: '#ff6b35',
            success: (res) => {
                if (res.confirm) {
                    this.cancelOrder();
                }
            }
        });
    },

    // 取消订单请求
    cancelOrder: function() {
        const app = getApp();
        
        wx.showLoading({
            title: '取消中...',
        });

        wx.request({
            url: app.globalData.baseUrl + '/order/cancel/' + this.data.orderId,
            method: 'POST',
            success: (res) => {
                wx.hideLoading();
                console.log('取消订单响应:', res.data);

                if (res.data.code === 200) {
                    wx.showToast({
                        title: '订单已取消',
                        icon: 'success',
                        success: () => {
                            // 刷新页面
                            this.loadOrderDetail(this.data.orderId);
                        }
                    });
                } else {
                    wx.showToast({
                        title: '取消失败: ' + (res.data.message || '未知错误'),
                        icon: 'none'
                    });
                }
            },
            fail: (err) => {
                wx.hideLoading();
                console.error('取消订单请求失败:', err);
                wx.showToast({
                    title: '网络错误，请重试',
                    icon: 'none'
                });
            }
        });
    },

    // 阻止事件冒泡
    stopPropagation: function() {
        return;
    }
});