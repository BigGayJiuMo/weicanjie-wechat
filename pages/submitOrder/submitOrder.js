Page({
    data: {
      orderList: [],
      orderCount: 0,
      totalAmount: "0.00"
    },
  
    onLoad(options) {
        if (options.data) {
          const decoded = decodeURIComponent(options.data);
          const orderData = JSON.parse(decoded);
      
          console.log("提交订单页面收到数据:", orderData);
      
          let restaurants = orderData.restaurants || [];
          let count = restaurants.length;
      
          // 处理每家餐厅的金额
          restaurants = restaurants.map(r => {
            let dishTotal = 0;
      
            // 给每个菜品计算 totalPrice
            const items = r.items.map(dish => {
              const price = Number(dish.dishPrice || dish.price || 0);
              const quantity = Number(dish.quantity || 1);
              const totalPrice = (price * quantity).toFixed(2);
              dishTotal += price * quantity;
      
              return {
                ...dish,
                totalPrice
              };
            });
      
            // 使用餐厅自身的配送费，如果没有就默认 0
            const deliveryFee = Number(r.deliveryFee || 0).toFixed(2);
      
            return {
              ...r,
              items,
              packingFee: Number(r.packingFee || 0).toFixed(2), // 同样格式化
              deliveryFee,
              discount: Number(r.discount || 0).toFixed(2),     // 同样格式化
              subTotal: (dishTotal + Number(deliveryFee) + Number(r.packingFee || 0) - Number(r.discount || 0)).toFixed(2)
            };
          });
      
          this.setData({
            orderList: restaurants,
            orderCount: count,
            totalAmount: Number(orderData.totalAmount || 0).toFixed(2)
          });
        }
      },
      
  
    onBack() {
      wx.navigateBack();
    },
  
    submitOrder() {
      wx.showLoading({ title: "提交中..." });
  
      wx.request({
        url: getApp().globalData.baseUrl + "/order/submit",
        method: "POST",
        data: {
          restaurants: this.data.orderList
        },
        success: res => {
          wx.hideLoading();
  
          if (res.data.code === 200) {
            wx.showToast({ title: "提交成功", icon: "success" });
            setTimeout(() => {
              wx.redirectTo({
                url: `/pages/payment/payment?orderId=${res.data.data.orderId}`
              });
            }, 1000);
          } else {
            wx.showToast({ title: res.data.message, icon: "none" });
          }
        },
        fail: () => {
          wx.hideLoading();
          wx.showToast({ title: "网络错误", icon: "none" });
        }
      });
    }
  });
  