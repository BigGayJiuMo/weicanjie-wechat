// pages/order/order.js
Page({
    data: {
        orderId: null,
        order: null,
        restaurant: {},
        orderItems: [],
        subTotal: 0,
        deliveryFee: 0,
        loading: true,
        estimateDeliveryTime: '30-45分钟',
        // 新增：预先计算的状态信息
        statusInfo: {
            icon: '',
            text: '',
            desc: ''
        }
    },

    onLoad: function(options) {
        console.log('订单详情页面参数:', options);
        
        let orderId = null;
        
        // 多种方式获取订单ID
        if (options.id) {
            orderId = options.id;
        } else if (options.orderId) {
            orderId = options.orderId;
        } else if (options.data) {
            try {
                const orderData = JSON.parse(options.data);
                orderId = orderData.orderId || orderData.order?.id;
            } catch (error) {
                console.error('解析订单数据失败:', error);
            }
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

        console.log('开始加载订单详情，订单ID:', orderId);

        wx.request({
            url: app.globalData.baseUrl + '/order/' + orderId,
            method: 'GET',
            success: (res) => {
                console.log('订单详情响应:', res.data);
                this.setData({ loading: false });

                if (res.data.code === 200) {
                    this.processOrderData(res.data.data);
                } else {
                    wx.showToast({
                        title: '获取订单失败: ' + (res.data.message || '未知错误'),
                        icon: 'none'
                    });
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

    // 处理订单数据 - 预先计算状态信息
    processOrderData: function(orderData) {
        console.log('处理订单数据:', orderData);
        
        // 兼容不同格式的响应数据
        const order = orderData.order || orderData;
        const restaurant = orderData.restaurant || order.restaurant || {};
        const orderItems = orderData.orderItems || order.orderItems || [];
        
        // 计算菜品小计
        const subTotal = orderItems.reduce((total, item) => {
            const price = parseFloat(item.dishPrice || item.price || 0);
            const quantity = parseInt(item.quantity || 0);
            return total + (price * quantity);
        }, 0);
        
        // 获取配送费
        const deliveryFee = parseFloat(order.deliveryFee || restaurant.deliveryFee || 0);
        
        // 确保订单有必要的字段
        if (!order.createdTime) {
            order.createdTime = new Date().toISOString();
        }
        
        if (!order.orderNumber) {
            order.orderNumber = 'ORD' + Date.now();
        }
        
        // 如果订单已取消，确保状态正确
        if (order.status === 5) {
            order.payStatus = 0; // 未支付
        }

        // 预先计算状态信息
        const statusInfo = this.calculateStatusInfo(order.status);
        console.log('计算的状态信息:', statusInfo);

        this.setData({
            order: order,
            restaurant: restaurant,
            orderItems: orderItems,
            subTotal: subTotal.toFixed(2),
            deliveryFee: deliveryFee.toFixed(2),
            statusInfo: statusInfo  // 设置预先计算的状态信息
        });
    },

    // 计算状态信息
    calculateStatusInfo: function(status) {
        console.log('计算状态信息，状态值:', status);
        
        // 确保状态是数字
        const statusNum = parseInt(status);
        
        // 状态图标映射
        const iconMap = {
            1: '/images/order-pending.png',
            2: '/images/order-processing.png',
            3: '/images/order-delivering.png',
            4: '/images/order-completed.png',
            5: '/images/order-cancelled.png'
        };
        
        // 状态文本映射
        const textMap = {
            1: '待支付',
            2: '待处理',
            3: '配送中',
            4: '已完成',
            5: '已取消'
        };
        
        // 状态描述映射
        const descMap = {
            1: '请尽快完成支付',
            2: '餐厅正在准备您的订单',
            3: '骑手正在火速配送中',
            4: '订单已完成，感谢您的惠顾',
            5: '订单已取消，支付已关闭'
        };
        
        return {
            icon: iconMap[statusNum] || '/images/order-pending.png',
            text: textMap[statusNum] || '未知状态',
            desc: descMap[statusNum] || ''
        };
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

        // 跳转到餐厅详情页
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

    onReady: function() {
        // 页面渲染完成
    },

    onShow: function() {
        // 页面显示时刷新数据
        if (this.data.orderId) {
            this.loadOrderDetail(this.data.orderId);
        }
    },

    onHide: function() {
        // 页面隐藏
    },

    onUnload: function() {
        // 页面卸载
    }
});