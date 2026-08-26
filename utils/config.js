/**
 * 环境配置
 * 开发模式:localhost 指向电脑(微信开发者工具可用)
 * 真机预览:必须改为电脑的局域网 IP,例如 http://192.168.1.100:8080/api
 */
const BASE_URL = 'http://localhost:8080/api';

/**
 * 生成幂等 key(防重复提交)
 * format: {yyyyMMddHHmmss}-{6位随机},同一秒内 + 随机数,足够唯一
 * 用于下单/支付/退款等防重接口,配套后端 @Idempotent 注解 + X-Idempotent-Key 请求头。
 */
function genIdempotentKey() {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  const ts = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}` +
    `${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  const rand = String(Math.floor(Math.random() * 1000000)).padStart(6, '0');
  return `${ts}-${rand}`;
}

module.exports = {
  BASE_URL,
  genIdempotentKey,
};