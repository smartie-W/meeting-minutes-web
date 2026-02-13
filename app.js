const RECORDS_KEY = "sales_meeting_minutes_records_v2";
const AI_CONFIG_KEY = "sales_meeting_minutes_ai_config_v2";
const DRAFT_KEY = "sales_meeting_minutes_draft_v1";
const FIREBASE_COLLECTION = "meeting_minutes_records";
const FIREBASE_CONFIG = window.FIREBASE_CONFIG || {
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: "",
};
const MANAGER_LOGIN_USERNAME = "wangqiming";
const MANAGER_LOGIN_PASSWORD = "wqm211700";
const MIGRATION_SOURCE_OPTIONS = ["无", "Jira", "Cf", "禅道", "pingcode", "TB", "飞书项目", "飞书知识库", "Tapd"];
const MIGRATION_VERSION_OPTIONS = ["无", "私有部署买断", "私有部署按年订阅", "公有云版本"];
const OUR_PARTICIPANT_ROLE_OPTIONS = ["AR", "SR", "FR-实施", "FR-PM", "运维", "技术", "产品", "测试"];
const CUSTOMER_INDUSTRY_MAP = {
  "阿里巴巴": { level1: "互联网", level2: "电商平台" },
  "腾讯": { level1: "互联网", level2: "社交平台" },
  "字节": { level1: "互联网", level2: "内容平台" },
  "华为": { level1: "ICT", level2: "通信设备" },
  "中兴": { level1: "ICT", level2: "通信设备" },
  "中国移动": { level1: "ICT", level2: "运营商" },
  "中国电信": { level1: "ICT", level2: "运营商" },
  "中国联通": { level1: "ICT", level2: "运营商" },
  "招商银行": { level1: "金融", level2: "银行" },
  "工商银行": { level1: "金融", level2: "银行" },
  "建设银行": { level1: "金融", level2: "银行" },
  "农业银行": { level1: "金融", level2: "银行" },
  "平安": { level1: "金融", level2: "保险" },
  "中国人寿": { level1: "金融", level2: "保险" },
  "比亚迪": { level1: "汽车", level2: "新能源汽车" },
  "上汽": { level1: "汽车", level2: "整车制造" },
  "广汽": { level1: "汽车", level2: "整车制造" },
  "蔚来": { level1: "汽车", level2: "新能源汽车" },
  "小鹏": { level1: "汽车", level2: "新能源汽车" },
  "理想": { level1: "汽车", level2: "新能源汽车" },
  "宁德时代": { level1: "新能源", level2: "动力电池" },
  "美的": { level1: "制造", level2: "家电制造" },
  "海尔": { level1: "制造", level2: "家电制造" },
  "格力": { level1: "制造", level2: "家电制造" },
  "三一重工": { level1: "制造", level2: "工程机械" },
  "中联重科": { level1: "制造", level2: "工程机械" },
  "京东": { level1: "零售", level2: "电商" },
  "拼多多": { level1: "零售", level2: "电商" },
  "沃尔玛": { level1: "零售", level2: "商超零售" },
  "华润": { level1: "零售", level2: "消费零售" },
  "顺丰": { level1: "物流", level2: "快递物流" },
  "中通": { level1: "物流", level2: "快递物流" },
  "圆通": { level1: "物流", level2: "快递物流" },
  "申通": { level1: "物流", level2: "快递物流" },
  "中国石化": { level1: "能源", level2: "石油石化" },
  "中国石油": { level1: "能源", level2: "石油石化" },
  "国家电网": { level1: "能源", level2: "电力" },
  "南方电网": { level1: "能源", level2: "电力" },
  "药明康德": { level1: "医疗健康", level2: "生物医药" },
  "恒瑞医药": { level1: "医疗健康", level2: "生物医药" },
  "迈瑞": { level1: "医疗健康", level2: "医疗器械" },
  "万科": { level1: "房地产", level2: "住宅地产" },
  "碧桂园": { level1: "房地产", level2: "住宅地产" },
  "保利": { level1: "房地产", level2: "住宅地产" },
  "中国中铁": { level1: "建筑基建", level2: "工程建设" },
  "中国建筑": { level1: "建筑基建", level2: "工程建设" },
  "海康威视": { level1: "安防", level2: "视频安防" },
  "大华": { level1: "安防", level2: "视频安防" },
  "中国中车": { level1: "交通运输", level2: "轨道交通" },
  "中国国航": { level1: "交通运输", level2: "航空运输" },
  "南方航空": { level1: "交通运输", level2: "航空运输" },
  "东方航空": { level1: "交通运输", level2: "航空运输" },
  "中国烟草": { level1: "消费品", level2: "烟草" },
  "国家能源": { level1: "能源", level2: "综合能源" },
  "天正电气": { level1: "制造", level2: "电气设备" },
  "浙江天正电气股份有限公司": { level1: "制造", level2: "电气设备" },
  "上海概伦电子技术股份有限公司": { level1: "电子信息", level2: "半导体EDA" },
  "上海概伦电子": { level1: "电子信息", level2: "半导体EDA" },
  "概伦电子": { level1: "电子信息", level2: "半导体EDA" },
  "荣耀": { level1: "消费电子", level2: "智能终端" },
  "荣耀终端股份有限公司": { level1: "消费电子", level2: "智能终端" },
};

const KNOWN_CUSTOMER_FULLNAMES = [
  "上海维科精密模塑股份有限公司",
  "杭州亿格云科技有限公司",
  "中国科学技术大学",
  "杭州极弱磁场国家重大科技基础设施研究院",
  "浙江海盐力源环保科技股份有限公司",
  "上海合成生物学创新中心",
  "中核建创新科技有限公司",
  "上海城建数字产业集团有限公司",
  "银联智策顾问（上海）有限公司",
  "能科科技股份有限公司",
  "杭州华望系统科技有限公司",
  "福建银河数字科技有限公司",
  "杭州剑证网络科技有限公司",
  "苏州圣沃软件科技有限公司",
  "AIRudder Pte Ltd",
  "南京埃斯顿自动化股份有限公司",
  "罗博网联（杭州）信息技术有限公司",
  "时代聚能（上海）新能源发展有限公司",
  "浙江久婵物联科技有限公司",
  "唯捷创芯（天津）电子技术股份有限公司",
  "上海科之锐人才咨询有限公司",
  "上海国际货币经纪有限责任公司",
  "江西维克特瑞科技装备有限公司",
  "光本位智能科技（苏州）有限公司",
  "浙江元矩阵生物科技有限公司",
  "内蒙古蒙泰集团有限公司",
  "浙江舒友仪器设备股份有限公司",
  "宁波均悦云新能源科技有限公司",
  "上海概伦电子股份有限公司",
  "江苏麒祥高新材料有限公司",
  "智仿科技（浙江）有限公司",
  "温州民商银行股份有限公司",
  "中银基金管理有限公司",
  "黑龙江惠达科技股份有限公司",
  "瑞纳智能设备股份有限公司",
  "浙江平湖农村商业银行股份有限公司",
  "上海沁灿信息技术有限公司",
  "上海骑圈信息技术有限公司",
  "上海矢安科技有限公司",
  "捷蒽迪智能电子（黄石）有限公司",
  "福建国芯科瑞智能科技有限公司",
  "广脉科技股份有限公司",
  "杭州吉高智能电子科技有限公司",
  "芯和半导体科技（上海）股份有限公司",
  "上海安路信息科技股份有限公司",
  "上海上班族数字科技有限公司",
  "厦门佳因特科技有限公司",
  "优刻得科技股份有限公司",
  "茶姬（上海）科技有限公司",
  "上海唛斯网络有限公司",
  "WECHAIN FINTECH PTE. LTD.",
  "浙江杭州余杭农村商业银行股份有限公司",
  "常州伯仪生物科技有限公司",
  "上海同萃创化医药科技有限公司",
  "复星保德信人寿保险有限公司",
  "安井食品集团股份有限公司",
  "上海昊启信息科技有限公司",
  "隼瞻科技（广州）有限公司",
  "亚数信息科技（上海）有限公司",
  "上海穹彻智能科技有限公司",
  "固德威技术股份有限公司",
  "上海隐冠半导体技术股份有限公司",
  "苏州同元软控信息技术有限公司",
  "上海辰华网络技术服务有限公司",
  "上海维信荟智金融科技有限公司",
  "凡己科技（苏州）有限公司",
  "宿州聚凯机械有限公司",
  "中汇信息技术（上海）有限公司",
  "合肥晶合集成电路股份有限公司",
  "南京衍构科技有限公司",
  "浙江一鸣食品股份有限公司",
  "传播大脑科技（浙江）股份有限公司",
  "东方日升新能源股份有限公司",
  "山善（上海）贸易有限公司",
  "大健云仓科技（苏州）有限公司",
  "上海云蟾数码科技有限公司",
  "上海良韵科技有限公司",
  "江苏菲沃泰纳米科技股份有限公司",
  "思源电气股份有限公司",
  "中智关爱通（上海）科技股份有限公司",
  "上海移为通信技术股份有限公司",
  "上海票据交易所股份有限公司",
  "杭州飞步科技有限公司",
  "苏州异格技术有限公司",
  "三迪（常州）智能装备有限公司",
  "浙江绿色智行科创有限公司",
  "上海振华重工（集团）股份有限公司",
  "上海随申行智慧交通科技有限公司",
  "上海正圆计算机科技有限公司",
  "浙江高速公路智能收费运营服务有限公司",
  "晟矽微电子（南京）有限公司",
  "中欧基金管理有限公司",
  "优网信息科技（上海）有限公司",
  "劲方医药科技（上海）有限公司",
  "嘉兴易多电力科技有限公司",
  "芯与物（上海）技术有限公司",
  "国药控股股份有限公司",
  "上海羽如贸易有限公司",
  "上海电气分布式能源科技有限公司",
  "浙商证券股份有限公司",
  "无锡信捷电气股份有限公司",
  "江苏泰瑞联腾供应链有限公司",
  "厦门象屿科技有限公司",
  "上海擎创信息技术有限公司",
  "宣城立讯精密工业有限公司",
  "苏州炎武软件有限公司",
  "浙江天正电气股份有限公司",
  "老虎表面技术新材料（苏州）有限公司",
  "上海驿创信息技术有限公司",
  "嘉信力合信息科技（上海）有限公司",
  "上海联泰科技股份有限公司",
  "上海非凸智能科技有限公司",
  "杭州火树科技有限公司",
  "云汉芯城（上海）互联网科技股份有限公司",
  "南京粒聚智能科技有限公司",
  "上海大界机器人科技有限公司",
  "上海英拿信息技术有限公司",
  "上海荣数信息技术有限公司",
  "盐城一之来计算机有限公司",
  "杭州巨玩科技有限公司",
  "浙江公链信息科技有限公司",
  "厦门市美亚柏科信息安全研究所有限公司",
  "北京一数一叶科技有限公司",
  "长江龙新媒体有限公司",
  "山东荣庆物流科技有限公司",
  "上海快仓自动化科技有限公司",
  "上海豹云网络信息服务有限公司",
  "上海微谱检测科技集团股份有限公司",
  "上海正泰智能科技有限公司",
  "安徽远硕科技有限公司北京分公司",
  "上海新宇钟表集团有限公司",
  "上海伊邦医药信息科技股份有限公司",
];
// total: 132

