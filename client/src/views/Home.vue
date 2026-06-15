<template>
  <div class="home-container">
    <div class="card secret-card">
      <div class="card-header">
        <span class="icon">💫</span>
        <h2>今日被宽恕的秘密</h2>
      </div>

      <div v-if="loading" class="loading">
        <div class="spinner"></div>
        <p>正在寻找一段温暖的秘密...</p>
      </div>

      <div v-else-if="!hasSecret" class="empty-state">
        <span class="empty-icon">🌸</span>
        <p>{{ message }}</p>
        <button class="btn btn-primary" @click="goToConfess">
          分享第一个秘密
        </button>
      </div>

      <transition name="fade" v-else>
        <div class="secret-content" :key="secret?.id">
          <p class="secret-text">"{{ secret.content }}"</p>
          <div class="secret-footer">
            <span class="status-badge">{{ secret.status }}</span>
            <div class="footer-actions">
              <button class="btn btn-secondary report-btn" @click="openReportModal">
                ⚠️ 举报
              </button>
              <button class="btn btn-secondary refresh-btn" @click="fetchRandomSecret">
                🔄 换一个
              </button>
            </div>
          </div>
        </div>
      </transition>

      <div class="card-actions">
        <button class="btn btn-primary" @click="goToConfess">
          我也想倾诉
        </button>
      </div>
    </div>

    <transition name="fade">
      <div v-if="showReportModal" class="modal-overlay" @click.self="closeReportModal">
        <div class="modal-content">
          <div class="modal-header">
            <h3>举报此内容</h3>
            <button class="close-btn" @click="closeReportModal">&times;</button>
          </div>
          <div class="modal-body">
            <p class="report-tip">请选择举报原因：</p>
            <div class="reason-list">
              <label
                v-for="reason in reportReasons"
                :key="reason.code"
                class="reason-item"
                :class="{ active: selectedReason === reason.code }"
              >
                <input
                  type="radio"
                  :value="reason.code"
                  v-model="selectedReason"
                  class="reason-radio"
                />
                <span class="reason-label">{{ reason.label }}</span>
              </label>
            </div>
            <div class="form-group">
              <label>补充说明（可选）</label>
              <textarea
                v-model="reportDescription"
                class="report-textarea"
                rows="3"
                placeholder="请详细描述问题..."
                maxlength="200"
              ></textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" @click="closeReportModal">
              取消
            </button>
            <button
              class="btn btn-primary"
              @click="submitReport"
              :disabled="submittingReport || !selectedReason"
            >
              <span v-if="submittingReport">
                <span class="btn-spinner"></span>
                提交中...
              </span>
              <span v-else>提交举报</span>
            </button>
          </div>
        </div>
      </div>
    </transition>

    <transition name="fade">
      <div v-if="showReportSuccess" class="toast toast-success">
        ✅ 举报已提交，我们会尽快处理
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const loading = ref(true)
const hasSecret = ref(false)
const secret = ref(null)
const message = ref('')

const showReportModal = ref(false)
const showReportSuccess = ref(false)
const reportReasons = ref([])
const selectedReason = ref('')
const reportDescription = ref('')
const submittingReport = ref(false)

async function fetchRandomSecret() {
  loading.value = true
  try {
    const response = await fetch('/api/secrets/random')
    const data = await response.json()
    hasSecret.value = data.hasSecret
    secret.value = data.secret
    message.value = data.message
  } catch (error) {
    console.error('获取秘密失败:', error)
    hasSecret.value = false
    message.value = '暂时无法连接到服务器'
  } finally {
    loading.value = false
  }
}

async function fetchReportReasons() {
  try {
    const response = await fetch('/api/reports/reasons')
    const data = await response.json()
    reportReasons.value = data.reasons
  } catch (error) {
    console.error('获取举报原因失败:', error)
  }
}

function openReportModal() {
  selectedReason.value = ''
  reportDescription.value = ''
  showReportModal.value = true
}

function closeReportModal() {
  showReportModal.value = false
}

