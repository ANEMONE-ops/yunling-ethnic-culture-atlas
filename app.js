(() => {
  "use strict";

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const root = $("#page-content");
  const dialog = $("#archive-dialog");
  const dialogContent = $("#dialog-content");
  const toast = $("#toast");
  const records = window.PATTERN_RECORDS || [];
  const patternById = new Map(records.map(item => [item.id, item]));
  const img = file => `assets/illustrations/${file}`;
  const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
  const localRead = (key, fallback) => { try { const value = JSON.parse(localStorage.getItem(key)); return value ?? fallback; } catch { return fallback; } };
  const localWrite = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch { notify("浏览器暂时无法保存，请检查本地存储设置。"); } };
  const saved = new Set(localRead("yunling-saved-v1", []));
  const pageNames = { home:"序厅", map:"地图漫游", peoples:"民族索引", stories:"山水故事", archive:"纹样档案", model:"三维展厅", workshop:"拼纹工坊", fieldnotes:"田野手记", saved:"我的收藏", about:"档案说明" };
  let toastTimer;
  let archiveState = { query:"", family:"全部", palette:"全部", sort:"default", onlySaved:false };
  let mapData = null;
  let selectedRegion = "红河哈尼族彝族自治州";
  let workshopState = { selected: [], color:"#f3eee1", repeat:3, scale:1 };
  let noteItems = localRead("yunling-fieldnotes-v1", []);
  let currentRoute = null;
  let modelCleanup = null;

  const groups = [
    "彝族","白族","哈尼族","壮族","傣族","苗族","回族","傈僳族","拉祜族","佤族","纳西族","瑶族","景颇族","藏族","布朗族","布依族","阿昌族","普米族","蒙古族","怒族","基诺族","德昂族","水族","满族","独龙族"
  ];

  const sourceYunnan = "https://mzzj.yn.gov.cn/html/2021/liuyangongkai_0202/38569.html";
  const sourceUnesco = "https://whc.unesco.org/en/list/1111/";
  const sourceMap = "https://geo.datav.aliyun.com/areas_v3/bound/530000_full.json";

  const stories = [
    {
      id:"hani-water", category:"地景与生活", title:"一条水，如何穿过云雾与村寨", eyebrow:"红河哈尼梯田 · 水的来路", summary:"从森林涵养、沟渠分流到梯田蓄水，一套长期维护的山地系统，让水在高低之间反复停留。", image:"water-channels.jpg", read:"约 8 分钟", source:sourceUnesco, sourceTitle:"UNESCO：Honghe Hani Rice Terraces", featured:true,
      lead:"清晨的水并不急着抵达山脚。它先在森林里停留，沿着沟渠穿过村寨，再分进一层层田埂。看似寻常的灌溉背后，是人与山地长期协作的空间秩序。",
      sections:[
        {tag:"01 · 林", note:"山地生态", title:"先让山有一座蓄水的屋顶", paragraphs:["红河哈尼梯田遗产地并不是一片孤立的稻田。UNESCO 将森林、供水系统、梯田和村寨视作彼此连接的整体：森林帮助涵养水源，水沿山势向下，逐级进入梯田，最终回到河谷。","这样的结构把生态过程和日常生活放在同一张地景里。看森林时，我们也在看一条水的上游；看梯田时，也要记得它依赖山体植被、季节降水和共同维护。"]},
        {tag:"02 · 水", note:"沟渠系统", title:"水沿着许多小路分开", paragraphs:["遗产说明记载，当地经过长期发展，形成复杂的灌溉沟渠网络。水不是单向的大河，而是被引导、分配和调节的细流。沟渠把坡面上的水送到村庄和田块，也让山地不同高度上的农事彼此关联。","数字档案可以把这件事讲得更清楚：在地图上看水系方向，在三维场景里观察高差，在故事里读维护规则。它们是同一个主题的不同入口，而不是互相替代的展示形式。"]},
        {tag:"03 · 田", note:"梯田景观", title:"每一级田埂，都在调整水的速度", paragraphs:["层叠的田埂把陡坡拆成许多可以蓄水的平面。季节变化会让田面呈现不同状态：翻耕后的水镜、插秧时的嫩绿、成熟前的金黄。四季并不是背景，它直接参与了梯田的视觉和生产节律。","因此，图像记录应注明拍摄时间与地点。只截取一季的景色，会让人误以为梯田恒定不变；把季相、劳动和用水方式放在一起，才更接近日常景观的完整面貌。"]},
        {tag:"04 · 村", note:"生活共同体", title:"维护不是景观的附属说明", paragraphs:["UNESCO 的遗产资料描述了由森林、村寨、梯田与水系组成的复合景观。沟渠需要持续巡护与修整，水的分配也依赖地方规则和协作。这里的知识不只存在于工程结构中，也存在于关于何时放水、怎样维护和如何协商的实践里。","数字记录应把讲述者、授权范围、资料来源和校核状态一起留下。技术可以帮助保存路径和关系，但不能替代社区成员对自身知识的解释。"]}
      ]
    },
    {
      id:"shared-channels", category:"地景与生活", title:"四条干渠与一张共同维护的水网", eyebrow:"红河哈尼梯田 · 水网记录", summary:"UNESCO 遗产资料记录了主干渠与支渠的规模。数字可视化可以帮助读者理解水网的层级，也要谨慎说明数据的来源。", image:"mountain-water-village.jpg", read:"约 6 分钟", source:sourceUnesco, sourceTitle:"UNESCO：Honghe Hani Rice Terraces",
      lead:"数字本身很醒目，但数字并不会自动解释生活。把水渠网络讲清楚，需要同时说明它从哪里来、怎样组织，以及当地人如何参与维护。",
      sections:[
        {tag:"01 · 资料", note:"官方记录", title:"先辨认数字的出处", paragraphs:["UNESCO 遗产资料记录了四条主干渠及其支渠网络，总长约 445.83 公里。这个数据属于遗产说明中的记录，引用时应连同来源一起展示；它不是实时测绘结果，也不应被误读为某一年完整实测的水渠台账。","档案页面因此把数据出处放在数字旁边，并保留原始链接，方便读者回到一手资料核对语境。"]},
        {tag:"02 · 关系", note:"系统层级", title:"主干、支渠与田块相互连接", paragraphs:["地图适合呈现空间结构：主干渠从哪里经过，支流怎样接入，村寨与梯田如何相邻。要把关系画成线条，必须基于可核验的地理数据；没有来源的细线只能标为概念示意，不应冒充精确水渠位置。","本展的交互地图展示真实的云南地州行政边界，红河梯田标记则是地点入口。当前没有把所有水渠线绘成精确线路，因为公开资料不足以支持这种精度。"]},
        {tag:"03 · 共护", note:"传承与维护", title:"系统的延续离不开共同劳动", paragraphs:["遗产叙述提醒我们，灌溉设施不只是静态遗存。它需要持续使用、管理与维护。记录维护者的讲述时，应先确认对方希望公开的内容，避免将地方规则简化成旅游说明或把口述知识抽离出原有的使用场景。","后续采集可以在社区协作下补充渠道名称、季节变化、维护方式和讲述者授权范围，让数字地图逐步从地理轮廓发展为有来源的生活档案。"]}
      ]
    },
    {
      id:"four-part-landscape", category:"地景与生活", title:"森林、村寨、梯田：一处遗产的四层关系", eyebrow:"红河哈尼梯田 · 景观结构", summary:"自然环境、居住空间、农业生产和水资源管理不是分散的标签，而是一套相互依赖的文化景观。", image:"hero-terraces.jpg", read:"约 7 分钟", source:sourceUnesco, sourceTitle:"UNESCO：Honghe Hani Rice Terraces",
      lead:"如果只把梯田拍成一张风景照，最重要的关系反而容易消失。它是一种由地形、水源、聚落与农业共同构成的文化景观。",
      sections:[
        {tag:"01 · 森林", note:"水源涵养", title:"向上的山林，连接向下的田地", paragraphs:["UNESCO 对红河哈尼梯田的描述强调森林在整体系统中的作用。森林不仅构成视线里的绿色背景，也与水源涵养相连。观察梯田时，镜头可以从田面向上移动，补全森林和山脊，让画面回到完整的山地剖面。","影像采集时可以记录季节、天气、观察方向和所在村寨，并在展示中说明这是何种资料。"]},
        {tag:"02 · 村寨", note:"居住形态", title:"村庄不是景观的摆设", paragraphs:["村寨是生活发生的地方。遗产资料记载遗产地范围内有 82 个村庄，并提到具有地方特征的传统民居。具体建筑样式、空间称谓和使用方式应由当地资料与讲述者确认，不能只根据一张概念插画推断。","本网站的 AI 插画只用于视觉氛围，不对应具体村庄、民族服饰或真实建筑测绘。"]},
        {tag:"03 · 梯田", note:"农事循环", title:"农田的形态随时间改变", paragraphs:["梯田既是生产空间，也是水系的一部分。耕作时节、灌水安排、作物生长和收获都会改变田面形态。数字展览可以用时间轴呈现季相，但每一帧都需要标明时间与素材来源，避免将不同年份的影像剪接成虚假的连续纪录。"]},
        {tag:"04 · 共同体", note:"文化传承", title:"让景观知识继续被讲述", paragraphs:["文化景观之所以仍然成立，是因为它还在被使用、理解和照料。档案能够保存图像、声音、地图和文字，却必须尊重社区对知识的解释权。数字展览最好的目标，是为继续讲述创造入口，而不是把活态文化封存在一个漂亮的界面里。"]}
      ]
    },
    {
      id:"pattern-record", category:"档案方法", title:"从一块布、一件器物开始：怎样记录纹样", eyebrow:"数字档案 · 观察方法", summary:"形态、材料、工序和讲述要放在一起。未经来源校核的图案只是一份视觉样稿，不该被标为某个民族的传统纹样。", image:"handloom.jpg", read:"约 5 分钟", source:"", sourceTitle:"用户提供的赛事要求与本展档案方法说明",
      lead:"一枚纹样不是孤立的图形。它可能出现在织物、器物或建筑构件上，也可能随着使用方式改变。记录时，先把看见的内容和推测分开。",
      sections:[
        {tag:"01 · 看见", note:"形态观察", title:"先描述，再命名", paragraphs:["记录图案的轮廓、重复方式、材料和色彩时，尽量使用可观察的语言：是否连续、是否对称、是否由几何单元构成。不要在缺少依据时直接写成“太阳纹”“祖先纹”或某种寓意。命名本身也可能属于当地知识，需要留出校核空间。","本展的 50 张 SVG 是原创的形态实验，用于演示数字归档和构成观察，不对应具体民族或地区。"]},
        {tag:"02 · 材料", note:"工艺过程", title:"把制作过程也纳入记录", paragraphs:["同一类纹样，在不同纤维、染料、工具和织造结构中会形成不同效果。采集可以补充材料名称、工序顺序、工具、使用场景与时间信息。每个字段都要注明由谁提供、是否经过复核。","AI 概念插画适合表达创作过程的气氛，但不能代替现场图像、传承人访谈或器物测绘。"]},
        {tag:"03 · 解释", note:"文化语境", title:"让讲述者确认解释方式", paragraphs:["如果图案有特定称谓、禁忌或使用范围，应由相关社区讲述者解释，并在公开前确认文字、翻译和传播范围。某些内容可能不适合公开，也不必为了数字展示的完整而强行采集。","可持续的档案应保留原语言、自称、授权方式、撤回联系渠道和校核日期。这样，未来的更新才能回应社区，而不只是扩充展品数量。"]}
      ]
    },
    {
      id:"image-ethics", category:"档案方法", title:"一张图片进入档案前的四个问题", eyebrow:"数字档案 · 图像伦理", summary:"谁拍摄、拍摄什么、谁同意公开、图像将被怎样使用。把这些信息留在图片旁边，是数字保存的一部分。", image:"archive-workbench.jpg", read:"约 4 分钟", source:"", sourceTitle:"用户提供的赛事要求与本展档案方法说明",
      lead:"数字化让图像更容易复制，也让误读和脱离语境的传播更快。图片归档不只是扫描和压缩，还包括持续的授权管理。",
      sections:[
        {tag:"01 · 来处", note:"来源记录", title:"保留拍摄与采集链条", paragraphs:["每张照片都应记录拍摄者、时间、地点、采集方式和原始文件位置。来自网络的图片要保留页面链接和许可信息；无法确认权利状态的素材，不应当成装饰图片直接发布。","如果照片包含人物，除了画面质量，还要考虑对方是否理解数字公开、下载和二次传播的范围。"]},
        {tag:"02 · 授权", note:"知情同意", title:"说明将如何使用", paragraphs:["获取同意时，说明展示平台、受众、可能的下载和后续传播方式。也要记录是否同意公开姓名、声音、面部和具体地点。如果授权范围发生变化，数字档案需要有对应的更新或撤回机制。","本原型是纯静态展示，不上传任何表单数据；手记只保存在当前设备的浏览器中。"]},
        {tag:"03 · 校核", note:"内容复核", title:"公开前让相关人看见", paragraphs:["字幕、翻译、民族自称、工艺名称和地图点位都需要校核。由社区参与确认可以减少错误转译，也能让档案从单向展示变成共同建设。没有确认的内容，应明确标注为待核实。"]}
      ]
    },
    {
      id:"field-steps", category:"档案方法", title:"从田野到屏幕：一份数字记录的工作流", eyebrow:"数字档案 · 资料流程", summary:"采集、整理、校核、授权、展示和复核，是一条持续往返的工作链，而不是一次性的上传。", image:"pottery-workshop.jpg", read:"约 5 分钟", source:"", sourceTitle:"用户提供的赛事要求与本展档案方法说明",
      lead:"数字保护的关键不在于把资料全部放进网站，而在于保留资料的上下文与后续联系。每个步骤都应留下依据。",
      sections:[
        {tag:"01 · 采集", note:"建立记录", title:"先明确问题和授权", paragraphs:["采集前写清楚要回答的问题、采集范围和公开计划。准备来源记录表、拍摄清单、讲述者同意说明和现场备份策略。不能把“已经拍到了”当作“可以公开”的依据。"]},
        {tag:"02 · 整理", note:"元数据", title:"让文件可找到、可比较", paragraphs:["统一命名规则，并记录拍摄日期、地点、素材类型、采集者、讲述语言、授权状态和校核状态。把原始文件与裁切、调色、压缩后的展示副本分开保存。","地图点位应根据真实记录生成。公开范围不适合暴露的地点，可以经协商后做模糊化或仅显示到乡镇、县级。"]},
        {tag:"03 · 校核", note:"共同审阅", title:"把复核意见保留下来", paragraphs:["邀请相关社区成员或专业研究者核对名称、解释、翻译和使用边界。修改时记录日期、修改人和依据，让后来者理解内容为何改变。"]},
        {tag:"04 · 展示", note:"持续更新", title:"让网站成为版本化档案", paragraphs:["图像、地图、故事和交互应该各自标明来源。对外发布后，继续接收修订意见，并保留版本历史。静态网站也可以通过更新文件版本持续维护。"]}
      ]
    }
  ];

  function notify(message) {
    toast.textContent = message;
    toast.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 2600);
  }

  function setSaved(id, state) {
    if (state) saved.add(id); else saved.delete(id);
    localWrite("yunling-saved-v1", [...saved]);
    updateSavedCount();
  }

  function toggleSaved(id) {
    const nowSaved = !saved.has(id);
    setSaved(id, nowSaved);
    notify(nowSaved ? "已加入我的收藏" : "已从收藏中移除");
    return nowSaved;
  }

  function updateSavedCount() {
    $("#saved-count").textContent = String(saved.size);
    $("#top-saved-count").textContent = String(saved.size);
  }

  function pageHeading(eyebrow, title, deck, note = "") {
    return `<header class="page-heading"><div><p class="eyebrow">${eyebrow}</p><h1>${title}</h1><p>${deck}</p></div>${note ? `<div class="heading-note">${note}</div>` : ""}</header>`;
  }

  function renderHome() {
    return `<div class="page-wrap home-wrap">
      <section class="home-hero">
        <div class="home-copy"><p class="eyebrow">云南 · 山地文化资源数字档案</p><h1>在云岭，<br><em>寻一条水的来路。</em></h1><p class="home-intro">从真实的地理边界出发，沿着山、水、梯田与村寨，观察文化资源如何被记录、讲述与共同守护。</p><div class="home-buttons"><a class="button" href="#/map">从地图开始 <span>↗</span></a><a class="home-text-link" href="#/stories">阅读山水故事　→</a></div></div>
        <div class="home-art"><img src="${img("hero-terraces.jpg")}" alt="云南山地梯田的 AI 概念插画，非实地影像"><span class="hero-index">LANDSCAPE STUDY · 01</span><div class="home-art-caption"><span><strong>山地与水系</strong>一幅关于流动的景观概念图</span><span>AI 概念插画</span></div></div>
      </section>
      <section class="home-facts" aria-label="展览数据"><div class="fact-item"><span class="fact-value">25</span><span><strong>常住少数民族</strong><small>云南省民族名录资料</small></span></div><div class="fact-item"><span class="fact-value">16</span><span><strong>地级行政单元</strong><small>真实边界 GeoJSON</small></span></div><div class="fact-item"><span class="fact-value">50</span><span><strong>纹样形态样稿</strong><small>原创 SVG 数字练习</small></span></div><div class="fact-item"><span class="fact-value">10</span><span><strong>AI 概念插画</strong><small>不作为田野证据</small></span></div></section>
      <div class="home-feature-grid">
        <a class="home-feature" href="#/stories/hani-water"><img src="${img("water-channels.jpg")}" alt="穿过梯田的水渠 AI 概念插画"><div class="home-feature-body"><small>FEATURED STORY · 红河哈尼梯田</small><strong>一条水，如何穿过云雾与村寨</strong><span>水系 · 聚落 · 农耕景观　↗</span></div></a>
        <a class="home-feature" href="#/archive"><img src="${img("handloom.jpg")}" alt="木织机与编织过程 AI 概念插画"><div class="home-feature-body"><small>数字档案方法</small><strong>先观察形态，再回到语境</strong><span>探索 50 枚未定族属的图案样稿　↗</span></div></a>
        <a class="home-feature" href="#/map"><img src="${img("mountain-water-village.jpg")}" alt="云雾山谷与水渠 AI 概念插画"><div class="home-feature-body"><small>云南 · 地理图谱</small><strong>从省域边界开始漫游</strong><span>查看 16 个地级单元　↗</span></div></a>
      </div>
      <h2 class="section-kicker">选择一条进入路径 <small>三种方式，同一份档案</small></h2>
      <div class="home-route-list"><a class="route-card" href="#/peoples"><span class="route-no">01</span><span><strong>民族名录</strong><small>浏览云南常住少数民族名称与档案字段</small></span><span class="route-arrow">↗</span></a><a class="route-card" href="#/model"><span class="route-no">02</span><span><strong>三维景观</strong><small>旋转观察山地梯田概念模型</small></span><span class="route-arrow">↗</span></a><a class="route-card" href="#/workshop"><span class="route-no">03</span><span><strong>拼纹工坊</strong><small>用原创形态样稿搭建一幅数字构成</small></span><span class="route-arrow">↗</span></a></div>
      <aside class="home-caution"><span>◌</span><p><strong>资料边界：</strong>民族名录引用官方公开资料；地图为真实行政区边界；故事基于公开遗产资料；所有生成插画均为 AI 概念图。未核实的图案、地点、传统寓意和社区故事不作事实陈述。</p></aside>
    </div>`;
  }

  function renderMap() {
    setTimeout(initMap, 0);
    return `<div class="page-wrap">${pageHeading("真实边界 · 资料点位", "地图漫游", "以云南省地州级行政边界为底图，查看资料地点与展览路径。行政边界是真实地理数据；文化资源点位单独标注来源，不推演民族分布。", `<strong>地图说明</strong>选择地州查看行政名称。红河梯田为遗产资料入口，不代表民族分布范围。`)}
      <div class="map-layout"><section class="map-board" aria-label="云南省地州边界交互地图"><div class="map-board-head"><strong>云南省</strong><small>地级行政单元 · 16</small></div><div class="map-compass">N<small>↑</small></div><div class="map-svg-wrap" id="map-svg-wrap"><div class="map-error" id="map-loading">正在载入本地行政边界……</div></div><div class="map-legend"><span><i class="legend-swatch"></i>地州边界</span><span><i class="legend-dot"></i>有公开来源的文化地点</span><span>点击地州查看资料入口</span></div></section>
      <aside class="map-panel"><p class="eyebrow">SELECTED PLACE · 资料入口</p><h2 id="map-selection-title">${escapeHtml(selectedRegion)}</h2><p id="map-selection-copy">红河哈尼梯田世界遗产资料入口。地图标记用于定位遗产主题，不表示哈尼族或其他民族的分布边界。</p><div class="map-panel-image"><img src="${img("water-channels.jpg")}" alt="梯田水渠的 AI 概念插画"><span class="concept-label">AI 概念插画</span></div><div class="map-stat"><strong id="map-selection-stat">地州级边界</strong><span id="map-selection-meta">行政地图 · 非民族分布图</span></div><a class="button button-dark button-small" id="map-story-link" href="#/stories/hani-water">进入红河梯田故事 <span>↗</span></a><div class="map-region-list" id="map-region-list" aria-label="选择地州"></div><p class="source-note map-attribution">边界数据：<a href="${sourceMap}" target="_blank" rel="noreferrer">阿里云 DataV GeoAtlas · 云南 530000</a>，用于地理展示，非测绘用途。遗产地点资料：<a href="${sourceUnesco}" target="_blank" rel="noreferrer">UNESCO 世界遗产中心</a>。</p></aside></div>
      <div class="map-footnote"><b>!</b><span>行政区界线仅用于省域浏览；没有数据支持的族群分布、具体水渠线路和非遗资源位置不会被绘制成确定边界。</span></div>
    </div>`;
  }

  function collectCoordinates(value, out = []) {
    if (!Array.isArray(value)) return out;
    if (value.length >= 2 && typeof value[0] === "number" && typeof value[1] === "number") out.push(value);
    else value.forEach(item => collectCoordinates(item, out));
    return out;
  }

  function mapShortName(name) { return String(name || "").replace("自治州", "州").replace(/市$/, ""); }

  function projectGeoPoint(point, box) {
    const [x, y] = point;
    return [box.x + (x - box.minX) * box.scale, box.y + box.height - (y - box.minY) * box.scale];
  }

  function ringsOf(geometry) {
    if (geometry.type === "Polygon") return geometry.coordinates;
    if (geometry.type === "MultiPolygon") return geometry.coordinates.flat();
    return [];
  }

  function geometryPath(geometry, box) {
    return ringsOf(geometry).map(ring => ring.map((point, index) => {
      const [x, y] = projectGeoPoint(point, box);
      return `${index ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(" ") + " Z").join(" ");
  }

  function initMap() {
    const host = $("#map-svg-wrap");
    if (!host || currentRoute?.page !== "map") return;
    if (mapData) { drawMap(mapData); return; }
    fetch("data/yunnan-prefectures.geojson").then(response => {
      if (!response.ok) throw new Error("地图数据读取失败");
      return response.json();
    }).then(data => { mapData = data; drawMap(data); }).catch(() => {
      if (host) host.innerHTML = `<div class="map-error">无法读取本地边界文件。请从网站根目录通过静态服务器打开；GeoJSON 文件位于 <code>data/yunnan-prefectures.geojson</code>。</div>`;
    });
  }

  function drawMap(data) {
    const host = $("#map-svg-wrap");
    if (!host || currentRoute?.page !== "map") return;
    const all = data.features.flatMap(feature => collectCoordinates(feature.geometry.coordinates));
    const xs = all.map(p => p[0]); const ys = all.map(p => p[1]);
    const width = 690; const height = 600; const pad = 28;
    const minX = Math.min(...xs); const maxX = Math.max(...xs); const minY = Math.min(...ys); const maxY = Math.max(...ys);
    const scale = Math.min((width - pad * 2) / (maxX - minX), (height - pad * 2) / (maxY - minY));
    const mapW = (maxX - minX) * scale; const mapH = (maxY - minY) * scale;
    const box = { x:(width - mapW) / 2, y:(height - mapH) / 2, width:mapW, height:mapH, minX, minY, scale };
    const featureMarkup = data.features.map((feature, index) => {
      const name = feature.properties?.name || feature.properties?.NAME || "未命名地州";
      const short = mapShortName(name);
      const center = feature.properties?.centroid || feature.properties?.center || collectCoordinates(feature.geometry.coordinates)[0];
      const [cx, cy] = projectGeoPoint(center, box);
      return `<g><path class="map-pref${name === selectedRegion ? " is-selected" : ""}" data-region="${escapeHtml(name)}" d="${geometryPath(feature.geometry, box)}" fill-rule="evenodd" tabindex="0" role="button" aria-label="选择${escapeHtml(name)}"><title>${escapeHtml(name)}</title></path><text class="map-label" x="${cx.toFixed(1)}" y="${cy.toFixed(1)}">${escapeHtml(short)}</text></g>`;
    }).join("");
    const [hx, hy] = projectGeoPoint([102.79, 23.07], box);
    host.innerHTML = `<svg class="yunnan-map" viewBox="0 0 ${width} ${height}" role="img" aria-label="云南省16个地级行政单元边界地图"><g>${featureMarkup}</g><g aria-label="红河哈尼梯田世界遗产资料点位"><circle class="map-marker-ring" cx="${hx.toFixed(1)}" cy="${hy.toFixed(1)}" r="7"></circle><circle class="map-marker" cx="${hx.toFixed(1)}" cy="${hy.toFixed(1)}" r="3.5"></circle><text class="map-marker-label" x="${(hx+9).toFixed(1)}" y="${(hy+3).toFixed(1)}">红河梯田资料点</text></g></svg>`;
    const chips = $("#map-region-list");
    if (chips) chips.innerHTML = data.features.map(feature => { const name = feature.properties?.name || "未命名地州"; return `<button type="button" class="map-region-chip${name === selectedRegion ? " is-selected" : ""}" data-region="${escapeHtml(name)}">${escapeHtml(mapShortName(name))}</button>`; }).join("");
    updateMapSelection(selectedRegion);
  }

  function updateMapSelection(name) {
    selectedRegion = name;
    const related = name.includes("红河");
    $("#map-selection-title")?.replaceChildren(document.createTextNode(name));
    const copy = $("#map-selection-copy");
    if (copy) copy.textContent = related ? "红河哈尼梯田世界遗产资料入口。地图标记用于定位遗产主题，不表示哈尼族或其他民族的分布边界。" : "当前显示真实行政区边界。此处暂不推测该地州的民族文化资源分布，后续可在资料有来源、授权并完成校核后补充档案点位。";
    const stat = $("#map-selection-stat");
    if (stat) stat.textContent = related ? "遗产资料入口" : "地州级边界";
    const meta = $("#map-selection-meta");
    if (meta) meta.textContent = related ? "点位来源见 UNESCO" : "行政地图 · 非民族分布图";
    const link = $("#map-story-link");
    if (link) { link.style.display = related ? "inline-flex" : "none"; }
    $$(".map-pref").forEach(node => node.classList.toggle("is-selected", node.dataset.region === name));
    $$(".map-region-chip").forEach(node => node.classList.toggle("is-selected", node.dataset.region === name));
  }

  function renderPeoples() {
    return `<div class="page-wrap">${pageHeading("云南 · 常住少数民族名录", "民族索引", "云南省公开资料列出 25 个常住少数民族。本页只呈现名录，并为每个名称预留可溯源的档案字段；不把省级名录误写成各民族的聚居边界。", `<strong>25 个名称 · 同一套记录准则</strong>点开单张名录卡可查看建议的采集字段。文化内容须经社区参与、授权与复核。`)}
      <div class="directory-tools"><label class="search-input-wrap"><span>⌕</span><input id="group-search" type="search" placeholder="搜索民族名称…" autocomplete="off" aria-label="搜索民族名称"></label><div class="directory-summary"><strong id="group-result-count">25</strong><span>个名录结果 · 来源：云南省民族宗教事务委员会</span></div><div class="directory-actions"><button class="button button-plain button-small" id="export-groups" data-export-groups type="button">导出名录 CSV ↗</button><button class="button button-plain button-small" id="clear-group-search" data-clear-group-search type="button">清除</button></div></div>
      <div class="people-grid" id="people-grid">${groups.map((name, index) => `<button class="people-card" type="button" data-group="${escapeHtml(name)}"><span class="people-card-top"><h3>${escapeHtml(name)}</h3><span class="group-number">${String(index+1).padStart(2,"0")}</span></span><p>常住少数民族名录 · 档案字段待社区共建</p><span class="group-open">查看记录字段 ↗</span></button>`).join("")}</div>
      <div class="directory-note"><span>ⓘ</span><span><strong>名录说明：</strong>上列名称依据云南省民族宗教事务委员会公开资料。名称次序仅为名录顺序，不表示人口规模、地区分布或文化重要性。<a href="${sourceYunnan}" target="_blank" rel="noreferrer">查看来源 ↗</a></span></div>
    </div>`;
  }

  function openGroupDialog(name) {
    dialogContent.innerHTML = `<div class="dialog-content-pad"><p class="eyebrow">ETHNICITY DIRECTORY · 名录字段</p><h2 id="dialog-title" style="font:27px var(--serif);margin:0 0 8px">${escapeHtml(name)}</h2><p style="max-width:570px;color:var(--ink-soft);font-size:11px;line-height:1.9">该名称来自云南省公开的常住少数民族名录。本页没有预设民族分布、服饰、纹样、节庆或传统寓意，避免在资料不足时替社区代言。</p><dl class="pattern-detail-dl" style="display:grid;grid-template-columns:130px 1fr;font-size:10px;margin:18px 0"><dt style="padding:8px 0;color:var(--ink-faint);border-top:1px solid var(--line)">社区自称与语言</dt><dd style="margin:0;padding:8px 0;border-top:1px solid var(--line)">待与相关社区核实</dd><dt style="padding:8px 0;color:var(--ink-faint);border-top:1px solid var(--line)">文化资源与场景</dt><dd style="margin:0;padding:8px 0;border-top:1px solid var(--line)">待授权采集，不从名录推断</dd><dt style="padding:8px 0;color:var(--ink-faint);border-top:1px solid var(--line)">讲述者与使用许可</dt><dd style="margin:0;padding:8px 0;border-top:1px solid var(--line)">记录授权范围、校核日期和撤回方式</dd><dt style="padding:8px 0;color:var(--ink-faint);border-top:1px solid var(--line)">公开来源</dt><dd style="margin:0;padding:8px 0;border-top:1px solid var(--line)"><a href="${sourceYunnan}" target="_blank" rel="noreferrer" style="color:var(--clay-deep)">云南省民族宗教事务委员会 ↗</a></dd></dl><button class="button button-dark button-small" type="button" data-save="group-${escapeHtml(name)}">收藏这张名录卡 ◇</button></div>`;
    showDialog();
  }

  function renderStories() {
    const feature = stories.find(item => item.featured) || stories[0];
    const cards = stories.filter(item => !item.featured).map(item => `<article class="story-card"><a href="#/stories/${item.id}"><div class="story-card-image"><img src="${img(item.image)}" alt="${escapeHtml(item.title)}的 AI 概念插画"><span class="concept-label">AI 概念插画</span></div><div class="story-card-body"><div class="story-meta"><span>${escapeHtml(item.category)}</span><i class="meta-dot"></i><span>${escapeHtml(item.read)}</span></div><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.summary)}</p><span class="text-arrow">阅读全文 <b>→</b></span></div></a></article>`).join("");
    return `<div class="page-wrap">${pageHeading("长篇叙事 · 来源可查", "山水故事", "从红河哈尼梯田的水网与山地系统出发，再回到数字档案的采集、授权与传播。每篇故事都标明资料边界。", `<strong>6 篇专题 · 2 条阅读线</strong>地景故事以 UNESCO 遗产资料为依据；档案方法篇用于说明采集与呈现原则。`)}
      <section class="story-feature"><div class="story-feature-copy"><p class="eyebrow">${feature.eyebrow}</p><h2>${feature.title}</h2><p>${feature.summary}</p><a class="text-arrow" href="#/stories/${feature.id}">进入专题阅读 <b>→</b></a></div><div class="story-feature-art"><img src="${img(feature.image)}" alt="${escapeHtml(feature.title)}的 AI 概念插画"></div></section>
      <h2 class="section-kicker">专题篇章 <small>选择一篇继续阅读</small></h2><div class="story-grid">${cards}</div>
      <div class="home-caution"><span>◌</span><p><strong>插画说明：</strong>本页图片由 AI 生成，仅为展览概念插画，不是实地照片，也不代表特定民族的服饰、建筑或传统工艺细节。事实内容请以每篇标注的一手来源为准。</p></div>
    </div>`;
  }

  function renderStoryDetail(id) {
    const story = stories.find(item => item.id === id);
    if (!story) return `<div class="page-wrap">${pageHeading("专题不存在", "暂未收录这篇故事", "回到山水故事页继续浏览。")}<a class="button button-dark" href="#/stories">返回故事索引</a></div>`;
    const sourceBody=story.source?"本文依据公开资料进行介绍性转述，不替代社区讲述与实地调查。图中 AI 概念插画不是事实影像。":"本文为文化资源数字档案方法说明，参考用户提供的赛事要求；不陈述某个民族的具体文化事实。图中 AI 概念插画不是田野影像。";
    const sourceLinks=story.source?`<a href="${story.source}" target="_blank" rel="noreferrer">阅读原始来源 ↗</a>`:`<span>参考：赛事文件《民族文化 创新表达》作品要求</span>`;
    return `<div class="page-wrap"><a class="text-arrow" href="#/stories" style="margin:0 0 14px">← 返回故事索引</a><section class="story-detail-hero"><div class="story-detail-copy"><p class="eyebrow">${story.eyebrow}</p><h1>${story.title}</h1><p>${story.summary}</p><div class="story-meta" style="margin-top:15px;color:#c8d1c5"><span>${story.category}</span><i class="meta-dot"></i><span>${story.read}</span></div></div><div class="story-detail-art"><img src="${img(story.image)}" alt="${escapeHtml(story.title)}的 AI 概念插画"></div></section>
      <article class="story-article"><p class="story-article-lead">${story.lead}</p>${story.sections.map((section,index) => `<section class="article-section"><aside>${section.tag}<small>${section.note}</small></aside><div><h2>${section.title}</h2>${section.paragraphs.map(text => `<p>${text}</p>`).join("")}</div></section>`).join("")}<blockquote class="article-pullquote">“数字化保存的不只是图像，也包括图像从何而来、谁有权解释，以及它可以去往哪里。”</blockquote><div class="article-source-box"><strong>资料来源与阅读边界</strong><p>${story.sourceTitle}。${sourceBody}</p><p style="margin-top:8px">${sourceLinks}</p></div><div class="article-actions"><button class="button button-dark button-small" type="button" data-save="story-${story.id}">收藏这篇故事 ◇</button><button class="button button-plain button-small" type="button" data-copy-link>复制本页链接 ↗</button></div></article>
    </div>`;
  }

  function familyNames() { return ["全部", ...new Set(records.map(item => item.family))]; }

  function renderArchive() {
    const familyButtons = familyNames().map(name => `<button class="filter-chip${archiveState.family === name ? " is-active" : ""}" type="button" data-family="${escapeHtml(name)}">${escapeHtml(name)}${name === "全部" ? ` · ${records.length}` : ""}</button>`).join("");
    const palettes = [["全部","transparent"],["暮蓝","#244f56"],["陶土","#994f3b"],["苔绿","#526c55"],["胭脂","#9b3e4b"],["岩褐","#71523e"],["烟墨","#34413e"]].map(([name,color]) => `<button class="palette-dot${archiveState.palette === name ? " is-active" : ""}" style="background:${color}" type="button" data-palette="${name}" title="${name}" aria-label="按${name}筛选"></button>`).join("");
    setTimeout(renderPatternCards, 0);
    return `<div class="page-wrap">${pageHeading("原创形态练习 · 不指代特定民族", "纹样档案", "50 枚数字形态样稿，可按构成方式、色彩与名称筛选。它们用于演示档案界面和创作工具，不是经考证的民族传统纹样。", `<strong>50 枚 · 5 种构成方式</strong>每张卡保留“未定族属 / 待来源校核”状态，不标注未经验证的传统寓意。`)}
      <section class="archive-banner"><div class="archive-banner-copy"><strong>先看结构，再进入生活语境</strong><p>从连续边饰、几何单元到交织结构，试着描述线条如何组织。正式展陈时，每个传统纹样都需补上采集地点、讲述者、授权范围、工艺与社区校核记录。</p></div><div class="archive-banner-art"><img src="${img("handloom.jpg")}" alt="织机操作细节的 AI 概念插画"></div></section>
      <div class="archive-tools"><div class="archive-tools-left"><label class="archive-search"><span>⌕</span><input id="pattern-search" type="search" placeholder="搜索暂拟名称…" value="${escapeHtml(archiveState.query)}" autocomplete="off"></label><select id="pattern-sort" class="select-control" aria-label="纹样排序"><option value="default" ${archiveState.sort === "default" ? "selected" : ""}>档案顺序</option><option value="title" ${archiveState.sort === "title" ? "selected" : ""}>名称 A—Z</option><option value="family" ${archiveState.sort === "family" ? "selected" : ""}>按构成分类</option></select></div><div class="archive-tools-right"><button class="filter-chip${archiveState.onlySaved ? " is-active" : ""}" type="button" data-only-saved>仅看收藏</button><button class="filter-chip" type="button" data-random-pattern>随机发现 ↗</button><div class="palette-dots" aria-label="色彩筛选">${palettes}</div></div></div>
      <div class="filter-row" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:13px">${familyButtons}</div><p class="source-note" id="pattern-result-label"></p><div class="pattern-grid" id="pattern-grid"></div>
      <div class="home-caution"><span>ⓘ</span><p><strong>图案性质：</strong>本页 50 张 SVG 均为原创数字形态示意稿，不对应某个民族、地区或传统含义。点击卡片可查看记录字段和说明。</p></div>
    </div>`;
  }

  function filteredPatterns() {
    let items = [...records];
    if (archiveState.query) items = items.filter(item => `${item.title} ${item.family} ${item.id}`.toLowerCase().includes(archiveState.query.toLowerCase()));
    if (archiveState.family !== "全部") items = items.filter(item => item.family === archiveState.family);
    if (archiveState.palette !== "全部") items = items.filter(item => item.palette === archiveState.palette);
    if (archiveState.onlySaved) items = items.filter(item => saved.has(`pattern-${item.id}`));
    if (archiveState.sort === "title") items.sort((a,b) => a.title.localeCompare(b.title,"zh-CN"));
    if (archiveState.sort === "family") items.sort((a,b) => a.family.localeCompare(b.family,"zh-CN") || a.id.localeCompare(b.id));
    return items;
  }

  function patternCard(item) {
    const isSaved = saved.has(`pattern-${item.id}`);
    return `<article class="pattern-card" data-pattern-card="${item.id}"><button class="pattern-open" type="button" data-pattern-details="${item.id}" aria-label="查看${escapeHtml(item.title)}档案"><div class="pattern-thumb"><img loading="lazy" src="${escapeHtml(item.image)}" alt="${escapeHtml(item.title)}原创形态示意图"><span class="pattern-no">${item.id}</span></div></button><button class="pattern-fav${isSaved ? " is-saved" : ""}" type="button" data-pattern-save="${item.id}" aria-label="${isSaved ? "取消收藏" : "收藏"}${escapeHtml(item.title)}">${isSaved ? "♥" : "◇"}</button><div class="pattern-card-body"><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.family)} · ${escapeHtml(item.palette)}</p><div class="pattern-status"><span>未定族属</span><span>待来源校核</span></div></div></article>`;
  }

  function renderPatternCards() {
    const grid = $("#pattern-grid");
    if (!grid) return;
    const items = filteredPatterns();
    grid.innerHTML = items.length ? items.map(patternCard).join("") : `<div class="pattern-empty">没有符合条件的纹样。试试更换关键词或清除筛选。</div>`;
    const label = $("#pattern-result-label");
    if (label) label.textContent = `当前显示 ${items.length} / ${records.length} 枚 · 选中卡片可查看完整档案说明`;
  }

  function openPatternDialog(id) {
    const item = patternById.get(id);
    if (!item) return;
    const isSaved = saved.has(`pattern-${id}`);
    dialogContent.innerHTML = `<div class="pattern-detail"><img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.title)}原创形态示意图"><div><p class="eyebrow">PATTERN STUDY · ${item.id}</p><h2 id="dialog-title">${escapeHtml(item.title)}</h2><p>这是一枚原创数字构成练习。名称和色彩仅用于档案原型演示，不代表特定民族、地区、传统称谓或文化寓意。</p><dl><dt>构成方式</dt><dd>${escapeHtml(item.family)}</dd><dt>色彩练习</dt><dd>${escapeHtml(item.palette)}</dd><dt>文化归属</dt><dd>未定族属 · 不作传统认定</dd><dt>来源状态</dt><dd>数字原创样稿；无田野来源</dd><dt>正式展陈字段</dt><dd>采集地点、讲述者、授权、工艺、社区校核</dd></dl><button class="button button-dark button-small" type="button" data-pattern-save="${item.id}">${isSaved ? "取消收藏 ♥" : "收藏这枚样稿 ◇"}</button></div></div>`;
    showDialog();
  }

  function renderModel() {
    setTimeout(initModel, 0);
    return `<div class="page-wrap">${pageHeading("WebGL · 可旋转的山地模型", "三维展厅", "以真实的红河哈尼梯田景观结构为叙事依据，搭建一座可旋转的概念模型。模型几何、路径和建筑均为数字示意，不是激光扫描或实景复刻。", `<strong>拖动旋转 · 滚轮缩放 · 切换图层</strong>概念模型帮助观察空间关系；细节与位置不作为精确地理测量。`)}
      <section class="model-shell"><div class="model-stage"><canvas id="terrain-canvas" tabindex="0" aria-label="可旋转的三维梯田景观概念模型"></canvas><div class="model-stage-head"><strong>山水协作系统 · 三维概念模型</strong><span>森林涵养 → 水渠分流 → 梯田蓄水 → 村寨共护</span></div><div class="model-control-strip"><button type="button" data-model-control="zoom-out" aria-label="缩小">−</button><button type="button" data-model-control="reset" aria-label="重置视角">↺</button><button type="button" data-model-control="zoom-in" aria-label="放大">＋</button></div><span class="model-live-label">LIVE WEBGL · 鼠标拖拽旋转</span></div><aside class="model-side"><p class="eyebrow">INTERACTIVE TERRAIN</p><h2>在不同高度，<br>看见彼此依赖。</h2><p>模型以坡地、层级田面、林地、水线与村寨建筑作为说明性几何体。选择一个图层了解它在公开遗产资料中的位置。</p><div class="model-layer-list"><button class="model-layer is-active" type="button" data-layer="all"><b>01</b> 全景 · 山水复合系统</button><button class="model-layer" type="button" data-layer="forest"><b>02</b> 森林 · 水源涵养</button><button class="model-layer" type="button" data-layer="water"><b>03</b> 水系 · 逐级分流</button><button class="model-layer" type="button" data-layer="terraces"><b>04</b> 梯田 · 层层蓄水</button><button class="model-layer" type="button" data-layer="village"><b>05</b> 村寨 · 生活空间</button></div><div class="model-info" id="model-info"><strong>山水复合系统</strong><p>UNESCO 将森林、灌溉、梯田和村庄作为整体文化景观描述。概念模型用于讲解这种关系。</p></div><p class="source-note">资料依据：<a href="${sourceUnesco}" target="_blank" rel="noreferrer">UNESCO 红河哈尼梯田遗产说明</a>。模型不复刻具体村寨、建筑测绘或真实水渠线路。</p></aside></section><div class="model-instructions"><span>拖动 · 环绕观察</span><span>滚轮 · 调整距离</span><span>触屏 · 单指旋转</span><span>键盘 · ← → 调整视角</span></div><div class="model-credits"><strong>↗</strong><span>世界遗产资料记载当地经过长期发展形成复杂灌溉系统。模型表现的是“森林—水—梯田—村寨”的解释结构；画面中的线条与房屋是艺术化示意，不应当作实测数据。</span></div></div>`;
  }

  const modelLayerText = {
    all:["山水复合系统","UNESCO 将森林、灌溉、梯田和村庄作为整体文化景观描述。概念模型用于讲解这种关系。"],
    forest:["森林涵养","模型上部的树冠与山脊表示水源涵养所处的山地环境，不对应具体林地边界。"],
    water:["水渠分流","蓝色曲线是解释性的水路示意，不对应公开测绘的实际渠道线路。"],
    terraces:["层级田面","同心层级展示梯田顺坡展开的空间观念，不对应某个实地田块尺寸。"],
    village:["村寨空间","建筑体块只表达村寨在山地系统中的位置关系，不复刻任何真实村落建筑。"]
  };

  function createSceneGeometry() {
    const batches = { terrain:[], terraces:[], forest:[], water:[], village:[] };
    const colors = { terrain:[], terraces:[], forest:[], water:[], village:[] };
    const lines = [];
    const lineColors = [];
    const color = hex => [parseInt(hex.slice(1,3),16)/255, parseInt(hex.slice(3,5),16)/255, parseInt(hex.slice(5,7),16)/255];
    function tri(layer,a,b,c,col) { batches[layer].push(...a,...b,...c); const rgb=color(col); colors[layer].push(...rgb,...rgb,...rgb); }
    function quad(layer,a,b,c,d,col) { tri(layer,a,b,c,col); tri(layer,a,c,d,col); }
    function line(a,b,col="#77c2bd") { lines.push(...a,...b); const rgb=color(col); lineColors.push(...rgb,...rgb); }
    function heightAt(x,z) {
      const h1=1.12*Math.exp(-((x+.45)**2/2.4+(z-.2)**2/2.9));
      const h2=.86*Math.exp(-((x-1.6)**2/1.2+(z+1.25)**2/1.9));
      const h3=.72*Math.exp(-((x+1.8)**2/1.7+(z+1.4)**2/1.4));
      const h4=.58*Math.exp(-((x-.9)**2/1.7+(z-1.6)**2/1.3));
      return .08+h1+h2+h3+h4+.025*Math.sin(x*2.6+z)*Math.cos(z*2.1);
    }
    const cells=38, span=6;
    for(let iz=0;iz<cells;iz++) for(let ix=0;ix<cells;ix++) {
      const x0=-span/2+span*ix/cells, x1=-span/2+span*(ix+1)/cells;
      const z0=-span/2+span*iz/cells, z1=-span/2+span*(iz+1)/cells;
      const p0=[x0,heightAt(x0,z0),z0], p1=[x1,heightAt(x1,z0),z0], p2=[x1,heightAt(x1,z1),z1], p3=[x0,heightAt(x0,z1),z1];
      const avg=(p0[1]+p1[1]+p2[1]+p3[1])/4;
      const col=avg>.85?"#536d4a":avg>.5?"#637b51":"#7b8861";
      quad("terrain",p0,p1,p2,p3,col);
    }
    function terraceHill(cx,cz,maxRX,maxRZ,levels=7) {
      const edge=heightAt(cx+maxRX,cz)+.025;
      const stepY=.10;
      const stepR=1/levels;
      for(let tier=0;tier<levels;tier++) {
        const outer=1-tier*stepR, inner=outer-stepR*.75;
        const y=edge+tier*stepY+.07;
        const tint=tier%3===0?"#83a078":tier%3===1?"#7f9c75":"#71906e";
        const segments=56;
        for(let j=0;j<segments;j++) {
          const a=j/segments*Math.PI*2, b=(j+1)/segments*Math.PI*2;
          const po=[cx+Math.cos(a)*maxRX*outer,y,cz+Math.sin(a)*maxRZ*outer];
          const po2=[cx+Math.cos(b)*maxRX*outer,y,cz+Math.sin(b)*maxRZ*outer];
          const pi=[cx+Math.cos(a)*maxRX*inner,y,cz+Math.sin(a)*maxRZ*inner];
          const pi2=[cx+Math.cos(b)*maxRX*inner,y,cz+Math.sin(b)*maxRZ*inner];
          quad("terraces",po,po2,pi2,pi,tint);
          const wallY=y+stepY*.8;
          const wallTop=[cx+Math.cos(a)*maxRX*inner,wallY,cz+Math.sin(a)*maxRZ*inner];
          const wallTop2=[cx+Math.cos(b)*maxRX*inner,wallY,cz+Math.sin(b)*maxRZ*inner];
          quad("terraces",pi,pi2,wallTop2,wallTop,"#526c59");
        }
      }
    }
    terraceHill(-.4,.2,1.48,1.36,8);
    terraceHill(1.58,-1.25,.72,.67,5);
    terraceHill(-1.72,-1.36,.65,.58,5);
    terraceHill(.98,1.65,.56,.52,4);

    function tree(x,z,size=.16) {
      const y=heightAt(x,z); const tip=y+size*2.15; const sides=6;
      const trunk=.045*size/.16;
      const base1=[x-trunk,y,z-trunk],base2=[x+trunk,y,z-trunk],base3=[x+trunk,y,z+trunk],base4=[x-trunk,y,z+trunk];
      const top=[x,y+size*.6,z];
      quad("forest",base1,base2,base3,base4,"#6b5039");
      for(let i=0;i<sides;i++) {
        const a=i/sides*Math.PI*2,b=(i+1)/sides*Math.PI*2;
        const p=[x+Math.cos(a)*size,y+size*.25,z+Math.sin(a)*size];
        const q=[x+Math.cos(b)*size,y+size*.25,z+Math.sin(b)*size];
        const tipPoint=[x,y+size*2.1,z];
        tri("forest",p,q,tipPoint,i%2?"#789260":"#668151");
      }
      return tip;
    }
    let seed=731;
    const random=()=>{seed=(seed*16807)%2147483647;return(seed-1)/2147483646;};
    for(let i=0;i<96;i++) {
      let x=-2.75+random()*5.5, z=-2.75+random()*5.5;
      const d1=Math.hypot((x+.4)/1.48,(z-.2)/1.36);
      const d2=Math.hypot((x-1.58)/.72,(z+1.25)/.67);
      if(d1<1.05||d2<1.05) continue;
      tree(x,z,.10+random()*.13);
    }

    function channel(points) {
      for(let i=0;i<points.length-1;i++) line(points[i],points[i+1],"#82c9c2");
      for(let i=1;i<points.length-1;i++) line([points[i][0]+.022,points[i][1]+.008,points[i][2]],[points[i][0]-.022,points[i][1]+.008,points[i][2]],"#b1e0d5");
    }
    channel([[-2.65,heightAt(-2.65,-.05)+.05,-.05],[-1.9,heightAt(-1.9,-.05)+.08,-.05],[-1.2,heightAt(-1.2,-.05)+.09,-.05],[-.65,heightAt(-.65,-.05)+.12,-.05],[-.15,heightAt(-.15,-.05)+.12,-.05],[.6,heightAt(.6,-.05)+.1,-.05],[1.35,heightAt(1.35,-.05)+.07,-.05],[2.5,heightAt(2.5,-.05)+.045,-.05]]);
    channel([[-2.5,heightAt(-2.5,1.15)+.04,1.15],[-1.65,heightAt(-1.65,1.15)+.08,1.15],[-.9,heightAt(-.9,1.15)+.12,1.15],[-.2,heightAt(-.2,1.15)+.1,1.15],[.55,heightAt(.55,1.15)+.09,1.15],[1.5,heightAt(1.5,1.15)+.05,1.15]]);
    channel([[.15,heightAt(.15,2.6)+.05,2.6],[.2,heightAt(.2,1.8)+.09,1.8],[.25,heightAt(.25,1)+.12,1],[.3,heightAt(.3,.3)+.12,.3],[.35,heightAt(.35,-.4)+.09,-.4],[.42,heightAt(.42,-1.3)+.05,-1.3]]);

    function box(cx,cy,cz,sx,sy,sz,col,layer="village") {
      const x0=cx-sx/2,x1=cx+sx/2,y0=cy,y1=cy+sy,z0=cz-sz/2,z1=cz+sz/2;
      const a=[x0,y0,z0],b=[x1,y0,z0],c=[x1,y0,z1],d=[x0,y0,z1],e=[x0,y1,z0],f=[x1,y1,z0],g=[x1,y1,z1],h=[x0,y1,z1];
      quad(layer,a,b,f,e,col);quad(layer,b,c,g,f,col);quad(layer,c,d,h,g,col);quad(layer,d,a,e,h,col);quad(layer,e,f,g,h,col);
    }
    function house(x,z,s=.26) {
      const y=heightAt(x,z)+.035, w=s, d=s*.72, h=s*.5, peak=[x,y+h+s*.38,z];
      box(x,y,z,w,h,d,"#ab7654");
      const ridgeA=[x-w*.58,y+h,z-d*.58], ridgeB=[x+w*.58,y+h,z-d*.58];
      const ridgeC=[x+w*.58,y+h,z+d*.58], ridgeD=[x-w*.58,y+h,z+d*.58];
      const front=[x,y+h+s*.36,z-d*.62], back=[x,y+h+s*.36,z+d*.62];
      tri("village",ridgeA,ridgeB,front,"#51473b");
      tri("village",ridgeD,ridgeC,back,"#5e4b3c");
      quad("village",ridgeA,ridgeD,back,front,"#705540");
      quad("village",ridgeB,ridgeC,back,front,"#87654a");
    }
    [[-.5,-2.15,.31],[.05,-2.3,.28],[.52,-2.12,.32],[.89,-2.35,.23],[-.12,-1.83,.22]].forEach(([x,z,s])=>house(x,z,s));
    const layers = {};
    for(const name of Object.keys(batches)) layers[name]={vertices:new Float32Array(batches[name]),colors:new Float32Array(colors[name])};
    return {layers,lineVertices:new Float32Array(lines),lineColors:new Float32Array(lineColors)};
  }

  function matMultiply(a,b) {
    const out=new Float32Array(16);
    for(let c=0;c<4;c++) for(let r=0;r<4;r++) out[c*4+r]=a[r]*b[c*4]+a[4+r]*b[c*4+1]+a[8+r]*b[c*4+2]+a[12+r]*b[c*4+3];
    return out;
  }
  function perspective(fov,aspect,near,far) {
    const f=1/Math.tan(fov/2), nf=1/(near-far);
    return new Float32Array([f/aspect,0,0,0,0,f,0,0,0,0,(far+near)*nf,-1,0,0,2*far*near*nf,0]);
  }
  function lookAt(eye,target,up) {
    const norm=v=>{const l=Math.hypot(...v)||1;return v.map(x=>x/l);};
    const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
    const dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0);
    const z=norm(eye.map((v,i)=>v-target[i]));const x=norm(cross(up,z));const y=cross(z,x);
    return new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-dot(x,eye),-dot(y,eye),-dot(z,eye),1]);
  }
  function rotationX(angle) { const c=Math.cos(angle),s=Math.sin(angle);return new Float32Array([1,0,0,0,0,c,s,0,0,-s,c,0,0,0,0,1]); }
  function rotationY(angle) { const c=Math.cos(angle),s=Math.sin(angle);return new Float32Array([c,0,-s,0,0,1,0,0,s,0,c,0,0,0,0,1]); }

  function initModel() {
    const canvas=$("#terrain-canvas");
    if(!canvas||currentRoute?.page!=="model") return;
    if(modelCleanup) { modelCleanup(); modelCleanup=null; }
    const gl=canvas.getContext("webgl",{antialias:true,alpha:true});
    if(!gl) { const host=canvas.parentElement; host.insertAdjacentHTML("beforeend","<div class='map-error'>此浏览器暂不支持 WebGL，请使用较新版本浏览器查看三维模型。</div>"); return; }
    const vertexShader=`attribute vec3 aPosition;attribute vec3 aColor;uniform mat4 uMvp;varying vec3 vColor;void main(){gl_Position=uMvp*vec4(aPosition,1.0);vColor=aColor;}`;
    const fragmentShader=`precision mediump float;varying vec3 vColor;void main(){gl_FragColor=vec4(vColor,1.0);}`;
    function compile(type,source){const shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(shader));return shader;}
    let program;
    try { program=gl.createProgram();gl.attachShader(program,compile(gl.VERTEX_SHADER,vertexShader));gl.attachShader(program,compile(gl.FRAGMENT_SHADER,fragmentShader));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program)); }
    catch { const host=canvas.parentElement;host.insertAdjacentHTML("beforeend","<div class='map-error'>三维场景初始化失败，请刷新页面后重试。</div>");return; }
    const locations={position:gl.getAttribLocation(program,"aPosition"),color:gl.getAttribLocation(program,"aColor"),mvp:gl.getUniformLocation(program,"uMvp")};
    const scene=createSceneGeometry();
    function bufferFor(vertices,colors) { const vb=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,vb);gl.bufferData(gl.ARRAY_BUFFER,vertices,gl.STATIC_DRAW);const cb=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,cb);gl.bufferData(gl.ARRAY_BUFFER,colors,gl.STATIC_DRAW);return {vb,cb,count:vertices.length/3}; }
    const layerBuffers={};for(const [key,data] of Object.entries(scene.layers))layerBuffers[key]=bufferFor(data.vertices,data.colors);
    const lineBuffer=bufferFor(scene.lineVertices,scene.lineColors);
    const activeLayers={terrain:true,terraces:true,forest:true,water:true,village:true};
    let yaw=.72,pitch=.14,distance=8.8,drag=null,frame=0;
    gl.enable(gl.DEPTH_TEST);gl.disable(gl.CULL_FACE);gl.clearColor(0,0,0,0);
    function drawBatch(batch,mode=gl.TRIANGLES) { gl.bindBuffer(gl.ARRAY_BUFFER,batch.vb);gl.enableVertexAttribArray(locations.position);gl.vertexAttribPointer(locations.position,3,gl.FLOAT,false,0,0);gl.bindBuffer(gl.ARRAY_BUFFER,batch.cb);gl.enableVertexAttribArray(locations.color);gl.vertexAttribPointer(locations.color,3,gl.FLOAT,false,0,0);gl.drawArrays(mode,0,batch.count); }
    function render() {
      const ratio=window.devicePixelRatio||1;const width=Math.max(1,Math.round(canvas.clientWidth*ratio));const height=Math.max(1,Math.round(canvas.clientHeight*ratio));
      if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;}
      gl.viewport(0,0,width,height);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.useProgram(program);
      const projection=perspective(.71,width/height,.1,80);const view=lookAt([0,3.2,distance],[0,.4,0],[0,1,0]);const model=matMultiply(rotationY(yaw),rotationX(pitch));const mvp=matMultiply(projection,matMultiply(view,model));gl.uniformMatrix4fv(locations.mvp,false,mvp);
      for(const [name,batch] of Object.entries(layerBuffers))if(activeLayers[name])drawBatch(batch);
      if(activeLayers.water){gl.lineWidth(Math.max(1,2*ratio));drawBatch(lineBuffer,gl.LINES);}
      frame=requestAnimationFrame(render);
    }
    render();
    const down=event=>{drag={x:event.clientX,y:event.clientY};canvas.setPointerCapture?.(event.pointerId);};
    const move=event=>{if(!drag)return;const dx=event.clientX-drag.x,dy=event.clientY-drag.y;drag={x:event.clientX,y:event.clientY};yaw+=dx*.008;pitch=Math.max(-.55,Math.min(.62,pitch+dy*.006));};
    const up=()=>{drag=null;};
    const wheel=event=>{event.preventDefault();distance=Math.max(5.3,Math.min(13,distance+Math.sign(event.deltaY)*.32));};
    const key=event=>{if(event.key==="ArrowLeft")yaw-=.07;if(event.key==="ArrowRight")yaw+=.07;};
    canvas.addEventListener("pointerdown",down);canvas.addEventListener("pointermove",move);canvas.addEventListener("pointerup",up);canvas.addEventListener("pointercancel",up);canvas.addEventListener("wheel",wheel,{passive:false});canvas.addEventListener("keydown",key);
    const resize=()=>{};window.addEventListener("resize",resize);
    const control=event=>{const kind=event.target.closest("[data-model-control]")?.dataset.modelControl;if(kind==="zoom-in")distance=Math.max(5.3,distance-.6);if(kind==="zoom-out")distance=Math.min(13,distance+.6);if(kind==="reset"){yaw=.72;pitch=.14;distance=8.8;}};
    const layer=event=>{const button=event.target.closest("[data-layer]");if(!button)return;const name=button.dataset.layer;Object.keys(activeLayers).forEach(key=>activeLayers[key]=name==="all"||name===key);$$(".model-layer").forEach(node=>node.classList.toggle("is-active",node===button));const copy=modelLayerText[name]||modelLayerText.all;const info=$("#model-info");if(info)info.innerHTML=`<strong>${copy[0]}</strong><p>${copy[1]}</p>`;};
    $(".model-control-strip")?.addEventListener("click",control);$(".model-layer-list")?.addEventListener("click",layer);
    modelCleanup=()=>{cancelAnimationFrame(frame);window.removeEventListener("resize",resize);canvas.removeEventListener("pointerdown",down);canvas.removeEventListener("pointermove",move);canvas.removeEventListener("pointerup",up);canvas.removeEventListener("pointercancel",up);canvas.removeEventListener("wheel",wheel);canvas.removeEventListener("keydown",key);$(".model-control-strip")?.removeEventListener("click",control);$(".model-layer-list")?.removeEventListener("click",layer);};
  }

  function compositionSvg(embedded = {}) {
    const selected=workshopState.selected.map(id=>patternById.get(id)).filter(Boolean);
    if(!selected.length) return `<svg viewBox="0 0 600 360" role="img" aria-label="拼纹工坊空画布"><rect width="600" height="360" fill="${workshopState.color}"/><text x="300" y="171" text-anchor="middle" fill="#637067" font-family="sans-serif" font-size="16">选择左侧纹样，开始构成</text><text x="300" y="201" text-anchor="middle" fill="#92978e" font-family="sans-serif" font-size="10">原创形态样稿 · 不指代特定传统图案</text></svg>`;
    const count=Math.max(1,Math.min(6,workshopState.repeat));
    const tile=108*workshopState.scale;
    const positions=[];
    for(let row=0;row<2;row++)for(let col=0;col<count;col++)positions.push({x:45+col*(510/Math.max(count,3)),y:55+row*128,scale:tile/100});
    const images=positions.map((pos,index)=>{const item=selected[index%selected.length];const href=embedded[item.id]||item.image;return `<image href="${href}" x="${pos.x.toFixed(1)}" y="${pos.y.toFixed(1)}" width="${tile.toFixed(1)}" height="${tile.toFixed(1)}" preserveAspectRatio="xMidYMid meet"/>`;}).join("");
    return `<svg viewBox="0 0 600 360" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="原创纹样构成实验"><rect width="600" height="360" fill="${workshopState.color}"/><path d="M0 32H600M0 328H600" stroke="#8f927e" stroke-opacity=".25"/><text x="28" y="25" fill="#59665a" font-family="serif" font-size="10" letter-spacing="2">YUNLING · PATTERN STUDY</text>${images}<text x="300" y="343" text-anchor="middle" fill="#667066" font-family="sans-serif" font-size="9">数字形态实验 · 非特定民族传统纹样</text></svg>`;
  }

  function renderWorkshop() {
    setTimeout(() => { const host=$("#workshop-preview");if(host)host.innerHTML=compositionSvg(); },0);
    const selectedMarkup=workshopState.selected.map(id=>{const item=patternById.get(id);return item?`<button class="selected-motif" type="button" data-workshop-remove="${id}" title="移除${escapeHtml(item.title)}"><img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.title)}"></button>`:"";}).join("");
    const choices=records.map(item=>`<button class="motif-choice${workshopState.selected.includes(item.id)?" is-selected":""}" type="button" data-workshop-add="${item.id}" title="${escapeHtml(item.title)}"><img loading="lazy" src="${escapeHtml(item.image)}" alt="${escapeHtml(item.title)}"></button>`).join("");
    const colors=["#f3eee1","#e7decb","#dae0d5","#d4e0e1","#ead9cf","#efe5bc"];
    return `<div class="page-wrap">${pageHeading("浏览器本地创作 · 可导出 SVG", "拼纹工坊", "选取原创形态样稿，调整色纸与重复数量，生成一张个人构成练习。作品仅存在于本地浏览器中，不会上传。", `<strong>选择 1—6 枚形态样稿</strong>导出作品会将所用 SVG 嵌入文件，便于离线查看。`)}
      <div class="workshop-layout"><section class="workshop-canvas-wrap"><div class="workshop-topline"><strong>画布 · 云岭形态实验</strong><small>${workshopState.selected.length} / 6 已选</small></div><div class="workshop-canvas" id="workshop-preview"><div class="workshop-empty"><strong>留白也是起点</strong>从右侧挑选一枚或多枚图案。</div></div><div class="workshop-button-row"><button class="button button-dark button-small" type="button" data-workshop-export>导出 SVG ↗</button><button class="button button-plain button-small" type="button" data-workshop-random>随机组合</button><button class="button button-plain button-small" type="button" data-workshop-clear>清空画布</button></div><p class="source-note" style="margin:10px 0 0">导出的文件注明作品为原创形态练习；它不代表经考证的民族传统纹样。</p></section>
      <aside class="workshop-controls"><h2>选择形态</h2><p>最多选择 6 枚；点击已选纹样可移除。</p><div class="selected-motifs">${selectedMarkup||`<span class="muted" style="font-size:9px">尚未选择纹样</span>`}</div><div class="motif-picker" aria-label="50枚纹样选择器">${choices}</div><h2 style="margin-top:16px">纸张色调</h2><div class="workshop-palette">${colors.map(color=>`<button class="workshop-color${workshopState.color===color?" is-active":""}" type="button" style="background:${color}" data-workshop-color="${color}" aria-label="选择${color}纸张"></button>`).join("")}</div><div class="workshop-sliders"><label>重复数量<input type="range" min="1" max="6" value="${workshopState.repeat}" data-workshop-repeat><output>${workshopState.repeat}</output></label><label>图案尺度<input type="range" min="0.65" max="1.25" step="0.05" value="${workshopState.scale}" data-workshop-scale><output>${Math.round(workshopState.scale*100)}%</output></label></div><p class="source-note">纹样与组合均为原创视觉样稿。创作工具不包含民族文化事实认定。</p></aside></div></div>`;
  }

  function saveBlob(name, content, type) {
    const blob=new Blob([content],{type});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);
  }

  async function exportComposition() {
    if(!workshopState.selected.length){notify("先选择至少一枚纹样再导出。");return;}
    notify("正在整理嵌入式 SVG…");
    const embedded={};
    try {
      for(const id of workshopState.selected){const item=patternById.get(id);if(!item)continue;const response=await fetch(item.image);const text=await response.text();embedded[id]=`data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(text)))}`;}
      saveBlob("云岭-纹样构成练习.svg",compositionSvg(embedded),"image/svg+xml;charset=utf-8");notify("SVG 已导出，可离线打开。" );
    } catch { notify("读取图案失败，请通过本地静态服务器打开后再导出。" ); }
  }

  function renderFieldNotes() {
    return `<div class="page-wrap">${pageHeading("个人工作区 · 数据只在本机", "田野手记", "为文化资源采集准备一份本地记录卡。表单内容保存在当前浏览器设备，不会上传，也不构成真实采集授权。", `<strong>纯本地 · 可导出 JSON</strong>实际田野工作仍须取得知情同意，并按社区约定管理资料。`)}
      <div class="field-layout"><section class="form-panel"><h2>新增一则手记</h2><p>先记来源和采集状态，再整理影像或口述资料。</p><form class="field-form" id="field-note-form"><label>记录标题<input name="title" required maxlength="80" placeholder="例如：河谷织物的材料观察"></label><label>资源类型<select name="type"><option>形态观察</option><option>口述访谈</option><option>影像记录</option><option>工艺流程</option><option>地图点位</option><option>其他</option></select></label><label>地点或区域<input name="place" maxlength="80" placeholder="精确地点可暂不公开"></label><label>资料来源<input name="source" maxlength="160" placeholder="讲述者、出版物、采集编号等"></label><label class="wide">记录内容<textarea name="body" required maxlength="3000" placeholder="写下观察、尚待核实的问题、授权状态与下一步……"></textarea></label><label>授权状态<select name="consent"><option>待确认，不公开</option><option>已获有限授权</option><option>仅内部整理</option><option>可公开展示</option></select></label><label>校核状态<select name="review"><option>待复核</option><option>已与讲述者核对</option><option>待补充来源</option></select></label><button class="button button-dark button-small form-submit" type="submit">保存到本机手记 ↗</button></form></section>
      <aside class="notes-panel"><h2>本机手记簿</h2><p>${noteItems.length} 则 · 当前设备本地保存</p><div class="workshop-button-row" style="margin:0 0 10px"><button class="button button-plain button-small" type="button" data-export-notes>导出 JSON ↗</button><button class="button button-plain button-small" type="button" data-clear-notes>清空手记</button></div><div id="notes-list">${renderNotesList()}</div></aside></div>
    </div>`;
  }

  function renderNotesList() {
    if(!noteItems.length)return `<div class="empty-panel"><div><strong>还没有手记</strong>记录会保存在这台设备的浏览器中。</div></div>`;
    return noteItems.map(item=>`<article class="field-note-item"><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.type)} · ${escapeHtml(item.place||"未填写地点")} · ${new Date(item.created).toLocaleDateString("zh-CN")}</small><p>${escapeHtml(item.body)}</p><small>授权：${escapeHtml(item.consent)} · 校核：${escapeHtml(item.review)}${item.source?` · 来源：${escapeHtml(item.source)}`:""}</small><div class="field-note-actions"><button type="button" data-delete-note="${escapeHtml(item.id)}">删除</button></div></article>`).join("");
  }

  function renderSaved() {
    const savedPatterns=[...saved].filter(id=>id.startsWith("pattern-")).map(id=>patternById.get(id.slice(8))).filter(Boolean);
    const savedStories=[...saved].filter(id=>id.startsWith("story-")).map(id=>stories.find(item=>item.id===id.slice(6))).filter(Boolean);
    const savedGroups=[...saved].filter(id=>id.startsWith("group-"));
    const empty=!savedPatterns.length&&!savedStories.length&&!savedGroups.length;
    return `<div class="page-wrap">${pageHeading("本机保存 · 不同步到服务器", "我的收藏", "收藏的纹样、故事与名录卡保存在当前浏览器设备。清理浏览器数据后，本机收藏可能会被移除。", `<strong>${saved.size} 个收藏条目</strong>收藏使用浏览器本地存储；不同设备之间不会同步。`)}${empty?`<div class="empty-panel" style="min-height:260px"><div><strong>这里暂时空着</strong>去纹样档案、民族索引或山水故事，收藏感兴趣的内容。<div class="workshop-button-row" style="justify-content:center"><a class="button button-dark button-small" href="#/archive">浏览纹样</a><a class="button button-plain button-small" href="#/stories">阅读故事</a></div></div></div>`:`${savedPatterns.length?`<h2 class="section-kicker">纹样样稿 <small>${savedPatterns.length} 枚</small></h2><div class="pattern-grid">${savedPatterns.map(patternCard).join("")}</div>`:""}${savedStories.length?`<h2 class="section-kicker">山水故事 <small>${savedStories.length} 篇</small></h2><div class="story-grid">${savedStories.map(item=>`<article class="story-card"><a href="#/stories/${item.id}"><div class="story-card-image"><img src="${img(item.image)}" alt="${escapeHtml(item.title)} AI 概念插画"></div><div class="story-card-body"><h3>${item.title}</h3><p>${item.summary}</p></div></a></article>`).join("")}</div>`:""}${savedGroups.length?`<h2 class="section-kicker">名录卡片 <small>${savedGroups.length} 项</small></h2><div class="people-grid">${savedGroups.map(id=>`<button class="people-card" data-group="${escapeHtml(id.slice(6))}" type="button"><span class="people-card-top"><h3>${escapeHtml(id.slice(6))}</h3></span><p>云南常住少数民族名录</p><span class="group-open">查看记录字段 ↗</span></button>`).join("")}</div>`:""}`}<div class="home-caution"><span>⌂</span><p>收藏只储存内容编号，不会上传浏览记录。</p></div></div>`;
  }

  function renderAbout() {
    return `<div class="page-wrap"> <section class="about-hero"><div class="about-hero-copy"><p class="eyebrow">ARCHIVE PRINCIPLES · 档案与边界</p><h1>先尊重语境，<br>再谈数字创新。</h1><p>这是一座纯静态文化展览原型。它展示资料如何被组织、地图如何标注、故事如何引用，也明确区分事实资料与概念插画。</p></div><div class="about-hero-art"><img src="${img("indigo-dye.jpg")}" alt="靛蓝染色过程的 AI 概念插画"></div></section>
      <h2 class="section-kicker">本展使用了什么 <small>静态素材与交互范围</small></h2><div class="about-columns"><article class="about-card"><h2>资料与地图</h2><p>云南常住少数民族名录按云南省民族宗教事务委员会公开资料整理。地图使用本地 GeoJSON 绘制云南 16 个地级行政单元的真实边界。边界数据仅作地理展示，不作测绘用途。</p><p>红河哈尼梯田专题采用 UNESCO 遗产页面的公开介绍。其他没有明确资料支撑的文化点位、民族分布和传统含义，不做臆测。</p></article><article class="about-card"><h2>视觉素材清单</h2><p>本展共有 60 张本地图片素材：50 张原创 SVG 形态样稿，以及 10 张 AI 生成的概念插画。生成插画用于视觉叙事，不代表实地拍摄、具体民族服饰、建筑或真实工艺记录。</p><ul><li>山地梯田、水渠与山谷村寨概念图</li><li>织机、靛蓝染色、竹编与陶艺过程概念图</li><li>50 枚未定族属的原创数字纹样</li></ul></article></div>
      <h2 class="section-kicker">原创概念插画 <small>10 幅 · 均非实地记录</small></h2><div class="concept-gallery">${[["hero-terraces.jpg","云雾梯田"],["water-channels.jpg","田间水渠"],["mountain-water-village.jpg","山谷聚落"],["handloom.jpg","织机与经纬"],["indigo-dye.jpg","靛蓝染色"],["basket-weaving.jpg","竹编过程"],["pottery-workshop.jpg","陶艺工作台"],["archive-workbench.jpg","档案整理"],["mountain-bridge.jpg","山地桥梁"],["silver-work.jpg","金工操作"]].map(([file,title])=>`<figure class="concept-card"><img loading="lazy" src="${img(file)}" alt="${title}的 AI 概念插画"><figcaption><strong>${title}</strong><span>AI 概念插画</span></figcaption></figure>`).join("")}</div>
      <h2 class="section-kicker">资料处理原则 <small>四个不能省略的步骤</small></h2><div class="ethics-grid"><article class="ethics-item"><span>01</span><strong>交代来路</strong><p>保留来源、采集者、日期、地点及资料版本。</p></article><article class="ethics-item"><span>02</span><strong>取得许可</strong><p>公开人物影像和社区知识前，明确说明使用范围。</p></article><article class="ethics-item"><span>03</span><strong>社区校核</strong><p>确认名称、翻译、解释与是否适宜公开。</p></article><article class="ethics-item"><span>04</span><strong>持续修订</strong><p>记录修改依据，为撤回或更新留出路径。</p></article></div>
      <h2 class="section-kicker">可核查来源 <small>公开一手资料</small></h2><div class="source-list"><a href="${sourceYunnan}" target="_blank" rel="noreferrer"><b>↗</b><span><strong>云南省民族宗教事务委员会 · 云南民族概况公开资料</strong><br>云南常住少数民族名录来源。当前页面依据公开名单整理，不用于推断各民族分布。</span></a><a href="${sourceUnesco}" target="_blank" rel="noreferrer"><b>↗</b><span><strong>UNESCO World Heritage Centre · Honghe Hani Rice Terraces</strong><br>红河哈尼梯田世界遗产介绍、景观系统与水渠资料来源。</span></a><a href="${sourceMap}" target="_blank" rel="noreferrer"><b>↗</b><span><strong>阿里云 DataV GeoAtlas · 云南 530000 行政区 GeoJSON</strong><br>本地地图边界数据来源，2026-10-22 下载；地图展示不用于测绘或政策决策。</span></a></div>
      <div class="home-caution"><span>ⓘ</span><p><strong>技术范围：</strong>无服务器、无登录、无远程数据接口；搜索、地图、三维模型、收藏、手记和 SVG 导出均由浏览器本地运行。地图边界已随站点打包，可从本地静态服务器离线查看。</p></div>
    </div>`;
  }

  function parseRoute() {
    const path=decodeURIComponent(location.hash.replace(/^#\/?/,""));
    const parts=path.split("/").filter(Boolean);
    if(!parts.length)return {page:"home"};
    if(parts[0]==="stories"&&parts[1])return {page:"stories",storyId:parts[1]};
    return {page:pageNames[parts[0]]?parts[0]:"home"};
  }

  function render() {
    if(modelCleanup){modelCleanup();modelCleanup=null;}
    currentRoute=parseRoute();
    const page=currentRoute.page;
    const view=page==="home"?renderHome():page==="map"?renderMap():page==="peoples"?renderPeoples():page==="stories"?(currentRoute.storyId?renderStoryDetail(currentRoute.storyId):renderStories()):page==="archive"?renderArchive():page==="model"?renderModel():page==="workshop"?renderWorkshop():page==="fieldnotes"?renderFieldNotes():page==="saved"?renderSaved():renderAbout();
    root.innerHTML=view;
    $$("[data-nav]").forEach(link=>link.classList.toggle("is-active",link.dataset.nav===page));
    $("#breadcrumb-current").textContent=currentRoute.storyId?(stories.find(item=>item.id===currentRoute.storyId)?.title||"山水故事"):pageNames[page]||"序厅";
    document.title=`${currentRoute.storyId?(stories.find(item=>item.id===currentRoute.storyId)?.title||"山水故事"):pageNames[page]} · 云岭民族文化数字图谱`;
    updateSavedCount();
    document.body.classList.remove("nav-open");
    $("#mobile-menu").setAttribute("aria-expanded","false");
    $("#rail-scrim").hidden=true;
    if(dialog.open)dialog.close();
  }

  function showDialog() { if(!dialog.open)dialog.showModal(); }

  function exportGroups() {
    const csv="民族名称,名录性质,资料状态\r\n"+groups.map(name=>`"${name}","云南常住少数民族名录","待社区参与与来源核校"`).join("\r\n");
    saveBlob("云南常住少数民族名录.csv","\ufeff"+csv,"text/csv;charset=utf-8");
  }

  function exportNotes() {
    saveBlob("云岭田野手记-本地导出.json",JSON.stringify({exportedAt:new Date().toISOString(),scope:"仅用户当前设备的本地手记",notes:noteItems},null,2),"application/json;charset=utf-8");
  }

  function openGlobalSearch() {
    dialogContent.innerHTML=`<div class="global-search-dialog"><p class="eyebrow">SEARCH THE ARCHIVE · 本地搜索</p><h2 id="dialog-title">搜索展览内容</h2><label class="search-input-wrap"><span>⌕</span><input id="global-search-input" type="search" placeholder="输入民族名称、故事、纹样…" autocomplete="off"></label><div class="global-search-results" id="global-search-results"><a class="global-search-result" href="#/map"><span>地图漫游 · 云南真实行政区边界</span><b>↗</b></a><a class="global-search-result" href="#/model"><span>三维展厅 · 红河梯田概念模型</span><b>↗</b></a><a class="global-search-result" href="#/peoples"><span>民族索引 · 25 个常住少数民族</span><b>↗</b></a></div></div>`;
    showDialog();
    $("#global-search-input")?.focus();
  }

  function performGlobalSearch(query) {
    const target=$("#global-search-results");if(!target)return;
    const q=query.trim().toLowerCase();
    if(!q){target.innerHTML=`<a class="global-search-result" href="#/map"><span>地图漫游 · 云南真实行政区边界</span><b>↗</b></a><a class="global-search-result" href="#/model"><span>三维展厅 · 红河梯田概念模型</span><b>↗</b></a><a class="global-search-result" href="#/peoples"><span>民族索引 · 25 个常住少数民族</span><b>↗</b></a>`;return;}
    const hits=[];
    groups.filter(name=>name.toLowerCase().includes(q)).forEach(name=>hits.push({type:"group",title:name,sub:"云南常住少数民族名录",name}));
    stories.filter(item=>`${item.title} ${item.summary} ${item.category}`.toLowerCase().includes(q)).forEach(item=>hits.push({type:"story",title:item.title,sub:item.category,route:`#/stories/${item.id}`}));
    records.filter(item=>`${item.title} ${item.family} ${item.id}`.toLowerCase().includes(q)).forEach(item=>hits.push({type:"pattern",title:item.title,sub:`纹样样稿 ${item.id} · ${item.family}`,id:item.id}));
    const views=[...Object.entries(pageNames).map(([key,title])=>({title,route:`#/${key}`,sub:"展览页面"})),{title:"红河哈尼梯田",route:"#/stories/hani-water",sub:"山水专题"}].filter(item=>item.title.toLowerCase().includes(q));
    views.forEach(item=>hits.push({type:"view",...item}));
    target.innerHTML=hits.length?hits.slice(0,24).map(item=>item.type==="group"?`<button class="global-search-result" type="button" data-search-group="${escapeHtml(item.name)}"><span>${escapeHtml(item.title)}<small> · ${escapeHtml(item.sub)}</small></span><b>↗</b></button>`:item.type==="pattern"?`<button class="global-search-result" type="button" data-search-pattern="${item.id}"><span>${escapeHtml(item.title)}<small> · ${escapeHtml(item.sub)}</small></span><b>↗</b></button>`:`<a class="global-search-result" href="${item.route}"><span>${escapeHtml(item.title)}<small> · ${escapeHtml(item.sub)}</small></span><b>↗</b></a>`).join(""):`<div class="empty-panel"><div><strong>没有找到匹配内容</strong>试试搜索“哈尼”“梯田”或“织”。</div></div>`;
  }

  function openPatternOrGroupFromSearch(event, kind) {
    const node=event.target.closest(kind==="pattern"?"[data-search-pattern]":"[data-search-group]");if(!node)return false;
    const value=kind==="pattern"?node.dataset.searchPattern:node.dataset.searchGroup;
    dialog.close();
    if(kind==="pattern")openPatternDialog(value);else openGroupDialog(value);
    return true;
  }

  function handleClick(event) {
    const target=event.target;
    const region=target.closest("[data-region]");
    if(region){updateMapSelection(region.dataset.region);return;}
    const group=target.closest("[data-group]");
    if(group){openGroupDialog(group.dataset.group);return;}
    const patternDetail=target.closest("[data-pattern-details]");
    if(patternDetail){openPatternDialog(patternDetail.dataset.patternDetails);return;}
    if(openPatternOrGroupFromSearch(event,"pattern")||openPatternOrGroupFromSearch(event,"group"))return;
    const patternSave=target.closest("[data-pattern-save]");
    if(patternSave){const id=patternSave.dataset.patternSave;const now=toggleSaved(`pattern-${id}`);patternSave.classList.toggle("is-saved",now);patternSave.textContent=patternSave.classList.contains("pattern-fav")?(now?"♥":"◇"):(now?"已收藏 ♥":"收藏这枚样稿 ◇");const card=$(`[data-pattern-card="${id}"] .pattern-fav`);if(card&&card!==patternSave){card.classList.toggle("is-saved",now);card.textContent=now?"♥":"◇";}if(archiveState.onlySaved)renderPatternCards();return;}
    const save=target.closest("[data-save]");
    if(save){const id=save.dataset.save;const now=toggleSaved(id);save.textContent=now?"已收藏 ♥":(id.startsWith("group-")?"收藏这张名录卡 ◇":"收藏这篇故事 ◇");return;}
    const family=target.closest("[data-family]");
    if(family){archiveState.family=family.dataset.family;render();return;}
    const palette=target.closest("[data-palette]");
    if(palette){archiveState.palette=palette.dataset.palette;render();return;}
    if(target.closest("[data-only-saved]")){archiveState.onlySaved=!archiveState.onlySaved;render();return;}
    if(target.closest("[data-random-pattern]")){const items=filteredPatterns();if(items.length)openPatternDialog(items[Math.floor(Math.random()*items.length)].id);return;}
    if(target.closest("[data-export-groups]")){exportGroups();return;}
    if(target.closest("[data-clear-group-search]")){const input=$("#group-search");if(input){input.value="";input.dispatchEvent(new Event("input",{bubbles:true}));}return;}
    if(target.closest("[data-workshop-add]")){const id=target.closest("[data-workshop-add]").dataset.workshopAdd;if(workshopState.selected.includes(id)){workshopState.selected=workshopState.selected.filter(item=>item!==id);}else if(workshopState.selected.length<6){workshopState.selected.push(id);}else notify("最多选择 6 枚形态样稿。");render();return;}
    if(target.closest("[data-workshop-remove]")){const id=target.closest("[data-workshop-remove]").dataset.workshopRemove;workshopState.selected=workshopState.selected.filter(item=>item!==id);render();return;}
    if(target.closest("[data-workshop-color]")){workshopState.color=target.closest("[data-workshop-color]").dataset.workshopColor;render();return;}
    if(target.closest("[data-workshop-random]")){workshopState.selected=[];while(workshopState.selected.length<3){const id=records[Math.floor(Math.random()*records.length)].id;if(!workshopState.selected.includes(id))workshopState.selected.push(id);}render();return;}
    if(target.closest("[data-workshop-clear]")){workshopState.selected=[];render();return;}
    if(target.closest("[data-workshop-export]")){exportComposition();return;}
    if(target.closest("[data-export-notes]")){exportNotes();return;}
    if(target.closest("[data-clear-notes]")){if(noteItems.length&&window.confirm("清空保存在本机浏览器中的全部手记？")){noteItems=[];localWrite("yunling-fieldnotes-v1",noteItems);render();notify("本机手记已清空。");}return;}
    const deleteNote=target.closest("[data-delete-note]");
    if(deleteNote){noteItems=noteItems.filter(item=>item.id!==deleteNote.dataset.deleteNote);localWrite("yunling-fieldnotes-v1",noteItems);render();notify("手记已删除。");return;}
    if(target.closest("[data-copy-link]")){if(navigator.clipboard?.writeText)navigator.clipboard.writeText(location.href).then(()=>notify("页面链接已复制。"),()=>notify("复制失败，请从地址栏复制链接。"));else notify("当前浏览器不支持复制链接，请从地址栏复制。");return;}
  }

  function handleInput(event) {
    if(event.target.id==="group-search"){
      const q=event.target.value.trim().toLowerCase();let count=0;
      $$(".people-card").forEach(card=>{const matches=card.dataset.group.toLowerCase().includes(q);card.hidden=!matches;if(matches)count++;});
      const label=$("#group-result-count");if(label)label.textContent=String(count);
    }
    if(event.target.id==="pattern-search"){archiveState.query=event.target.value;renderPatternCards();}
    if(event.target.id==="global-search-input")performGlobalSearch(event.target.value);
    if(event.target.matches("[data-workshop-repeat]")){workshopState.repeat=Number(event.target.value);event.target.nextElementSibling.value=String(workshopState.repeat);const host=$("#workshop-preview");if(host)host.innerHTML=compositionSvg();}
    if(event.target.matches("[data-workshop-scale]")){workshopState.scale=Number(event.target.value);event.target.nextElementSibling.value=`${Math.round(workshopState.scale*100)}%`;const host=$("#workshop-preview");if(host)host.innerHTML=compositionSvg();}
  }

  function handleChange(event) {
    if(event.target.id==="pattern-sort"){archiveState.sort=event.target.value;renderPatternCards();}
  }

  function handleSubmit(event) {
    if(event.target.id!=="field-note-form")return;
    event.preventDefault();
    const data=new FormData(event.target);
    const item={id:window.crypto?.randomUUID?.()||`${Date.now()}-${Math.random().toString(16).slice(2)}`,title:String(data.get("title")||""),type:String(data.get("type")||""),place:String(data.get("place")||""),source:String(data.get("source")||""),body:String(data.get("body")||""),consent:String(data.get("consent")||""),review:String(data.get("review")||""),created:new Date().toISOString()};
    noteItems=[item,...noteItems];localWrite("yunling-fieldnotes-v1",noteItems);render();notify("已保存在当前设备的浏览器中。");
  }

  root.addEventListener("click",handleClick);
  root.addEventListener("input",handleInput);
  root.addEventListener("change",handleChange);
  root.addEventListener("submit",handleSubmit);
  dialogContent.addEventListener("click",handleClick);
  dialogContent.addEventListener("input",event=>{if(event.target.id==="global-search-input")performGlobalSearch(event.target.value);});
  dialog.addEventListener("click",event=>{if(event.target.tagName==="A")dialog.close();});
  window.addEventListener("hashchange",render);
  $("#global-search").addEventListener("click",openGlobalSearch);
  $("#mobile-menu").addEventListener("click",()=>{document.body.classList.toggle("nav-open");const open=document.body.classList.contains("nav-open");$("#mobile-menu").setAttribute("aria-expanded",String(open));$("#rail-scrim").hidden=!open;});
  $("#rail-scrim").addEventListener("click",()=>{document.body.classList.remove("nav-open");$("#rail-scrim").hidden=true;$("#mobile-menu").setAttribute("aria-expanded","false");});
  document.addEventListener("keydown",event=>{if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==="k"){event.preventDefault();openGlobalSearch();}if(event.key==="Escape")document.body.classList.remove("nav-open");});
  render();
})();