const COMPANY_ALIAS_FULLNAME_MAP = {
  "天正电气": "浙江天正电气股份有限公司",
  "天正": "浙江天正电气股份有限公司",
  "荣耀": "荣耀终端股份有限公司",
  "概伦电子": "上海概伦电子技术股份有限公司",
};

const INDUSTRY_KEYWORD_RULES = [
  { keys: ["银行", "农商行", "城商行"], level1: "金融", level2: "银行" },
  { keys: ["证券", "期货"], level1: "金融", level2: "证券" },
  { keys: ["基金", "资管"], level1: "金融", level2: "基金资管" },
  { keys: ["保险", "人寿"], level1: "金融", level2: "保险" },
  { keys: ["电力", "电网"], level1: "能源", level2: "电力" },
  { keys: ["石油", "石化", "天然气", "煤"], level1: "能源", level2: "油气化工" },
  { keys: ["制药", "药业", "生物"], level1: "医疗健康", level2: "生物医药" },
  { keys: ["医院", "医疗器械"], level1: "医疗健康", level2: "医疗服务/器械" },
  { keys: ["汽车", "汽配"], level1: "汽车", level2: "整车/零部件" },
  { keys: ["新能源车", "动力电池"], level1: "汽车", level2: "新能源汽车" },
  { keys: ["制造", "重工", "装备", "机械"], level1: "制造", level2: "工业制造" },
  { keys: ["电商", "零售", "商超", "百货"], level1: "零售", level2: "电商/零售" },
  { keys: ["物流", "快递", "供应链"], level1: "物流", level2: "快递物流" },
  { keys: ["运营商", "通信", "联通", "移动", "电信"], level1: "ICT", level2: "运营商/通信" },
  { keys: ["地产", "置业", "房产"], level1: "房地产", level2: "房地产开发" },
  { keys: ["建筑", "建工", "路桥"], level1: "建筑基建", level2: "工程建设" },
  { keys: ["大学", "学院", "学校"], level1: "教育", level2: "高教/职教" },
  { keys: ["政府", "公安", "税务", "法院"], level1: "政务", level2: "政府机构" },
  { keys: ["电气", "电器", "配电", "低压电器"], level1: "制造", level2: "电气设备" },
  { keys: ["电子", "终端", "手机", "智能设备"], level1: "消费电子", level2: "智能终端" },
  { keys: ["芯片", "半导体"], level1: "电子信息", level2: "半导体" },
  { keys: ["eda", "电路仿真", "电路设计"], level1: "电子信息", level2: "半导体EDA" },
  { keys: ["半导体", "集成电路", "微电子", "芯片", "晶圆"], level1: "电子信息", level2: "半导体" },
  { keys: ["机器人", "自动化", "智能装备", "数控"], level1: "制造", level2: "智能制造" },
  { keys: ["软件", "信息技术", "信息科技", "信息", "网络", "数码", "数字科技", "云", "saas", "科技"], level1: "软件服务", level2: "企业软件/SaaS" },
  { keys: ["光伏", "储能", "新能源", "新能"], level1: "新能源", level2: "光伏/储能" },
  { keys: ["材料", "新材料", "纳米", "化工"], level1: "制造", level2: "新材料/化工" },
  { keys: ["检测", "检验", "认证"], level1: "专业服务", level2: "检测认证" },
  { keys: ["贸易", "商贸"], level1: "批发零售", level2: "贸易" },
  { keys: ["食品", "饮料", "乳业", "餐饮"], level1: "消费品", level2: "食品饮料" },
  { keys: ["物流", "仓", "仓储", "供应链"], level1: "物流", level2: "供应链/仓储" },
  { keys: ["交通", "轨道", "航空", "港口", "高速"], level1: "交通运输", level2: "交通基础设施" },
  { keys: ["研究院", "研究所", "大学", "学院"], level1: "教育科研", level2: "高校/科研" },
  { keys: ["信息安全", "网络安全", "安防"], level1: "网络安全", level2: "信息安全" },
  { keys: ["通信技术", "通信科技"], level1: "ICT", level2: "通信技术服务" },
];


const INDUSTRY_PEER_COMPANIES = {
  "金融|银行": ["交通银行", "中国银行", "浦发银行", "兴业银行", "民生银行", "中信银行", "光大银行", "北京银行", "宁波银行", "江苏银行", "杭州银行", "南京银行", "上海银行", "浙商银行", "渤海银行"],
  "金融|证券": ["中信证券", "国泰君安", "华泰证券", "海通证券", "广发证券", "中金公司", "中信建投", "东方证券", "兴业证券", "申万宏源", "招商证券", "国信证券"],
  "金融|基金资管": ["易方达基金", "华夏基金", "南方基金", "嘉实基金", "富国基金", "广发基金", "博时基金", "汇添富基金", "中欧基金", "中银基金"],
  "金融|保险": ["中国平安", "中国太保", "中国人保", "新华保险", "太平人寿", "泰康保险", "众安保险"],
  "ICT|运营商/通信": ["中国移动", "中国电信", "中国联通", "中国广电", "华为", "中兴通讯", "烽火通信"],
  "电子信息|半导体": ["中芯国际", "华虹半导体", "韦尔股份", "兆易创新", "紫光国微", "闻泰科技", "长电科技", "通富微电", "华天科技", "芯原股份", "澜起科技"],
  "电子信息|半导体EDA": ["概伦电子", "华大九天", "芯和半导体", "芯华章", "芯愿景"],
  "消费电子|智能终端": ["荣耀终端", "小米", "OPPO", "vivo", "传音", "联想", "华勤技术"],
  "新能源|光伏/储能": ["隆基绿能", "晶科能源", "天合光能", "晶澳科技", "通威股份", "阿特斯", "东方日升", "协鑫集成", "正泰新能", "阳光电源", "固德威"],
  "制造|电气设备": ["正泰电器", "德力西电气", "良信股份", "公牛集团", "思源电气", "许继电气", "平高电气"],
  "制造|智能制造": ["汇川技术", "埃斯顿", "新松机器人", "埃夫特", "拓斯达", "大族激光", "海目星"],
  "医疗健康|生物医药": ["恒瑞医药", "复星医药", "药明康德", "君实生物", "百济神州", "信达生物", "迈瑞医疗"],
  "专业服务|检测认证": ["华测检测", "谱尼测试", "广电计量", "国检集团", "微谱检测"],
  "物流|供应链/仓储": ["顺丰控股", "京东物流", "菜鸟", "安能物流", "德邦股份", "中通快递", "圆通速递"],
  "软件服务|企业软件/SaaS": ["金蝶国际", "用友网络", "明源云", "泛微网络", "致远互联", "腾讯云", "阿里云", "华为云"],
};

function buildEnrichedIndustryMap() {
  const merged = { ...CUSTOMER_INDUSTRY_MAP };

  Object.entries(INDUSTRY_PEER_COMPANIES).forEach(([pair, companies]) => {
    const [level1, level2] = pair.split("|");
    (companies || []).forEach((name) => {
      if (!merged[name]) merged[name] = { level1, level2 };
    });
  });

  KNOWN_CUSTOMER_FULLNAMES.forEach((name) => {
    if (merged[name]) return;
    const inferred = inferIndustryFromText(name);
    if (inferred) merged[name] = inferred;
  });

  return merged;
}

const ENRICHED_CUSTOMER_INDUSTRY_MAP = buildEnrichedIndustryMap();

const INDUSTRY_CHAIN_MAP = {
  "电子信息|半导体": {
    upstream: ["晶圆制造", "EDA工具", "半导体设备", "材料与IP"],
    downstream: ["芯片设计公司", "IDM", "消费电子终端", "汽车电子"],
  },
  "电子信息|半导体EDA": {
    upstream: ["晶圆厂PDK", "器件模型", "EDA基础IP", "高性能算力资源"],
    downstream: ["IC设计企业", "晶圆代工生态", "封测企业", "系统厂商芯片团队"],
  },
  "消费电子|智能终端": {
    upstream: ["芯片/模组", "显示与摄像头", "结构件与电池", "操作系统与中间件"],
    downstream: ["运营商渠道", "电商零售", "企业终端采购", "售后服务体系"],
  },
  "制造|电气设备": {
    upstream: ["铜铝等原材料", "电子元器件", "继电器/断路器核心件", "工业软件"],
    downstream: ["电力系统集成商", "建筑与园区项目", "工业制造企业", "运维服务商"],
  },
  "金融|银行": {
    upstream: ["核心系统厂商", "数据库与中间件", "安全与合规服务", "云基础设施"],
    downstream: ["企业客户", "零售客户", "分支行网点", "生态合作伙伴"],
  },
};

const CUSTOMER_CHAIN_OVERRIDES = {
  "上海概伦电子技术股份有限公司": {
    upstream: ["晶圆厂PDK与工艺模型", "器件参数与测试数据", "EDA基础算法库", "高性能计算资源"],
    downstream: ["模拟/数模IC设计公司", "晶圆代工与IDM", "封测与验证团队", "汽车/工业芯片客户"],
  },
};

const state = {
  records: loadRecords(),
  aiConfig: loadAiConfig(),
  filterStart: "",
  filterEnd: "",
  filterSales: "",
  filterPreset: "week",
  historyCustomer: "",
  historyAr: "",
  historySr: "",
  historyFrImpl: "",
  historyFrPm: "",
  historyModalList: [],
  historyModalIndex: -1,
  pendingDeleteRecordId: "",
  managerAuthenticated: false,
  pendingView: "",
  firestore: null,
  cloudUnsubscribe: null,
  aiResult: {
    summary: "暂无",
    globalKeywords: [],
    bySales: {},
    generatedAt: "",
    source: "local",
  },
};
let industryLookupSeq = 0;
let industryLookupTimer = null;
let draftSaveTimer = null;

