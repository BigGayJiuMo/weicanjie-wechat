// pages/refund/refund.js
Page({
    data: {
      orderId: null,
      reasonList: [
        { value: "mistake", label: "下错单了" },
        { value: "no_accept", label: "商家长时间未接单" },
        { value: "bad_quality", label: "食物质量有问题" },
        { value: "not_match", label: "收到的餐品与描述不符" },
        { value: "other", label: "其他原因" }
      ],
      selectedReason: "",
      remark: ""
    },
  
    onLoad(options) {
      this.setData({
        orderId: options.orderId
      });
    },
  
    onReasonChange(e) {
      this.setData({
        selectedReason: e.detail.value
      });
    },
  
    onRemarkInput(e) {
      this.setData({
        remark: e.detail.value
      });
    },
  
    submitRefund() {
      const { orderId, selectedReason, remark } = this.data;
  
      if (!selectedReason) {
        wx.showToast({ title: "请选择原因", icon: "none" });
        return;
      }
  
      const app = getApp();
  
      wx.request({
        url: app.globalData.baseUrl + "/order/refund/apply",
        method: "POST",
        header: { "X-Idempotent-Key": (require("../../utils/config")).genIdempotentKey() },
        data: {
          orderId,
          reason: selectedReason,
          remark
        },
        success: res => {
          wx.showToast({
            title: res.data.message || "提交成功",
            icon: "success"
          });
  
          // 返回订单详情页
          setTimeout(() => {
            wx.navigateBack();
          }, 800);
        },
        fail() {
          wx.showToast({ title: "请求失败", icon: "none" });
        }
      });
    }
  });
  