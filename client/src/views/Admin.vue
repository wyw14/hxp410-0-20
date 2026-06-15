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
                @click="restoreSecret(item.id)"
              >
                恢复
              </button>
              <button
                v-else
                class="btn btn-danger btn-sm"
                @click="hideSecret(item.id)"
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
                      举报时间：{{ formatDate(report.createdAt) }}
                    </span>
                    <span v-if="report.handledAt" class="record-handled">
                      处理时间：{{ formatDate(report.handledAt) }}
                      （{{ report.handleResult }}）
                    </span>
                  </div>
                  <div v-if="report.status === 'pending'" class="record-actions">
                    <button
                      class="btn btn-secondary btn-xs"
                      @click="ignoreReport(report.id)"
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
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const loading = ref(true)
const items = ref([])
const expandedId = ref(null)

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
    hidden: '已隐藏'
  }
  return map[status] || status
}

function toggleExpand(id) {
  if (expandedId.value === id) {
    expandedId.value = null
  } else {
    expandedId.value = id
  }
}

async function hideSecret(id) {
  if (!confirm('确定要隐藏此秘密吗？隐藏后将不再在首页显示。')) return

  try {
    const response = await fetch(`/api/admin/secrets/${id}/hide`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    })
    const data = await response.json()
    if (data.success) {
      fetchReports()
    } else {
      alert(data.error || '操作失败')
    }
  } catch (error) {
    console.error('隐藏失败:', error)
    alert('操作失败，请稍后重试')
  }
}

async function restoreSecret(id) {
  if (!confirm('确定要恢复此秘密吗？恢复后将重新在首页显示。')) return

  try {
    const response = await fetch(`/api/admin/secrets/${id}/restore`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    })
    const data = await response.json()
    if (data.success) {
      fetchReports()
    } else {
      alert(data.error || '操作失败')
    }
  } catch (error) {
    console.error('恢复失败:', error)
    alert('操作失败，请稍后重试')
  }
}

async function ignoreReport(reportId) {
  if (!confirm('确定要忽略此举报吗？')) return

  try {
    const response = await fetch(`/api/admin/reports/${reportId}/ignore`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    })
    const data = await response.json()
    if (data.success) {
      fetchReports()
    } else {
      alert(data.error || '操作失败')
    }
  } catch (error) {
    console.error('忽略失败:', error)
    alert('操作失败，请稍后重试')
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
  max-height: 1000px;
  overflow: hidden;
}

.slide-enter-from,
.slide-leave-to {
  max-height: 0;
  opacity: 0;
}
</style>