const el = {
  tabs: [...document.querySelectorAll(".tab")],
  views: {
    sales: document.querySelector("#view-sales"),
    manager: document.querySelector("#view-manager"),
    history: document.querySelector("#view-history"),
  },

  form: document.querySelector("#minutes-form"),
  recordId: document.querySelector("#record-id"),
  salesName: document.querySelector("#sales-name"),
  meetingMode: document.querySelector("#meeting-mode"),
  industryLevel1: document.querySelector("#industry-level1"),
  industryLevel2: document.querySelector("#industry-level2"),
  meetingTime: document.querySelector("#meeting-time"),
  meetingLocation: document.querySelector("#meeting-location"),
  customerName: document.querySelector("#customer-name"),
  companyNameSuggestions: document.querySelector("#company-name-suggestions"),
  meetingTopic: document.querySelector("#meeting-topic"),
  customerParticipants: document.querySelector("#customer-participants"),
  ourParticipants: document.querySelector("#our-participants"),
  addCustomerParticipant: document.querySelector("#add-customer-participant"),
  addOurParticipant: document.querySelector("#add-our-participant"),
  focusModules: [...document.querySelectorAll('input[name=\"focus-module\"]')],
  deployMode: document.querySelector("#deploy-mode"),
  coopMode: document.querySelector("#coop-mode"),
  migrationSources: document.querySelector("#migration-sources"),
  addMigrationSource: document.querySelector("#add-migration-source"),
  meetingContent: document.querySelector("#meeting-content"),
  nextActions: document.querySelector("#next-actions"),
  formReset: document.querySelector("#form-reset"),
  draftStatus: document.querySelector("#draft-status"),

  exportBtn: document.querySelector("#export-btn"),

  filterSales: document.querySelector("#filter-sales"),
  presetButtons: [...document.querySelectorAll(".preset-btn")],
  applyFilter: document.querySelector("#apply-filter"),
  clearFilter: document.querySelector("#clear-filter"),

  aiEndpoint: document.querySelector("#ai-endpoint"),
  aiModel: document.querySelector("#ai-model"),
  aiKey: document.querySelector("#ai-key"),
  saveAi: document.querySelector("#save-ai"),
  runAi: document.querySelector("#run-ai"),
  aiStatus: document.querySelector("#ai-status"),

  kpiSalespeople: document.querySelector("#kpi-salespeople"),
  kpiMinutes: document.querySelector("#kpi-minutes"),
  kpiCustomers: document.querySelector("#kpi-customers"),
  kpiWeeks: document.querySelector("#kpi-weeks"),
  managerTable: document.querySelector("#manager-table"),
  srTable: document.querySelector("#sr-table"),
  weekTable: document.querySelector("#week-table"),
  aiSummary: document.querySelector("#ai-summary"),
  globalKeywords: document.querySelector("#global-keywords"),

  historyCustomer: document.querySelector("#history-customer"),
  historyAr: document.querySelector("#history-ar"),
  historySr: document.querySelector("#history-sr"),
  historyFrImpl: document.querySelector("#history-fr-impl"),
  historyFrPm: document.querySelector("#history-fr-pm"),
  historySummary: document.querySelector("#history-summary"),
  historyList: document.querySelector("#history-list"),
  historyItemTemplate: document.querySelector("#history-item-template"),
  historyDetailModal: document.querySelector("#history-detail-modal"),
  historyDetailDelete: document.querySelector("#history-detail-delete"),
  historyDetailNext: document.querySelector("#history-detail-next"),
  historyDetailClose: document.querySelector("#history-detail-close"),
  historyDetailTitle: document.querySelector("#history-detail-title"),
  historyDetailBody: document.querySelector("#history-detail-body"),
  historyDeleteAuthModal: document.querySelector("#history-delete-auth-modal"),
  historyDeleteAuthUsername: document.querySelector("#history-delete-auth-username"),
  historyDeleteAuthPassword: document.querySelector("#history-delete-auth-password"),
  historyDeleteAuthSubmit: document.querySelector("#history-delete-auth-submit"),
  historyDeleteAuthCancel: document.querySelector("#history-delete-auth-cancel"),
  historyDeleteAuthError: document.querySelector("#history-delete-auth-error"),
  managerLoginModal: document.querySelector("#manager-login-modal"),
  managerLoginUsername: document.querySelector("#manager-login-username"),
  managerLoginPassword: document.querySelector("#manager-login-password"),
  managerLoginSubmit: document.querySelector("#manager-login-submit"),
  managerLoginCancel: document.querySelector("#manager-login-cancel"),
  managerLoginError: document.querySelector("#manager-login-error"),
};

boot();

function boot() {
  bindEvents();
  applyManagerPreset("week");
  fillAiConfigInputs();
  resetParticipantSections();
  resetMigrationSources();
  applyDeployCoopRule();
  ensureMeetingTimeDefault();
  clearDraft();
  updateDraftStatus("草稿未保存");
  applyMeetingModeLocationRule();
  refreshIndustryByCustomer();
  syncLongInputHeights();
  render();
  initCloudSync();
}

function bindEvents() {
  el.tabs.forEach((tab) => {
    tab.addEventListener("click", () => switchView(tab.dataset.view));
  });

  el.form.addEventListener("submit", handleSaveRecord);
  el.formReset.addEventListener("click", resetForm);
  el.form.addEventListener("input", scheduleDraftSave);
  el.form.addEventListener("change", scheduleDraftSave);
  el.meetingContent.addEventListener("input", () => autoGrowLongInput(el.meetingContent));
  el.nextActions.addEventListener("input", () => autoGrowLongInput(el.nextActions));
  el.customerName.addEventListener("input", scheduleIndustryLookup);
  el.salesName.addEventListener("input", () => {
    syncArParticipantNames();
  });
  el.meetingMode.addEventListener("change", () => {
    applyMeetingModeLocationRule({ force: true });
    scheduleDraftSave();
  });
  el.deployMode.addEventListener("change", () => {
    applyDeployCoopRule();
    scheduleDraftSave();
  });
  el.addCustomerParticipant.addEventListener("click", () =>
    addParticipantRow(el.customerParticipants),
  );
  el.addOurParticipant.addEventListener("click", () => addParticipantRow(el.ourParticipants));
  el.addMigrationSource.addEventListener("click", () => addMigrationSourceRow(el.migrationSources));

  el.exportBtn.addEventListener("click", exportRecords);

  el.applyFilter.addEventListener("click", () => {
    state.filterSales = el.filterSales.value.trim();
    renderManager();
  });

  el.clearFilter.addEventListener("click", () => {
    state.filterSales = "";
    el.filterSales.value = "";
    applyManagerPreset("week");
    renderManager();
  });

  el.presetButtons.forEach((button) => {
    button.addEventListener("click", () => {
      applyManagerPreset(button.dataset.preset || "");
      state.filterSales = el.filterSales.value.trim();
      renderManager();
    });
  });

  el.saveAi.addEventListener("click", saveAiConfig);
  el.runAi.addEventListener("click", runAiAnalysis);

  el.historyCustomer.addEventListener("input", applyHistoryFilters);
  el.historyAr.addEventListener("input", applyHistoryFilters);
  el.historySr.addEventListener("input", applyHistoryFilters);
  el.historyFrImpl.addEventListener("input", applyHistoryFilters);
  el.historyFrPm.addEventListener("input", applyHistoryFilters);
  el.historyDetailClose.addEventListener("click", closeHistoryDetailModal);
  el.historyDetailDelete.addEventListener("click", openDeleteAuthModal);
  el.historyDetailNext.addEventListener("click", openNextHistoryDetail);
  el.historyDetailModal.addEventListener("click", (event) => {
    if (event.target instanceof Element && event.target.closest("[data-close-modal='true']")) {
      closeHistoryDetailModal();
    }
  });
  el.historyDeleteAuthSubmit.addEventListener("click", submitDeleteAuth);
  el.historyDeleteAuthCancel.addEventListener("click", closeDeleteAuthModal);
  el.historyDeleteAuthPassword.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      submitDeleteAuth();
    }
  });
  el.historyDeleteAuthModal.addEventListener("click", (event) => {
    if (event.target instanceof Element && event.target.closest("[data-close-delete-auth='true']")) {
      closeDeleteAuthModal();
    }
  });
  el.managerLoginSubmit.addEventListener("click", submitManagerLogin);
  el.managerLoginCancel.addEventListener("click", closeManagerLoginModal);
  el.managerLoginPassword.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      submitManagerLogin();
    }
  });
  el.managerLoginModal.addEventListener("click", (event) => {
    if (event.target instanceof Element && event.target.closest("[data-close-manager-login='true']")) {
      closeManagerLoginModal();
    }
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeHistoryDetailModal();
      closeDeleteAuthModal();
      closeManagerLoginModal();
    }
  });
}

function applyManagerPreset(preset) {
  const today = new Date();
  const current = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  let start = current;
  let end = current;

  if (preset === "week") {
    const day = current.getDay() || 7;
    start = addDays(current, 1 - day);
    end = addDays(start, 6);
  } else if (preset === "month") {
    start = new Date(current.getFullYear(), current.getMonth(), 1);
    end = new Date(current.getFullYear(), current.getMonth() + 1, 0);
  } else if (preset === "quarter") {
    const startMonth = Math.floor(current.getMonth() / 3) * 3;
    start = new Date(current.getFullYear(), startMonth, 1);
    end = new Date(current.getFullYear(), startMonth + 3, 0);
  } else if (preset === "year") {
    start = new Date(current.getFullYear(), 0, 1);
    end = new Date(current.getFullYear(), 11, 31);
  } else {
    state.filterPreset = "";
    syncPresetButtons("");
    return;
  }

  state.filterPreset = preset;
  state.filterStart = toDateInputValue(start);
  state.filterEnd = toDateInputValue(end);
  syncPresetButtons(preset);
}

function syncPresetButtons(activePreset) {
  el.presetButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.preset === activePreset);
  });
}

function addDays(date, amount) {
  const d = new Date(date);
  d.setDate(d.getDate() + amount);
  return d;
}

function toDateInputValue(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function switchView(viewName) {
  if (viewName === "manager" && !state.managerAuthenticated) {
    openManagerLoginModal(viewName);
    return;
  }
  activateView(viewName);
}

function activateView(viewName) {
  el.tabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.view === viewName));
  Object.entries(el.views).forEach(([name, node]) => {
    node.classList.toggle("active", name === viewName);
  });
}

function openManagerLoginModal(targetView = "manager") {
  state.pendingView = targetView;
  el.managerLoginUsername.value = "";
  el.managerLoginPassword.value = "";
  el.managerLoginError.textContent = "";
  el.managerLoginModal.classList.add("open");
  el.managerLoginModal.setAttribute("aria-hidden", "false");
  setTimeout(() => el.managerLoginUsername.focus(), 0);
}

