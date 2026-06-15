<template>
  <div class="admin-container">
    <div class="card admin-card">
      <div class="card-header">
        <span class="icon">🛡️</span>
        <h2>举报处理中心</h2>
        <p class="subtitle">管理被举报的内容，按举报次数排序</p>
      </div>

      <div v-if="loading" class="loading">
        <div class="spinner"></div>
        <p>正在加载举报数据...</p>
      </div>

      <div v-else-if="items.length === 0" class="empty-state">
        <span class="empty-icon">✅</span>
        <p>暂无举报内容</p>
      </div>

      <div v-else class="report-list">
        <div
          v-for="item in items"
          :key="item.id"
          class="report-item"
          :class="{ 'item-hidden': item.hidden }"
        >
          <div class="item-header">
            <div class="item-stats">
              <span class="report-count-badge">
                📢 {{ item.reportCount }} 次举报
              </span>
              <span
                v-if="item.pendingReportCount > 0"
                class="pending-badge"
              >
                {{ item.pendingReportCount }} 待处理
              </span>
              <span v-if="item.hidden" class="hidden-badge">
                🔒 已隐藏
              </span>
              <span v-else class="visible-badge">
                👁️ 公开中
              </span>
            </div>
            <div class="item-actions">
              <button
                v-if="item.hidden"
                class="btn btn-success btn-sm"
                @click="openActionModal('restore', item.id)"
              >
                恢复
              </button>
              <button
                v-else
                class="btn btn-danger btn-sm"
                @click="openActionModal('hide', item.id)"
              >
                隐藏
              </button>
              <button
                class="btn btn-secondary btn-sm toggle-btn"
                @click="toggleExpand(item.id)"
              >
                {{ expandedId === item.id ? '收起' : '详情' }}
              </button>
            </div>
          </div>

          <div class="item-content">
            <p class="secret-text">"{{ item.content }}"</p>
            <p class="item-time">
              发布时间：{{ formatDate(item.createdAt) }}
            </p>
          </div>

          <transition name="slide">
            <div v-if="expandedId === item.id" class="report-details">
              <div class="details-header">
                <h4>举报记录</h4>
              </div>
              <div class="report-records">
                <div
                  v-for="report in item.reports"
                  :key="report.id"
                  class="report-record"
                  :class="{ 'record-process': report.reason === 'process' || report.reason === 'restore' }"
                >
                  <div class="record-header">
                    <span
                      class="reason-tag"
                      :class="'reason-' + report.reason"
                    >
                      {{ report.reasonLabel }}
                    </span>
                    <span
                      class="status-tag"
                      :class="'status-' + report.status"
                    >
                      {{ getStatusLabel(report.status) }}
                    </span>
                  </div>
                  <p v-if="report.description" class="report-desc">
                    {{ report.description }}
                  </p>
                  <div class="record-footer">
                    <span class="record-time">
                      {{ getTimeLabel(report) }}
                    </span>
                    <span v-if="report.handledAt" class="record-handled">
                      处理时间：{{ formatDate(report.handledAt) }}
                      （{{ report.handleResult }}）
                    </span>
                  </div>
                  <div v-if="report.status === 'pending'" class="record-actions">
                    <button
                      class="btn btn-secondary btn-xs"
                      @click="openActionModal('ignore', report.id)"
                    >
                      忽略此举报
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </transition>
        </div>
      </div>

      <div class="card-footer">
        <button class="btn btn-secondary" @click="refreshData">
          🔄 刷新
        </button>
      </div>
    </div>

    <transition name="fade">
      <div v-if="showActionModal" class="modal-overlay" @click.self="closeActionModal">
        <div class="modal-content">
          <div class="modal-header">
            <h3>{{ getModalTitle() }}</h3>
            <button class="close-btn" @click="closeActionModal">&times;</button>
          </div>
          <div class="modal-body">
            <p class="modal-tip">{{ getModalTip() }}</p>
            <div class="form-group">
              <label>处理备注（可选）</label>
              <textarea
                v-model="actionRemark"
                class="action-textarea"
                rows="3"
                placeholder="请输入处理备注..."
                maxlength="200"
              ></textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" @click="closeActionModal">
              取消
            </button>
            <button
              class="btn"
              :class="getConfirmBtnClass()"
              @click="confirmAction"
              :disabled="submittingAction"
            >
              <span v-if="submittingAction">
                <span class="btn-spinner"></span>
                处理中...
              </span>
              <span v-else>{{ getConfirmBtnText() }}</span>
            </button>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const loading = ref(true)
