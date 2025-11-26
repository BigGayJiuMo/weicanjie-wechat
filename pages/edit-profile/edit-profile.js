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
        isOverLength: false, // 是否超出长度限制
        
        // 手机号修改相关
        showPhoneModal: false,
        newPhone: '',
        verifyCode: '',
        generatedCode: '', // 生成的验证码
        countdown: 0, // 倒计时秒数
        countdownTimer: null, // 倒计时计时器
        canGetCode: true, // 是否可以获取验证码
        phoneInputFocus: false,
        isSavingPhone: false,
        canConfirmPhone: false // 是否可以确认修改手机号
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
        const isOverLength = length > 9;
        
        // 不截断输入，允许输入到15个字符，但超过9个时显示警告
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
        if (nickname.length > 9) {
            this.showToast('昵称不能超过9个字');
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

    // 点击手机号
    onPhoneTap: function() {
        this.setData({
            showPhoneModal: true,
            newPhone: '',
            verifyCode: '',
            phoneInputFocus: true,
            canGetCode: true,
            canConfirmPhone: false
        });
    },

    // 手机号输入
    onPhoneInput: function(e) {
        const value = e.detail.value;
        this.setData({
            newPhone: value,
            canGetCode: value.length === 11 // 手机号格式正确才能获取验证码
        });
    },

    // 验证码输入
    onVerifyCodeInput: function(e) {
        const value = e.detail.value;
        this.setData({
            verifyCode: value,
            canConfirmPhone: value.length === 4 && this.data.newPhone.length === 11
        });
    },

    // 获取验证码
    getVerifyCode: function() {
        if (!this.data.canGetCode || this.data.countdown > 0) {
            return;
        }

        // 验证手机号格式
        const phone = this.data.newPhone;
        if (!phone || !/^1[3-9]\d{9}$/.test(phone)) {
            this.showToast('请输入正确的手机号');
            return;
        }

        // 生成4位随机验证码
        const code = Math.floor(1000 + Math.random() * 9000).toString();
        
        console.log('生成的验证码:', code); // 在控制台输出验证码，方便测试
        
        this.setData({
            generatedCode: code,
            canGetCode: false,
            countdown: 60
        });

        // 开始倒计时
        this.startCountdown();
        
        // 模拟发送验证码（实际项目中应该调用短信服务）
        this.showToast('验证码已发送: ' + code);
    },

    // 开始倒计时
    startCountdown: function() {
        const timer = setInterval(() => {
            if (this.data.countdown > 1) {
                this.setData({
                    countdown: this.data.countdown - 1
                });
            } else {
                // 倒计时结束
                clearInterval(timer);
                this.setData({
                    countdown: 0,
                    canGetCode: true
                });
            }
        }, 1000);
        
        this.setData({
            countdownTimer: timer
        });
    },

    // 确认修改手机号
    confirmChangePhone: function() {
        if (!this.data.canConfirmPhone || this.data.isSavingPhone) {
            return;
        }

        const phone = this.data.newPhone.trim();
        const verifyCode = this.data.verifyCode.trim();

        // 验证手机号格式
        if (!phone || !/^1[3-9]\d{9}$/.test(phone)) {
            this.showToast('请输入正确的手机号');
            return;
        }

        // 验证验证码
        if (verifyCode !== this.data.generatedCode) {
            this.showToast('验证码错误');
            return;
        }

        this.setData({
            isSavingPhone: true
        });

        // 保存手机号到数据库
        this.savePhoneToDatabase(phone);
    },

    // 保存手机号到数据库
    savePhoneToDatabase: function(phone) {
        const app = getApp();
        const userInfo = this.data.userInfo;
        
        if (!userInfo || !userInfo.id) {
            this.showToast('用户信息不完整');
            this.setData({ 
                isSavingPhone: false
            });
            return;
        }

        console.log('保存手机号到数据库:', {
            userId: userInfo.id,
            phone: phone
        });
        
        wx.request({
            url: app.globalData.baseUrl + '/user/bindPhone',
            method: 'POST',
            header: {
                'content-type': 'application/json'
            },
            data: {
                userId: userInfo.id,
                phone: phone
            },
            success: (res) => {
                this.setData({ 
                    isSavingPhone: false,
                    showPhoneModal: false
                });
                console.log('更新手机号响应:', res.data);
                
                if (res.data.code === 200) {
                    // 更新本地存储和全局数据
                    const updatedUserInfo = {...userInfo, phone: phone};
                    wx.setStorageSync('userInfo', updatedUserInfo);
                    app.globalData.userInfo = updatedUserInfo;
                    
                    // 更新页面显示
                    const processedInfo = this.processUserInfo(updatedUserInfo);
                    this.setData({
                        userInfo: processedInfo,
                        displayPhone: processedInfo.displayPhone
                    });
                    
                    this.showToast('手机号更新成功');
                    
                    // 清除倒计时
                    if (this.data.countdownTimer) {
                        clearInterval(this.data.countdownTimer);
                    }
                } else {
                    console.error('手机号更新失败:', res.data);
                    this.showToast('手机号更新失败: ' + (res.data.message || '未知错误'));
                }
            },
            fail: (err) => {
                this.setData({ 
                    isSavingPhone: false
                });
                console.error('更新手机号请求失败:', err);
                this.showToast('网络错误，请重试');
            }
        });
    },

    // 取消修改手机号
    cancelChangePhone: function() {
        this.setData({
            showPhoneModal: false,
            phoneInputFocus: false
        });
        
        // 清除倒计时
        if (this.data.countdownTimer) {
            clearInterval(this.data.countdownTimer);
            this.setData({
                countdown: 0,
                canGetCode: true
            });
        }
    },

    // 页面卸载时清除计时器
    onUnload: function() {
        if (this.data.countdownTimer) {
            clearInterval(this.data.countdownTimer);
        }
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