function closeManagerLoginModal() {
  el.managerLoginModal.classList.remove("open");
  el.managerLoginModal.setAttribute("aria-hidden", "true");
}

function submitManagerLogin() {
  const username = el.managerLoginUsername.value.trim();
  const password = el.managerLoginPassword.value;
  if (username === MANAGER_LOGIN_USERNAME && password === MANAGER_LOGIN_PASSWORD) {
    state.managerAuthenticated = true;
    closeManagerLoginModal();
    activateView(state.pendingView || "manager");
    state.pendingView = "";
    return;
  }
  el.managerLoginError.textContent = "账号或密码错误";
}

async function handleSaveRecord(event) {
  event.preventDefault();
  applyDeployCoopRule();

  const customerNames = splitByComma(el.customerName.value);
  const focusModules = getSelectedFocusModules();
  const intentDeployMode = el.deployMode.value;
  const intentCoopMode = el.coopMode.value;
  const migrationSources = readMigrationSources(el.migrationSources);
  const customerIndustries = inferIndustriesByCustomers(customerNames);
  const inferredIndustry = pickPrimaryIndustry(customerIndustries);
  const industryLevel1 = el.industryLevel1.value.trim() || inferredIndustry.level1;
  const industryLevel2 = el.industryLevel2.value.trim() || inferredIndustry.level2;
  const chain = inferIndustryChain(customerNames[0] || "", { level1: industryLevel1, level2: industryLevel2 });

  const record = {
    id: el.recordId.value || crypto.randomUUID(),
    salesName: el.salesName.value.trim(),
    meetingMode: el.meetingMode.value,
    meetingTime: el.meetingTime.value,
    meetingLocation: el.meetingLocation.value.trim(),
    customerNames,
    customerIndustries,
    industryLevel1,
    industryLevel2,
    meetingIndustry: formatIndustry({ level1: industryLevel1, level2: industryLevel2 }),
    industryUpstream: chain.upstream,
    industryDownstream: chain.downstream,
    meetingTopic: el.meetingTopic.value.trim(),
    customerParticipants: readParticipants(el.customerParticipants),
    ourParticipants: readParticipants(el.ourParticipants),
    focusModules,
    intentDeployMode,
    intentCoopMode,
    migrationSources,
    meetingContent: el.meetingContent.value.trim(),
    nextActions: el.nextActions.value.trim(),
    localKeywords: extractKeywords(
      `${el.meetingTopic.value} ${focusModules.join(" ")} ${intentDeployMode} ${intentCoopMode} ${migrationSources.map((x) => `${x.source} ${x.version}`).join(" ")} ${el.meetingContent.value} ${el.nextActions.value}`,
      6,
    ),
    updatedAt: new Date().toISOString(),
  };

  if (
    !record.salesName ||
    !record.meetingMode ||
    !record.meetingTime ||
    !record.meetingLocation ||
    !record.customerNames.length ||
    !record.focusModules.length ||
    !record.intentDeployMode ||
    !record.intentCoopMode ||
    !record.meetingTopic ||
    !record.meetingContent
  ) {
    alert("请填写必填项：AR、会议时间、会议地点、客户名称、关注模块、意向部署方式、意向合作方式、会议议题、会议纪要内容");
    return;
  }

  try {
    await upsertRecord(record);
  } catch (error) {
    alert(`保存失败：${error.message || "请稍后重试"}`);
    return;
  }
  clearDraft();
  resetForm();
  render();
}

function resetForm() {
  el.form.reset();
  el.recordId.value = "";
  resetParticipantSections();
  resetMigrationSources();
  setSelectedFocusModules([]);
  applyDeployCoopRule();
  el.industryLevel1.value = "";
  el.industryLevel2.value = "";
  el.companyNameSuggestions.innerHTML = "";
  ensureMeetingTimeDefault();
  applyMeetingModeLocationRule();
  clearDraft();
  updateDraftStatus("草稿已清空");
  refreshIndustryByCustomer();
  syncLongInputHeights();
}

function getManagerVisibleRecords() {
  return state.records.filter((record) => {
    const meetingDate = getMeetingDatePart(record);
    if (state.filterStart && meetingDate < state.filterStart) return false;
    if (state.filterEnd && meetingDate > state.filterEnd) return false;
    if (state.filterSales && !record.salesName.includes(state.filterSales)) return false;
    return true;
  });
}

function renderManager() {
  const records = getManagerVisibleRecords();
  const bySalesRows = summarizeBySales(records);
  const bySrRows = summarizeBySr(records);
  const byWeekRows = summarizeByWeek(records);

  const uniqueSales = new Set(records.map((r) => r.salesName));
  const uniqueCustomers = new Set(records.flatMap((r) => r.customerNames.map((c) => `${r.salesName}::${c}`)));

  el.kpiSalespeople.textContent = String(uniqueSales.size);
  el.kpiMinutes.textContent = String(records.length);
  el.kpiCustomers.textContent = String(uniqueCustomers.size);
  el.kpiWeeks.textContent = String(byWeekRows.length);

  renderManagerTable(bySalesRows);
  renderSrTable(bySrRows);
  renderWeekTable(byWeekRows);
  renderAiBlock(records, bySalesRows);
}

function summarizeBySales(records) {
  const map = new Map();

  records.forEach((record) => {
    if (!map.has(record.salesName)) {
      map.set(record.salesName, {
        salesName: record.salesName,
        minuteCount: 0,
        customers: new Set(),
        jiraCustomers: new Set(),
        cfCustomers: new Set(),
        projectMgmtCustomers: new Set(),
        knowledgebaseCustomers: new Set(),
        rawText: "",
        localKeywords: [],
      });
    }

    const row = map.get(record.salesName);
    row.minuteCount += 1;
    record.customerNames.forEach((name) => row.customers.add(name));
    const sources = (record.migrationSources || []).map((item) => String(item?.source || "").toLowerCase());
    const modules = new Set((record.focusModules || []).map(String));
    if (sources.includes("jira")) {
      record.customerNames.forEach((name) => row.jiraCustomers.add(name));
    }
    if (sources.includes("cf")) {
      record.customerNames.forEach((name) => row.cfCustomers.add(name));
    }
    if (modules.has("项目管理")) {
      record.customerNames.forEach((name) => row.projectMgmtCustomers.add(name));
    }
    if (modules.has("知识库")) {
      record.customerNames.forEach((name) => row.knowledgebaseCustomers.add(name));
    }
    row.rawText += ` ${record.meetingTopic || ""} ${(record.focusModules || []).join(" ")} ${record.intentDeployMode || ""} ${record.intentCoopMode || ""} ${(record.migrationSources || []).map((x) => `${x.source} ${x.version}`).join(" ")} ${record.meetingContent} ${record.nextActions || ""}`;
  });

  const rows = [...map.values()].map((row) => {
    row.localKeywords = extractKeywords(row.rawText, 5);
    return row;
  });

  rows.sort((a, b) => b.minuteCount - a.minuteCount);
  return rows;
}

function summarizeBySr(records) {
  const map = new Map();

  records.forEach((record) => {
    const srNames = [...new Set(
      (record.ourParticipants || [])
        .filter((item) => item?.role === "SR" && String(item?.name || "").trim())
        .map((item) => String(item.name).trim()),
    )];

    srNames.forEach((srName) => {
      if (!map.has(srName)) {
        map.set(srName, {
          srName,
          minuteCount: 0,
          customers: new Set(),
        });
      }
      const row = map.get(srName);
      row.minuteCount += 1;
      (record.customerNames || []).forEach((name) => row.customers.add(name));
    });
  });

  return [...map.values()].sort((a, b) => b.minuteCount - a.minuteCount || a.srName.localeCompare(b.srName));
}

function summarizeByWeek(records) {
  const map = new Map();

  records.forEach((record) => {
    const key = toWeekKey(record.meetingTime);
    if (!map.has(key)) {
      map.set(key, {
        weekKey: key,
        minuteCount: 0,
        sales: new Set(),
        customers: new Set(),
      });
    }

    const row = map.get(key);
    row.minuteCount += 1;
    row.sales.add(record.salesName);
    record.customerNames.forEach((name) => row.customers.add(`${record.salesName}::${name}`));
  });

  return [...map.values()].sort((a, b) => b.weekKey.localeCompare(a.weekKey));
}

function renderManagerTable(rows) {
  el.managerTable.innerHTML = "";

  if (!rows.length) {
    el.managerTable.innerHTML = '<tr><td colspan="7">当前筛选下暂无数据</td></tr>';
    return;
  }

  rows.forEach((row) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(row.salesName)}</td>
      <td>${row.minuteCount}</td>
      <td>${row.customers.size}</td>
      <td>${row.jiraCustomers.size}</td>
      <td>${row.cfCustomers.size}</td>
      <td>${row.projectMgmtCustomers.size}</td>
      <td>${row.knowledgebaseCustomers.size}</td>
    `;
    el.managerTable.appendChild(tr);
  });
}

function renderSrTable(rows) {
  el.srTable.innerHTML = "";
  if (!rows.length) {
    el.srTable.innerHTML = '<tr><td colspan="3">当前筛选下暂无数据</td></tr>';
    return;
  }

  rows.forEach((row) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(row.srName)}</td>
      <td>${row.minuteCount}</td>
      <td>${row.customers.size}</td>
    `;
    el.srTable.appendChild(tr);
  });
}

