// pages/edit-profile/edit-profile.js
Page({
    data: {
        userInfo: null,
        avatarUrl: '',
        nickname: '',
        displayPhone: '',
        showToast: false,
        toastMessage: '',
        toastAnimation: {},
        showNicknameModal: false,
        newNickname: '',
        nicknameInputFocus: false,
        isSavingAvatar: false,
        isSavingNickname: false,
        isOverLength: false // 新增：是否超出长度限制
    },

    onLoad: function (options) {
        this.loadUserInfo();
    },

    // 加载用户信息
    loadUserInfo: function () {
        const app = getApp();
        const userInfo = app.globalData.userInfo;
        
        if (userInfo) {
            const processedInfo = this.processUserInfo(userInfo);
            this.setData({
                userInfo: processedInfo,
                avatarUrl: processedInfo.avatarUrl || '/images/default-avatar.png',
                nickname: processedInfo.nickname || '微信用户',
                displayPhone: processedInfo.displayPhone || '未绑定手机号'
            });
        } else {
            wx.showToast({
                title: '请先登录',
                icon: 'none',
                success: () => {
                    setTimeout(() => {
                        wx.navigateBack();
                    }, 1500);
                }
            });
        }
    },

    // 处理用户信息，包括手机号脱敏
    processUserInfo: function(userInfo) {
        if (!userInfo) return userInfo;
        
        const processedInfo = {...userInfo};
        
        if (processedInfo.phone) {
            processedInfo.displayPhone = this.maskPhoneNumber(processedInfo.phone);
        } else {
            processedInfo.displayPhone = '未绑定手机号';
        }
        
        return processedInfo;
    },

    // 手机号脱敏处理
    maskPhoneNumber: function(phone) {
        if (phone && phone.length === 11) {
            return phone.substring(0, 3) + '****' + phone.substring(7);
        }
        return phone;
    },

    // 返回上一页
    onBack: function() {
        wx.navigateBack();
    },

    // 选择微信头像
    onChooseAvatar: function(e) {
        console.log('微信选择头像:', e.detail);
        const avatarUrl = e.detail.avatarUrl;
        
        if (avatarUrl) {
            this.setData({
                avatarUrl: avatarUrl,
                isSavingAvatar: true
            });
            
            // 立即保存头像到数据库
            this.saveAvatarToDatabase(avatarUrl);
        }
    },

    // 保存头像到数据库
    saveAvatarToDatabase: function(avatarUrl) {
        const app = getApp();
        const userInfo = this.data.userInfo;
        
        if (!userInfo || !userInfo.id) {
            this.showToast('用户信息不完整');
            this.setData({ isSavingAvatar: false });
            return;
        }

        console.log('保存头像到数据库:', {
            userId: userInfo.id,
            avatarUrl: avatarUrl
        });
        
        wx.request({
            url: app.globalData.baseUrl + '/user/updateProfile',
            method: 'POST',
            header: {
                'content-type': 'application/json'
            },
            data: {
                userId: userInfo.id,
                nickname: userInfo.nickname, // 保持原昵称不变
                avatarUrl: avatarUrl
            },
            success: (res) => {
                this.setData({ isSavingAvatar: false });
                console.log('更新头像响应:', res.data);
                
                if (res.data.code === 200) {
                    // 更新本地存储和全局数据
                    const updatedUserInfo = res.data.data;
                    wx.setStorageSync('userInfo', updatedUserInfo);
                    app.globalData.userInfo = updatedUserInfo;
                    
                    this.showToast('头像更新成功');
                    
                    // 刷新页面显示
                    this.setData({
                        userInfo: updatedUserInfo,
                        avatarUrl: updatedUserInfo.avatarUrl
                    });
                } else {
                    console.error('头像更新失败:', res.data);
                    this.showToast('头像更新失败: ' + (res.data.message || '未知错误'));
                }
            },
            fail: (err) => {
                this.setData({ isSavingAvatar: false });
                console.error('更新头像请求失败:', err);
                this.showToast('网络错误，请重试');
            }
        });
    },

    // 点击昵称
    onNicknameTap: function() {
        this.setData({
            showNicknameModal: true,
            newNickname: this.data.nickname,
            nicknameInputFocus: true,
            isOverLength: false // 重置超出长度状态
        });
    },

    // 昵称弹窗输入
    onNicknameModalInput: function(e) {
        const value = e.detail.value;
        const length = value.length;
        const isOverLength = length > 7;
        
        // 不截断输入，允许输入到10个字符，但超过7个时显示警告
        this.setData({
            newNickname: value,
            isOverLength: isOverLength
        });
    },

    // 确认修改昵称
    confirmNickname: function() {
        // 如果超出长度，直接返回
        if (this.data.isOverLength) {
            return;
        }
        
        const nickname = this.data.newNickname.trim();
        if (!nickname) {
            this.showToast('昵称不能为空');
            return;
        }
        
        // 检查昵称长度是否超过7个字
        if (nickname.length > 7) {
            this.showToast('昵称不能超过7个字');
            return;
        }
        
        this.setData({
            isSavingNickname: true
        });
        
        // 保存昵称到数据库
        this.saveNicknameToDatabase(nickname);
    },

    // 保存昵称到数据库
    saveNicknameToDatabase: function(nickname) {
        const app = getApp();
        const userInfo = this.data.userInfo;
        
        if (!userInfo || !userInfo.id) {
            this.showToast('用户信息不完整');
            this.setData({ 
                isSavingNickname: false,
                showNicknameModal: false 
            });
            return;
        }

        console.log('保存昵称到数据库:', {
            userId: userInfo.id,
            nickname: nickname
        });
        
        wx.request({
            url: app.globalData.baseUrl + '/user/updateProfile',
            method: 'POST',
            header: {
                'content-type': 'application/json'
            },
            data: {
                userId: userInfo.id,
                nickname: nickname,
                avatarUrl: userInfo.avatarUrl // 保持原头像不变
            },
            success: (res) => {
                this.setData({ 
                    isSavingNickname: false,
                    showNicknameModal: false 
                });
                console.log('更新昵称响应:', res.data);
                
                if (res.data.code === 200) {
                    // 更新本地存储和全局数据
                    const updatedUserInfo = res.data.data;
                    wx.setStorageSync('userInfo', updatedUserInfo);
                    app.globalData.userInfo = updatedUserInfo;
                    
                    // 更新页面显示
                    this.setData({
                        nickname: nickname,
                        userInfo: updatedUserInfo
                    });
                    
                    this.showToast('昵称更新成功');
                } else {
                    console.error('昵称更新失败:', res.data);
                    this.showToast('昵称更新失败: ' + (res.data.message || '未知错误'));
                }
            },
            fail: (err) => {
                this.setData({ 
                    isSavingNickname: false,
                    showNicknameModal: false 
                });
                console.error('更新昵称请求失败:', err);
                this.showToast('网络错误，请重试');
            }
        });
    },

    // 取消修改昵称
    cancelNickname: function() {
        this.setData({
            showNicknameModal: false,
            nicknameInputFocus: false,
            isOverLength: false // 重置超出长度状态
        });
    },

    // 显示提示
    showToast: function(message) {
        const animation = wx.createAnimation({
            duration: 300,
            timingFunction: 'ease'
        });
        
        this.setData({
            showToast: true,
            toastMessage: message,
            toastAnimation: animation.opacity(1).step().export()
        });
        
        setTimeout(() => {
            animation.opacity(0).step();
            this.setData({
                toastAnimation: animation.export()
            });
            
            setTimeout(() => {
                this.setData({
                    showToast: false
                });
            }, 300);
        }, 2000);
    }
});