const items = ref([])
const expandedId = ref(null)

const showActionModal = ref(false)
const actionType = ref('')
const actionTargetId = ref('')
const actionRemark = ref('')
const submittingAction = ref(false)

async function fetchReports() {
  loading.value = true
  try {
    const response = await fetch('/api/admin/reports')
    const data = await response.json()
    if (data.success) {
      items.value = data.items
    }
  } catch (error) {
    console.error('获取举报列表失败:', error)
  } finally {
    loading.value = false
  }
}

function formatDate(dateStr) {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function getStatusLabel(status) {
  const map = {
    pending: '待处理',
    ignored: '已忽略',
    hidden: '已隐藏',
    restored: '已恢复'
  }
  return map[status] || status
}

function getTimeLabel(report) {
  if (report.reason === 'process' || report.reason === 'restore') {
    return `操作时间：${formatDate(report.createdAt)}`
  }
  return `举报时间：${formatDate(report.createdAt)}`
}

function toggleExpand(id) {
  if (expandedId.value === id) {
    expandedId.value = null
  } else {
    expandedId.value = id
  }
}

function openActionModal(type, targetId) {
  actionType.value = type
  actionTargetId.value = targetId
  actionRemark.value = ''
  showActionModal.value = true
}

function closeActionModal() {
  showActionModal.value = false
}

function getModalTitle() {
  const titles = {
    hide: '隐藏此内容',
    restore: '恢复此内容',
    ignore: '忽略此举报'
  }
  return titles[actionType.value] || '操作确认'
}

function getModalTip() {
  const tips = {
    hide: '确定要隐藏此秘密吗？隐藏后将不再在首页显示。',
    restore: '确定要恢复此秘密吗？恢复后将重新在首页显示。',
    ignore: '确定要忽略此举报吗？此操作不会对内容产生影响。'
  }
  return tips[actionType.value] || '确定执行此操作吗？'
}

function getConfirmBtnClass() {
  const classes = {
    hide: 'btn-danger',
    restore: 'btn-success',
    ignore: 'btn-primary'
  }
  return classes[actionType.value] || 'btn-primary'
}

function getConfirmBtnText() {
  const texts = {
    hide: '确认隐藏',
    restore: '确认恢复',
    ignore: '确认忽略'
  }
  return texts[actionType.value] || '确认'
}

async function confirmAction() {
  submittingAction.value = true
  try {
    let url = ''
    if (actionType.value === 'hide') {
      url = `/api/admin/secrets/${actionTargetId.value}/hide`
    } else if (actionType.value === 'restore') {
      url = `/api/admin/secrets/${actionTargetId.value}/restore`
    } else if (actionType.value === 'ignore') {
      url = `/api/admin/reports/${actionTargetId.value}/ignore`
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        remark: actionRemark.value.trim()
      })
    })

    const data = await response.json()
    if (data.success) {
      closeActionModal()
      fetchReports()
    } else {
      alert(data.error || '操作失败')
    }
  } catch (error) {
    console.error('操作失败:', error)
    alert('操作失败，请稍后重试')
  } finally {
    submittingAction.value = false
  }
}

function refreshData() {
  fetchReports()
}

onMounted(() => {
  fetchReports()
})
</script>

<style scoped>
.admin-container {
  width: 100%;
  max-width: 800px;
}

.admin-card {
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
  margin-bottom: 8px;
}

.subtitle {
  color: #666;
  font-size: 14px;
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
  padding: 60px 20px;
}

