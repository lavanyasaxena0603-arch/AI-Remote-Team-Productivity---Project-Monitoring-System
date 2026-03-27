"""
AI Command Center — Rule-Based AI Engine
Handles chat responses, risk analysis, and alerts
"""
from datetime import datetime


# ============================================================
# RISK ANALYSIS
# ============================================================
def analyze_risk(project):
    """Return risk level and reasons based on project data."""
    reasons   = []
    risk_score = 0

    total     = len(project.tasks)
    completed = sum(1 for t in project.tasks if t.status == 'completed')
    pending   = total - completed
    completion = project.completion()

    # Pending ratio
    if total > 0:
        pending_ratio = pending / total
        if pending_ratio > 0.7:
            risk_score += 40
            reasons.append(f"{pending} of {total} tasks still pending ({int(pending_ratio*100)}%)")
        elif pending_ratio > 0.4:
            risk_score += 20
            reasons.append(f"Moderate pending workload ({int(pending_ratio*100)}%)")

    # Deadline proximity
    if project.deadline:
        days_left = (project.deadline - datetime.utcnow()).days
        if days_left < 0:
            risk_score += 50
            reasons.append(f"Project is {abs(days_left)} day(s) OVERDUE")
        elif days_left < 2:
            risk_score += 35
            reasons.append(f"Deadline in {days_left} day(s) — critical")
        elif days_left < 7:
            risk_score += 15
            reasons.append(f"Deadline in {days_left} days")

    # Completion
    if completion < 20 and total > 0:
        risk_score += 20
        reasons.append("Very low completion rate")
    elif completion < 50 and total > 5:
        risk_score += 10
        reasons.append("Below 50% completion")

    # No tasks at all
    if total == 0:
        risk_score = 5
        reasons.append("No tasks added yet")

    # Determine level
    if risk_score >= 50:
        level = 'high'
        color = '#FF4C4C'
        label = 'HIGH RISK'
    elif risk_score >= 25:
        level = 'medium'
        color = '#FF8C00'
        label = 'MEDIUM RISK'
    else:
        level = 'low'
        color = '#00FF9C'
        label = 'LOW RISK'

    return {
        'level':      level,
        'label':      label,
        'color':      color,
        'score':      risk_score,
        'reasons':    reasons,
        'completion': completion,
    }


# ============================================================
# ALERTS GENERATOR
# ============================================================
def generate_alerts(projects):
    """Generate system alerts across all projects."""
    alerts = []
    for project in projects:
        risk = analyze_risk(project)
        total   = len(project.tasks)
        pending = sum(1 for t in project.tasks if t.status == 'pending')
        completed = total - pending

        if risk['level'] == 'high':
            alerts.append({
                'type':    'high',
                'color':   '#FF4C4C',
                'icon':    'fas fa-exclamation-triangle',
                'title':   f'HIGH RISK — {project.name}',
                'message': risk['reasons'][0] if risk['reasons'] else 'Critical issues detected',
                'project': project.name,
                'time':    'Just now',
            })
        elif risk['level'] == 'medium':
            alerts.append({
                'type':    'medium',
                'color':   '#FF8C00',
                'icon':    'fas fa-exclamation-circle',
                'title':   f'MEDIUM RISK — {project.name}',
                'message': risk['reasons'][0] if risk['reasons'] else 'Attention needed',
                'project': project.name,
                'time':    'Just now',
            })

        if completed > 0 and pending == 0:
            alerts.append({
                'type':    'low',
                'color':   '#00FF9C',
                'icon':    'fas fa-check-circle',
                'title':   f'COMPLETE — {project.name}',
                'message': f'All {total} tasks completed. Project ready for review.',
                'project': project.name,
                'time':    'Just now',
            })

    return alerts


