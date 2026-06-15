const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = 41120;

const DATA_DIR = path.join(__dirname, 'data');
const SECRETS_FILE = path.join(DATA_DIR, 'secrets.json');
const REPORTS_FILE = path.join(DATA_DIR, 'reports.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

if (!fs.existsSync(SECRETS_FILE)) {
  fs.writeFileSync(SECRETS_FILE, JSON.stringify([]));
}

if (!fs.existsSync(REPORTS_FILE)) {
  fs.writeFileSync(REPORTS_FILE, JSON.stringify([]));
}

app.use(cors());
app.use(express.json());

function readSecrets() {
  const data = fs.readFileSync(SECRETS_FILE, 'utf8');
  return JSON.parse(data);
}

function writeSecrets(secrets) {
  fs.writeFileSync(SECRETS_FILE, JSON.stringify(secrets, null, 2));
}

function readReports() {
  const data = fs.readFileSync(REPORTS_FILE, 'utf8');
  return JSON.parse(data);
}

function writeReports(reports) {
  fs.writeFileSync(REPORTS_FILE, JSON.stringify(reports, null, 2));
}

const REPORT_REASONS = [
  'spam',
  'inappropriate',
  'harassment',
  'violence',
  'other'
];

const REPORT_REASON_LABELS = {
  spam: '垃圾广告',
  inappropriate: '不当内容',
  harassment: '骚扰霸凌',
  violence: '暴力内容',
  other: '其他原因',
  process: '处理记录',
  restore: '恢复记录'
};

app.post('/api/secrets', (req, res) => {
  try {
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: '秘密内容不能为空' });
    }

    const secrets = readSecrets();
    const newSecret = {
      id: uuidv4(),
      content: content.trim(),
      status: '已宽恕',
      hidden: false,
      createdAt: new Date().toISOString()
    };

    secrets.push(newSecret);
    writeSecrets(secrets);

    res.json({
      success: true,
      message: '你的秘密已被宽恕',
      secret: newSecret
    });
  } catch (error) {
    console.error('保存秘密时出错:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

app.get('/api/secrets/random', (req, res) => {
  try {
    const secrets = readSecrets();
    const visibleSecrets = secrets.filter(s => s.status === '已宽恕' && !s.hidden);

    if (visibleSecrets.length === 0) {
      return res.json({
        hasSecret: false,
        message: '还没有被宽恕的秘密，成为第一个分享的人吧'
      });
    }

    const randomIndex = Math.floor(Math.random() * visibleSecrets.length);
    const randomSecret = visibleSecrets[randomIndex];

    res.json({
      hasSecret: true,
      secret: {
        id: randomSecret.id,
        content: randomSecret.content,
        status: randomSecret.status
      }
    });
  } catch (error) {
    console.error('获取随机秘密时出错:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

app.post('/api/reports', (req, res) => {
  try {
    const { targetId, targetType, reason, description } = req.body;

    if (!targetId || !targetType || !reason) {
      return res.status(400).json({ error: '缺少必要参数' });
    }

    if (!REPORT_REASONS.includes(reason)) {
      return res.status(400).json({ error: '无效的举报原因' });
    }

    if (targetType !== 'secret') {
      return res.status(400).json({ error: '无效的举报类型' });
    }

    const secrets = readSecrets();
    const targetSecret = secrets.find(s => s.id === targetId);
    if (!targetSecret) {
      return res.status(404).json({ error: '举报目标不存在' });
    }

    const reports = readReports();
    const newReport = {
      id: uuidv4(),
      targetId,
      targetType,
      reason,
      description: description || '',
      status: 'pending',
      createdAt: new Date().toISOString(),
      handledAt: null,
      handleResult: null
    };

    reports.push(newReport);
    writeReports(reports);

    res.json({
      success: true,
      message: '举报已提交，我们会尽快处理'
    });
  } catch (error) {
    console.error('提交举报时出错:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

app.get('/api/reports/reasons', (req, res) => {
  res.json({
    reasons: REPORT_REASONS.map(code => ({
      code,
      label: REPORT_REASON_LABELS[code]
    }))
  });
});

app.get('/api/admin/reports', (req, res) => {
  try {
    const reports = readReports();
    const secrets = readSecrets();

    const secretMap = {};
    secrets.forEach(s => {
      secretMap[s.id] = s;
    });

    const reportCounts = {};
    reports.forEach(r => {
      if (r.targetType === 'secret') {
        if (!reportCounts[r.targetId]) {
          reportCounts[r.targetId] = { total: 0, pending: 0 };
        }
        reportCounts[r.targetId].total++;
        if (r.status === 'pending') {
          reportCounts[r.targetId].pending++;
        }
      }
    });

    const result = secrets
      .filter(s => reportCounts[s.id])
      .map(s => ({
        id: s.id,
        content: s.content,
        hidden: s.hidden,
        status: s.status,
        createdAt: s.createdAt,
        reportCount: reportCounts[s.id].total,
        pendingReportCount: reportCounts[s.id].pending,
        reports: reports
          .filter(r => r.targetId === s.id)
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .map(r => ({
            id: r.id,
            reason: r.reason,
            reasonLabel: REPORT_REASON_LABELS[r.reason],
            description: r.description,
            status: r.status,
            createdAt: r.createdAt,
            handledAt: r.handledAt,
            handleResult: r.handleResult
          }))
      }))
      .sort((a, b) => b.reportCount - a.reportCount);

    res.json({
      success: true,
      items: result
    });
  } catch (error) {
    console.error('获取举报列表时出错:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

app.post('/api/admin/secrets/:id/hide', (req, res) => {
  try {
    const { id } = req.params;
    const { remark } = req.body;
    const secrets = readSecrets();
    const reports = readReports();

    const secretIndex = secrets.findIndex(s => s.id === id);
    if (secretIndex === -1) {
      return res.status(404).json({ error: '秘密不存在' });
    }

    secrets[secretIndex].hidden = true;
    writeSecrets(secrets);

    const now = new Date().toISOString();
    const handleResult = remark ? `已隐藏：${remark}` : '已隐藏';
    reports.forEach(r => {
      if (r.targetId === id && r.status === 'pending') {
        r.status = 'hidden';
        r.handledAt = now;
        r.handleResult = handleResult;
      }
    });

    const targetReports = reports.filter(r => r.targetId === id && r.status === 'hidden');
    if (targetReports.length === 0) {
      const newProcessRecord = {
        id: uuidv4(),
        targetId: id,
        targetType: 'secret',
        reason: 'process',
        description: remark || '',
        status: 'hidden',
        createdAt: now,
        handledAt: now,
        handleResult: handleResult
      };
      reports.push(newProcessRecord);
    }

    writeReports(reports);

    res.json({
      success: true,
      message: '秘密已隐藏'
    });
  } catch (error) {
    console.error('隐藏秘密时出错:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

app.post('/api/admin/secrets/:id/restore', (req, res) => {
  try {
    const { id } = req.params;
    const { remark } = req.body;
    const secrets = readSecrets();
    const reports = readReports();

    const secretIndex = secrets.findIndex(s => s.id === id);
    if (secretIndex === -1) {
      return res.status(404).json({ error: '秘密不存在' });
    }

    secrets[secretIndex].hidden = false;
    writeSecrets(secrets);

    const now = new Date().toISOString();
    const handleResult = remark ? `已恢复：${remark}` : '已恢复';

    const restoreRecord = {
      id: uuidv4(),
      targetId: id,
      targetType: 'secret',
      reason: 'restore',
      description: remark || '',
      status: 'restored',
      createdAt: now,
      handledAt: now,
      handleResult: handleResult
    };
    reports.push(restoreRecord);
    writeReports(reports);

    res.json({
      success: true,
      message: '秘密已恢复'
    });
  } catch (error) {
    console.error('恢复秘密时出错:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

app.post('/api/admin/reports/:id/ignore', (req, res) => {
  try {
    const { id } = req.params;
    const { remark } = req.body;
    const reports = readReports();

    const reportIndex = reports.findIndex(r => r.id === id);
    if (reportIndex === -1) {
      return res.status(404).json({ error: '举报不存在' });
    }

    const handleResult = remark ? `已忽略：${remark}` : '已忽略';
    reports[reportIndex].status = 'ignored';
    reports[reportIndex].handledAt = new Date().toISOString();
    reports[reportIndex].handleResult = handleResult;
    writeReports(reports);

    res.json({
      success: true,
      message: '举报已忽略'
    });
  } catch (error) {
    console.error('忽略举报时出错:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`忏悔室后端服务运行在 http://localhost:${PORT}`);
});
