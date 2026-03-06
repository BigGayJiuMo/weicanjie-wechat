const app = getApp();

Page({
  data: {
    dishId: null,
    dish: {},
    restaurantId: null,

    // 单个菜品的数量（详情页用）
    quantity: 0,

    // 餐厅全部菜品
    allDishes: [],

    // 购物车
    cartItems: {},
    orderItems: [],
    checkoutItems: [],

    totalQuantity: 0,
    subTotal: 0,

    eatType: 2,            // 1: 堂食, 2: 外带
    showPackingFee: true,  // 是否显示打包费行
    formattedSubTotal: "0.00",
    formattedTotalPrice: "0.00",

    packingFee: 0,

    // 面板
    showOrderPanel: false,
    showCheckoutPanel: false
  },

  // 页面加载
  onLoad(options) {
    const dishId = Number(options.id);
    const eatType = options.eatType ? Number(options.eatType) : 2;
    console.log(eatType);
    this.setData({ 
        dishId,
        eatType 
    });
    this.loadDishDetail(dishId);
  },

  onUnload() {
    const pages = getCurrentPages();
    const prevPage = pages[pages.length - 2]; // 上一页
    if (prevPage) {
      // 更新上一页的 eatType
      prevPage.setData({ eatType: this.data.eatType }, () => {
        // 触发上一页重新计算价格（确保 updateCart 方法存在）
        if (typeof prevPage.updateCart === 'function') {
          prevPage.updateCart(prevPage.data.cartItems);
        }
      });
    }
  },
  // 加载菜品详情
  loadDishDetail(dishId) {
    wx.request({
      url: `${app.globalData.baseUrl}/dish/detail/${dishId}`,
      method: "GET",
      success: (res) => {
        console.log("🍜 菜品详情：", res.data);
        if (res.data.code === 200) {
          let dish = res.data.data;
          dish.formattedPrice = Number(dish.price).toFixed(2);

          this.setData({
            dish,
            restaurantId: dish.restaurantId
          });

          this.loadAllDishes(dish.restaurantId, () => {
            this.loadDishQuantityFromCart();
          });
        }
      }
    });
  },

  // 加载餐厅所有菜品
  loadAllDishes(restaurantId, callback) {
    wx.request({
      url: `${app.globalData.baseUrl}/restaurant/${restaurantId}`,
      method: "GET",
      success: (res) => {
        if (res.data.code === 200) {
          const data = res.data.data;
          let dishes = [];
          if (data.categories) {
            data.categories.forEach(c => {
              if (c.dishes) dishes.push(...c.dishes);
            });
          }

          this.setData({
            allDishes: dishes || [],
            packingFee: data.packingFee || 0,
            restaurant: data,
          }, () => {
            console.log('打包费：', this.data.packingFee); // 添加此行
            if (callback) callback();
          });
        }
      }
    });
  },

  // 查询当前菜品数量
  loadDishQuantityFromCart() {
    const userId = app.globalData.userInfo?.id || 1;
    const restaurantId = this.data.restaurantId;
    const dishId = this.data.dishId;

    wx.request({
      url: `${app.globalData.baseUrl}/cart/map/user/${userId}/restaurant/${restaurantId}`,
      method: "GET",
      success: (res) => {
        console.log("🛒 当前餐厅购物车：", res.data);
        if (res.data.code === 200) {
          const cartMap = res.data.data || {};
          const qty = cartMap[dishId] || 0;
          this.setData({ quantity: qty });
          this.recalculateCart(cartMap);
        }
      }
    });
  },

  // 更新购物车数量
  updateCartOnServer(dishId, qty) {
    const userId = app.globalData.userInfo?.id || 1;
    const restaurantId = this.data.restaurantId;

    wx.request({
      url: `${app.globalData.baseUrl}/cart/update`,
      method: 'POST',
      data: { userId, restaurantId, dishId, quantity: qty },
      success: (res) => {
        if (res.data.code === 200) {
          this.loadDishQuantityFromCart();
        } else {
          wx.showToast({ title: res.data.message || '更新失败', icon: 'none' });
          this.loadDishQuantityFromCart();
        }
      },
      fail: () => {
        wx.showToast({ title: '网络错误', icon: 'none' });
        this.loadDishQuantityFromCart();
      }
    });
  },

  // + 按钮
  increaseQuantity() {
    if (!this.data.restaurantId) {
      wx.showToast({ title: '餐厅信息未加载，请稍后', icon: 'none' });
      return;
    }
    const newQty = this.data.quantity + 1;
    if (newQty > this.data.dish.stock) {
      wx.showToast({ title: '库存不足', icon: 'none' });
      return;
    }
    this.setData({ quantity: newQty });
    this.updateCartOnServer(this.data.dishId, newQty);
  },

  // - 按钮
  decreaseQuantity() {
    let qty = this.data.quantity - 1;
    if (qty < 0) qty = 0;
    const dishId = this.data.dishId;
    this.setData({ quantity: qty });
    this.updateCartOnServer(dishId, qty);
  },

  // 重新计算购物车数据
  recalculateCart(cartMap) {
    const dishList = this.data.allDishes;
    const packingFee = Number(this.data.packingFee);

    let fullMap = {};
    let totalQuantity = 0;
    let subTotal = 0;

    Object.keys(cartMap).forEach(key => {
      const dishId = Number(key);
      const qty = cartMap[key];
      const dish = dishList.find(d => d.id == dishId);
      if (!dish) return;

      const subtotal = qty * Number(dish.price);

      fullMap[dishId] = {
        dishId: dish.id,
        name: dish.name,
        imageUrl: dish.imageUrl,
        quantity: qty,
        subtotal: subtotal.toFixed(2),
        dishPrice: dish.price,
        stock: dish.stock,
        restaurantId: dish.restaurantId
      };

      totalQuantity += qty;
      subTotal += subtotal;
    });

    this.setData({
      cartItems: fullMap,
      orderItems: Object.values(fullMap),
      checkoutItems: Object.values(fullMap),
      totalQuantity,
      subTotal
    });

    // 更新总额（根据用餐方式）
    this.updateTotals();
  },

  // 根据用餐方式更新价格显示
  updateTotals() {
    const subTotal = this.data.subTotal;
    const packingFee = Number(this.data.packingFee) || 0;
    const showPackingFee = this.data.eatType == 2;
    const totalAmount = subTotal + (showPackingFee ? packingFee : 0);
  
    console.log('updateTotals 执行：', {
      eatType: this.data.eatType,
      subTotal,
      packingFee,
      showPackingFee,
      totalAmount
    });
  
    this.setData({
      formattedSubTotal: subTotal.toFixed(2),
      formattedTotalPrice: totalAmount.toFixed(2),
      showPackingFee
    });
  },

  // 切换用餐方式
  selectEatType(e) {
    const type = e.currentTarget.dataset.type;
    this.setData({ eatType: type }, () => {
      this.updateTotals();
    });
  },

  // 购物车面板逻辑
  onCartBarTap() {
    if (this.data.totalQuantity > 0) {
      this.setData({ showOrderPanel: true });
    }
  },

  hideOrderPanel() {
    this.setData({ showOrderPanel: false });
  },

  // 购物车面板加减
  onOrderIncreaseQuantity(e) {
    const item = e.currentTarget.dataset.dish;
    this.updateCartOnServer(item.dishId, item.quantity + 1);
  },

  onOrderDecreaseQuantity(e) {
    const item = e.currentTarget.dataset.dish;
    const newQty = item.quantity - 1;
    this.updateCartOnServer(item.dishId, newQty < 0 ? 0 : newQty);
  },

  // 清空购物车
  clearCart() {
    const userId = app.globalData.userInfo?.id || 1;
    wx.request({
      url: `${app.globalData.baseUrl}/cart/clear`,
      method: "POST",
      data: {
        userId,
        restaurantId: this.data.restaurantId
      },
      success: () => {
        this.loadDishQuantityFromCart();
        this.setData({ showOrderPanel: false });
      }
    });
  },

  // 结算
  onCheckout() {
    if (this.data.totalQuantity === 0) return;
    this.setData({ showCheckoutPanel: true });
  },

  hideCheckoutPanel() {
    this.setData({ showCheckoutPanel: false });
  },

  // 返回
  onBack() {
    wx.navigateBack();
  },

  stopPropagation() {}
});