function renderWeekTable(rows) {
  el.weekTable.innerHTML = "";

  if (!rows.length) {
    el.weekTable.innerHTML = '<tr><td colspan="4">当前筛选下暂无数据</td></tr>';
    return;
  }

  rows.forEach((row) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(row.weekKey)}</td>
      <td>${row.minuteCount}</td>
      <td>${row.sales.size}</td>
      <td>${row.customers.size}</td>
    `;
    el.weekTable.appendChild(tr);
  });
}

function renderAiBlock(records, bySalesRows) {
  el.aiSummary.textContent = state.aiResult.summary || "暂无";

  const fallbackGlobal = extractKeywords(
    records
      .map(
        (r) => `${r.meetingTopic || ""} ${(r.focusModules || []).join(" ")} ${r.intentDeployMode || ""} ${r.intentCoopMode || ""} ${(r.migrationSources || []).map((x) => `${x.source} ${x.version}`).join(" ")} ${r.meetingContent} ${r.nextActions || ""}`,
      )
      .join(" "),
    10,
  );

  const globalKeywords = state.aiResult.globalKeywords.length ? state.aiResult.globalKeywords : fallbackGlobal;

  el.globalKeywords.innerHTML = globalKeywords.length
    ? globalKeywords.map((word) => `<li>${escapeHtml(word)}</li>`).join("")
    : "<li>暂无</li>";

  if (!state.aiResult.generatedAt) {
    el.aiStatus.textContent = "未执行AI分析（当前为本地关键词抽取）";
    return;
  }

  el.aiStatus.textContent = `最近分析：${new Date(state.aiResult.generatedAt).toLocaleString()} | 来源：${
    state.aiResult.source === "api" ? "第三方AI接口" : "本地规则"
  }`;

  if (!Object.keys(state.aiResult.bySales).length) {
    const fallbackBySales = {};
    bySalesRows.forEach((row) => {
      fallbackBySales[row.salesName] = row.localKeywords;
    });
    state.aiResult.bySales = fallbackBySales;
  }
}

function applyHistoryFilters() {
  state.historyCustomer = el.historyCustomer.value.trim();
  state.historyAr = el.historyAr.value.trim();
  state.historySr = el.historySr.value.trim();
  state.historyFrImpl = el.historyFrImpl.value.trim();
  state.historyFrPm = el.historyFrPm.value.trim();
  renderHistory();
}

function getHistoryVisibleRecords() {
  const customer = state.historyCustomer.toLowerCase();
  const ar = state.historyAr.toLowerCase();
  const sr = state.historySr.toLowerCase();
  const frImpl = state.historyFrImpl.toLowerCase();
  const frPm = state.historyFrPm.toLowerCase();

  const filtered = state.records.filter((record) => {
    if (customer) {
      const hasCustomer = record.customerNames.some((name) => name.toLowerCase().includes(customer));
      if (!hasCustomer) return false;
    }
    if (ar && !record.salesName.toLowerCase().includes(ar)) return false;
    if (sr) {
      const srMatched = (record.ourParticipants || []).some(
        (item) => item?.role === "SR" && String(item?.name || "").toLowerCase().includes(sr),
      );
      if (!srMatched) return false;
    }
    if (frImpl) {
      const frImplMatched = (record.ourParticipants || []).some(
        (item) => item?.role === "FR-实施" && String(item?.name || "").toLowerCase().includes(frImpl),
      );
      if (!frImplMatched) return false;
    }
    if (frPm) {
      const frPmMatched = (record.ourParticipants || []).some(
        (item) => item?.role === "FR-PM" && String(item?.name || "").toLowerCase().includes(frPm),
      );
      if (!frPmMatched) return false;
    }
    return true;
  });

  filtered.sort((a, b) => getMeetingTimeSortValue(b) - getMeetingTimeSortValue(a));
  return filtered;
}

function getMeetingTimeSortValue(record) {
  const raw = String(record?.meetingTime || record?.meetingDate || "").trim();
  if (!raw) return 0;
  const normalized = raw.includes("T") ? raw : raw.replace(" ", "T");
  const timestamp = Date.parse(normalized);
  if (!Number.isNaN(timestamp)) return timestamp;
  const fallback = Date.parse(raw);
  return Number.isNaN(fallback) ? 0 : fallback;
}

function renderHistory() {
  const hasFilters = Boolean(
    state.historyCustomer.trim()
      || state.historyAr.trim()
      || state.historySr.trim()
      || state.historyFrImpl.trim()
      || state.historyFrPm.trim(),
  );
  if (!hasFilters) {
    el.historyList.innerHTML = '<li class="record-item">请输入客户名称、AR或SR后自动查询</li>';
    el.historySummary.textContent = "当前共 0 条匹配结果";
    return;
  }

  const records = getHistoryVisibleRecords();
  el.historyList.innerHTML = "";
  el.historySummary.textContent = `当前共 ${records.length} 条匹配结果`;

  if (!records.length) {
    el.historyList.innerHTML = '<li class="record-item">暂无匹配纪要</li>';
    return;
  }

  records.forEach((record, index) => {
    const node = el.historyItemTemplate.content.cloneNode(true);
    const item = node.querySelector(".record-item");
    item.classList.add("clickable");
    item.tabIndex = 0;
    node.querySelector(".record-title").textContent = `${record.customerNames.join(" / ")} | ${record.meetingTopic || "未填写议题"}`;
    node.querySelector(".record-date").textContent = `${formatMeetingTime(record.meetingTime)} | ${toWeekLabel(record.meetingTime)}`;
    node.querySelector(".record-meta").textContent = `销售 ${record.salesName} | 方式 ${record.meetingMode || "-"} | 行业 ${formatIndustry(record) || "未识别"} | 地点 ${record.meetingLocation || "-"}`;
    node.querySelector(".record-preview").textContent = record.meetingContent || "-";
    item.addEventListener("click", () => openHistoryDetailModal(records, index));
    item.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openHistoryDetailModal(records, index);
      }
    });

    const tags = node.querySelector(".tags");
    (record.localKeywords || []).slice(0, 5).forEach((word) => {
      const span = document.createElement("span");
      span.className = "tag";
      span.textContent = word;
      tags.appendChild(span);
    });

    el.historyList.appendChild(node);
  });
}

function openHistoryDetailModal(records, index) {
  state.historyModalList = Array.isArray(records) ? records : [];
  state.historyModalIndex = Number.isInteger(index) ? index : -1;
  const record = state.historyModalList[state.historyModalIndex];
  if (!record) return;
  el.historyDetailTitle.textContent = `${(record.customerNames || []).join(" / ")} | ${record.meetingTopic || "未填写议题"}`;
  el.historyDetailBody.innerHTML = `
    <div class="detail-grid">
      <div><div class="detail-label">AR</div><div class="detail-value">${escapeHtml(record.salesName || "-")}</div></div>
      <div><div class="detail-label">会议方式</div><div class="detail-value">${escapeHtml(record.meetingMode || "-")}</div></div>
      <div><div class="detail-label">会议时间</div><div class="detail-value">${escapeHtml(formatMeetingTime(record.meetingTime || ""))}</div></div>
      <div><div class="detail-label">会议地点</div><div class="detail-value">${escapeHtml(record.meetingLocation || "-")}</div></div>
      <div><div class="detail-label">客户名称</div><div class="detail-value">${escapeHtml((record.customerNames || []).join(" / ") || "-")}</div></div>
      <div><div class="detail-label">行业</div><div class="detail-value">${escapeHtml(formatIndustry(record) || "-")}</div></div>
      <div><div class="detail-label">我方参会人员</div><div class="detail-value">${escapeHtml(formatParticipantsCsv(record.ourParticipants) || "-")}</div></div>
      <div><div class="detail-label">客户参会人员</div><div class="detail-value">${escapeHtml(formatParticipantsCsv(record.customerParticipants) || "-")}</div></div>
    </div>
    <div class="detail-label">会议纪要内容</div>
    <div class="detail-value">${escapeHtml(record.meetingContent || "-")}</div>
    <div class="detail-label" style="margin-top:10px;">后续行动</div>
    <div class="detail-value">${escapeHtml(record.nextActions || "-")}</div>
  `;
  el.historyDetailModal.classList.add("open");
  el.historyDetailModal.setAttribute("aria-hidden", "false");
  syncHistoryDetailNextButton();
}

function openNextHistoryDetail() {
  const nextIndex = state.historyModalIndex + 1;
  if (nextIndex >= state.historyModalList.length) return;
  openHistoryDetailModal(state.historyModalList, nextIndex);
}

function closeHistoryDetailModal() {
  el.historyDetailModal.classList.remove("open");
  el.historyDetailModal.setAttribute("aria-hidden", "true");
  state.historyModalList = [];
  state.historyModalIndex = -1;
  state.pendingDeleteRecordId = "";
}

function syncHistoryDetailNextButton() {
  const hasNext = state.historyModalIndex >= 0 && state.historyModalIndex < state.historyModalList.length - 1;
  el.historyDetailNext.disabled = !hasNext;
}

function openDeleteAuthModal() {
  const record = state.historyModalList[state.historyModalIndex];
  if (!record?.id) return;
  state.pendingDeleteRecordId = record.id;
  el.historyDeleteAuthUsername.value = "";
  el.historyDeleteAuthPassword.value = "";
  el.historyDeleteAuthError.textContent = "";
  el.historyDeleteAuthModal.classList.add("open");
  el.historyDeleteAuthModal.setAttribute("aria-hidden", "false");
  setTimeout(() => el.historyDeleteAuthUsername.focus(), 0);
}

function closeDeleteAuthModal() {
  el.historyDeleteAuthModal.classList.remove("open");
  el.historyDeleteAuthModal.setAttribute("aria-hidden", "true");
}

async function submitDeleteAuth() {
  const username = el.historyDeleteAuthUsername.value.trim();
  const password = el.historyDeleteAuthPassword.value;
  if (username !== MANAGER_LOGIN_USERNAME || password !== MANAGER_LOGIN_PASSWORD) {
    el.historyDeleteAuthError.textContent = "账号或密码错误";
    return;
  }

  const targetId = state.pendingDeleteRecordId;
  if (!targetId) {
    closeDeleteAuthModal();
    return;
  }

  try {
    await deleteRecordById(targetId);
  } catch (error) {
    el.historyDeleteAuthError.textContent = `删除失败：${error.message || "请稍后重试"}`;
    return;
  }
  closeDeleteAuthModal();

  const currentIndex = state.historyModalIndex;
  render();
  const latest = getHistoryVisibleRecords();
  if (!latest.length) {
    closeHistoryDetailModal();
    return;
  }
  const nextIndex = Math.min(currentIndex, latest.length - 1);
  openHistoryDetailModal(latest, nextIndex);
}

function render() {
  renderManager();
  renderHistory();
}

function resetParticipantSections() {
  setParticipants(el.customerParticipants, []);
  setParticipants(el.ourParticipants, []);
}

function setParticipants(container, participants) {
  container.innerHTML = "";
  const normalized = normalizeParticipants(participants);
  const rows = normalized.length ? normalized : [{ role: "", name: "" }];
  rows.forEach((item) => addParticipantRow(container, item.role, item.name));
  if (container === el.ourParticipants || container?.id === "our-participants") {
    syncArParticipantNames();
  }
}

function addParticipantRow(container, role = "", name = "") {
  const row = document.createElement("div");
  row.className = "participant-row";

  const isOurParticipants = container === el.ourParticipants || container?.id === "our-participants";
  let roleField;
  if (isOurParticipants) {
    const roleSelect = document.createElement("select");
    const empty = document.createElement("option");
    empty.value = "";
    empty.textContent = "职位";
    roleSelect.appendChild(empty);
    OUR_PARTICIPANT_ROLE_OPTIONS.forEach((option) => {
      const op = document.createElement("option");
      op.value = option;
      op.textContent = option;
      roleSelect.appendChild(op);
    });
    roleSelect.value = OUR_PARTICIPANT_ROLE_OPTIONS.includes(role) ? role : "";
    roleSelect.addEventListener("change", () => {
      applyArRoleNameRule(row);
      scheduleDraftSave();
    });
    roleField = roleSelect;
  } else {
    const roleInput = document.createElement("input");
    roleInput.placeholder = "职位";
    roleInput.value = role;
    roleField = roleInput;
  }
  roleField.className = "participant-role";

  const nameInput = document.createElement("input");
  nameInput.className = "participant-name";
  nameInput.placeholder = "姓名";
  nameInput.value = name;

  row.appendChild(roleField);
  row.appendChild(nameInput);
  container.appendChild(row);
  if (isOurParticipants) {
    applyArRoleNameRule(row);
  }
  scheduleDraftSave();
}

function readParticipants(container) {
  return [...container.querySelectorAll(".participant-row")]
    .map((row) => {
      const roleInput = row.querySelector(".participant-role");
      const nameInput = row.querySelector(".participant-name");
      return {
        role: String(roleInput?.value || "").trim(),
        name: String(nameInput?.value || "").trim(),
      };
    })
    .filter((item) => item.role || item.name);
}

function normalizeParticipants(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => ({
      role: String(item?.role || "").trim(),
      name: String(item?.name || "").trim(),
    }))
    .filter((item) => item.role || item.name);
}

function resetMigrationSources() {
  setMigrationSources(el.migrationSources, []);
}

function setMigrationSources(container, rows) {
  container.innerHTML = "";
  const normalized = normalizeMigrationSources(rows);
  const list = normalized.length
    ? normalized
    : [{ source: "", version: "" }];
  list.forEach((row) => addMigrationSourceRow(container, row.source, row.version));
}

function addMigrationSourceRow(
  container,
  source = "",
  version = "",
) {
  const row = document.createElement("div");
  row.className = "migration-row";

  const sourceSelect = document.createElement("select");
  const sourceEmpty = document.createElement("option");
  sourceEmpty.value = "";
  sourceEmpty.textContent = "请选择";
  sourceSelect.appendChild(sourceEmpty);
  MIGRATION_SOURCE_OPTIONS.forEach((option) => {
    const op = document.createElement("option");
    op.value = option;
    op.textContent = option;
    sourceSelect.appendChild(op);
  });
  sourceSelect.value = MIGRATION_SOURCE_OPTIONS.includes(source) ? source : "";
  sourceSelect.addEventListener("change", () => {
    applyMigrationRowRule(row);
    scheduleDraftSave();
  });

  const versionSelect = document.createElement("select");
  const versionEmpty = document.createElement("option");
  versionEmpty.value = "";
  versionEmpty.textContent = "请选择";
  versionSelect.appendChild(versionEmpty);
  MIGRATION_VERSION_OPTIONS.forEach((option) => {
    const op = document.createElement("option");
    op.value = option;
    op.textContent = option;
    versionSelect.appendChild(op);
  });
  versionSelect.value = MIGRATION_VERSION_OPTIONS.includes(version)
    ? version
    : "";

  row.appendChild(sourceSelect);
  row.appendChild(versionSelect);
  container.appendChild(row);
  applyMigrationRowRule(row);
  scheduleDraftSave();
}

function readMigrationSources(container) {
  return [...container.querySelectorAll(".migration-row")]
    .map((row) => {
      const [sourceSelect, versionSelect] = row.querySelectorAll("select");
      return {
        source: sourceSelect?.value || "",
        version: versionSelect?.value || "",
      };
    })
    .filter((item) => item.source && item.version);
}

function normalizeMigrationSources(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => ({
      source: String(item?.source || "").trim(),
      version: String(item?.version || "").trim(),
    }))
    .filter((item) => item.source || item.version)
    .map((item) => ({
      source: MIGRATION_SOURCE_OPTIONS.includes(item.source)
        ? item.source
        : "",
      version: MIGRATION_VERSION_OPTIONS.includes(item.version)
        ? item.version
        : "",
    }));
}

function applyMigrationRowRule(row) {
  const [sourceSelect, versionSelect] = row.querySelectorAll("select");
  if (!sourceSelect || !versionSelect) return;
  if (sourceSelect.value === "无") {
    versionSelect.value = "无";
    versionSelect.disabled = true;
    return;
  }
  versionSelect.disabled = false;
  if (versionSelect.value === "无") {
    versionSelect.value = "";
  }
}

function splitByComma(input) {
  if (!input.trim()) return [];
  return input
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

function autoGrowLongInput(textarea) {
  if (!textarea) return;
  textarea.style.height = "auto";
  textarea.style.height = `${Math.max(textarea.scrollHeight, textarea.clientHeight)}px`;
  textarea.scrollTop = textarea.scrollHeight;
}

function syncLongInputHeights() {
  autoGrowLongInput(el.meetingContent);
  autoGrowLongInput(el.nextActions);
}

function getMeetingDatePart(record) {
  const value = record.meetingTime || record.meetingDate || "";
  return String(value).slice(0, 10);
}

function toDateTimeLocalValue(value) {
  if (!value) return "";
  const text = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(text)) return text;
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return `${text}T09:00`;

  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

function formatMeetingTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString();
}

function getBeijingDateTimeLocalValue() {
  const parts = new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());

  const bag = {};
  parts.forEach((part) => {
    bag[part.type] = part.value;
  });

  return `${bag.year}-${bag.month}-${bag.day}T${bag.hour}:${bag.minute}`;
}

function ensureMeetingTimeDefault() {
  if (!el.meetingTime.value) {
    el.meetingTime.value = getBeijingDateTimeLocalValue();
  }
}

function scheduleIndustryLookup() {
  if (industryLookupTimer) clearTimeout(industryLookupTimer);
  industryLookupTimer = setTimeout(() => {
    refreshIndustryByCustomer();
  }, 350);
}

async function refreshIndustryByCustomer() {
  const customerName = splitByComma(el.customerName.value || "")[0] || "";
  if (!customerName) {
    el.industryLevel1.value = "";
    el.industryLevel2.value = "";
    el.companyNameSuggestions.innerHTML = "";
    return;
  }

  const fallback = inferIndustryByCustomer(customerName);
  el.industryLevel1.value = `${fallback.level1}（识别中）`;
  el.industryLevel2.value = fallback.level2;
  el.companyNameSuggestions.innerHTML = "";
  const seq = ++industryLookupSeq;

  try {
    const onlineResult = await lookupCompanyInfoOnline(customerName);
    if (seq !== industryLookupSeq) return;
    const output = onlineResult.industry || fallback;
    el.industryLevel1.value = output.level1;
    el.industryLevel2.value = output.level2;
    renderCompanyNameSuggestions(customerName, onlineResult.fullNames || []);
  } catch {
    if (seq !== industryLookupSeq) return;
    el.industryLevel1.value = fallback.level1;
    el.industryLevel2.value = fallback.level2;
    renderCompanyNameSuggestions(customerName, []);
  }
}

function inferIndustriesByCustomers(customers) {
  const result = {};
  customers.forEach((name) => {
    result[name] = inferIndustryByCustomer(name);
  });
  return result;
}

function inferIndustryByCustomer(customerName) {
  const name = String(customerName || "").trim();
  if (!name) return { level1: "未知", level2: "未知" };
  const normalizedName = normalizeCompanyNameText(name);
  const knownCandidates = getLocalFullNameCandidates(name);

  for (const fullName of knownCandidates) {
    if (ENRICHED_CUSTOMER_INDUSTRY_MAP[fullName]) return ENRICHED_CUSTOMER_INDUSTRY_MAP[fullName];
  }

  const inferredFromKnown = inferIndustryFromText(knownCandidates.join(" "));
  if (inferredFromKnown) return inferredFromKnown;

  for (const [key, industry] of Object.entries(ENRICHED_CUSTOMER_INDUSTRY_MAP)) {
    const normalizedKey = normalizeCompanyNameText(key);
    if (
      name.includes(key) ||
      key.includes(name) ||
      normalizedName.includes(normalizedKey) ||
      normalizedKey.includes(normalizedName)
    ) {
      return industry;
    }
  }

  for (const rule of INDUSTRY_KEYWORD_RULES) {
    if (rule.keys.some((k) => name.includes(k))) {
      return { level1: rule.level1, level2: rule.level2 };
    }
  }

  return { level1: "未知", level2: "未知" };
}

function normalizeCompanyNameText(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replaceAll(/[()（）·\-\s]/g, "")
    .replaceAll("股份有限公司", "")
    .replaceAll("有限责任公司", "")
    .replaceAll("集团股份有限公司", "")
    .replaceAll("集团有限公司", "")
    .replaceAll("有限公司", "")
    .replaceAll("集团", "");
}

function inferIndustryFromText(text) {
  const value = String(text || "");
  for (const rule of INDUSTRY_KEYWORD_RULES) {
    if (rule.keys.some((k) => value.includes(k))) {
      return { level1: rule.level1, level2: rule.level2 };
    }
  }
  return null;
}

async function lookupCompanyInfoOnline(customerName) {
  const query = encodeURIComponent(`${customerName} 公司 行业`);
  const url = `https://api.duckduckgo.com/?q=${query}&format=json&no_html=1&skip_disambig=1`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4500);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    const related = Array.isArray(data.RelatedTopics)
      ? data.RelatedTopics.flatMap((item) => {
          if (item?.Text) return [item.Text];
          if (Array.isArray(item?.Topics)) {
            return item.Topics.map((child) => child?.Text).filter(Boolean);
          }
          return [];
        })
      : [];
    const text = [data.Heading, data.AbstractText, ...related].filter(Boolean).join(" ");
    const inferred = inferIndustryFromText(text);
    const fullNames = extractCompanyFullNames([data.Heading, data.AbstractText, ...related]);
    return {
      industry: inferred || inferIndustryByCustomer(customerName),
      fullNames,
    };
  } finally {
    clearTimeout(timer);
  }
}

