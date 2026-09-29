/**
 * 访客问候卡片（纯文字版）
 * ------------------------------------------------------------------
 * 显示内容：
 *   · 按时段问候（早安 / 午安 / 晚安…）
 *   · 欢迎来自「省 · 市」的朋友
 *   · 访客当地时间 + 星期（随时区自动变化，每分钟刷新）
 *   · 按 IP 国家 / 中国省份，显示对应语言或方言的问候
 *   · 访客自己的 IP
 *
 * 原理：纯浏览器端。先查浏览器本地时间和时区，再调免费 IP 地理接口拿位置。
 *      不经过任何服务器，静态博客直接可用，无需备案。
 *
 * 放置位置：source/js/visitor-greeting.js
 * 引入方式：_config.butterfly.yml 的 inject.bottom 加
 *          <script src="/js/visitor-greeting.js"></script>
 * 挂载点：  侧栏卡片里的 id="visitor-greeting"（由 source/_data/widget.yml 生成）
 */
(function () {
  'use strict';

  /* ==================================================================
   *  配置区：要改就改这里
   * ================================================================== */
  var CONFIG = {
    // 页面上要填充的元素 id
    mount: 'visitor-greeting',

    // 显示访客 IP
    showIP: true,

    // 时钟刷新间隔（毫秒）
    clockTick: 30000,

    // 地理信息缓存 key（同一标签页内不重复请求接口）
    cacheKey: 'vgr_geo_v1',

    // 接口请求超时（毫秒）
    apiTimeout: 6000,

    // IP 地理接口：按顺序尝试，第一个成功的就用
    apis: [
      'https://ipapi.co/json/',
      'https://ipwho.is/',
      'https://ipinfo.io/json',
      'https://api.ip.sb/geoip',
      'https://ip.useragentinfo.com/json'
    ],

    // 时段划分（from 含，to 不含；最后一段可跨午夜）
    periods: [
      { from: 5,  to: 11, icon: '🌅', text: '早上好' },
      { from: 11, to: 13, icon: '🍜', text: '中午好' },
      { from: 13, to: 18, icon: '☀️', text: '下午好' },
      { from: 18, to: 23, icon: '🌆', text: '晚上好' },
      { from: 23, to: 5,  icon: '🌙', text: '夜深了' }
    ],

    // 拿不到地理信息时的兜底问候
    defaultGreeting: '你好呀'
  };

  /* ==================================================================
   *  国家 / 地区问候语（按 ISO 两位国家码）
   *  想加就照着加，格式：'国家码': '问候语'
   * ================================================================== */
  var COUNTRY_GREETINGS = {
    CN: { lang: '中文',   text: '你好呀' },
    HK: { lang: '粤语',   text: '你好呀' },
    MO: { lang: '粤语',   text: '你好呀' },
    TW: { lang: '中文',   text: '你好呀' },
    JP: { lang: '日语',   text: 'こんにちは' },
    KR: { lang: '韩语',   text: '안녕하세요' },
    KP: { lang: '韩语',   text: '안녕하세요' },
    MN: { lang: '蒙古语', text: 'Сайн байна уу' },
    SG: { lang: '英语',   text: 'Hello' },
    MY: { lang: '马来语', text: 'Apa khabar' },
    TH: { lang: '泰语',   text: 'สวัสดี' },
    VN: { lang: '越南语', text: 'Xin chào' },
    ID: { lang: '印尼语', text: 'Halo' },
    PH: { lang: '他加禄语', text: 'Kumusta' },
    MM: { lang: '缅甸语', text: 'မင်္ဂလာပါ' },
    KH: { lang: '高棉语', text: 'សួស្តី' },
    LA: { lang: '老挝语', text: 'ສະບາຍດີ' },
    IN: { lang: '印地语', text: 'नमस्ते' },
    NP: { lang: '尼泊尔语', text: 'नमस्ते' },
    BD: { lang: '孟加拉语', text: 'হ্যালো' },
    PK: { lang: '乌尔都语', text: 'السلام علیکم' },
    LK: { lang: '僧伽罗语', text: 'ආයුබෝවන්' },
    KZ: { lang: '哈萨克语', text: 'Сәлеметсіз бе' },
    US: { lang: '英语',   text: 'Hello' },
    GB: { lang: '英语',   text: 'Hello' },
    AU: { lang: '英语',   text: 'G\'day' },
    CA: { lang: '英语',   text: 'Hello' },
    NZ: { lang: '英语',   text: 'Kia ora' },
    IE: { lang: '英语',   text: 'Hello' },
    FR: { lang: '法语',   text: 'Bonjour' },
    DE: { lang: '德语',   text: 'Hallo' },
    AT: { lang: '德语',   text: 'Servus' },
    CH: { lang: '德语',   text: 'Grüezi' },
    NL: { lang: '荷兰语', text: 'Hallo' },
    BE: { lang: '荷兰语', text: 'Hallo' },
    ES: { lang: '西班牙语', text: 'Hola' },
    MX: { lang: '西班牙语', text: 'Hola' },
    AR: { lang: '西班牙语', text: 'Hola' },
    CL: { lang: '西班牙语', text: 'Hola' },
    CO: { lang: '西班牙语', text: 'Hola' },
    PE: { lang: '西班牙语', text: 'Hola' },
    PT: { lang: '葡萄牙语', text: 'Olá' },
    BR: { lang: '葡萄牙语', text: 'Olá' },
    IT: { lang: '意大利语', text: 'Ciao' },
    GR: { lang: '希腊语', text: 'Γεια σας' },
    RU: { lang: '俄语',   text: 'Привет' },
    UA: { lang: '乌克兰语', text: 'Привіт' },
    PL: { lang: '波兰语', text: 'Cześć' },
    CZ: { lang: '捷克语', text: 'Ahoj' },
    HU: { lang: '匈牙利语', text: 'Szia' },
    RO: { lang: '罗马尼亚语', text: 'Bună' },
    SE: { lang: '瑞典语', text: 'Hej' },
    NO: { lang: '挪威语', text: 'Hei' },
    DK: { lang: '丹麦语', text: 'Hej' },
    FI: { lang: '芬兰语', text: 'Hei' },
    IS: { lang: '冰岛语', text: 'Halló' },
    TR: { lang: '土耳其语', text: 'Merhaba' },
    IL: { lang: '希伯来语', text: 'שלום' },
    SA: { lang: '阿拉伯语', text: 'مرحبا' },
    AE: { lang: '阿拉伯语', text: 'مرحبا' },
    EG: { lang: '阿拉伯语', text: 'مرحبا' },
    IR: { lang: '波斯语', text: 'سلام' },
    ZA: { lang: '南非荷兰语', text: 'Hallo' },
    NG: { lang: '英语',   text: 'Hello' },
    KE: { lang: '斯瓦希里语', text: 'Jambo' },
    ET: { lang: '阿姆哈拉语', text: 'ሰላም' }
  };

  /* ==================================================================
   *  中国省份 / 地区方言问候
   *  ⚠️ 这些是「示意性」的写法，同一省内口音差异很大，
   *     请按你了解的情况自行修改 —— 说错了不如不说。
   *     写法尽量用普通话能读出来的音译，别写成段子。
   * ================================================================== */
  var PROVINCE_DATA = {
    '北京':     { lang: '北京话',   text: '吃了吗您呐' },
    '天津':     { lang: '天津话',   text: '您吃了吗' },
    '上海':     { lang: '上海话',   text: '侬好呀' },
    '重庆':     { lang: '重庆话',   text: '你好哇' },
    '河北':     { lang: '河北话',   text: '吃咧呗' },
    '山西':     { lang: '山西话',   text: '你好咧' },
    '辽宁':     { lang: '东北话',   text: '干啥呢' },
    '吉林':     { lang: '东北话',   text: '干啥呢' },
    '黑龙江':   { lang: '东北话',   text: '干啥呢' },
    '江苏':     { lang: '苏州话',   text: '倷好' },
    '浙江':     { lang: '吴语',     text: '侬好' },
    '安徽':     { lang: '安徽话',   text: '你可吃过饭了' },
    '福建':     { lang: '闽南语',   text: '汝好' },
    '江西':     { lang: '赣语',     text: '你好撒' },
    '山东':     { lang: '山东话',   text: '你吃饭了吗' },
    '河南':     { lang: '河南话',   text: '你吃了冇' },
    '湖北':     { lang: '武汉话',   text: '你过早了冇' },
    '湖南':     { lang: '长沙话',   text: '你好咯' },
    '广东':     { lang: '粤语',     text: '雷猴啊' },
    '广西':     { lang: '广西话',   text: '你好喂' },
    '海南':     { lang: '海南话',   text: '汝好' },
    '四川':     { lang: '四川话',   text: '你好嘛' },
    '贵州':     { lang: '贵州话',   text: '你吃饭没得' },
    '云南':     { lang: '云南话',   text: '你给吃饭了' },
    '西藏':     { lang: '藏语',     text: 'བཀྲ་ཤིས་བདེ་ལེགས' },
    '陕西':     { lang: '陕西话',   text: '你来咧' },
    '甘肃':     { lang: '甘肃话',   text: '你好着哩' },
    '青海':     { lang: '青海话',   text: '你好着撒' },
    '宁夏':     { lang: '宁夏话',   text: '你好着呢' },
    '新疆':     { lang: '维吾尔语', text: 'ياخشىمۇسىز' },
    '内蒙古':   { lang: '蒙古语',   text: 'Сайн байна уу' },
    '香港':     { lang: '粤语',     text: '你好呀' },
    '澳门':     { lang: '粤语',     text: '你好呀' },
    '台湾':     { lang: '台湾话',   text: '你好' }
  };

  // 把接口返回的各种省名写法归一化到上面表的 key
  var PROVINCE_ALIAS = {
    // 英文名（ipapi / ipinfo / ipwho 对中国 IP 常返回英文）
    beijing: '北京', tianjin: '天津', hebei: '河北', shanxi: '山西', shaanxi: '陕西',
    'inner mongolia': '内蒙古', neimenggu: '内蒙古', liaoning: '辽宁', jilin: '吉林',
    heilongjiang: '黑龙江', shanghai: '上海', jiangsu: '江苏', zhejiang: '浙江',
    anhui: '安徽', fujian: '福建', jiangxi: '江西', shandong: '山东', henan: '河南',
    hubei: '湖北', hunan: '湖南', guangdong: '广东', guangxi: '广西', hainan: '海南',
    chongqing: '重庆', sichuan: '四川', guizhou: '贵州', yunnan: '云南', tibet: '西藏',
    xizang: '西藏', gansu: '甘肃', qinghai: '青海', ningxia: '宁夏', xinjiang: '新疆',
    'hong kong': '香港', hongkong: '香港', macau: '澳门', macao: '澳门', taiwan: '台湾',
    // 带后缀的中文写法
    '内蒙古自治区': '内蒙古', '广西壮族自治区': '广西', '西藏自治区': '西藏',
    '宁夏回族自治区': '宁夏', '新疆维吾尔自治区': '新疆',
    '香港特别行政区': '香港', '澳门特别行政区': '澳门'
  };

  /* ==================================================================
   *  工具函数
   * ================================================================== */

  // 转义，防止接口返回的内容被当 HTML 执行
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function pad2(n) { return (n < 10 ? '0' : '') + n; }

  // 按当前小时取时段问候
  function periodOf(hour) {
    var ps = CONFIG.periods;
    for (var i = 0; i < ps.length; i++) {
      var p = ps[i];
      if (p.from < p.to) {
        if (hour >= p.from && hour < p.to) return p;
      } else {
        // 跨午夜
        if (hour >= p.from || hour < p.to) return p;
      }
    }
    return ps[0];
  }

  var WEEK = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];

  // 省份归一化
  function normProvince(raw) {
    if (!raw) return '';
    var s = String(raw).trim();
    if (!s) return '';
    if (PROVINCE_DATA[s]) return s;
    var low = s.toLowerCase();
    if (PROVINCE_ALIAS[low]) return PROVINCE_ALIAS[low];
    if (PROVINCE_ALIAS[s]) return PROVINCE_ALIAS[s];
    // 去掉「省 / 市 / 自治区」等后缀再试
    var stripped = s.replace(/(省|市|自治区|特别行政区|壮族|回族|维吾尔|自治州)$/g, '').trim();
    if (PROVINCE_DATA[stripped]) return stripped;
    if (PROVINCE_ALIAS[stripped]) return PROVINCE_ALIAS[stripped];
    if (PROVINCE_ALIAS[stripped.toLowerCase()]) return PROVINCE_ALIAS[stripped.toLowerCase()];
    // 前缀匹配（"广东深圳" 这种）
    for (var k in PROVINCE_DATA) {
      if (s.indexOf(k) === 0) return k;
    }
    return '';
  }

  // 常见城市的英文名 → 中文（接口对中国 IP 常返回英文城市名）
  var CITY_CN = {
    beijing: '北京', shanghai: '上海', guangzhou: '广州', shenzhen: '深圳',
    hangzhou: '杭州', nanjing: '南京', suzhou: '苏州', chengdu: '成都',
    chongqing: '重庆', wuhan: '武汉', xian: '西安', "xi'an": '西安',
    tianjin: '天津', changsha: '长沙', zhengzhou: '郑州', qingdao: '青岛',
    jinan: '济南', shenyang: '沈阳', dalian: '大连', harbin: '哈尔滨',
    changchun: '长春', fuzhou: '福州', xiamen: '厦门', quanzhou: '泉州',
    nanchang: '南昌', hefei: '合肥', kunming: '昆明', guiyang: '贵阳',
    nanning: '南宁', haikou: '海口', sanya: '三亚', lanzhou: '兰州',
    xining: '西宁', yinchuan: '银川', urumqi: '乌鲁木齐', lhasa: '拉萨',
    hohhot: '呼和浩特', taiyuan: '太原', shijiazhuang: '石家庄', tangshan: '唐山',
    wuxi: '无锡', ningbo: '宁波', wenzhou: '温州', foshan: '佛山',
    dongguan: '东莞', zhuhai: '珠海', zhongshan: '中山', huizhou: '惠州',
    shantou: '汕头', baoding: '保定', luoyang: '洛阳', xuzhou: '徐州',
    changzhou: '常州', nantong: '南通', yangzhou: '扬州', shaoxing: '绍兴',
    jiaxing: '嘉兴', jinhua: '金华', guilin: '桂林', yantai: '烟台',
    weihai: '威海', zibo: '淄博', weifang: '潍坊', linyi: '临沂',
    datong: '大同', baotou: '包头', jilin: '吉林', handan: '邯郸',
    'hong kong': '香港', kowloon: '九龙', macau: '澳门', macao: '澳门',
    taipei: '台北', kaohsiung: '高雄', taichung: '台中'
  };

  // 城市名归一化
  function normCity(raw) {
    if (!raw) return '';
    var s = String(raw).trim();
    if (!s) return '';
    var low = s.toLowerCase();
    if (CITY_CN[low]) return CITY_CN[low];
    // 去掉「市 / 区 / 县 / 自治州」等后缀
    var stripped = s.replace(/(市|区|县|自治州|地区|盟)$/g, '').trim();
    if (CITY_CN[stripped.toLowerCase()]) return CITY_CN[stripped.toLowerCase()];
    return stripped || s;
  }

  /* ==================================================================
   *  地理信息：多接口依次尝试 + 归一化
   * ================================================================== */

  function pick(obj, keys) {
    for (var i = 0; i < keys.length; i++) {
      var v = obj[keys[i]];
      if (v !== undefined && v !== null && String(v).trim() !== '') return v;
    }
    return '';
  }

  // 把各家接口的不同字段名归一化成统一结构
  function normalize(raw) {
    if (!raw || typeof raw !== 'object') return null;
    // 有的接口用 success/code 表示失败
    if (raw.success === false) return null;
    if (raw.code !== undefined && String(raw.code) !== '200' && String(raw.code) !== '0') return null;

    var cnip = (raw.ipinfo && raw.ipinfo.cnip) || null;   // vore.top 的中国 IP 结构
    var ipdata = raw.ipdata || {};

    var ip = String(pick(raw, ['ip', 'query', 'ipAddress', 'ip_addr']) ||
                    (raw.ipinfo && raw.ipinfo.text) || '');
    var cc = String(pick(raw, ['country_code', 'countryCode', 'short_name', 'countryCode2']) ||
                    (String(pick(raw, ['country'])).length === 2 ? pick(raw, ['country']) : '')).toUpperCase();
    var country = String(pick(raw, ['country_name', 'country_name_en', 'country']) ||
                    (cnip && cnip[0]) || '');
    var province = String(pick(raw, ['region', 'regionName', 'province', 'state']) ||
                    (cnip && cnip[1]) || '');
    var city = String(pick(raw, ['city', 'town']) ||
                    ipdata.info3 || (cnip && cnip[2]) || '');
    var tz = String(pick(raw, ['timezone']) ||
                    (raw.timezone && raw.timezone.id) || '');

    if (!ip && !cc && !province) return null;
    return { ip: ip, cc: cc, country: country, province: province, city: city, tz: tz };
  }

  function fetchOne(url) {
    return new Promise(function (resolve, reject) {
      var done = false;
      var timer = setTimeout(function () {
        if (done) return; done = true; reject(new Error('timeout'));
      }, CONFIG.apiTimeout);

      var ctrl = null;
      try { ctrl = new AbortController(); } catch (e) {}

      fetch(url, { signal: ctrl ? ctrl.signal : undefined, credentials: 'omit' })
        .then(function (r) { return r.ok ? r.json() : Promise.reject(new Error('HTTP ' + r.status)); })
        .then(function (j) {
          if (done) return; done = true; clearTimeout(timer);
          var g = normalize(j);
          g ? resolve(g) : reject(new Error('bad payload'));
        })
        .catch(function (e) {
          if (done) return; done = true; clearTimeout(timer);
          reject(e);
        });
    });
  }

  // 依次尝试所有接口
  function fetchGeo() {
    var i = 0;
    function next() {
      if (i >= CONFIG.apis.length) return Promise.reject(new Error('all failed'));
      var url = CONFIG.apis[i++];
      return fetchOne(url).catch(next);
    }
    return next();
  }

  function readCache() {
    try {
      var s = sessionStorage.getItem(CONFIG.cacheKey);
      return s ? JSON.parse(s) : null;
    } catch (e) { return null; }
  }
  function writeCache(g) {
    try { sessionStorage.setItem(CONFIG.cacheKey, JSON.stringify(g)); } catch (e) {}
  }

  /* ==================================================================
   *  样式（自带，不用改主题配置）
   * ================================================================== */
  var STYLE_ID = 'vgr-style';
  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    var css = ''
      + '#visitor-greeting .vgr-hi{font-size:1.05em;font-weight:bold;margin:0 0 10px}'
      + '#visitor-greeting .vgr-line{margin:6px 0;line-height:1.7;word-break:break-word}'
      + '#visitor-greeting .vgr-line b{color:var(--btn-hover-color,#C3152A)}'
      + '#visitor-greeting .vgr-dim{opacity:.6;font-size:.9em}'
      + '#visitor-greeting .vgr-dialect{background:rgba(127,127,127,.10);border-radius:6px;padding:8px 10px;margin-top:10px}'
      + '#visitor-greeting code{font-size:.9em;padding:1px 6px;border-radius:4px;background:rgba(127,127,127,.15)}'
      + '#visitor-greeting .vgr-loading{opacity:.6}';
    var st = document.createElement('style');
    st.id = STYLE_ID;
    st.appendChild(document.createTextNode(css));
    document.head.appendChild(st);
  }

  /* ==================================================================
   *  渲染
   * ================================================================== */

  // 问候语：优先中国省份方言 → 国家语言 → 兜底
  function greetingFor(geo) {
    if (!geo) return { lang: '', text: CONFIG.defaultGreeting };
    if (geo.cc === 'CN' || geo.cc === 'HK' || geo.cc === 'MO' || geo.cc === 'TW') {
      var p = normProvince(geo.province);
      if (p && PROVINCE_DATA[p]) return PROVINCE_DATA[p];
      // 中国但认不出省份
      if (geo.cc === 'CN') return { lang: '中文', text: '你好呀' };
    }
    if (geo.cc && COUNTRY_GREETINGS[geo.cc]) return COUNTRY_GREETINGS[geo.cc];
    return { lang: '', text: CONFIG.defaultGreeting };
  }

  function placeOf(geo) {
    if (!geo) return '';
    var p = geo.cc === 'CN' ? normProvince(geo.province) : (geo.province || '');
    var c = normCity(geo.city);
    var parts = [];
    if (p) parts.push(p);
    else if (geo.country) parts.push(geo.country);
    // 城市和省份重复（"上海 · 上海市"）或城市包含省份时，不重复显示
    if (c && c !== p && (!p || (c.indexOf(p) === -1 && p.indexOf(c) === -1))) parts.push(c);
    return parts.join(' · ');
  }

  function localTimeHtml() {
    var now = new Date();
    var hh = pad2(now.getHours()) + ':' + pad2(now.getMinutes());
    var week = WEEK[now.getDay()];
    var tz = '';
    try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) {}
    return {
      period: periodOf(now.getHours()),
      time: hh,
      week: week,
      tz: tz
    };
  }

  function render(geo, node) {
    var t = localTimeHtml();
    var g = greetingFor(geo);
    var place = placeOf(geo);

    var html = '';
    html += '<p class="vgr-hi">' + esc(t.period.icon + ' ' + t.period.text) + '！</p>';

    if (place) {
      html += '<p class="vgr-line">欢迎来自 <b>' + esc(place) + '</b> 的朋友</p>';
    } else {
      html += '<p class="vgr-line">欢迎来访的朋友</p>';
    }

    html += '<p class="vgr-line">你那边现在是 <b>' + esc(t.time) + '</b>'
          + '<span class="vgr-dim">（' + esc(t.week)
          + (t.tz ? ' · ' + esc(t.tz) : '') + '）</span></p>';

    if (g.text) {
      html += '<p class="vgr-line vgr-dialect">🗣️ '
            + (g.lang ? esc(g.lang) + '：' : '')
            + '<b>' + esc(g.text) + '</b></p>';
    }

    if (CONFIG.showIP && geo && geo.ip) {
      html += '<p class="vgr-line vgr-dim">你的 IP：<code>' + esc(geo.ip) + '</code></p>';
    }

    node.innerHTML = html;
  }

  /* ==================================================================
   *  启动
   * ================================================================== */
  var currentGeo = null;

  function mount() {
    var node = document.getElementById(CONFIG.mount);
    if (!node) return false;
    injectStyle();

    if (currentGeo) {
      render(currentGeo, node);
      return true;
    }

    // 先用缓存
    var cached = readCache();
    if (cached) {
      currentGeo = cached;
      render(currentGeo, node);
      return true;
    }

    // 先渲染「时间 + 问候」，地理信息到了再补 —— 避免白等
    node.innerHTML = '<p class="vgr-loading">正在看看你从哪里来…</p>';
    fetchGeo().then(function (geo) {
      currentGeo = geo;
      writeCache(geo);
      var n = document.getElementById(CONFIG.mount);
      if (n) render(geo, n);
    }).catch(function () {
      // 地理接口全挂了也不影响时间和问候
      currentGeo = { ip: '', cc: '', country: '', province: '', city: '', tz: '' };
      var n = document.getElementById(CONFIG.mount);
      if (n) render(currentGeo, n);
    });
    return true;
  }

  function boot() {
    mount();
    // 时钟每分钟刷新（跨时段时会自动换问候语）
    setInterval(function () {
      var n = document.getElementById(CONFIG.mount);
      if (n && currentGeo) render(currentGeo, n);
    }, CONFIG.clockTick);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  // Butterfly 开了 pjax（无刷新跳转），侧栏会被整体替换，
  // 所以每次跳转后要重新填充一次
  document.addEventListener('pjax:complete', function () {
    setTimeout(mount, 0);
  });
})();
