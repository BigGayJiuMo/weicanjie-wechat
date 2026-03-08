Page({
    data: {
      categoryList: [],
      activeCategoryId: null,
      restaurants: [],
      loading: false,
      pageNum: 1,
      pageSize: 10,
      hasMore: true,
      loadingMore: false,
      currentCategoryId: null
    },
  
    onLoad() {
        this.loadCategoryList();
    },
  
    /** 加载左侧分类列表 */
    loadCategoryList() {
        const app = getApp();
        this.setData({ loading: true });
      
        wx.request({
          url: app.globalData.baseUrl + "/category/list",
          method: "GET",
          success: (res) => {
            if (res.data.code !== 200) {
              wx.showToast({ title: "分类加载失败", icon: "none" });
              this.setData({ loading: false });
              return;
            }
      
            let list = res.data.data || [];
      
            // ⭐ 按 sortOrder 排序（没有 sortOrder 的默认为 999）
            list = list.sort((a, b) => {
              return (a.sortOrder ?? 999) - (b.sortOrder ?? 999);
            });
      
            if (list.length === 0) {
              this.setData({ loading: false });
              return;
            }
      
            this.setData({
              categoryList: list,
              activeCategoryId: list[0].id,
              loading: false
            });
      
            this.loadRestaurantList(list[0].id);
          },
          fail: () => {
            this.setData({ 
                loading: false,
                restaurants: [],
                categoryList: []
              });
            wx.showToast({ title: "网络异常", icon: "none" });
          }
        });
      },
  
    /** 左侧分类点击 */
    onCategoryTap(e) {
        const id = e.currentTarget.dataset.id;
        this.setData({ activeCategoryId: id });
        this.loadRestaurantList(id, false); // 非加载更多
      },
  
    /** 根据分类加载餐厅 */
    loadRestaurantList(categoryId, isLoadMore = false) {
        const app = getApp();
        const { pageNum, pageSize, restaurants } = this.data;
      
        // 如果不是加载更多，重置分页状态
        if (!isLoadMore) {
          this.setData({
            restaurants: [],
            loading: true,
            pageNum: 1,
            hasMore: true,
            currentCategoryId: categoryId
          });
        } else {
          // 正在加载更多或没有更多数据时直接返回
          if (this.data.loadingMore || !this.data.hasMore) return;
          this.setData({ loadingMore: true });
        }
      
        wx.request({
          url: app.globalData.baseUrl + "/restaurant/pageByCategory",
          method: "GET",
          data: {
            categoryId,
            pageNum: isLoadMore ? pageNum : 1,
            pageSize
          },
          success: (res) => {
            if (res.data.code === 200) {
              const pageResult = res.data.data;
              let newList = pageResult.records || [];
      
              // 处理营业状态、评分、打包费等
              newList = newList.map(r => {
                // 处理评分
                if (r.avgRating === null || r.avgRating === undefined || r.avgRating === -1) {
                  r.avgRating = null;
                } else {
                  r.avgRating = Number(r.avgRating).toFixed(1);
                }
      
                // 处理打包费
                if (r.packingFee !== undefined && r.packingFee !== null) {
                  r.packingFee = Number(r.packingFee).toFixed(2);
                }
      
                // 处理营业状态 - 添加手动状态逻辑
                if (r.status === 0) {
                  r.statusText = "已停业";
                  r.statusClass = "status-closed";
                  r.businessStatus = 0;
                } else if (r.manualBusinessStatus != null && r.manualBusinessStatus !== 0) {
                  if (r.manualBusinessStatus === 1) {
                    r.statusText = "营业中";
                    r.statusClass = "status-open";
                    r.businessStatus = 1;
                  } else if (r.manualBusinessStatus === 2) {
                    r.statusText = "休息中";
                    r.statusClass = "status-break";
                    r.businessStatus = 3;
                  }
                } else if (r.businessStatusText && r.businessStatusClass) {
                  r.statusText = r.businessStatusText;
                  r.statusClass = r.businessStatusClass;
                } else {
                  switch (r.businessStatus) {
                    case 1:
                      r.statusText = "营业中";
                      r.statusClass = "status-open";
                      break;
                    case 2:
                    case 3:
                      r.statusText = "休息中";
                      r.statusClass = "status-break";
                      break;
                    default:
                      r.statusText = "未知状态";
                      r.statusClass = "status-closed";
                  }
                }
      
                return r;
              });
      
              // 合并数据
              const updatedRestaurants = isLoadMore ? restaurants.concat(newList) : newList;
              const hasMoreData = newList.length >= pageSize;
              const nextPageNum = isLoadMore ? pageNum + 1 : 2; // 下一页页码
      
              // 排序：营业中的在前（可选）
              updatedRestaurants.sort((a, b) => {
                const order = { 1: 1, 2: 2, 3: 3, 0: 4 };
                return (order[a.businessStatus] || 4) - (order[b.businessStatus] || 4);
              });
      
              this.setData({
                restaurants: updatedRestaurants,
                pageNum: nextPageNum,
                hasMore: hasMoreData,
                loading: false,
                loadingMore: false
              });
            } else {
              this.setData({
                loading: false,
                loadingMore: false
              });
              wx.showToast({ title: "加载失败", icon: "none" });
            }
          },
          fail: () => {
            this.setData({
              loading: false,
              loadingMore: false
            });
            wx.showToast({ title: "网络异常", icon: "none" });
          }
        });
      },
      
    loadMore() {
        // 如果当前有分类ID且未加载完，触发加载更多
        if (this.data.currentCategoryId && this.data.hasMore && !this.data.loadingMore) {
          this.loadRestaurantList(this.data.currentCategoryId, true);
        }
    },
    /** 跳转餐厅详情 */
    goDetail(e) {
      const restaurantId = e.currentTarget.dataset.id;
  
      if (!restaurantId) {
        wx.showToast({
          title: '餐厅ID不存在',
          icon: 'none'
        });
        return;
      }
  
      wx.navigateTo({
        url: `/pages/restaurant-detail/restaurant-detail?id=${restaurantId}`
      });
    },
  
    goSearchPage() {
      wx.navigateTo({
        url: "/pages/search-restaurant/search-restaurant"
      });
    }
  });