# ============================================================
# CHAT ENGINE
# ============================================================
def chat_response(message, project):
    """Rule-based AI chat response using project context."""
    msg  = message.lower().strip()
    total     = len(project.tasks)
    completed = sum(1 for t in project.tasks if t.status == 'completed')
    pending   = total - completed
    completion = project.completion()
    risk       = analyze_risk(project)

    # — What is wrong / problems / issues —
    if any(k in msg for k in ['wrong', 'problem', 'issue', 'bad', 'error', 'fail']):
        if total == 0:
            return {
                'reply': (
                    f"◈ ANALYSIS — {project.name}\n\n"
                    "No tasks have been added to this project yet. "
                    "The AI agents cannot monitor what doesn't exist. "
                    "Recommendation: Add tasks to start tracking progress."
                ),
                'type': 'warning'
            }
        if risk['level'] == 'high':
            return {
                'reply': (
                    f"◈ CRITICAL ISSUES DETECTED — {project.name}\n\n"
                    + '\n'.join(f"• {r}" for r in risk['reasons'])
                    + f"\n\nRisk Score: {risk['score']}/100\n"
                    "Recommended Action: Prioritize pending tasks immediately and reassign if needed."
                ),
                'type': 'alert'
            }
        if pending > 0:
            return {
                'reply': (
                    f"◈ STATUS — {project.name}\n\n"
                    f"• {pending} tasks pending out of {total} total\n"
                    f"• Completion: {completion}%\n"
                    f"• Risk Level: {risk['label']}\n\n"
                    "No critical failures detected. Monitor pending tasks closely."
                ),
                'type': 'info'
            }
        return {
            'reply': f"◈ {project.name} appears healthy. All {total} tasks completed. No issues detected.",
            'type': 'success'
        }

    # — Delay / behind schedule —
    elif any(k in msg for k in ['delay', 'late', 'behind', 'slow', 'schedule', 'deadline']):
        if project.deadline:
            days_left = (project.deadline - datetime.utcnow()).days
            if days_left < 0:
                return {
                    'reply': (
                        f"◈ DELAY ANALYSIS — {project.name}\n\n"
                        f"⚠ Project is {abs(days_left)} day(s) OVERDUE.\n"
                        f"• {pending} tasks still pending\n"
                        f"• Only {completion}% complete\n\n"
                        "Causes: Task accumulation, insufficient velocity.\n"
                        "Action: Enter emergency sprint mode — assign all agents to pending tasks."
                    ),
                    'type': 'alert'
                }
            elif days_left < 7:
                return {
                    'reply': (
                        f"◈ TIMELINE ALERT — {project.name}\n\n"
                        f"• Deadline: {days_left} day(s) remaining\n"
                        f"• Current completion: {completion}%\n"
                        f"• Pending tasks: {pending}\n\n"
                        "Required daily rate to meet deadline: "
                        f"{round(pending / max(days_left, 1), 1)} tasks/day.\n"
                        "Recommendation: Increase agent throughput now."
                    ),
                    'type': 'warning'
                }
        if pending > total * 0.5:
            return {
                'reply': (
                    f"◈ PROGRESS CONCERN — {project.name}\n\n"
                    f"More than 50% of tasks are still pending ({pending}/{total}).\n"
                    "This pattern often leads to deadline pressure.\n\n"
                    "Suggestion: Set a deadline and prioritize high-impact tasks first."
                ),
                'type': 'warning'
            }
        return {
            'reply': (
                f"◈ {project.name} is on track. {completion}% complete with {pending} tasks remaining. "
                "No significant delay patterns detected."
            ),
            'type': 'success'
        }

    # — Suggestions / optimize / improve —
    elif any(k in msg for k in ['suggest', 'recommend', 'improve', 'optimize', 'help', 'next', 'tip', 'advice']):
        suggestions = []
        if total == 0:
            suggestions.append("Add tasks to start tracking project progress")
        if pending > 5:
            suggestions.append(f"Break down the {pending} pending tasks into smaller sub-tasks")
        if completion < 30 and total > 0:
            suggestions.append("Focus on completing at least 3 tasks today to gain momentum")
        if not project.deadline:
            suggestions.append("Set a project deadline to enable timeline risk analysis")
        if completed > 0:
            suggestions.append(f"Great — {completed} tasks done! Keep the velocity going")
        if risk['level'] == 'high':
            suggestions.append("Immediately reassign resources to the highest-priority pending tasks")
        if not suggestions:
            suggestions.append("Project is performing well. Maintain current pace.")
            suggestions.append("Consider reviewing completed tasks for quality assurance")

        return {
            'reply': (
                f"◈ AI RECOMMENDATIONS — {project.name}\n\n"
                + '\n'.join(f"  {i+1}. {s}" for i, s in enumerate(suggestions))
                + f"\n\nCurrent efficiency index: {completion}%"
            ),
            'type': 'info'
        }

    # — Status / overview —
    elif any(k in msg for k in ['status', 'overview', 'summary', 'report', 'progress', 'update']):
        high_priority = sum(1 for t in project.tasks if t.priority == 'high' and t.status == 'pending')
        return {
            'reply': (
                f"◈ PROJECT STATUS — {project.name}\n\n"
                f"• Total Tasks:     {total}\n"
                f"• Completed:       {completed}\n"
                f"• Pending:         {pending}\n"
                f"• Completion:      {completion}%\n"
                f"• High Priority:   {high_priority} pending\n"
                f"• Risk Level:      {risk['label']}\n"
                + (f"• Deadline:        {project.deadline.strftime('%b %d, %Y')}\n" if project.deadline else "• Deadline:        Not set\n")
            ),
            'type': 'info'
        }

    # — Tasks —
    elif any(k in msg for k in ['task', 'todo', 'pending', 'complete', 'done']):
        if total == 0:
            return {'reply': f"◈ No tasks found in {project.name}. Add tasks to start AI monitoring.", 'type': 'warning'}
        task_list = project.tasks[-5:]  # last 5
        task_lines = '\n'.join(
            f"  {'✓' if t.status == 'completed' else '○'} {t.name} [{t.priority}]"
            for t in task_list
        )
        return {
            'reply': (
                f"◈ TASK SNAPSHOT — {project.name}\n\n"
                f"{task_lines}\n\n"
                f"Showing last {len(task_list)} of {total} tasks. {completed} completed, {pending} pending."
            ),
            'type': 'info'
        }

    # — Agents —
    elif any(k in msg for k in ['agent', 'ai', 'bot', 'who']):
        return {
            'reply': (
                "◈ ACTIVE AI AGENTS\n\n"
                "• STRATEGIST (Purple)  — Planning & mission design\n"
                "• ANALYST   (Green)    — Data analysis & KPIs\n"
                "• OPTIMIZER (Blue)     — Resource & load balancing\n"
                "• RISK MGR  (Red)      — Threat detection & alerts\n\n"
                f"All 4 agents are currently monitoring: {project.name}"
            ),
            'type': 'info'
        }

    # — Hello / hi / greeting —
    elif any(k in msg for k in ['hello', 'hi', 'hey', 'greet', 'start']):
        return {
            'reply': (
                f"◈ AI COMMAND CENTER ONLINE\n\n"
                f"Monitoring project: {project.name}\n"
                f"Current completion: {completion}%\n"
                f"Risk level: {risk['label']}\n\n"
                "You can ask me:\n"
                "  • \"What is wrong?\"\n"
                "  • \"Why is there a delay?\"\n"
                "  • \"Give me suggestions\"\n"
                "  • \"Show status\"\n"
                "  • \"Explain the tasks\""
            ),
            'type': 'info'
        }

    # — Default / unknown —
    else:
        return {
            'reply': (
                f"◈ INTELLIGENCE QUERY RECEIVED\n\n"
                f"I don't have a specific pattern for that query.\n"
                f"Current project: {project.name} — {completion}% complete\n\n"
                "Try asking:\n"
                "  • \"What is wrong?\"\n"
                "  • \"Why delay?\"\n"
                "  • \"Suggestions?\"\n"
                "  • \"Status report\"\n"
                "  • \"Show tasks\""
            ),
            'type': 'info'
        }