function extractCompanyFullNames(textList) {
  const results = [];
  const namePattern =
    /([\u4e00-\u9fa5A-Za-z0-9()（）·\-]{2,}(?:股份有限公司|有限责任公司|集团有限公司|集团股份有限公司|有限公司|集团公司|集团))/g;

  textList.forEach((line) => {
    const value = String(line || "");
    const matches = value.match(namePattern) || [];
    matches.forEach((name) => {
      const clean = name.trim();
      if (clean.length >= 4) results.push(clean);
    });
  });

  return [...new Set(results)].slice(0, 6);
}

function renderCompanyNameSuggestions(inputName, candidates) {
  const lower = normalizeCompanyNameText(inputName || "");
  const localCandidates = getLocalFullNameCandidates(inputName);
  const merged = [...(candidates || []), ...localCandidates];
  const list = [...new Set(merged)]
    .filter((name) => normalizeCompanyNameText(name) !== lower)
    .sort((a, b) => {
      const an = normalizeCompanyNameText(a);
      const bn = normalizeCompanyNameText(b);
      const aStarts = an.startsWith(lower) ? 1 : 0;
      const bStarts = bn.startsWith(lower) ? 1 : 0;
      if (aStarts !== bStarts) return bStarts - aStarts;
      return a.length - b.length;
    })
    .slice(0, 8);
  el.companyNameSuggestions.innerHTML = "";

  if (!list.length) return;

  const hint = document.createElement("span");
  hint.className = "muted";
  hint.textContent = "联网识别工商全名：";
  el.companyNameSuggestions.appendChild(hint);

  list.forEach((name) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "suggest-item";
    button.textContent = name;
    button.addEventListener("click", () => {
      el.customerName.value = name;
      el.companyNameSuggestions.innerHTML = "";
      refreshIndustryByCustomer();
      scheduleDraftSave();
    });
    el.companyNameSuggestions.appendChild(button);
  });
}

