// pages/payment/payment.js
Page({
    data: {
        orderId: null,
        order: {
          orderNumber: '加载中...',
          status: 1,
          createdTime: new Date()
        },
        restaurant: {
          name: '加载中...'
        },
        orderItems: [],
        subTotal: '0.00',
        deliveryFee: '0.00',
        totalAmount: '0.00',
        showCancelModal: false,
        paymentTime: '',
        isPaying: false,
        lastPayTime: 0 // 新增：记录上次点击时间
      },
    
      onLoad: function(options) {
        console.log('支付页面接收到的参数:', options);
        
        try {
          if (options.data) {
            const orderData = JSON.parse(options.data);
            console.log('支付页面解析的订单数据:', orderData);
            
            const paymentTime = this.formatTime(new Date());
            
            this.setData({
              orderId: orderData.orderId,
              restaurant: orderData.restaurant || { name: '未知餐厅' },
              orderItems: orderData.orderItems || [],
              subTotal: orderData.subTotal || '0.00',
              deliveryFee: orderData.deliveryFee || '0.00',
              totalAmount: orderData.totalAmount || '0.00',
              paymentTime: paymentTime,
              order: orderData.order || {
                orderNumber: 'ORD' + Date.now(),
                status: 1,
                createdTime: new Date()
              }
            });
          } else {
            console.error('没有接收到订单数据');
            wx.showToast({
              title: '订单数据异常',
              icon: 'none'
            });
          }
        } catch (error) {
          console.error('解析订单数据失败:', error);
          wx.showToast({
            title: '订单数据异常',
            icon: 'none'
          });
        }
      },

  // 格式化时间
  formatTime: function(date) {
    if (!date) return '未知时间';
    
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (!(dateObj instanceof Date) || isNaN(dateObj.getTime())) {
      return '时间格式错误';
    }
    
    const year = dateObj.getFullYear();
    const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
    const day = dateObj.getDate().toString().padStart(2, '0');
    const hour = dateObj.getHours().toString().padStart(2, '0');
    const minute = dateObj.getMinutes().toString().padStart(2, '0');
    const second = dateObj.getSeconds().toString().padStart(2, '0');
    
    return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
  },

  // 确认支付 - 修复重复点击问题
  onConfirmPayment: function() {
    const now = Date.now();
    
    // 防止重复点击：检查是否正在支付，或者点击间隔小于1秒
    if (this.data.isPaying || (now - this.data.lastPayTime < 1000)) {
      console.log('支付请求被阻止：重复点击');
      return;
    }
    
    // 更新最后点击时间
    this.setData({
      lastPayTime: now
    });
    
    const that = this;
    
    // 设置支付中状态
    this.setData({
      isPaying: true
    });
    
    wx.showLoading({
      title: '支付中...',
      mask: true
    });
    
    console.log('开始支付请求，订单ID:', this.data.orderId);
    
    // 调用后端模拟微信支付接口
    wx.request({
      url: getApp().globalData.baseUrl + `/order/pay/${this.data.orderId}`,
      method: 'POST',
      success: (res) => {
        wx.hideLoading();
        console.log('支付响应:', res.data);
        
        // 无论成功失败，都重置支付状态
        that.setData({
          isPaying: false
        });
        
        if (res.data.code === 200) {
          console.log('支付成功，准备跳转到订单详情');
          
          // 支付成功，直接跳转到订单详情页面
          wx.showToast({
            title: '支付成功',
            icon: 'success',
            duration: 1500,
            mask: true,
            success: () => {
              // 延迟跳转，让用户看到成功提示
              setTimeout(() => {
                console.log('执行跳转到订单详情');
                // 使用 redirectTo 关闭当前页面并跳转到订单详情
                wx.redirectTo({
                  url: `/pages/order/order?id=${that.data.orderId}`
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
        }
      },
      fail: (err) => {
        wx.hideLoading();
        console.error('支付请求失败:', err);
        
        // 重置支付状态
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
    // 如果在支付中，不允许取消
    if (this.data.isPaying) {
      wx.showToast({
        title: '支付进行中，请稍候...',
        icon: 'none'
      });
      return;
    }
    
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
          // 关闭取消支付弹窗
          this.setData({
            showCancelModal: false
          });
          
          wx.showToast({
            title: '已取消支付',
            icon: 'success',
            duration: 1500,
            success: () => {
              // 延迟跳转，让用户看到提示
              setTimeout(() => {
                // 跳转到订单详情页面
                wx.redirectTo({
                  url: `/pages/order/order?id=${this.data.orderId}`
                });
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
  },

  // 返回上一页
  onBack: function() {
    // 如果在支付中，提示用户
    if (this.data.isPaying) {
      wx.showToast({
        title: '支付进行中，请稍候...',
        icon: 'none'
      });
      return;
    }
    
    wx.navigateBack();
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

  // 页面卸载时清理
  onUnload: function() {
    // 清理状态
    this.setData({
      isPaying: false
    });
  }
});