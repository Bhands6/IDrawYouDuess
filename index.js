'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const { Server } = require('socket.io');

const PORT = Number(process.env.PORT) || 80;
const TOTAL = 80;          // 每轮时长（秒）
const MAX_STROKES = 240;   // 服务端最多保留的笔画（防内存膨胀）
const BOT_COUNT = 3;       // 只有 1 个真人时自动补几个陪玩
const OFFLINE_TTL = 3 * 60 * 1000;   // 离线超过 3 分钟就从玩家榜移除

/* ============================================================
   静态文件服务
   ============================================================ */
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
};

function handler(req, res) {
  let url = '/';
  try {
    url = decodeURIComponent(req.url.split('?')[0]);
  } catch (_) {
    url = '/';
  }
  if (url === '/') url = '/index.html';

  const file = path.normalize(path.join(__dirname, url));
  // 防止穿越到项目目录之外
  if (file.indexOf(__dirname) !== 0) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('403 Forbidden');
  }

  fs.readFile(file, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('404 Not Found: ' + url);
    }
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-cache'
    });
    res.end(data);
  });
}

const server = http.createServer(handler);
const io = new Server(server, {
  pingInterval: 20000,
  pingTimeout: 15000
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('开启socket.io  ->  http://localhost:' + PORT);
});

/* ============================================================
   词库 / 常量
   ============================================================ */
const WORDS = [
  // 水果
  { word: '西瓜', cat: '水果', hint: '夏天的解暑神器，切开是红的' },
  { word: '苹果', cat: '水果', hint: '红的或青的，咬一口很脆' },
  { word: '香蕉', cat: '水果', hint: '黄色的，弯弯的，要剥皮' },
  { word: '葡萄', cat: '水果', hint: '一串一串的，紫的或绿的' },
  // 运动
  { word: '篮球', cat: '运动', hint: '橙色的球，往篮筐里扔' },
  { word: '足球', cat: '运动', hint: '黑白拼块，用脚踢' },
  { word: '网球', cat: '运动', hint: '黄色小球，有拍子有网' },
  { word: '游泳', cat: '运动', hint: '在水里往前划' },
  // 自然
  { word: '太阳', cat: '自然', hint: '白天挂在天上，很刺眼' },
  { word: '月亮', cat: '自然', hint: '晚上出来，会变胖变瘦' },
  { word: '雪人', cat: '自然', hint: '冬天堆出来的朋友，会化' },
  { word: '彩虹', cat: '自然', hint: '雨后的七色桥' },
  // 物品
  { word: '眼镜', cat: '物品', hint: '架在鼻梁上，帮你看清黑板' },
  { word: '雨伞', cat: '物品', hint: '下雨天撑开的半圆' },
  { word: '剪刀', cat: '物品', hint: '两片刀交叉，咔嚓' },
  { word: '闹钟', cat: '物品', hint: '早上把你叫醒' },
  { word: '气球', cat: '物品', hint: '吹起来会飘走' },
  { word: '风筝', cat: '物品', hint: '有风才飞得起来' },
  { word: '相机', cat: '物品', hint: '咔嚓一下留下画面' },
  // 科技
  { word: '火箭', cat: '科技', hint: '倒数三秒，一飞冲天' },
  { word: '手机', cat: '科技', hint: '随身带，屏幕会亮' },
  { word: '灯泡', cat: '科技', hint: '拧上去就发光' },
  { word: '飞机', cat: '科技', hint: '在天上飞，有两片翅膀' },
  // 美食
  { word: '冰淇淋', cat: '美食', hint: '夏天会融化的甜品' },
  { word: '汉堡', cat: '美食', hint: '两片面包夹着肉饼' },
  { word: '蛋糕', cat: '美食', hint: '过生日会插蜡烛' },
  { word: '包子', cat: '美食', hint: '白白的，带褶，蒸出来的' },
  // 交通
  { word: '自行车', cat: '交通', hint: '两个轮子，靠脚踩' },
  { word: '火车', cat: '交通', hint: '一节一节，走铁轨' },
  { word: '轮船', cat: '交通', hint: '在水上跑，个头很大' },
  { word: '滑板', cat: '交通', hint: '一块板加四个轮子' },
  // 动物
  { word: '章鱼', cat: '动物', hint: '住在海里，有八条腿' },
  { word: '恐龙', cat: '动物', hint: '很久以前的大块头' },
  { word: '熊猫', cat: '动物', hint: '黑白两色，爱吃竹子' },
  { word: '蝴蝶', cat: '动物', hint: '翅膀有花纹，会飞' },
  { word: '螃蟹', cat: '动物', hint: '横着走，有两只大钳子' },
  { word: '乌龟', cat: '动物', hint: '背着壳，走得很慢' },
  // 建筑
  { word: '灯塔', cat: '建筑', hint: '站在海边，夜里发光指路' },
  { word: '城堡', cat: '建筑', hint: '有尖塔和护城河' },
  { word: '房子', cat: '建筑', hint: '有屋顶和门，人住里面' },
  { word: '桥', cat: '建筑', hint: '跨过河，把两岸连起来' },
  // 乐器
  { word: '吉他', cat: '乐器', hint: '六根弦，抱着弹' },
  { word: '钢琴', cat: '乐器', hint: '一排黑白键' },
  { word: '鼓', cat: '乐器', hint: '敲的，咚咚响' },
  { word: '小提琴', cat: '乐器', hint: '架在肩上用弓拉' },
  // 饮品
  { word: '咖啡', cat: '饮品', hint: '苦的，喝了提神' },
  { word: '奶茶', cat: '饮品', hint: '插着吸管，底下有珍珠' },
  { word: '啤酒', cat: '饮品', hint: '黄色带泡沫，倒在杯子里' },
  { word: '牛奶', cat: '饮品', hint: '白色的，盒装或瓶装' }
];

