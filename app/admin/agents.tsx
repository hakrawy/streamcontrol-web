import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../../constants/theme';
import { useLocale } from '../../contexts/LocaleContext';
import { agentManager, AgentType, AgentResult } from '../../agents';

interface AgentState {
  id: string;
  name: string;
  description: string;
  type: AgentType;
  status: 'idle' | 'running' | 'completed' | 'failed';
  lastRun?: string;
  enabled: boolean;
}

export default function AgentsScreen() {
  const { language } = useLocale();
  const [agents, setAgents] = useState<AgentState[]>([]);
  const [runningAgent, setRunningAgent] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<AgentResult | null>(null);

  const isRTL = language === 'Arabic';
  const dir = isRTL ? 'rtl' : 'ltr';

  const copy = {
    title: isRTL ? 'وكلاء الذكاء الاصطناعي' : 'AI Agents',
    subtitle: isRTL ? 'إدارة وكلاء الأتمتة والذكاء الاصطناعي' : 'Manage AI automation agents',
    run: isRTL ? 'تشغيل' : 'Run',
    running: isRTL ? 'جارٍ التشغيل...' : 'Running...',
    enabled: isRTL ? 'مفعّل' : 'Enabled',
    disabled: isRTL ? 'معطّل' : 'Disabled',
    lastRun: isRTL ? 'آخر تشغيل' : 'Last run',
    never: isRTL ? 'لم يُشغَّل' : 'Never',
    success: isRTL ? 'نجاح' : 'Success',
    failed: isRTL ? 'فشل' : 'Failed',
    result: isRTL ? 'النتيجة' : 'Result',
    learnMore: isRTL ? 'اعرف المزيد' : 'Learn more',
    importAgent: isRTL ? 'وكيل الاستيراد' : 'Import Agent',
    importDesc: isRTL ? 'التحقق من صحة البيانات المستوردة وتنظيفها' : 'Validates and cleans imported content data',
    orgAgent: isRTL ? 'وكيل التنظيم' : 'Organization Agent',
    orgDesc: isRTL ? 'تصنيف المحتوى تلقائيًا واكتشاف التكرارات' : 'Auto-categorizes content and detects duplicates',
    monAgent: isRTL ? 'وكيل المراقبة' : 'Monitoring Agent',
    monDesc: isRTL ? 'فحص البث المكسور والصور المفقودة' : 'Checks broken streams and missing images',
    perfAgent: isRTL ? 'وكيل الأداء' : 'Performance Agent',
    perfDesc: isRTL ? 'تحليل الصفحات البطيئة وفرص التخزين المؤقت' : 'Analyzes slow pages and caching opportunities',
    assistAgent: isRTL ? 'مساعد المدير' : 'Admin Assistant',
    assistDesc: isRTL ? 'مساعدة في مهام الإدارة وتوضيح المشاكل' : 'Helps with admin tasks and explains problems',
  };

  useEffect(() => {
    const allAgents = agentManager.getAllAgents();
    setAgents(
      allAgents.map((a) => ({
        id: a.getId(),
        name: a.getName(),
        description: a.getDescription(),
        type: a.getType(),
        status: a.getStatus(),
        lastRun: a.lastRun,
        enabled: a.isEnabled(),
      }))
    );
  }, []);

  const handleRunAgent = useCallback(async (agentType: AgentType) => {
    setRunningAgent(agentType);
    try {
      const result = await agentManager.runAgent(agentType);
      setLastResult(result);
      // Refresh agent states
      const allAgents = agentManager.getAllAgents();
      setAgents(
        allAgents.map((a) => ({
          id: a.getId(),
          name: a.getName(),
          description: a.getDescription(),
          type: a.getType(),
          status: a.getStatus(),
          lastRun: a.lastRun,
          enabled: a.isEnabled(),
        }))
      );
    } catch (error) {
      setLastResult({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setRunningAgent(null);
    }
  }, []);

  const getAgentIcon = (type: AgentType): string => {
    switch (type) {
      case 'import': return 'upload';
      case 'organization': return 'category';
      case 'monitoring': return 'monitor-heart';
      case 'performance': return 'speed';
      case 'assistant': return '智能' === '智能' ? 'smart-toy' : 'help';
      default: return 'smart-toy';
    }
  };

  const getAgentColor = (type: AgentType): string => {
    switch (type) {
      case 'import': return theme.primary;
      case 'organization': return theme.success;
      case 'monitoring': return theme.warning;
      case 'performance': return theme.info;
      case 'assistant': return theme.accent;
      default: return theme.primary;
    }
  };

  return (
    <ScrollView style={[styles.container, { direction: dir }]}>
      <View style={styles.header}>
        <Text style={styles.title}>{copy.title}</Text>
        <Text style={styles.subtitle}>{copy.subtitle}</Text>
      </View>

      <View style={styles.agentsList}>
        {agents.map((agent) => {
          const isRunning = runningAgent === agent.type;
          const agentColor = getAgentColor(agent.type);
          
          let agentName = '';
          let agentDesc = '';
          switch (agent.type) {
            case 'import': agentName = copy.importAgent; agentDesc = copy.importDesc; break;
            case 'organization': agentName = copy.orgAgent; agentDesc = copy.orgDesc; break;
            case 'monitoring': agentName = copy.monAgent; agentDesc = copy.monDesc; break;
            case 'performance': agentName = copy.perfAgent; agentDesc = copy.perfDesc; break;
            case 'assistant': agentName = copy.assistAgent; agentDesc = copy.assistDesc; break;
          }

          return (
            <View key={agent.id} style={styles.agentCard}>
              <View style={styles.agentHeader}>
                <View style={[styles.agentIcon, { backgroundColor: `${agentColor}20` }]}>
                  <MaterialIcons name={getAgentIcon(agent.type) as any} size={24} color={agentColor} />
                </View>
                <View style={styles.agentInfo}>
                  <Text style={styles.agentName}>{agentName}</Text>
                  <Text style={styles.agentDesc}>{agentDesc}</Text>
                </View>
              </View>

              <View style={styles.agentStatus}>
                <View style={[styles.statusBadge, agent.status === 'completed' && styles.statusSuccess, agent.status === 'failed' && styles.statusFailed]}>
                  <Text style={styles.statusText}>{agent.status}</Text>
                </View>
                {agent.lastRun && (
                  <Text style={styles.lastRun}>
                    {copy.lastRun}: {new Date(agent.lastRun).toLocaleString()}
                  </Text>
                )}
              </View>

              <Pressable
                style={[
                  styles.runButton,
                  isRunning && styles.runButtonDisabled,
                ]}
                onPress={() => handleRunAgent(agent.type)}
                disabled={isRunning}
              >
                {isRunning ? (
                  <>
                    <ActivityIndicator size="small" color="#FFF" />
                    <Text style={styles.runButtonText}>{copy.running}</Text>
                  </>
                ) : (
                  <>
                    <MaterialIcons name="play-arrow" size={20} color="#FFF" />
                    <Text style={styles.runButtonText}>{copy.run}</Text>
                  </>
                )}
              </Pressable>
            </View>
          );
        })}
      </View>

      {lastResult && (
        <View style={[styles.resultCard, !lastResult.success && styles.resultError]}>
          <View style={styles.resultHeader}>
            <MaterialIcons
              name={lastResult.success ? 'check-circle' : 'error'}
              size={24}
              color={lastResult.success ? theme.success : theme.error}
            />
            <Text style={styles.resultTitle}>
              {lastResult.success ? copy.success : copy.failed}
            </Text>
          </View>
          <Text style={styles.resultMessage}>{lastResult.message}</Text>
          {lastResult.metrics && (
            <View style={styles.metricsGrid}>
              <View style={styles.metricItem}>
                <Text style={styles.metricValue}>{lastResult.metrics.itemsProcessed}</Text>
                <Text style={styles.metricLabel}>Processed</Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={styles.metricValue}>{lastResult.metrics.itemsFailed}</Text>
                <Text style={styles.metricLabel}>Failed</Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={styles.metricValue}>{(lastResult.metrics.duration / 1000).toFixed(1)}s</Text>
                <Text style={styles.metricLabel}>Duration</Text>
              </View>
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.divider,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.textPrimary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: theme.textSecondary,
  },
  agentsList: {
    padding: 16,
    gap: 16,
  },
  agentCard: {
    backgroundColor: theme.surface,
    borderRadius: theme.radius.lg,
    padding: 16,
    gap: 12,
  },
  agentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  agentIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  agentInfo: {
    flex: 1,
  },
  agentName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.textPrimary,
  },
  agentDesc: {
    fontSize: 13,
    color: theme.textSecondary,
    marginTop: 2,
  },
  agentStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.radius.full,
    backgroundColor: theme.surfaceHighlight,
  },
  statusSuccess: {
    backgroundColor: `${theme.success}20`,
  },
  statusFailed: {
    backgroundColor: `${theme.error}20`,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.textSecondary,
    textTransform: 'capitalize',
  },
  lastRun: {
    fontSize: 12,
    color: theme.textMuted,
  },
  runButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.primary,
    paddingVertical: 12,
    borderRadius: theme.radius.md,
  },
  runButtonDisabled: {
    opacity: 0.6,
  },
  runButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
  resultCard: {
    margin: 16,
    marginTop: 0,
    backgroundColor: `${theme.success}15`,
    borderRadius: theme.radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.success,
  },
  resultError: {
    backgroundColor: `${theme.error}15`,
    borderColor: theme.error,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.textPrimary,
  },
  resultMessage: {
    fontSize: 14,
    color: theme.textSecondary,
  },
  metricsGrid: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 16,
  },
  metricItem: {
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.textPrimary,
  },
  metricLabel: {
    fontSize: 11,
    color: theme.textMuted,
  },
});