Page({
    data: {
        orderId: null,
        order: null,
        restaurant: {},
        orderItems: [],
        subTotal: 0,
        packingFee: 0,
        loading: true,
        statusInfo: {},
        countdown: '',
        countdownTimer: null,
        hasReview: false,
        canReview: false,
        remarkDialogVisible: false,
        remarkTemp: "",
        canEditRemark: false
    },

    onLoad(options) {
        const orderId = options.orderId || options.id;
        if (!orderId) {
            wx.showToast({ title: "订单不存在", icon: "none" });
            return;
        }
        this.setData({ orderId });
        this.loadOrderDetail(orderId);
    },

    onShow() {
        if (this.data.orderId) this.loadOrderDetail(this.data.orderId);
    },

    onUnload() {
        this.clearCountdown();
    },

    /** 加载订单详情 */
    loadOrderDetail(orderId) {
        const app = getApp();
        this.setData({ loading: true });

        wx.request({
            url: app.globalData.baseUrl + "/order/detail/" + orderId,
            method: "GET",
            success: res => {
                this.setData({ loading: false });

                if (res.data.code === 200) {
                    this.processOrderData(res.data.data);
                } else {
                    wx.showToast({ title: "加载失败", icon: "none" });
                }
            },
            fail: () => {
                this.setData({ loading: false });
                wx.showToast({ title: "网络错误", icon: "none" });
            }
        });
    },

    /** 处理返回数据 */
    processOrderData(orderData) {
        const order = orderData.order;
        const restaurant = orderData.restaurant || {};
        let items = orderData.orderItems || [];
        restaurant.contactPhone = restaurant.contactPhone || "";
        // 格式化商品
        items = items.map(i => ({
            ...i,
            uiImage: i.dishImageUrl || "/images/logo.png",
            uiName: i.dishName,
            uiPrice: Number(i.dishPrice).toFixed(2)
        }));

        const sub = items.reduce(
            (sum, i) => sum + i.dishPrice * i.quantity,
            0
        );

        const statusInfo = this.getStatusInfo(order.status);
        const canEdit = [1, 2, 3].includes(order.status); 
        // 备注截断（最多 10 字）
        let remark = orderData.order.remark || "无备注";
        let remarkShort = remark.length > 10 ? remark.substring(0, 10) + "..." : remark;
        this.setData({
            order,
            restaurant,
            orderItems: items,
            subTotal: sub.toFixed(2),
            packingFee: Number(order.packingFee).toFixed(2),
            statusInfo,
            canEditRemark: canEdit,
            remarkShort
        });

        /** 倒计时（仅待支付） */
        if (order.status === 1) {
            this.startCountdown(order.createdTime);
        } else {
            this.clearCountdown();
        }

        this.checkReviewStatus(order.id, order.createdTime);
    },

    /** 倒计时：30分钟未支付自动取消 */
    startCountdown(createdTime) {
        this.clearCountdown();

        const deadline = new Date(createdTime.replace(/-/g, "/")).getTime() + 30 * 60 * 1000;

        const timer = setInterval(() => {
            const diff = deadline - Date.now();

            if (diff <= 0) {
                this.clearCountdown();
                this.autoCancelOrder();
                return;
            }

            const m = Math.floor(diff / 60000);
            const s = Math.floor((diff % 60000) / 1000);

            this.setData({
                countdown: `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
            });
        }, 1000);

        this.setData({ countdownTimer: timer });
    },

    clearCountdown() {
        if (this.data.countdownTimer) {
            clearInterval(this.data.countdownTimer);
            this.setData({ countdownTimer: null, countdown: "" });
        }
    },

    /** 超时自动取消订单 */
    autoCancelOrder() {
        const app = getApp();
        wx.request({
            url: app.globalData.baseUrl + "/order/cancel/" + this.data.orderId,
            method: "POST",
            success: () => {
                wx.showToast({ title: "订单已取消", icon: "none" });
                this.loadOrderDetail(this.data.orderId);
            }
        });
    },

    /** 新状态文本 + 描述（根据你统一要求） */
    getStatusInfo(status) {
        const textMap = {
            1: "待支付",
            2: "待处理",
            3: "制作中",
            4: "待取餐",
            5: "已取消",
            6: "已完成",
            7: "退款中",
            8: "已退款"
        };

        const descMap = {
            1: "请尽快完成支付",
            2: "商家正在准备您的餐品",
            3: "餐品制作中，请稍候",
            4: "请前往餐厅取餐",
            5: "订单已取消",
            6: "订单已完成",
            7: "退款申请已提交，等待商家审核",
            8: "退款已完成"
        };

        return {
            text: textMap[status],
            desc: descMap[status]
        };
    },

    /** 查询是否已评价 */
    checkReviewStatus(orderId, createdTime) {
        const app = getApp();
        wx.request({
          url: app.globalData.baseUrl + "/review/userReviews",
          method: "GET",
          data: { userId: app.globalData.userInfo.id },
          success: res => {
            const reviewedList = res.data.data || [];
            const reviewed = reviewedList.some(r =>
              r.orderId === orderId || r.order_id === orderId
            );
      
            const diff = (new Date() - new Date(createdTime)) / 3600000;
            const expired = diff > 24;
      
            this.setData({
              hasReview: reviewed,
              // 注意：已完成状态现在是6
              canReview: (!reviewed && !expired && this.data.order.status === 6)
            });
          }
        });
      },

    /** 按钮事件区域 ↓ */

    onPayNow() {
        const amount = this.data.order.totalAmount;

        this.showPayConfirmDialog(
            amount,
            () => {
                this.onConfirmPayment();
            },
            () => {}
        );
    },

    onConfirmPayment() {
        const app = getApp();
        wx.request({
            url: app.globalData.baseUrl + "/order/pay/" + this.data.orderId,
            method: "POST",
            success: res => {
                if (res.data.code === 200) {
                    wx.showToast({ title: "支付成功" });
                    this.loadOrderDetail(this.data.orderId);
                }
            }
        });
    },

    onCancelOrder() {
        const order = this.data.order;
      
        if (![1, 2].includes(order.status)) {
          wx.showToast({ title: "当前状态无法取消", icon: "none" });
          return;
        }
      
        wx.showModal({
          title: "确认取消订单？",

          confirmColor: '#ff6b35',
          success: res => {
            if (res.confirm) {
              this.cancelOrder();
            }
          }
        });
      },

    cancelOrder() {
        const app = getApp();

        wx.request({
            url: app.globalData.baseUrl + "/order/cancel/" + this.data.orderId,
            method: "POST",
            success: () => {
                wx.showToast({ title: "订单已取消" });
                this.loadOrderDetail(this.data.orderId);
            }
        });
    },

    openRemarkDialog() {
        this.setData({
            remarkDialogVisible: true,
            remarkTemp: this.data.order.remark || ""
        });
    },
    onRemarkInputChange(e) {
        this.setData({
            remarkTemp: e.detail.value
        });
    },
    closeRemarkDialog() {
        this.setData({ remarkDialogVisible: false });
    },
    submitRemark() {
        const app = getApp();
        const newRemark = this.data.remarkTemp;
    
        wx.request({
            url: app.globalData.baseUrl + "/order/updateRemark",
            method: "POST",
            data: {
                orderId: this.data.orderId,
                remark: newRemark
            },
            success: res => {
                if (res.data.code === 200) {
                    wx.showToast({ title: "修改成功" });
    
                    // 更新本地订单备注
                    this.setData({
                        ["order.remark"]: newRemark,
                        remarkShort: newRemark.length > 10 ? newRemark.substring(0, 10) + "..." : newRemark,
                        remarkDialogVisible: false
                    });
                } else {
                    wx.showToast({ title: "修改失败", icon: "none" });
                }
            }
        });
    },
    /** 确认取餐 */
    confirmPickup() {
        const app = getApp();
        
        wx.showModal({
            title: "确认取餐",
            content: "请确认已取到餐品",
            confirmColor: '#ff6b35',
            success: (res) => {
                if (res.confirm) {
                    wx.request({
                        url: app.globalData.baseUrl + "/order/confirmPickup/" + this.data.orderId,
                        method: "POST",
                        success: (res) => {
                            if (res.data.code === 200) {
                                wx.showToast({ title: "取餐成功" });
                                this.loadOrderDetail(this.data.orderId);
                            }
                        }
                    });
                }
            }
        });
    },
    onRefund() {
        const order = this.data.order;
        
        // 根据后端逻辑，只有待取餐(4)和已完成(6)可以申请退款
        if (![4, 6].includes(order.status)) {
          wx.showToast({ 
            title: "当前状态无法申请退款", 
            icon: "none" 
          });
          return;
        }
      
        wx.showModal({
          title: "申请退款",
          content: "退款申请提交后将由商家审核",
          success: (res) => {
            if (!res.confirm) return;
      
            wx.navigateTo({
              url: `/pages/refund/refund?orderId=${this.data.orderId}`
            });
          }
        });
      },
    /** 联系客服/商家 */
    onContactService() {
        const order = this.data.order;
        const restaurant = this.data.restaurant;
    
        // 制作中：联系商家
        if (order.status === 3) {
            if (!restaurant.contactPhone) {
                wx.showToast({
                    title: "商家未提供联系电话",
                    icon: "none"
                });
                return;
            }
    
            wx.makePhoneCall({
                phoneNumber: restaurant.contactPhone
            });
            return;
        }
    
        // 其他状态：联系客服
        wx.makePhoneCall({
            phoneNumber: '400-123-4567'
        });
    },
    goReview() {
        wx.navigateTo({
            url: `/pages/review/review?orderId=${this.data.orderId}&restaurantId=${this.data.restaurant.id}`
        });
    },
    onReorder() {
        const restaurantId = this.data.restaurant.id;
        if (restaurantId) {
            wx.navigateTo({
                url: `/pages/restaurant-detail/restaurant-detail?id=${restaurantId}`
            });
        }
    },
    onBack() {
        wx.navigateBack();
    },
    showPayConfirmDialog(amount, onConfirm, onCancel) {
        wx.showModal({
            title: "确认支付",
            content: `是否立即支付订单？\n订单金额：¥${amount}`,
            confirmText: "确认支付",
            cancelText: "取消",
            confirmColor: "#ff6b35",
            success(res) {
                if (res.confirm) {
                    onConfirm && onConfirm();
                } else {
                    onCancel && onCancel();
                }
            }
        });
    }
});