const WRONG_POOL = [
  '苹果', '香蕉', '太阳', '猫', '火箭', '冰淇淋', '自行车', '篮球', '眼镜', '章鱼',
  '恐龙', '雪人', '灯塔', '饺子', '老虎', '气球', '吉他', '面包', '螃蟹', '城堡',
  '云朵', '菠萝', '铅笔', '大树', '星星'
];

const COLORS = ['#FF5A45', '#2E5BFF', '#FFC53D', '#2FCB8B', '#FF8FB1', '#FF8A3D', '#7C5CFF', '#0093A8'];
const NAME_POOL = ['小满', '阿橘', 'Kiki', '大熊', '豆豆', '阿布', '团子', '小鹿', '火柴', '奶油'];

/* ============================================================
   房间状态
   ============================================================ */
const state = {
  round: 0,
  phase: 'waiting',      // waiting | idle | drawing | revealed
  drawerKey: null,
  word: '',
  cat: '',
  hint: '',
  revealed: 0,
  timeLeft: TOTAL,
  timeLimit: TOTAL,      // 每轮时长，画手可改
  timerRunning: false,
  timer: null,
  strokes: [],
  guessed: new Set(),
  nextVotes: new Set(),   // 本轮结束后，按了「请求下一轮」的猜图者
  hintAsks: new Set(),    // 本轮里请求过提示、还没被响应的猜图者
  resetAsks: new Set(),   // 请求过重开一局的猜图者
  botTimers: [],
  lastWinner: ''
};

const players = new Map();   // key -> player
const sockets = new Map();   // socket.id -> key
const joinOrder = [];        // 真人加入顺序（用于轮换画手）

/* ============================================================
   小工具
   ============================================================ */
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

