// pages/payment/payment.js
Page({
  data: {
    orderId: null,
    order: {},
    restaurant: {},
    orderItems: [],
    subTotal: 0,
    deliveryFee: 0,
    totalAmount: 0,
    showSuccessModal: false,
    showCancelModal: false,
    paymentTime: ''
  },

  onLoad: function(options) {
    console.log('支付页面接收到的参数:', options);
    
    try {
      // 直接解析JSON，不需要decodeURIComponent
      const orderData = JSON.parse(options.data);
      console.log('支付页面解析的订单数据:', orderData);
      
      // 预先生成支付时间
      const paymentTime = this.formatTime(new Date());
      
      this.setData({
        orderId: orderData.orderId,
        restaurant: orderData.restaurant,
        orderItems: orderData.orderItems || [],
        subTotal: orderData.subTotal || 0,
        deliveryFee: orderData.deliveryFee || 0,
        totalAmount: orderData.totalAmount || 0,
        paymentTime: paymentTime,
        order: orderData.order || {
          orderNumber: 'ORD' + Date.now(),
          status: 1,
          createdTime: new Date()
        }
      });
    } catch (error) {
      console.error('解析订单数据失败:', error);
      wx.showToast({
        title: '订单数据异常',
        icon: 'none'
      });
      
      // 返回上一页
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    }
  },

  // 格式化时间
  formatTime: function(date) {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hour = date.getHours().toString().padStart(2, '0');
    const minute = date.getMinutes().toString().padStart(2, '0');
    const second = date.getSeconds().toString().padStart(2, '0');
    
    return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
  },

  // 确认支付
  onConfirmPayment: function() {
    const that = this;
    
    wx.showLoading({
      title: '支付中...',
      mask: true
    });
    
    // 调用后端模拟微信支付接口
    wx.request({
      url: getApp().globalData.baseUrl + `/order/pay/${this.data.orderId}`,
      method: 'POST',
      success: (res) => {
        wx.hideLoading();
        console.log('支付响应:', res.data);
        
        if (res.data.code === 200) {
          // 支付成功，更新支付时间为当前时间
          const paymentTime = this.formatTime(new Date());
          
          this.setData({
            showSuccessModal: true,
            paymentTime: paymentTime
          });
          
          // 更新订单状态
          this.data.order.status = 2; // 待处理状态
          this.data.order.payStatus = 1; // 已支付
          
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
      showCancelModal: true
    });
  },

  // 确认取消支付
  confirmCancelPayment: function() {
    const that = this;
    
    wx.showLoading({
      title: '取消中...',
      mask: true
    });
    
    // 调用取消支付接口
    wx.request({
      url: getApp().globalData.baseUrl + `/order/cancel/${this.data.orderId}`,
      method: 'POST',
      success: (res) => {
        wx.hideLoading();
        console.log('取消支付响应:', res.data);
        
        if (res.data.code === 200) {
          wx.showToast({
            title: '已取消支付',
            icon: 'success',
            success: () => {
              setTimeout(() => {
                wx.navigateBack();
              }, 1500);
            }
          });
        } else {
          wx.showToast({
            title: '取消失败: ' + (res.data.message || '未知错误'),
            icon: 'none',
            duration: 3000
          });
        }
      },
      fail: (err) => {
        wx.hideLoading();
        console.error('取消支付请求失败:', err);
        wx.showToast({
          title: '网络错误，请重试',
          icon: 'none'
        });
      }
    });
    
    this.setData({
      showCancelModal: false
    });
  },

  // 查看订单
  onViewOrder: function() {
    // 这里可以跳转到订单详情页
    wx.redirectTo({
      url: '/pages/order/order'
    });
  },

  // 返回首页
  onBackToHome: function() {
    wx.switchTab({
      url: '/pages/index/index'
    });
  },

  // 返回上一页
  onBack: function() {
    wx.navigateBack();
  },

  // 隐藏成功弹窗
  hideSuccessModal: function() {
    this.setData({
      showSuccessModal: false
    });
  },

  // 隐藏取消弹窗
  hideCancelModal: function() {
    this.setData({
      showCancelModal: false
    });
  },

  // 阻止事件冒泡
  stopPropagation: function() {
    return;
  },

  // 清空购物车（支付成功后调用）
  clearCart: function() {
    // 这里可以调用清空购物车的接口
    console.log('支付成功，清空购物车');
  }
});