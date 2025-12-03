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
    formattedSubTotal: "0.00",
    formattedTotalPrice: "0.00",

    packingFee: 0,

    // 面板
    showOrderPanel: false,
    showCheckoutPanel: false
  },

  //----------------------------------------
  // 页面加载
  //----------------------------------------
  onLoad(options) {
    const dishId = Number(options.id);
    this.setData({ dishId });

    this.loadDishDetail(dishId);
  },

  //----------------------------------------
  // 加载菜品详情
  //----------------------------------------
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

  //----------------------------------------
  // 加载餐厅所有菜品（为了构建购物车列表）
  //----------------------------------------
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
            restaurant: data    // ⭐⭐⭐ 必须加这个
          }, () => {
            if (callback) callback();
          });
        }
      }
    });
  },

  //----------------------------------------
  // ⭐ 查询当前菜品数量（核心）
  //----------------------------------------
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

          // ⭐ 如果当前菜品在购物车里，展示数量
          const qty = cartMap[dishId] || 0;
          this.setData({ quantity: qty });

          // 同步整个购物车
          this.recalculateCart(cartMap);
        }
      }
    });
  },

  //----------------------------------------
  // 更新购物车数量（新增、更新、删除）
  //----------------------------------------
  updateCartOnServer(qty) {
    const userId = app.globalData.userInfo?.id || 1;
    const restaurantId = this.data.restaurantId;
    const dishId = this.data.dishId;

    wx.request({
      url: `${app.globalData.baseUrl}/cart/update`,
      method: "POST",
      data: {
        userId,
        restaurantId,
        dishId,
        quantity: qty
      },
      success: () => {
        // 更新完购物车后重新加载
        this.loadDishQuantityFromCart();
      }
    });
  },

  //----------------------------------------
  // + 按钮
  //----------------------------------------
  increaseQuantity() {
    let qty = this.data.quantity + 1;

    this.setData({ quantity: qty });
    this.updateCartOnServer(qty);
  },

  //----------------------------------------
  // - 按钮
  //----------------------------------------
  decreaseQuantity() {
    let qty = this.data.quantity - 1;
    if (qty < 0) qty = 0;

    this.setData({ quantity: qty });
    this.updateCartOnServer(qty);
  },

  //----------------------------------------
  // 重新计算购物车（全部菜品）
  //----------------------------------------
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
      subTotal,
      formattedSubTotal: subTotal.toFixed(2),
      formattedTotalPrice: (subTotal + packingFee).toFixed(2)
    });
  },

  //----------------------------------------
  // 购物车面板逻辑
  //----------------------------------------
  onCartBarTap() {
    if (this.data.totalQuantity > 0) {
      this.setData({ showOrderPanel: true });
    }
  },

  hideOrderPanel() {
    this.setData({ showOrderPanel: false });
  },

  //----------------------------------------
  // + -（购物车面板操作）
  //----------------------------------------
  onOrderIncreaseQuantity(e) {
    const item = e.currentTarget.dataset.dish;
    this.updateCartOnServer(item.quantity + 1);
  },

  onOrderDecreaseQuantity(e) {
    const item = e.currentTarget.dataset.dish;
    const newQty = item.quantity - 1;
    this.updateCartOnServer(newQty < 0 ? 0 : newQty);
  },

  //----------------------------------------
  // 清空购物车
  //----------------------------------------
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

  //----------------------------------------
  // 结算
  //----------------------------------------
  onCheckout() {
    if (this.data.totalQuantity === 0) return;
    this.setData({ showCheckoutPanel: true });
  },

  hideCheckoutPanel() {
    this.setData({ showCheckoutPanel: false });
  },

  //----------------------------------------
  // 返回
  //----------------------------------------
  onBack() {
    wx.navigateBack();
  },

  stopPropagation() {}

});