function normalizeName(n) {
  return String(n || '').replace(/[<>&"'`\\/]/g, '').trim().slice(0, 12);
}

function isNameTaken(name, exceptKey) {
  for (const p of players.values()) {
    if (p.name === name && p.key !== exceptKey) return true;
  }
  return false;
}

function uniqueName(base, exceptKey) {
  let n = normalizeName(base) || '玩家';
  if (!isNameTaken(n, exceptKey)) return n;
  for (let i = 2; i < 99; i++) {
    const t = n + i;
    if (!isNameTaken(t, exceptKey)) return t;
  }
  return n + Math.random().toString(36).slice(2, 5);
}

function freeColor() {
  const used = new Set([...players.values()].map(p => p.color));
  return COLORS.find(c => !used.has(c)) || pick(COLORS);
}

function nameOf(key) {
  const p = players.get(key);
  return p ? p.name : '';
}

// 只给当前画手推送一条界面提示（猜图者不会收到）
function emitToDrawer(event, payload) {
  const dkey = state.drawerKey;
  if (!dkey) return;
  for (const [sid, k] of sockets) {
    if (k !== dkey) continue;
    const s = io.sockets.sockets.get(sid);
    if (s) s.emit(event, payload);
  }
}

function onlineHumans() {
  return joinOrder.filter(k => {
    const p = players.get(k);
    return p && !p.bot && p.online;
  });
}

/* ============================================================
   机器人陪玩：房间里只有 1 个真人时才存在
   ============================================================ */
function botName() {
  const used = new Set([...players.values()].map(p => p.name));
  return NAME_POOL.find(n => !used.has(n)) || ('玩家' + (Math.floor(Math.random() * 90) + 10));
}

function syncBots() {
  const humans = onlineHumans().length;
  let bots = [...players.values()].filter(p => p.bot);

  // 房间没人了就不留 AI 占位
  if (humans === 0) {
    bots.forEach(b => players.delete(b.key));
    return;
  }

  const need = humans === 1 ? BOT_COUNT : 0;

  if (need === 0) {
    bots.forEach(b => players.delete(b.key));
    return;
  }

  let guard = 0;
  while ([...players.values()].filter(p => p.bot).length < need && guard++ < 20) {
    const key = 'bot:' + Math.random().toString(36).slice(2, 8);
    players.set(key, {
      key,
      name: uniqueName(botName()),
      score: 40 + Math.floor(Math.random() * 70),
      color: freeColor(),
      bot: true,
      online: true
    });
  }
}

function clearBotTimers() {
  state.botTimers.forEach(clearTimeout);
  state.botTimers = [];
}

// 清掉长时间不回来的玩家，避免玩家榜越堆越长
function sweepOffline() {
  const now = Date.now();
  let dirty = false;

  for (const [key, p] of [...players]) {
    if (p.bot || p.online) continue;
    if (p.offlineAt && now - p.offlineAt > OFFLINE_TTL) {
      players.delete(key);
      const i = joinOrder.indexOf(key);
      if (i >= 0) joinOrder.splice(i, 1);
      dirty = true;
    }
  }

  if (dirty) {
    syncBots();
    // 被清掉的正好是画手 → 立刻重开一轮，别让房间停在空转状态
    if (state.drawerKey && !players.has(state.drawerKey)) {
      if (onlineHumans().length) {
        beginRound();
      } else {
        state.drawerKey = null;
        state.phase = 'waiting';
      }
    }
    broadcastState();
  }
}

setInterval(sweepOffline, 60 * 1000).unref();

function botGuess(key, text, hit) {
  const p = players.get(key);
  if (!p) return;
  io.emit('feed', { name: p.name, color: p.color, text, hit: !!hit });
  if (hit) endRound(key);
}

function scheduleBots() {
  clearBotTimers();
  const bots = [...players.values()].filter(p => p.bot);
  if (!bots.length || !state.drawerKey) return;

  const keys = bots.map(b => b.key);
  const wrongs = WRONG_POOL.filter(w => w !== state.word);

  state.botTimers.push(setTimeout(() => {
    if (state.phase !== 'drawing') return;
    io.emit('feed:sys', '提示：这个词有 ' + [...state.word].length + ' 个字');
  }, 12000));

  for (let i = 0; i < 6; i++) {
    state.botTimers.push(setTimeout(() => {
      if (state.phase !== 'drawing') return;
      botGuess(pick(keys), pick(wrongs), false);
    }, 5000 + i * 7000 + Math.random() * 2500));
  }

  state.botTimers.push(setTimeout(() => {
    if (state.phase !== 'drawing') return;
    botGuess(pick(keys), state.word, true);
  }, 26000 + Math.random() * 18000));
}

/* ============================================================
   状态广播
   ============================================================ */
function viewFor(socketId) {
  const key = sockets.get(socketId) || null;
  const isDrawer = !!key && key === state.drawerKey;
  const chars = [...state.word];
  const drawerPlayer = state.drawerKey ? players.get(state.drawerKey) : null;

  return {
    you: key,
    isDrawer,
    round: state.round,
    phase: state.phase,
    drawerKey: state.drawerKey,
    drawerName: nameOf(state.drawerKey),
    drawerOnline: !!(drawerPlayer && drawerPlayer.online),
    guesserCount: [...players.values()].filter(p => p.online && !p.bot && p.key !== state.drawerKey).length,
    word: isDrawer ? state.word : '',
    cat: state.cat,          // 分类是公开线索，双方都看得到
    // 只有题目保密；提示是给所有人看的线索
    hintText: state.hint,
    len: chars.length,
    revealed: state.revealed,
    mask: chars.map((c, i) => (i < state.revealed ? c : '')),
    timeLeft: state.timeLeft,
    total: state.timeLimit,
    running: state.timerRunning,
    lastWord: state.phase === 'revealed' ? state.word : '',
    lastWinner: state.phase === 'revealed' ? state.lastWinner : '',
    nextVotes: [...state.nextVotes],
    hintAsked: !!key && state.hintAsks.has(key),
    hintAskCount: state.hintAsks.size,
    resetAsked: !!key && state.resetAsks.has(key),
    resetAskCount: state.resetAsks.size,
    // 玩家榜只下发在线的人；离线玩家保留在服务端（等重连恢复分数），但不占榜
    players: [...players.values()].filter(p => p.online).map(p => ({
      key: p.key,
      name: p.name,
      score: p.score,
      color: p.color,
      bot: p.bot,
      online: p.online,
      drawer: p.key === state.drawerKey
    }))
  };
}

function broadcastState() {
  io.sockets.sockets.forEach(s => s.emit('state', viewFor(s.id)));
}

/* ============================================================
   回合流程
   ============================================================ */
// 画手位是否已经被一个在线的人占着（自己不算）
function drawerBusy(key) {
  const d = state.drawerKey ? players.get(state.drawerKey) : null;
  return !!(d && d.online && state.drawerKey !== key);
}

function beginRound() {
  clearInterval(state.timer);
  state.timer = null;
  clearBotTimers();

  state.strokes = [];
  state.guessed.clear();
  state.nextVotes.clear();
  state.hintAsks.clear();
  state.revealed = 0;
  state.timeLeft = state.timeLimit;
  state.timerRunning = false;
  state.lastWinner = '';

  // 画手由玩家入场时自己选，这里只校验他还占着位置
  const d = state.drawerKey ? players.get(state.drawerKey) : null;
  if (!d || !d.online) state.drawerKey = null;

  const prev = state.word;
  let w;
  do {
    w = pick(WORDS);
  } while (WORDS.length > 1 && w.word === prev);
  state.word = w.word;
  state.cat = w.cat;
  state.hint = '';          // 词库题的提示语不参与游戏，避免直接泄底

  state.round++;
  state.phase = state.drawerKey ? 'idle' : 'waiting';

  io.emit('canvas:init', []);
  broadcastState();

  if (state.drawerKey) {
    io.emit('feed:sys', '第 ' + state.round + ' 轮开始，「' + nameOf(state.drawerKey) + '」执笔');
  } else {
    io.emit('feed:sys', '画手位空着，谁来接一下画笔？');
  }
}

// 同一画手、同一题目重画一张
function retryRound() {
  clearInterval(state.timer);
  state.timer = null;
  clearBotTimers();
  state.strokes = [];
  state.guessed.clear();
  state.revealed = 0;
  state.timeLeft = state.timeLimit;
  state.timerRunning = false;
  state.phase = state.drawerKey ? 'idle' : 'waiting';

  io.emit('canvas:init', []);
  broadcastState();
  io.emit('feed:sys', '画布已重置，同一道题再来一次');
}

function runTimer() {
  clearInterval(state.timer);
  state.timer = setInterval(() => {
    state.timeLeft--;
    if (state.timeLeft <= 0) {
      state.timeLeft = 0;
      endRound(null);
      return;
    }
    io.emit('tick', { timeLeft: state.timeLeft, total: state.timeLimit });
  }, 1000);
}

function startTimer() {
  if (state.timerRunning || state.phase === 'revealed' || !state.drawerKey) return;
  state.timerRunning = true;
  state.phase = 'drawing';
  scheduleBots();

  runTimer();

  io.emit('tick', { timeLeft: state.timeLeft, total: state.timeLimit });
  broadcastState();
}

function endRound(winnerKey) {
  if (state.phase === 'revealed') return;

  clearInterval(state.timer);
  state.timer = null;
  state.timerRunning = false;
  clearBotTimers();
  state.phase = 'revealed';
  state.nextVotes.clear();
  state.hintAsks.clear();

  const drawer = players.get(state.drawerKey);
  let drawerBonus = 0;
  state.lastWinner = winnerKey ? nameOf(winnerKey) : '';

  if (winnerKey && players.has(winnerKey)) {
    players.get(winnerKey).score += 20;
    if (drawer) {
      drawer.score += 10;
      drawerBonus = 10;
    }
    io.emit('feed:sys', '答案是「' + state.word + '」，' + nameOf(winnerKey) + ' 抢答成功');
  } else {
    io.emit('feed:sys', '时间到，答案是「' + state.word + '」');
  }

  io.emit('round:end', {
    word: state.word,
    winner: winnerKey ? nameOf(winnerKey) : null,
    drawer: nameOf(state.drawerKey),
    drawerBonus
  });

  broadcastState();
}

/* ============================================================
   连接
   ============================================================ */
io.on('connection', (socket) => {
  // 未加入的访客也能看到画布进度
  socket.emit('canvas:init', state.strokes);
  socket.emit('state', viewFor(socket.id));

  socket.on('join', (payload) => {
    const rawKey = payload && payload.key ? String(payload.key) : '';
    const key = rawKey.replace(/[^a-zA-Z0-9:_-]/g, '').slice(0, 40) || ('anon-' + socket.id);

    let role = payload && payload.role === 'drawer' ? 'drawer' : 'guesser';
    let p = players.get(key);
    const wanted = normalizeName(payload && payload.name);

    // 画手位只有一个：被人占着就只能当猜图者
    if (role === 'drawer' && drawerBusy(key)) {
      role = 'guesser';
      socket.emit('toast', '画手位已经有人啦，先来猜吧');
    }

    if (!p) {
      p = {
        key,
        name: uniqueName(wanted || botName(), key),
        score: 0,
        color: freeColor(),
        bot: false,
        online: true,
        role
      };
      players.set(key, p);
      joinOrder.push(key);
      io.emit('feed:sys', '「' + p.name + '」' + (role === 'drawer' ? '拿起画笔入座' : '进来猜图'));
    } else {
      p.online = true;
      p.offlineAt = 0;
      p.role = role;
      if (wanted && wanted !== p.name) p.name = uniqueName(wanted, key);
    }

    sockets.set(socket.id, key);
    syncBots();
    socket.emit('joined', { key, name: p.name, role });
    // 中途进来的人也要看到已经画的东西
    socket.emit('canvas:init', state.strokes);

    // 「重开后等大家选身份」的中间态：不自动占画手位，也不自动开局
    const fresh = state.phase === 'revealed' && !state.word;

    if (role === 'drawer' && fresh) {
      broadcastState();
    } else if (role === 'drawer') {
      if (state.drawerKey === key && state.phase === 'revealed' && state.word) {
        // 画手刷新回来：题目和画布都还在，直接续上
        state.phase = 'idle';
        state.timerRunning = false;
        state.timeLeft = state.timeLimit;
        state.revealed = 0;
        state.guessed.clear();
        io.emit('feed:sys', '画手回来了，接着画');
        broadcastState();
      } else {
        state.drawerKey = key;
        beginRound();
      }
    } else {
      // 本来占着画手位却选了猜 → 让出来
      if (state.drawerKey === key) {
        state.drawerKey = null;
        if (state.phase !== 'revealed') state.phase = 'waiting';
      }
      broadcastState();
    }
  });

  // 画手位空着时，已经在房间里的人点「我来画」接手
  socket.on('take:drawer', () => {
    const key = sockets.get(socket.id);
    if (!key) return;
    if (state.drawerKey === key) {
      socket.emit('toast', '画笔已经在你手里啦');
      return;
    }
    if (drawerBusy(key)) {
      socket.emit('toast', '画手位已经有人啦');
      return;
    }
    const p = players.get(key);
    if (p) p.role = 'drawer';
    state.drawerKey = key;
    beginRound();
  });

  socket.on('rename', (name) => {
    const key = sockets.get(socket.id);
    const p = key ? players.get(key) : null;
    if (!p) return;
    const n = normalizeName(name);
    if (!n) return;
    p.name = uniqueName(n, key);
    broadcastState();
    socket.emit('toast', '昵称已改成「' + p.name + '」');
  });

  /* ---------- 画笔 ---------- */
  socket.on('stroke:start', (s) => {
    const key = sockets.get(socket.id);
    if (!key || key !== state.drawerKey || state.phase === 'revealed') return;
    if (!s || !s.point) return;

    const stroke = {
      id: String(s.id || ''),
      color: String(s.color || '#141118').slice(0, 20),
      size: Math.max(1, Math.min(60, Number(s.size) || 13)),
      erase: !!s.erase,
      points: [{ x: Number(s.point.x) || 0, y: Number(s.point.y) || 0 }]
    };
    if (!stroke.id) return;

    state.strokes.push(stroke);
    while (state.strokes.length > MAX_STROKES) state.strokes.shift();

    socket.broadcast.emit('stroke:start', stroke);
    if (!state.timerRunning) startTimer();
  });

  socket.on('stroke:points', (data) => {
    const key = sockets.get(socket.id);
    if (!key || key !== state.drawerKey) return;
    if (!data || !Array.isArray(data.points)) return;

    const stroke = state.strokes.find(s => s.id === data.id);
    if (!stroke) return;

    const pts = data.points.slice(0, 200).map(pt => ({
      x: Number(pt.x) || 0,
      y: Number(pt.y) || 0
    }));
    stroke.points.push(...pts);
    socket.broadcast.emit('stroke:points', { id: data.id, points: pts });
  });

  socket.on('stroke:end', (data) => {
    const key = sockets.get(socket.id);
    if (!key || key !== state.drawerKey) return;
    socket.broadcast.emit('stroke:end', { id: data && data.id });
  });

  socket.on('undo', () => {
    const key = sockets.get(socket.id);
    if (!key || key !== state.drawerKey || state.phase === 'revealed') return;
    if (!state.strokes.length) {
      socket.emit('toast', '已经是最开始的样子啦');
      return;
    }
    state.strokes.pop();
    io.emit('canvas:init', state.strokes);   // 全量重绘，最稳
  });

  socket.on('clear', () => {
    const key = sockets.get(socket.id);
    if (!key || key !== state.drawerKey || state.phase === 'revealed') return;
    state.strokes = [];
    io.emit('canvas:init', []);
    io.emit('feed:sys', '画手清空了画布');
  });

  /* ---------- 自定义题目 ---------- */
  // 画手可以把自己要画的东西改成任意词，改完清空画布重新计时
  socket.on('topic:set', (payload) => {
    const key = sockets.get(socket.id);
    if (!key || key !== state.drawerKey) {
      socket.emit('toast', '只有画手能改题目');
      return;
    }
    if (state.phase === 'revealed') {
      socket.emit('toast', '本轮已经结束了，先开下一轮');
      return;
    }

    const word = String((payload && payload.word) || '').replace(/\s+/g, ' ').trim().slice(0, 8);
    if (!word) {
      socket.emit('toast', '题目不能是空的');
      return;
    }
    const hint = String((payload && payload.hint) || '').replace(/\s+/g, ' ').trim().slice(0, 30);

    clearInterval(state.timer);
    state.timer = null;
    clearBotTimers();

    state.word = word;
    state.cat = '自定义';
    state.hint = hint;
    state.revealed = 0;
    state.guessed.clear();
    state.strokes = [];
    state.timeLeft = state.timeLimit;
    state.timerRunning = false;
    state.phase = 'idle';

    io.emit('canvas:init', []);
    broadcastState();
    io.emit('feed:sys', '画手把题目改成了「' + word + '」');
  });

  /* ---------- 提示 ---------- */
  // 猜图者只能「请求」提示，是否给由画手决定
  socket.on('hint:request', () => {
    const key = sockets.get(socket.id);
    if (!key) return;
    if (key === state.drawerKey) {
      socket.emit('toast', '你自己就能给提示呀');
      return;
    }
    if (state.phase === 'revealed') {
      socket.emit('toast', '这一轮已经结束了');
      return;
    }
    if (state.hintAsks.has(key)) {
      socket.emit('toast', '已经请求过啦，等画手');
      return;
    }

    state.hintAsks.add(key);
    io.emit('feed:sys', '「' + nameOf(key) + '」请求给个提示');
    emitToDrawer('notice', { text: nameOf(key) + ' 请求给个提示' });
    broadcastState();
  });

  socket.on('hint', () => {
    const key = sockets.get(socket.id);
    if (!key) return;
    if (key !== state.drawerKey) {
      socket.emit('toast', '只有画手能给提示，你可以先请求一下');
      return;
    }

    const chars = [...state.word];
    if (state.revealed >= chars.length - 1) {
      socket.emit('toast', '再提示就全露馅啦');
      return;
    }

    state.revealed++;
    const ch = chars[state.revealed - 1];
    state.hintAsks.clear();     // 响应过了，大家都重新可以请求

    // 第二次提示起，画手扣 5 分
    if (state.revealed > 1) {
      const d = players.get(state.drawerKey);
      if (d) d.score = Math.max(0, d.score - 5);
    }

    io.emit('hint', { index: state.revealed, ch });
    io.emit('feed:sys', '画手给了个提示：第 ' + state.revealed + ' 个字是「' + ch + '」');
    broadcastState();
  });

  /* ---------- 猜词 ---------- */
  socket.on('guess', (payload) => {
    const key = sockets.get(socket.id);
    if (!key) return;
    const p = players.get(key);
    if (!p) return;
    if (state.phase === 'revealed') return;

    const text = String((payload && payload.text) || '').trim().slice(0, 24);
    if (!text) return;

    // 画手发言：只当普通聊天，不参与判定
    if (key === state.drawerKey) {
      io.emit('feed', { name: p.name, color: p.color, text, hit: false, drawer: true });
      return;
    }

    if (state.guessed.has(key)) {
      socket.emit('toast', '你已经猜对啦，等下一轮吧');
      return;
    }

    if (text.toLowerCase() === state.word.toLowerCase()) {
      state.guessed.add(key);
      endRound(key);
      return;
    }

    io.emit('feed', { name: p.name, color: p.color, text, hit: false });
    if (!state.timerRunning && state.phase !== 'revealed') startTimer();
  });

  /* ---------- 本轮时长 ---------- */
  // 只有画手能改，15~300 秒
  socket.on('time:set', (payload) => {
    const key = sockets.get(socket.id);
    if (!key || key !== state.drawerKey) {
      socket.emit('toast', '只有画手能设时长');
      return;
    }

    let sec = Math.round(Number(payload && payload.seconds));
    if (!Number.isFinite(sec) || sec <= 0) return;
    sec = Math.max(15, Math.min(300, sec));

    state.timeLimit = sec;
    state.timeLeft = sec;

    // 正在画的话立刻按新时长继续跑
    if (state.timerRunning && state.phase === 'drawing') runTimer();

    io.emit('tick', { timeLeft: sec, total: sec });
    broadcastState();
    io.emit('feed:sys', '画手把本轮时长调成 ' + sec + ' 秒');
  });

  /* ---------- 回合控制 ---------- */
  // 本轮结束后，谁点「我来画」谁就是下一轮画手，并立即开局
  socket.on('next', () => {
    const key = sockets.get(socket.id);
    if (!key) return;
    if (state.phase !== 'revealed') {
      socket.emit('toast', '这一轮还没结束呢');
      return;
    }
    state.drawerKey = key;
    beginRound();
  });

  // 本轮结束后点「我来猜」：只登记意愿，等有人接画笔
  socket.on('next:request', () => {
    const key = sockets.get(socket.id);
    if (!key) return;
    if (state.phase !== 'revealed') {
      socket.emit('toast', '还没到选身份的时候');
      return;
    }
    if (state.nextVotes.has(key)) return;

    state.nextVotes.add(key);
    io.emit('feed:sys', '「' + nameOf(key) + '」准备猜下一轮');
    broadcastState();
  });

  socket.on('retry', () => {
    const key = sockets.get(socket.id);
    if (state.phase !== 'revealed') {
      socket.emit('toast', '这一轮还没结束呢');
      return;
    }
    if (key !== state.drawerKey) {
      socket.emit('toast', '只有画手能重画这一题');
      return;
    }
    retryRound();
  });

  // 重开一局 = 分数清零重来，只有画手能真正执行
  socket.on('reset:request', () => {
    const key = sockets.get(socket.id);
    if (!key) return;
    if (key === state.drawerKey) {
      socket.emit('toast', '你自己就能重开');
      return;
    }
    if (state.resetAsks.has(key)) {
      socket.emit('toast', '已经请求过啦，等画手');
      return;
    }
    state.resetAsks.add(key);
    io.emit('feed:sys', '「' + nameOf(key) + '」请求重开一局');
    emitToDrawer('notice', { text: nameOf(key) + ' 请求重开一局' });
    broadcastState();
  });

  socket.on('reset', () => {
    const key = sockets.get(socket.id);
    if (!key || key !== state.drawerKey) {
      socket.emit('toast', '只有画手能重开一局，你可以先请求');
      return;
    }

    clearInterval(state.timer);
    state.timer = null;
    clearBotTimers();

    players.forEach(p => {
      p.score = p.bot ? 40 + Math.floor(Math.random() * 70) : 0;
    });

    // 分数清零后回到「选身份」的收尾界面，不直接开新局
    state.round = 0;
    state.word = '';
    state.cat = '';
    state.hint = '';
    state.revealed = 0;
    state.strokes = [];
    state.timeLeft = state.timeLimit;
    state.timerRunning = false;
    state.lastWinner = '';
    state.drawerKey = null;
    state.phase = 'revealed';

    state.nextVotes.clear();
    state.hintAsks.clear();
    state.resetAsks.clear();

    io.emit('canvas:init', []);
    io.emit('feed:sys', '房间重开，分数已清零 — 重新选个身份吧');
    broadcastState();
  });

  /* ---------- 断开 ---------- */
  socket.on('disconnect', () => {
    const key = sockets.get(socket.id);
    sockets.delete(socket.id);
    if (!key) return;

    const stillOnline = [...sockets.values()].includes(key);
    const p = players.get(key);
    if (!stillOnline && p) {
      p.online = false;
      p.offlineAt = Date.now();
      // 人都走了，别把他的请求继续挂在画手按钮上
      state.hintAsks.delete(key);
      state.nextVotes.delete(key);
      state.resetAsks.delete(key);
    }

    // 画手掉线 → 本轮直接结算，避免全房间卡住
    if (!stillOnline && key === state.drawerKey && state.phase !== 'revealed') {
      endRound(null);
    }

    // 真人都走了就清掉陪玩，避免空房间堆垃圾
    if (onlineHumans().length === 0) {
      [...players.values()].filter(b => b.bot).forEach(b => players.delete(b.key));
    } else {
      syncBots();
    }

    broadcastState();
  });
});
