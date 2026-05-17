var rule = {
host: 'https://www.knvod.com/',
  headers: {
    "User-Agent": "MOBILE_UA",
    Cookie: "X-Robots-Tag=CDN-VERIFY",
  },
  编码: 'utf-8',
  timeout: 10000,
  url: '/show/fyclassfyfilter/',
  filter_url: '-{{fl.area}}-{{fl.by or "time"}}-{{fl.class}}-{{fl.lang}}-{{fl.letter}}---fypage---{{fl.year}}',
  searchUrl: '/daxiaoren/**----------fypage---/',
  searchable: 1,
  searchCookie: '',
  quickSearch: 1,
  filterable: 1,
  limit: 9,
  double: false,
  play_parse: true,
  class_name: '综艺',
  class_url: '4',
  推荐: '*',
  一级: 'body&&.public-list-box;a&&title;img&&data-src;.sBottom&&Text;a&&href',
  搜索: $js.toString(() => {
    function fetchCk() {
      for (var i = 0; i < 2; i++) {
        const yzm = HOST + "/index.php/verify/index.html";
        const yzmHtml = request(yzm, {
          withHeaders: true,
          toBase64: true,
          headers: rule.headers
        }, true);
        const yzmJson = JSON.parse(yzmHtml);

        const setCk = Object.keys(yzmJson).find(it => it.toLowerCase() === "set-cookie");
        const cookie = setCk ? yzmJson[setCk].split(";")[0] : "";
        if (!cookie) continue;
        console.log("cookie:" + cookie);

        const ocrHtml = post('https://api.nn.ci/ocr/b64/text', { body: yzmJson.body });
        if (!ocrHtml) continue;

        const submit_url = `${HOST}/index.php/ajax/verify_check?type=search&verify=${ocrHtml}`;
        const submitHtml = post(submit_url, {
          body: undefined,
          headers: {
            ...rule.headers,
            Cookie: `${rule.headers.Cookie}; ${cookie}`,
          },
        });
        const submitJson = JSON.parse(submitHtml)
        if (submitJson?.code !== 1) continue;

        rule.searchCookie = cookie;
      }
    }

    // 尝试获取
    if (!rule.searchCookie) {
      fetchCk();
      // 判断获取是否成功
      if (!rule.searchCookie) setResult([]);
    }

    // 之前获取的是否过期
    let contentHtml = request(input, {
      headers: {
        ...rule.headers,
        Cookie: `${rule.headers.Cookie}; ${rule.searchCookie}`
      },
    });
    if (contentHtml.includes('请输入验证码')) {
      // 过期数据置空
      rule.searchCookie = '';
      // 尝试获取
      fetchCk();
      // 判断获取是否成功
      if (!rule.searchCookie) setResult([]);

      contentHtml = request(input, {
        headers: {
          ...rule.headers,
          Cookie: `${rule.headers.Cookie}; ${rule.searchCookie}`
        },
      });
    }

    const list = pdfa(contentHtml, ".public-list-box");
    list.forEach(it => {
      d.push({
        title: pdfh(it, "a&&Text"),
        desc: pdfh(it, ".thumb-blurb&&Text"),
        pic_url: pdfh(it, "img&&data-src"),
        url: HOST + pdfh(it, "a&&href")
      })
    });
    setResult(d);
  }),
  二级: $js.toString(() => {
    let html = request(input);
    VOD = {};
    VOD.vod_id = input;
    VOD.vod_name = pdfh(html, '.slide-info-title.hide&&Text');
    VOD.type_name = pdfh(html, 'li:contains(备注)&&Text').replace('备注：', ' ');
    VOD.vod_pic = pd(html, '', input);
    VOD.vod_remarks = pdfh(html, 'li:contains(更新)&&Text').replace('更新：', ' ');
    VOD.vod_year = pdfh(html, 'li:contains(年份)&&Text').replace('年份：', ' ');
    VOD.vod_area = pdfh(html, 'li:contains(地区)&&Text').replace('地区：', ' ');
    VOD.vod_director = pdfh(html, 'li:contains(导演)&&Text').replace('导演：', ' ');
    VOD.vod_actor = pdfh(html, 'li:contains(演员)&&Text').replace('演员：', ' ');
    VOD.vod_content = '祝您观影愉快！现为您介绍剧情:' + pdfh(html, 'li:contains(简介)&&Text').replace('简介：', ' ');
    let r_ktabs = pdfa(html, '.nav-swiper&&a');
    let ktabs = r_ktabs.map(it => '💢' + pdfh(it, 'Text').replace("播放源", " 极速云播").replace("电影", " 高清一线"));
    VOD.vod_play_from = ktabs.join('$$$');
    let klists = [];
    let r_plists = pdfa(html, 'body&&.anthology-list-box');
    r_plists.forEach((rp) => {
      let klist = pdfa(rp, 'body&&a').reverse().map((it) => {
        return pdfh(it, 'a&&Text').replace("展开全部", "👉 ") + '$' + pd(it, 'a&&href', input);
      });
      klist = klist.join('#');
      klists.push(klist);
    });
    VOD.vod_play_url = klists.join('$$$');
  }),
  lazy: $js.toString(() => {
    try {
      const html = request(input);
      const title = pdfh(html, 'title&&Text');
      const player_aaaa = JSON.parse(/var player_aaaa=({[^;]+})/.exec(html)[1]);
      const parseUrl = `https://yyds.cdnjson.xyz/bfjson.php?url=${player_aaaa.url}&next=//&title=${title}`;
      const parseHtml = request(parseUrl);
      const newUrl = /"url":"([^"]*)",/i.exec(parseHtml)[1];
      const pbgjz = /"pbgjz":"([^"]*)",/i.exec(parseHtml)[1];
      const dmkey = /"dmkey":"([^"]*)",/i.exec(parseHtml)[1];
      const key = CryptoJS.SHA256(`${Math.floor(Date.now() / 3600000) * 3600}knvod`).toString(CryptoJS.enc.Hex);
      const res = JSON.parse(post('https://yyds.cdnjson.xyz/post.php', {
        data: {
          url: newUrl,
          pbgjz,
          dmkey,
          key
        }
      }));
      if (res.knvod) {
        input = { parse: 0, url: res.knvod, type: res.type }
      } else {
        input = {
          parse: 1,
          url: parseUrl,
          parse_extra: `&init_script=${encodeURIComponent(base64Encode('document.querySelector(".art-state").click()'))}&custom_regex=tos&sniffer_exclude=20250102102756054`
        };
      }
    } catch {
      input = {
        parse: 1,
        url: input,
        parse_extra: `&init_script=${encodeURIComponent(base64Encode('document.querySelector(".art-state").click()'))}&custom_regex=tos&sniffer_exclude=20250102102756054`
      };
    }
  }),
}