function scheduleDraftSave() {
  if (draftSaveTimer) clearTimeout(draftSaveTimer);
  draftSaveTimer = setTimeout(() => {
    saveDraft();
  }, 350);
}

function saveDraft() {
  const draft = {
    recordId: el.recordId.value,
    salesName: el.salesName.value,
    meetingMode: el.meetingMode.value,
    customerName: el.customerName.value,
    industryLevel1: el.industryLevel1.value,
    industryLevel2: el.industryLevel2.value,
    meetingTime: el.meetingTime.value,
    meetingLocation: el.meetingLocation.value,
    meetingTopic: el.meetingTopic.value,
    focusModules: getSelectedFocusModules(),
    intentDeployMode: el.deployMode.value,
    intentCoopMode: el.coopMode.value,
    migrationSources: readMigrationSources(el.migrationSources),
    customerParticipants: readParticipants(el.customerParticipants),
    ourParticipants: readParticipants(el.ourParticipants),
    meetingContent: el.meetingContent.value,
    nextActions: el.nextActions.value,
    savedAt: new Date().toISOString(),
  };
  localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  updateDraftStatus(`草稿已自动保存：${new Date(draft.savedAt).toLocaleString()}`);
}

function restoreDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return;
    const draft = JSON.parse(raw);
    if (!draft || typeof draft !== "object") return;

    el.recordId.value = String(draft.recordId || "");
    el.salesName.value = String(draft.salesName || "");
    el.meetingMode.value = String(draft.meetingMode || "");
    el.customerName.value = String(draft.customerName || "");
    el.industryLevel1.value = String(draft.industryLevel1 || "");
    el.industryLevel2.value = String(draft.industryLevel2 || "");
    el.meetingTime.value = String(draft.meetingTime || "");
    el.meetingLocation.value = String(draft.meetingLocation || "");
    el.meetingTopic.value = String(draft.meetingTopic || "");
    setSelectedFocusModules(draft.focusModules || []);
    el.deployMode.value = String(draft.intentDeployMode || "");
    el.coopMode.value = String(draft.intentCoopMode || "按年订阅");
    setMigrationSources(el.migrationSources, normalizeMigrationSources(draft.migrationSources));
    applyDeployCoopRule();
    setParticipants(el.customerParticipants, normalizeParticipants(draft.customerParticipants));
    setParticipants(el.ourParticipants, normalizeParticipants(draft.ourParticipants));
    el.meetingContent.value = String(draft.meetingContent || "");
    el.nextActions.value = String(draft.nextActions || "");

    updateDraftStatus(
      draft.savedAt
        ? `已恢复草稿：${new Date(String(draft.savedAt)).toLocaleString()}`
        : "已恢复草稿",
    );
  } catch {
    updateDraftStatus("草稿恢复失败");
  }
}

function clearDraft() {
  localStorage.removeItem(DRAFT_KEY);
}

function updateDraftStatus(text) {
  if (!el.draftStatus) return;
  el.draftStatus.textContent = text;
}

function getSelectedFocusModules() {
  return el.focusModules.filter((item) => item.checked).map((item) => item.value);
}

function setSelectedFocusModules(values) {
  const selected = new Set((values || []).map(String));
  el.focusModules.forEach((item) => {
    item.checked = selected.has(item.value);
  });
}

function applyDeployCoopRule() {
  if (el.deployMode.value === "SAAS") {
    el.coopMode.value = "按年订阅";
    el.coopMode.disabled = true;
  } else {
    el.coopMode.disabled = false;
  }
}

function applyMeetingModeLocationRule({ force = false } = {}) {
  if (el.meetingMode.value === "线上") {
    if (force || !el.meetingLocation.value.trim()) {
      el.meetingLocation.value = "线上";
    }
    return;
  }
  if (el.meetingMode.value === "线下" && force) {
    el.meetingLocation.value = "";
  }
}

function applyArRoleNameRule(row) {
  const roleSelect = row?.querySelector(".participant-role");
  const nameInput = row?.querySelector(".participant-name");
  if (!roleSelect || !nameInput) return;
  if (roleSelect.value === "AR") {
    nameInput.value = el.salesName.value.trim();
    nameInput.readOnly = true;
    return;
  }
  nameInput.readOnly = false;
}

function syncArParticipantNames() {
  el.ourParticipants.querySelectorAll(".participant-row").forEach((row) => {
    applyArRoleNameRule(row);
  });
}

function inferIndustryChain(customerName, industry) {
  const name = String(customerName || "").trim();
  const normalizedName = normalizeCompanyNameText(name);

  for (const [key, chain] of Object.entries(CUSTOMER_CHAIN_OVERRIDES)) {
    const nk = normalizeCompanyNameText(key);
    if (normalizedName && (normalizedName.includes(nk) || nk.includes(normalizedName))) {
      return chain;
    }
  }

  const pair = normalizeIndustryPair(industry);
  const exactKey = `${pair.level1}|${pair.level2}`;
  if (INDUSTRY_CHAIN_MAP[exactKey]) return INDUSTRY_CHAIN_MAP[exactKey];

  const firstByL1 = Object.entries(INDUSTRY_CHAIN_MAP).find(([key]) => key.startsWith(`${pair.level1}|`));
  if (firstByL1) return firstByL1[1];

  return { upstream: ["原材料与核心技术", "基础软件与平台"], downstream: ["渠道与集成商", "终端客户与运维"] };
}

function getLocalFullNameCandidates(inputName) {
  const name = String(inputName || "").trim();
  if (!name) return [];
  const normalizedInput = normalizeCompanyNameText(name);

  const results = [];
  for (const [alias, fullName] of Object.entries(COMPANY_ALIAS_FULLNAME_MAP)) {
    const normalizedAlias = normalizeCompanyNameText(alias);
    if (
      alias.includes(name) ||
      name.includes(alias) ||
      normalizedAlias.includes(normalizedInput) ||
      normalizedInput.includes(normalizedAlias)
    ) {
      results.push(fullName);
    }
  }

  KNOWN_CUSTOMER_FULLNAMES.forEach((fullName) => {
    const normalizedFullName = normalizeCompanyNameText(fullName);
    if (
      fullName.includes(name) ||
      normalizedFullName.includes(normalizedInput) ||
      normalizedInput.includes(normalizedFullName)
    ) {
      results.push(fullName);
    }
  });

  return results;
}

function pickPrimaryIndustry(customerIndustries) {
  const counts = new Map();
  Object.values(customerIndustries || {}).forEach((industry) => {
    const normalized = normalizeIndustryPair(industry);
    const key = `${normalized.level1}|${normalized.level2}`;
    counts.set(key, (counts.get(key) || 0) + 1);
  });

  if (!counts.size) return { level1: "未知", level2: "未知" };
  const topKey = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
  const [level1, level2] = topKey.split("|");
  return { level1, level2 };
}

function normalizeIndustryPair(value) {
  if (value && typeof value === "object") {
    return {
      level1: String(value.level1 || "未知"),
      level2: String(value.level2 || "未知"),
    };
  }

  const text = String(value || "").trim();
  if (!text) return { level1: "未知", level2: "未知" };
  if (text.includes("/")) {
    const [level1, level2] = text.split("/");
    return {
      level1: level1 || "未知",
      level2: level2 || "未知",
    };
  }
  return { level1: text, level2: "未知" };
}

function formatIndustry(value) {
  const pair = normalizeIndustryPair(
    value && typeof value === "object" && ("industryLevel1" in value || "industryLevel2" in value)
      ? { level1: value.industryLevel1, level2: value.industryLevel2 }
      : value,
  );
  return `${pair.level1}/${pair.level2}`;
}

function extractKeywords(text, topN) {
  const stopWords = new Set([
    "我们",
    "你们",
    "他们",
    "公司",
    "客户",
    "项目",
    "系统",
    "会议",
    "纪要",
    "这个",
    "那个",
    "本周",
    "下周",
    "推进",
    "需要",
    "已经",
    "进行",
    "问题",
    "以及",
    "一个",
    "没有",
    "可以",
    "然后",
    "因为",
    "所以",
    "还有",
  ]);

  const counts = new Map();

  String(text || "")
    .replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s]/g, " ")
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => word.length >= 2 && !stopWords.has(word))
    .forEach((word) => counts.set(word, (counts.get(word) || 0) + 1));

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([word]) => word);
}

function saveAiConfig() {
  state.aiConfig = {
    endpoint: el.aiEndpoint.value.trim() || "https://api.openai.com/v1/chat/completions",
    model: el.aiModel.value.trim() || "gpt-4o-mini",
    apiKey: el.aiKey.value.trim(),
  };

  localStorage.setItem(AI_CONFIG_KEY, JSON.stringify(state.aiConfig));
  el.aiStatus.textContent = "AI配置已保存";
}

function fillAiConfigInputs() {
  el.aiEndpoint.value = state.aiConfig.endpoint;
  el.aiModel.value = state.aiConfig.model;
  el.aiKey.value = state.aiConfig.apiKey;
}

