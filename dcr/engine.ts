export interface Event {
  id: string;
  name: string;
  included: boolean;
  executed: boolean;
  pending: boolean;
  enabled: boolean;
}

export type RelationType = 'condition' | 'response' | 'include' | 'exclude' | 'milestone';

export interface Relation {
  from: string;
  to: string;
  type: RelationType;
}

export interface DCRGraph {
  events: Map<string, Event>;
  relations: Relation[];
}

export class DCREngine {
  private graph: DCRGraph;

  constructor(graphDefinition: DCRGraph) {
    this.graph = graphDefinition;
  }

  canExecute(eventId: string): boolean {
    const event = this.graph.events.get(eventId);
    if (!event || !event.included || !event.enabled) {
      return false;
    }

    const conditions = this.graph.relations.filter(
      r => r.type === 'condition' && r.to === eventId
    );

    for (const condition of conditions) {
      const fromEvent = this.graph.events.get(condition.from);
      if (!fromEvent?.executed) {
        return false;
      }
    }

    const milestones = this.graph.relations.filter(
      r => r.type === 'milestone' && r.to === eventId
    );

    for (const milestone of milestones) {
      const fromEvent = this.graph.events.get(milestone.from);
      if (fromEvent?.pending && fromEvent?.enabled) {
        return false;
      }
    }

    return true;
  }

  execute(eventId: string): boolean {
    if (!this.canExecute(eventId)) {
      return false;
    }

    const event = this.graph.events.get(eventId)!;
    event.executed = true;
    event.pending = false;

    for (const relation of this.graph.relations) {
      if (relation.from === eventId) {
        const targetEvent = this.graph.events.get(relation.to)!;

        switch (relation.type) {
          case 'response':
            targetEvent.pending = true;
            break;
          case 'include':
            targetEvent.included = true;
            targetEvent.enabled = true;
            break;
          case 'exclude':
            targetEvent.included = false;
            targetEvent.enabled = false;
            break;
        }
      }
    }

    return true;
  }

  getEnabledEvents(): Event[] {
    const enabled: Event[] = [];
    for (const [id, event] of this.graph.events) {
      if (this.canExecute(id)) {
        enabled.push(event);
      }
    }
    return enabled;
  }

  canComplete(): boolean {
    for (const [, event] of this.graph.events) {
      if (event.pending && event.included) {
        return false;
      }
    }
    return true;
  }

  getState(): DCRGraph {
    return {
      events: new Map(this.graph.events),
      relations: [...this.graph.relations]
    };
  }

  setState(state: DCRGraph): void {
    this.graph = {
      events: new Map(state.events),
      relations: [...state.relations]
    };
  }
}
