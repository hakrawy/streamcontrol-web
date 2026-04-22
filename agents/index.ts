/**
 * AI Agents System
 * 
 * Modular, extensible agent framework for platform automation and intelligence.
 * Each agent is designed to be independent, with its own configuration and execution model.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// ===== Types =====
export interface Agent {
  id: string;
  name: string;
  description: string;
  type: AgentType;
  enabled: boolean;
  status: AgentStatus;
  lastRun?: string;
  config?: Record<string, unknown>;
}

export type AgentType = 
  | 'import' 
  | 'organization' 
  | 'monitoring' 
  | 'performance' 
  | 'assistant';

export type AgentStatus = 'idle' | 'running' | 'completed' | 'failed';

export interface AgentResult {
  success: boolean;
  message: string;
  data?: unknown;
  errors?: string[];
  metrics?: AgentMetrics;
}

export interface AgentMetrics {
  itemsProcessed: number;
  itemsFailed: number;
  duration: number;
  timestamp: string;
}

// ===== Base Agent Class =====
export abstract class BaseAgent {
  protected id: string;
  protected name: string;
  protected description: string;
  protected status: AgentStatus = 'idle';
  protected lastRun?: string;
  protected enabled: boolean = true;

  constructor(id: string, name: string, description: string) {
    this.id = id;
    this.name = name;
    this.description = description;
  }

  getId(): string {
    return this.id;
  }

  getName(): string {
    return this.name;
  }

  getDescription(): string {
    return this.description;
  }

  getStatus(): AgentStatus {
    return this.status;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  protected setStatus(status: AgentStatus): void {
    this.status = status;
    this.lastRun = status === 'completed' || status === 'failed' ? new Date().toISOString() : undefined;
  }

  abstract execute(): Promise<AgentResult>;

  toJSON(): Agent {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      type: this.getType(),
      enabled: this.enabled,
      status: this.status,
      lastRun: this.lastRun,
    };
  }

  protected abstract getType(): AgentType;
}

// ===== Import Agent =====
export class ImportAgent extends BaseAgent {
  private validationRules: ImportValidationRule[] = [];

  constructor() {
    super('import_agent', 'Import Agent', 'Validates and cleans imported content data');
  }

  getType(): AgentType {
    return 'import';
  }

  setValidationRules(rules: ImportValidationRule[]): void {
    this.validationRules = rules;
  }

  async execute(): Promise<AgentResult> {
    if (!this.enabled) {
      return { success: false, message: 'Agent is disabled' };
    }

    this.setStatus('running');
    const startTime = Date.now();
    const errors: string[] = [];
    let itemsProcessed = 0;

    try {
      // Import validation logic would go here
      // This is a simplified implementation
      itemsProcessed = 0;
      
      this.setStatus('completed');
      
      return {
        success: true,
        message: `Processed ${itemsProcessed} items`,
        metrics: {
          itemsProcessed,
          itemsFailed: errors.length,
          duration: Date.now() - startTime,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      this.setStatus('failed');
      errors.push(error instanceof Error ? error.message : 'Unknown error');
      
      return {
        success: false,
        message: 'Import failed',
        errors,
        metrics: {
          itemsProcessed,
          itemsFailed: errors.length,
          duration: Date.now() - startTime,
          timestamp: new Date().toISOString(),
        },
      };
    }
  }
}

// ===== Organization Agent =====
export class OrganizationAgent extends BaseAgent {
  constructor() {
    super('organization_agent', 'Organization Agent', 'Auto-categorizes content and detects duplicates');
  }

  getType(): AgentType {
    return 'organization';
  }

  async execute(): Promise<AgentResult> {
    if (!this.enabled) {
      return { success: false, message: 'Agent is disabled' };
    }

    this.setStatus('running');
    const startTime = Date.now();
    const errors: string[] = [];
    let itemsProcessed = 0;

    try {
      // Organization logic would go here
      itemsProcessed = 0;
      
      this.setStatus('completed');
      
      return {
        success: true,
        message: `Organized ${itemsProcessed} items`,
        metrics: {
          itemsProcessed,
          itemsFailed: errors.length,
          duration: Date.now() - startTime,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      this.setStatus('failed');
      errors.push(error instanceof Error ? error.message : 'Unknown error');
      
      return {
        success: false,
        message: 'Organization failed',
        errors,
        metrics: {
          itemsProcessed,
          itemsFailed: errors.length,
          duration: Date.now() - startTime,
          timestamp: new Date().toISOString(),
        },
      };
    }
  }
}

// ===== Monitoring Agent =====
export class MonitoringAgent extends BaseAgent {
  private checkInterval: number = 300000; // 5 minutes

  constructor() {
    super('monitoring_agent', 'Monitoring Agent', 'Checks broken streams, missing images, and failing sources');
  }

  getType(): AgentType {
    return 'monitoring';
  }

  setCheckInterval(intervalMs: number): void {
    this.checkInterval = intervalMs;
  }

  async execute(): Promise<AgentResult> {
    if (!this.enabled) {
      return { success: false, message: 'Agent is disabled' };
    }

    this.setStatus('running');
    const startTime = Date.now();
    const errors: string[] = [];
    let itemsProcessed = 0;

    try {
      // Monitoring logic would go here
      itemsProcessed = 0;
      
      this.setStatus('completed');
      
      return {
        success: true,
        message: `Checked ${itemsProcessed} items`,
        metrics: {
          itemsProcessed,
          itemsFailed: errors.length,
          duration: Date.now() - startTime,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      this.setStatus('failed');
      errors.push(error instanceof Error ? error.message : 'Unknown error');
      
      return {
        success: false,
        message: 'Monitoring failed',
        errors,
        metrics: {
          itemsProcessed,
          itemsFailed: errors.length,
          duration: Date.now() - startTime,
          timestamp: new Date().toISOString(),
        },
      };
    }
  }
}

// ===== Performance Agent =====
export class PerformanceAgent extends BaseAgent {
  constructor() {
    super('performance_agent', 'Performance Agent', 'Analyzes slow pages, heavy components, and caching opportunities');
  }

  getType(): AgentType {
    return 'performance';
  }

  async execute(): Promise<AgentResult> {
    if (!this.enabled) {
      return { success: false, message: 'Agent is disabled' };
    }

    this.setStatus('running');
    const startTime = Date.now();
    const errors: string[] = [];
    let itemsProcessed = 0;

    try {
      // Performance analysis logic would go here
      itemsProcessed = 0;
      
      this.setStatus('completed');
      
      return {
        success: true,
        message: `Analyzed ${itemsProcessed} components`,
        metrics: {
          itemsProcessed,
          itemsFailed: errors.length,
          duration: Date.now() - startTime,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      this.setStatus('failed');
      errors.push(error instanceof Error ? error.message : 'Unknown error');
      
      return {
        success: false,
        message: 'Performance analysis failed',
        errors,
        metrics: {
          itemsProcessed,
          itemsFailed: errors.length,
          duration: Date.now() - startTime,
          timestamp: new Date().toISOString(),
        },
      };
    }
  }
}

// ===== Admin Assistant Agent =====
export interface AssistantContext {
  question: string;
  context?: Record<string, unknown>;
}

export interface AssistantResponse {
  answer: string;
  suggestions?: string[];
  actions?: AssistantAction[];
}

export interface AssistantAction {
  type: string;
  label: string;
  payload?: Record<string, unknown>;
}

export class AdminAssistantAgent extends BaseAgent {
  private knowledgeBase: Map<string, string> = new Map();

  constructor() {
    super('admin_assistant', 'Admin Assistant', 'Helps perform admin workflows and explains problems');
    this.initializeKnowledgeBase();
  }

  getType(): AgentType {
    return 'assistant';
  }

  private initializeKnowledgeBase(): void {
    // Initialize with common admin knowledge
    this.knowledgeBase.set('how_to_import', 'Go to Admin > Imports to import content from M3U or external sources.');
    this.knowledgeBase.set('how_to_add_movie', 'Navigate to Admin > Movies and click the + button to add a new movie.');
    this.knowledgeBase.set('how_to_manage_sources', 'Admin > Sources shows all stream sources. Test connections before using.');
    this.knowledgeBase.set('how_to_view_analytics', 'The admin dashboard shows key metrics. Check the Analytics tab for detailed stats.');
  }

  async execute(context?: AssistantContext): Promise<AgentResult> {
    if (!this.enabled) {
      return { success: false, message: 'Agent is disabled' };
    }

    this.setStatus('running');
    const startTime = Date.now();

    try {
      // Process question
      const response = this.processQuestion(context?.question || '');
      
      this.setStatus('completed');
      
      return {
        success: true,
        message: response.answer,
        data: {
          suggestions: response.suggestions,
          actions: response.actions,
        },
        metrics: {
          itemsProcessed: 1,
          itemsFailed: 0,
          duration: Date.now() - startTime,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      this.setStatus('failed');
      
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Assistant failed',
        metrics: {
          itemsProcessed: 0,
          itemsFailed: 1,
          duration: Date.now() - startTime,
          timestamp: new Date().toISOString(),
        },
      };
    }
  }

  private processQuestion(question: string): AssistantResponse {
    const lowerQuestion = question.toLowerCase();
    
    // Simple keyword matching
    for (const [key, value] of this.knowledgeBase.entries()) {
      if (lowerQuestion.includes(key.replace(/_/g, ' '))) {
        return {
          answer: value,
          suggestions: this.getRelatedSuggestions(key),
        };
      }
    }

    return {
      answer: 'I can help with importing content, adding movies, managing sources, and viewing analytics. What would you like to do?',
      suggestions: [
        'How to import content',
        'How to add a movie',
        'How to manage sources',
        'View analytics',
      ],
    };
  }

  private getRelatedSuggestions(topic: string): string[] {
    const suggestions: Record<string, string[]> = {
      'how_to_import': ['Add movie', 'Add series', 'Manage channels'],
      'how_to_add_movie': ['Edit movie', 'Delete movie', 'Bulk import'],
      'how_to_manage_sources': ['Test sources', 'View logs', 'Add source'],
      'how_to_view_analytics': ['User stats', 'View stats', 'Revenue'],
    };
    return suggestions[topic] || [];
  }

  ask(question: string): Promise<AssistantResponse> {
    return this.execute({ question }).then((result) => ({
      answer: result.message,
      suggestions: (result.data as AssistantResponse)?.suggestions,
      actions: (result.data as AssistantResponse)?.actions,
    }));
  }
}

// ===== Agent Factory =====
export function createAgent(type: AgentType): BaseAgent {
  switch (type) {
    case 'import':
      return new ImportAgent();
    case 'organization':
      return new OrganizationAgent();
    case 'monitoring':
      return new MonitoringAgent();
    case 'performance':
      return new PerformanceAgent();
    case 'assistant':
      return new AdminAssistantAgent();
    default:
      throw new Error(`Unknown agent type: ${type}`);
  }
}

// ===== Agent Manager =====
export class AgentManager {
  private agents: Map<AgentType, BaseAgent> = new Map();
  private storageKey = 'alc:agents';

  constructor() {
    this.initializeAgents();
  }

  private initializeAgents(): void {
    this.agents.set('import', new ImportAgent());
    this.agents.set('organization', new OrganizationAgent());
    this.agents.set('monitoring', new MonitoringAgent());
    this.agents.set('performance', new PerformanceAgent());
    this.agents.set('assistant', new AdminAssistantAgent());
  }

  getAgent(type: AgentType): BaseAgent | undefined {
    return this.agents.get(type);
  }

  getAllAgents(): BaseAgent[] {
    return Array.from(this.agents.values());
  }

  async runAgent(type: AgentType): Promise<AgentResult> {
    const agent = this.agents.get(type);
    if (!agent) {
      return { success: false, message: `Agent ${type} not found` };
    }
    return agent.execute();
  }

  async saveState(): Promise<void> {
    try {
      const agents = this.getAllAgents().map((a) => a.toJSON());
      await AsyncStorage.setItem(this.storageKey, JSON.stringify(agents));
    } catch (error) {
      console.error('Failed to save agent state:', error);
    }
  }

  async loadState(): Promise<void> {
    try {
      const data = await AsyncStorage.getItem(this.storageKey);
      if (data) {
        const agents = JSON.parse(data) as Agent[];
        agents.forEach((agent) => {
          const instance = this.agents.get(agent.type);
          if (instance) {
            instance.setEnabled(agent.enabled);
          }
        });
      }
    } catch (error) {
      console.error('Failed to load agent state:', error);
    }
  }
}

// ===== Validation Types =====
export interface ImportValidationRule {
  field: string;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: unknown) => boolean;
}

// ===== Default Export =====
export const agentManager = new AgentManager();
export default agentManager;