async function runAiAnalysis() {
  const records = getManagerVisibleRecords();

  if (!records.length) {
    alert("当前筛选无会议纪要，无法分析");
    return;
  }

  saveAiConfig();

  el.runAi.disabled = true;
  el.aiStatus.textContent = "AI分析中...";

  try {
    const result = await analyzeWithAiProvider(records, state.aiConfig);
    state.aiResult = {
      summary: result.summary,
      globalKeywords: result.globalKeywords,
      bySales: result.bySales,
      generatedAt: new Date().toISOString(),
      source: result.source,
    };
  } catch (error) {
    state.aiResult = buildLocalAiResult(records);
    state.aiResult.generatedAt = new Date().toISOString();
    el.aiStatus.textContent = `AI接口调用失败，已切换本地分析：${error.message}`;
  } finally {
    el.runAi.disabled = false;
    renderManager();
  }
}

async function analyzeWithAiProvider(records, config) {
  if (!config.apiKey) return buildLocalAiResult(records);

  const compactData = records.map((record) => ({
    salesName: record.salesName,
    meetingMode: record.meetingMode,
    meetingTime: record.meetingTime,
    meetingLocation: record.meetingLocation,
    industryLevel1: record.industryLevel1,
    industryLevel2: record.industryLevel2,
    industryUpstream: record.industryUpstream || [],
    industryDownstream: record.industryDownstream || [],
    week: toWeekKey(record.meetingTime),
    customerNames: record.customerNames,
    focusModules: record.focusModules || [],
    intentDeployMode: record.intentDeployMode || "",
    intentCoopMode: record.intentCoopMode || "",
    migrationSources: record.migrationSources || [],
    topic: record.meetingTopic,
    customerParticipants: record.customerParticipants || [],
    ourParticipants: record.ourParticipants || [],
    content: record.meetingContent,
    nextActions: record.nextActions,
  }));

  const prompt = `你是B2B软件公司的销售管理分析助手。请根据会议纪要数据，按周维度总结销售推进情况。

输出必须是JSON，格式如下：
{
  "summary": "不超过120字的管理摘要",
  "globalKeywords": ["关键词1", "关键词2"],
  "bySales": [
    {"salesName": "姓名", "keywords": ["词1","词2"]}
  ]
}

会议纪要数据：
${JSON.stringify(compactData)}`;

  const response = await fetch(config.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      temperature: 0.2,
      messages: [
        { role: "system", content: "你输出JSON时不要加markdown代码块。" },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  const payload = await response.json();
  const content = payload?.choices?.[0]?.message?.content;
  if (!content) throw new Error("empty AI response");

  const parsed = safeParseJson(content);
  if (!parsed) {
    return {
      ...buildLocalAiResult(records),
      summary: content.slice(0, 200),
      source: "api",
    };
  }

  const bySalesMap = {};
  (parsed.bySales || []).forEach((item) => {
    if (!item?.salesName) return;
    bySalesMap[String(item.salesName)] = Array.isArray(item.keywords)
      ? item.keywords.map(String)
      : [];
  });

  return {
    summary: String(parsed.summary || "暂无AI摘要"),
    globalKeywords: Array.isArray(parsed.globalKeywords)
      ? parsed.globalKeywords.map(String).slice(0, 12)
      : extractKeywords(records.map((r) => r.meetingContent).join(" "), 10),
    bySales: bySalesMap,
    source: "api",
  };
}

function buildLocalAiResult(records) {
  const bySales = {};
  records.forEach((record) => {
    if (!bySales[record.salesName]) bySales[record.salesName] = [];
    bySales[record.salesName].push(
      `${record.meetingTopic || ""} ${(record.focusModules || []).join(" ")} ${record.intentDeployMode || ""} ${record.intentCoopMode || ""} ${(record.migrationSources || []).map((x) => `${x.source} ${x.version}`).join(" ")} ${record.meetingContent} ${record.nextActions || ""}`,
    );
  });

  Object.keys(bySales).forEach((name) => {
    bySales[name] = extractKeywords(bySales[name].join(" "), 5);
  });

  const weeks = new Set(records.map((record) => toWeekKey(record.meetingTime)));
  const uniqueCustomers = new Set(records.flatMap((r) => r.customerNames.map((c) => `${r.salesName}::${c}`)));

  return {
    summary: `共分析 ${records.length} 条会议纪要，覆盖 ${Object.keys(bySales).length} 位销售、${weeks.size} 个自然周，客户覆盖 ${uniqueCustomers.size} 个。`,
    globalKeywords: extractKeywords(
      records
        .map(
          (record) =>
            `${record.meetingTopic || ""} ${(record.focusModules || []).join(" ")} ${record.intentDeployMode || ""} ${record.intentCoopMode || ""} ${(record.migrationSources || []).map((x) => `${x.source} ${x.version}`).join(" ")} ${record.meetingContent} ${record.nextActions || ""}`,
        )
        .join(" "),
      10,
    ),
    bySales,
    source: "local",
  };
}

function loadRecords() {
  try {
    const raw = localStorage.getItem(RECORDS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((record) => normalizeRecordIndustry(record));
  } catch {
    return [];
  }
}

function persistRecords() {
  localStorage.setItem(RECORDS_KEY, JSON.stringify(state.records));
}

function loadAiConfig() {
  try {
    const raw = localStorage.getItem(AI_CONFIG_KEY);
    if (!raw) {
      return {
        endpoint: "https://api.openai.com/v1/chat/completions",
        model: "gpt-4o-mini",
        apiKey: "",
      };
    }

    const parsed = JSON.parse(raw);
    return {
      endpoint: parsed.endpoint || "https://api.openai.com/v1/chat/completions",
      model: parsed.model || "gpt-4o-mini",
      apiKey: parsed.apiKey || "",
    };
  } catch {
    return {
      endpoint: "https://api.openai.com/v1/chat/completions",
      model: "gpt-4o-mini",
      apiKey: "",
    };
  }
}

function exportRecords() {
  const headers = [
    "销售姓名",
    "会议方式",
    "客户名称",
    "一级行业",
    "二级行业",
    "会议时间",
    "会议地点",
    "会议议题",
    "客户关注模块",
    "客户意向部署方式",
    "客户意向合作方式",
    "历史数据迁移来源",
    "历史迁移版本",
    "客户参会人员",
    "我方参会人员",
    "会议纪要内容",
    "后续行动",
    "更新时间",
  ];

  const rows = state.records.map((record) => [
    record.salesName || "",
    record.meetingMode || "",
    (record.customerNames || []).join(" / "),
    record.industryLevel1 || "",
    record.industryLevel2 || "",
    record.meetingTime || "",
    record.meetingLocation || "",
    record.meetingTopic || "",
    (record.focusModules || []).join(" / "),
    record.intentDeployMode || "",
    record.intentCoopMode || "",
    (record.migrationSources || []).map((item) => item.source).join(" / "),
    (record.migrationSources || []).map((item) => item.version).join(" / "),
    formatParticipantsCsv(record.customerParticipants),
    formatParticipantsCsv(record.ourParticipants),
    record.meetingContent || "",
    record.nextActions || "",
    record.updatedAt || "",
  ]);

  const csv = [headers, ...rows]
    .map((row) => row.map(csvEscape).join(","))
    .join("\n");

  const bom = "\uFEFF";
  const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `sales-meeting-minutes-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function csvEscape(value) {
  const text = String(value ?? "");
  return `"${text.replaceAll("\"", "\"\"")}"`;
}

function formatParticipantsCsv(participants) {
  return normalizeParticipants(participants)
    .map((item) => `${item.role}:${item.name}`)
    .join(" | ");
}

function toWeekKey(dateStr) {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "未知周";

  const day = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - day + 3);
  const thursday = new Date(date);

  const firstThursday = new Date(thursday.getFullYear(), 0, 4);
  const firstDay = (firstThursday.getDay() + 6) % 7;
  firstThursday.setDate(firstThursday.getDate() - firstDay + 3);

  const weekNo = 1 + Math.round((thursday - firstThursday) / 604800000);
  return `${thursday.getFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

function sanitizeCustomerIndustries(rawIndustries, rawCustomers) {
  const names = Array.isArray(rawCustomers)
    ? rawCustomers.map(String).filter(Boolean)
    : splitByComma(String(rawCustomers || ""));
  if (!names.length) return {};

  if (rawIndustries && typeof rawIndustries === "object") {
    const cleaned = {};
    names.forEach((name) => {
      const matched = rawIndustries[name];
      cleaned[name] = normalizeIndustryPair(matched || inferIndustryByCustomer(name));
    });
    return cleaned;
  }

  return inferIndustriesByCustomers(names);
}

function normalizeRecordIndustry(record) {
  const customerNames = Array.isArray(record.customerNames)
    ? record.customerNames.map(String).filter(Boolean)
    : splitByComma(String(record.customerNames || ""));
  const customerIndustries = sanitizeCustomerIndustries(record.customerIndustries, customerNames);
  const primaryIndustry = pickPrimaryIndustry(customerIndustries);
  const legacyIndustry = record.meetingIndustry
    ? normalizeIndustryPair(record.meetingIndustry)
    : { level1: "", level2: "" };
  const normalizedIndustry = normalizeIndustryPair({
    level1: record.industryLevel1 || legacyIndustry.level1 || primaryIndustry.level1,
    level2: record.industryLevel2 || legacyIndustry.level2 || primaryIndustry.level2,
  });
  const intentDeployMode = String(record.intentDeployMode || "");
  const intentCoopMode = intentDeployMode === "SAAS"
    ? "按年订阅"
    : String(record.intentCoopMode || "按年订阅");
  const chain = inferIndustryChain(customerNames[0] || "", normalizedIndustry);
  return {
    ...record,
    meetingMode: String(record.meetingMode || ""),
    meetingTime: toDateTimeLocalValue(record.meetingTime || record.meetingDate),
    meetingLocation: String(record.meetingLocation || ""),
    customerNames,
    customerIndustries,
    industryLevel1: normalizedIndustry.level1,
    industryLevel2: normalizedIndustry.level2,
    meetingIndustry: formatIndustry(normalizedIndustry),
    industryUpstream: Array.isArray(record.industryUpstream) && record.industryUpstream.length
      ? record.industryUpstream.map(String)
      : chain.upstream,
    industryDownstream: Array.isArray(record.industryDownstream) && record.industryDownstream.length
      ? record.industryDownstream.map(String)
      : chain.downstream,
    customerParticipants: normalizeParticipants(record.customerParticipants),
    ourParticipants: normalizeParticipants(record.ourParticipants),
    focusModules: Array.isArray(record.focusModules) ? record.focusModules.map(String) : [],
    intentDeployMode,
    intentCoopMode,
    migrationSources: normalizeMigrationSources(record.migrationSources),
  };
}

function toWeekLabel(dateStr) {
  return `周次 ${toWeekKey(dateStr)}`;
}

function safeParseJson(text) {
  const trimmed = String(text).trim();

  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(trimmed.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