async function submitReport() {
  if (!selectedReason.value || !secret.value) return

  submittingReport.value = true
  try {
    const response = await fetch('/api/reports', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        targetId: secret.value.id,
        targetType: 'secret',
        reason: selectedReason.value,
        description: reportDescription.value
      })
    })

    const data = await response.json()

    if (response.ok) {
      closeReportModal()
      showReportSuccess.value = true
      setTimeout(() => {
        showReportSuccess.value = false
      }, 3000)
      fetchRandomSecret()
    } else {
      alert(data.error || '举报失败，请稍后重试')
    }
  } catch (error) {
    console.error('提交举报失败:', error)
    alert('无法连接到服务器，请稍后重试')
  } finally {
    submittingReport.value = false
  }
}

function goToConfess() {
  router.push('/confess')
}

onMounted(() => {
  fetchRandomSecret()
  fetchReportReasons()
})
</script>

<style scoped>
.home-container {
  width: 100%;
  max-width: 600px;
}

.secret-card {
  animation: slideUp 0.6s ease;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.card-header {
  text-align: center;
  margin-bottom: 30px;
}

.icon {
  font-size: 48px;
  display: block;
  margin-bottom: 10px;
}

.card-header h2 {
  color: #333;
  font-size: 24px;
  font-weight: 600;
}

.loading {
  text-align: center;
  padding: 60px 20px;
  color: #666;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(102, 126, 234, 0.3);
  border-top-color: #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 20px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
}

.empty-icon {
  font-size: 64px;
  display: block;
  margin-bottom: 20px;
}

.empty-state p {
  color: #666;
  font-size: 16px;
  margin-bottom: 30px;
}

.secret-content {
  padding: 20px 0;
}

.secret-text {
  font-size: 20px;
  line-height: 1.8;
  color: #333;
  font-style: italic;
  text-align: center;
  margin-bottom: 30px;
  padding: 0 10px;
}

.secret-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 15px;
}

.status-badge {
  background: linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%);
  color: #2d5a4a;
  padding: 8px 20px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 500;
}

.refresh-btn {
  padding: 8px 20px;
  font-size: 14px;
  color: #666;
  background: #f0f0f0;
  border: none;
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.refresh-btn:hover {
  background: #e0e0e0;
  transform: translateY(-1px);
}

.card-actions {
  margin-top: 40px;
  text-align: center;
  padding-top: 30px;
  border-top: 1px solid #eee;
}

.footer-actions {
  display: flex;
  gap: 10px;
}

.report-btn {
  padding: 8px 16px;
  font-size: 14px;
  color: #ef4444;
  background: #fef2f2;
  border: none;
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.report-btn:hover {
  background: #fee2e2;
  transform: translateY(-1px);
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  padding: 20px;
}

.modal-content {
  background: white;
  border-radius: 20px;
  width: 100%;
  max-width: 480px;
  max-height: 90vh;
  overflow-y: auto;
  animation: modalSlideUp 0.3s ease;
}

@keyframes modalSlideUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #eee;
}

.modal-header h3 {
  margin: 0;
  font-size: 20px;
  color: #333;
}

.close-btn {
  background: none;
  border: none;
  font-size: 28px;
  color: #999;
  cursor: pointer;
  line-height: 1;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.2s ease;
}

.close-btn:hover {
  background: #f0f0f0;
  color: #666;
}

.modal-body {
  padding: 24px;
}

.report-tip {
  color: #666;
  font-size: 15px;
  margin-bottom: 16px;
}

.reason-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 20px;
}

.reason-item {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.reason-item:hover {
  border-color: #c7d2fe;
  background: #f5f3ff;
}

.reason-item.active {
  border-color: #667eea;
  background: #eef2ff;
}

.reason-radio {
  margin-right: 12px;
  accent-color: #667eea;
}

.reason-label {
  font-size: 15px;
  color: #333;
}

.form-group {
  margin-bottom: 0;
}

.form-group label {
  display: block;
  font-size: 14px;
  color: #666;
  margin-bottom: 8px;
}

.report-textarea {
  width: 100%;
  padding: 12px;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  font-size: 14px;
  font-family: inherit;
  resize: none;
  transition: all 0.3s ease;
  line-height: 1.6;
  background: #fafafa;
  box-sizing: border-box;
}

.report-textarea:focus {
  outline: none;
  border-color: #667eea;
  background: white;
  box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px 24px;
  border-top: 1px solid #eee;
}

.toast {
  position: fixed;
  top: 80px;
  left: 50%;
  transform: translateX(-50%);
  padding: 12px 24px;
  border-radius: 12px;
  font-size: 14px;
  z-index: 2000;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.toast-success {
  background: #10b981;
  color: white;
}
</style>
