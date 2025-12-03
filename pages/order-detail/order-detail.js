Page({
    data: {
        orderId: null,
        order: null,
        restaurant: {},
        orderItems: [],
        subTotal: 0,
        packingFee: 0,
        loading: true,
        estimateDeliveryTime: '30-45分钟',
        statusInfo: {
            icon: '',
            text: '',
            desc: ''
        },
        showPaymentModal: false,
        isPaying: false,
        hasReview: false,
        canReview: false,
    },

    onLoad: function(options) {
        console.log("订单详情页面参数:", options);

        let orderId = options.orderId || options.id;

        if (orderId) {
            this.setData({ orderId });
            this.loadOrderDetail(orderId);
        } else {
            wx.showToast({
                title: "订单ID不存在",
                icon: "none",
                success: () => setTimeout(() => wx.navigateBack(), 1500)
            });
        }
    },

    /** 加载订单详情 */
    loadOrderDetail: function(orderId) {
        const app = getApp();
        this.setData({ loading: true });

        wx.request({
            url: app.globalData.baseUrl + "/order/detail/" + orderId,
            method: "GET",
            success: res => {
                console.log("订单详情完整响应:", res.data);
                this.setData({ loading: false });

                if (res.data.code === 200) {
                    this.processOrderData(res.data.data);
                } else {
                    wx.showToast({
                        title: "加载失败：" + (res.data.message || "未知错误"),
                        icon: "none"
                    });
                }
            },
            fail: err => {
                this.setData({ loading: false });
                wx.showToast({ title: "网络错误", icon: "none" });
            }
        });
    },

    /** 处理订单数据 */
    processOrderData: function(orderData) {
        const order = orderData.order;
        const restaurant = orderData.restaurant || {};
        let orderItems = orderData.orderItems || [];
    
        orderItems = orderItems.map(item => ({
            ...item,
            uiImage: item.dishImageUrl || "/images/logo.png",
            uiName: item.dishName || "未命名商品",
            uiPrice: Number(item.dishPrice || 0).toFixed(2)
        }));
    
        const subTotal = orderItems.reduce(
            (total, item) => total + item.dishPrice * item.quantity,
            0
        );
    
        const packingFee = Number(order.packingFee || 0);   // ⭐ 只保留打包费
    
        const statusInfo = this.calculateStatusInfo(order.status);
    
        this.setData({
            order,
            restaurant,
            orderItems,
            subTotal: subTotal.toFixed(2),
            packingFee: packingFee.toFixed(2),
            statusInfo
        });
        this.checkReviewStatus(order.id, order.createdTime);
    },

    /** 订单状态文本与图标 */
    calculateStatusInfo: function(status) {
        const s = Number(status);
        const iconMap = {
            1: "/images/order-pending.png",
            2: "/images/order-processing.png",
            3: "/images/order-completed.png",
            4: "/images/order-cancelled.png"
        };

        const textMap = {
            1: "待支付",
            2: "待处理",
            3: "已完成",
            4: "已取消"
        };

        const descMap = {
            1: "请尽快完成支付",
            2: "餐厅正在准备您的订单",
            3: "订单已完成，感谢您的惠顾",
            4: "订单已取消"
        };

        return {
            icon: iconMap[s],
            text: textMap[s],
            desc: descMap[s]
        };
    },

    /** 支付按钮 */
    onPayNow() {
        if (!this.data.isPaying) {
            this.setData({ showPaymentModal: true });
        }
    },

    /** 确认支付 */
    onConfirmPayment() {
        const orderId = this.data.orderId;
        const app = getApp();

        this.setData({ isPaying: true, showPaymentModal: false });

        wx.showLoading({ title: "支付中...", mask: true });

        wx.request({
            url: app.globalData.baseUrl + `/order/pay/${orderId}`,
            method: "POST",
            success: res => {
                wx.hideLoading();
                this.setData({ isPaying: false });

                if (res.data.code === 200) {
                    wx.showToast({
                        title: "支付成功",
                        icon: "success",
                        success: () => this.loadOrderDetail(orderId)
                    });
                } else {
                    wx.showToast({
                        title: "支付失败: " + (res.data.message || "未知错误"),
                        icon: "none"
                    });
                }
            },
            fail: err => {
                wx.hideLoading();
                this.setData({ isPaying: false });
                wx.showToast({ title: "网络错误", icon: "none" });
            }
        });
    },

    // 取消支付
    onCancelPayment() {
        this.setData({ showPaymentModal: false });
    },

    hidePaymentModal() {
        this.setData({ showPaymentModal: false });
    },

    onBack() {
        wx.navigateBack();
    },

    onContactService() {
        wx.makePhoneCall({ phoneNumber: "4001234567" });
    },

    onReorder() {
        const id = this.data.restaurant.id;
        if (id) {
            wx.navigateTo({
                url: `/pages/restaurant-detail/restaurant-detail?id=${id}`
            });
        }
    },

    onCancelOrder() {
        const orderStatus = this.data.order.status;
        
        if (orderStatus === 1 || orderStatus === 2) { // 判断状态是待支付或者待处理
            wx.showModal({
                title: "确认取消？",
                content: "确定要取消这个订单吗？",
                confirmColor: "#ff6b35",
                success: res => {
                    if (res.confirm) {
                        this.cancelOrder();
                    }
                }
            });
        } else {
            wx.showToast({
                title: "此订单无法取消",
                icon: "none"
            });
        }
    },

    cancelOrder() {
        const app = getApp();

        wx.showLoading({ title: "取消中..." });

        wx.request({
            url: app.globalData.baseUrl + "/order/cancel/" + this.data.orderId,
            method: "POST",
            success: res => {
                wx.hideLoading();
                if (res.data.code === 200) {
                    wx.showToast({
                        title: "订单已取消",
                        success: () => this.loadOrderDetail(this.data.orderId)
                    });
                }
            }
        });
    },
    checkReviewStatus(orderId, createdTime) {
        const app = getApp();
        const userId = app.globalData.userInfo.id;
    
        wx.request({
            url: app.globalData.baseUrl + "/review/list",
            method: "GET",
            data: { restaurantId: this.data.restaurant.id },
            success: res => {
                let reviewed = false;
                if (res.data.code === 200) {
                    const list = res.data.data || [];
                    reviewed = list.some(r => r.order_id === orderId || r.orderId === orderId);
                }
    
                // 是否超过 24 小时
                const orderTime = new Date(createdTime.replace(/-/g, "/"));
                const now = new Date();
                const diffHours = (now - orderTime) / 3600000;
                const expire = diffHours > 24;
    
                this.setData({
                    hasReview: reviewed,
                    canReview: !reviewed && !expire && this.data.order.status === 3 // 3 = 已完成
                });
            }
        });
    },
    goReview() {
        wx.navigateTo({
            url: `/pages/review/review?orderId=${this.data.orderId}&restaurantId=${this.data.restaurant.id}`
        });
    },
    stopPropagation() {}
});