.empty-icon {
  font-size: 64px;
  display: block;
  margin-bottom: 20px;
}

.empty-state p {
  color: #666;
  font-size: 16px;
}

.report-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.report-item {
  background: #fafafa;
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  overflow: hidden;
  transition: all 0.3s ease;
}

.report-item:hover {
  border-color: #c7d2fe;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.1);
}

.item-hidden {
  opacity: 0.7;
  background: #fef2f2;
  border-color: #fecaca;
}

.item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: white;
  border-bottom: 1px solid #e5e7eb;
  flex-wrap: wrap;
  gap: 12px;
}

.item-stats {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.report-count-badge {
  background: linear-gradient(135deg, #f59e0b 0%, #ef4444 100%);
  color: white;
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 500;
}

.pending-badge {
  background: #fef3c7;
  color: #92400e;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
}

.hidden-badge {
  background: #fee2e2;
  color: #991b1b;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
}

.visible-badge {
  background: #d1fae5;
  color: #065f46;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
}

.item-actions {
  display: flex;
  gap: 8px;
}

.btn-sm {
  padding: 6px 14px;
  font-size: 13px;
}

.btn-xs {
  padding: 4px 10px;
  font-size: 12px;
}

.toggle-btn {
  background: #e0e7ff;
  color: #4338ca;
}

.toggle-btn:hover {
  background: #c7d2fe;
}

.item-content {
  padding: 20px;
}

.secret-text {
  font-size: 16px;
  line-height: 1.8;
  color: #333;
  font-style: italic;
  margin: 0 0 12px 0;
}

.item-time {
  font-size: 13px;
  color: #999;
  margin: 0;
}

.report-details {
  border-top: 1px solid #e5e7eb;
  background: #f9fafb;
}

.details-header {
  padding: 12px 20px;
  background: #f3f4f6;
}

.details-header h4 {
  margin: 0;
  font-size: 14px;
  color: #374151;
}

.report-records {
  padding: 12px 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.report-record {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 12px 14px;
}

.record-process {
  background: #f0fdf4;
  border-color: #bbf7d0;
}

.record-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  flex-wrap: wrap;
  gap: 8px;
}

.reason-tag {
  padding: 3px 10px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 500;
}

.reason-spam {
  background: #fef3c7;
  color: #92400e;
}

.reason-inappropriate {
  background: #fce7f3;
  color: #9d174d;
}

.reason-harassment {
  background: #ede9fe;
  color: #5b21b6;
}

.reason-violence {
  background: #fee2e2;
  color: #991b1b;
}

.reason-other {
  background: #e0e7ff;
  color: #3730a3;
}

.reason-process {
  background: #dcfce7;
  color: #166534;
}

.reason-restore {
  background: #dbeafe;
  color: #1e40af;
}

.status-tag {
  padding: 3px 10px;
  border-radius: 10px;
  font-size: 12px;
}

.status-pending {
  background: #fef3c7;
  color: #92400e;
}

.status-ignored {
  background: #e5e7eb;
  color: #4b5563;
}

.status-hidden {
  background: #d1fae5;
  color: #065f46;
}

.status-restored {
  background: #bfdbfe;
  color: #1e40af;
}

.report-desc {
  font-size: 13px;
  color: #555;
  margin: 0 0 8px 0;
  line-height: 1.6;
}

.record-footer {
  font-size: 12px;
  color: #999;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.record-actions {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px dashed #e5e7eb;
}

.card-footer {
  margin-top: 30px;
  text-align: center;
  padding-top: 20px;
  border-top: 1px solid #eee;
}

.slide-enter-active,
.slide-leave-active {
  transition: all 0.3s ease;
  max-height: 2000px;
  overflow: hidden;
}

.slide-enter-from,
.slide-leave-to {
  max-height: 0;
  opacity: 0;
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

.modal-tip {
  color: #333;
  font-size: 15px;
  margin-bottom: 20px;
  line-height: 1.6;
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

.action-textarea {
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

.action-textarea:focus {
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

.btn-spinner {
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-right: 8px;
  vertical-align: middle;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
