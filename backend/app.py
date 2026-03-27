"""
AI Command Center — Flask Backend
REST API Server on port 5000
"""
import os, sys
from datetime import datetime
from flask import Flask, request, jsonify, session
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash

# Make sure local imports work
sys.path.insert(0, os.path.dirname(__file__))

from database import db
from models   import User, Project, Task, Progress, AILog
from ai_engine import chat_response, analyze_risk, generate_alerts

# ── App Setup ──────────────────────────────────────────────
app = Flask(__name__)
app.secret_key = 'ai-command-center-secret-2026'
app.config['SQLALCHEMY_DATABASE_URI'] = (
    'sqlite:///' + os.path.join(os.path.dirname(__file__), 'ai_command.db')
)
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
# Cookies work over plain HTTP (proxy strips HTTPS before reaching Flask)
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
app.config['SESSION_COOKIE_SECURE']   = False
app.config['SESSION_COOKIE_HTTPONLY']  = True

CORS(app, supports_credentials=True, origins=['*'])
db.init_app(app)

# Guarantee tables exist on every startup
with app.app_context():
    try:
        db.create_all()
    except Exception as _e:
        print(f'[WARN] db.create_all failed: {_e}')

# ── Root health ────────────────────────────────────────────
@app.route('/')
def home():
    return jsonify({'status': 'backend running', 'version': '2.0'})

# ── Helpers ────────────────────────────────────────────────
def ok(data=None, **kwargs):
    payload = {'success': True}
    if data is not None:
        payload.update(data)
    payload.update(kwargs)
    return jsonify(payload), 200

def err(msg, code=400):
    return jsonify({'success': False, 'error': msg}), code

def current_user():
    uid = session.get('user_id')
    if not uid:
        return None
    return db.session.get(User, uid)

def _log(project_id, message, log_type='info'):
    db.session.add(AILog(project_id=project_id, message=message, log_type=log_type))
    db.session.commit()

def _update_progress(project):
    prog = Progress.query.filter_by(project_id=project.id).first()
    if not prog:
        prog = Progress(project_id=project.id)
        db.session.add(prog)
    prog.completion_percentage = project.completion()
    prog.updated_at = datetime.utcnow()
    db.session.commit()


# ── AUTH ───────────────────────────────────────────────────
@app.route('/api/signup', methods=['POST'])
def signup():
    d = request.get_json() or {}
    name     = (d.get('name') or '').strip()
    email    = (d.get('email') or '').strip().lower()
    password = d.get('password') or ''
    role     = d.get('role', 'individual')

    if not name or not email or not password:
        return err('Name, email and password are required')
    if len(password) < 6:
        return err('Password must be at least 6 characters')
    if User.query.filter_by(email=email).first():
        return err('Email already registered')

    user = User(
        name=name, email=email,
        password=generate_password_hash(password),
        role=role,
        avatar_seed=email.split('@')[0]
    )
    db.session.add(user)
    db.session.commit()

    session['user_id'] = user.id
    return ok({'user': user.to_dict(), 'message': 'Account created successfully'})


@app.route('/api/login', methods=['POST'])
def login():
    d = request.get_json() or {}
    email    = (d.get('email') or '').strip().lower()
    password = d.get('password') or ''

    if not email or not password:
        return err('Email and password are required')

    user = User.query.filter_by(email=email).first()
    if not user or not check_password_hash(user.password, password):
        return err('Invalid email or password', 401)

    session['user_id'] = user.id
    return ok({'user': user.to_dict(), 'message': 'Login successful'})


@app.route('/api/logout', methods=['POST'])
def logout():
    session.clear()
    return ok({'message': 'Logged out'})


@app.route('/api/me', methods=['GET'])
def me():
    user = current_user()
    if not user:
        return err('Not authenticated', 401)
    return ok({'user': user.to_dict()})


# ── PROJECTS ───────────────────────────────────────────────
@app.route('/api/create_project', methods=['POST'])
def create_project():
    user = current_user()
    if not user:
        return err('Not authenticated', 401)

    d = request.get_json() or {}
    name        = (d.get('name') or '').strip()
    description = (d.get('description') or '').strip()
    deadline_str = d.get('deadline')

    if not name:
        return err('Project name is required')

    deadline = None
    if deadline_str:
        try:
            deadline = datetime.fromisoformat(deadline_str.replace('Z', '+00:00'))
        except Exception:
            pass

    project = Project(
        name=name, description=description,
        user_id=user.id, deadline=deadline
    )
    db.session.add(project)
    db.session.commit()

    _log(project.id, f'Project "{name}" created by {user.name}', 'info')
    _update_progress(project)
    return ok({'project': project.to_dict(), 'message': 'Project created'})


@app.route('/api/projects', methods=['GET'])
def get_projects():
    user = current_user()
    if not user:
        return err('Not authenticated', 401)
    projects = Project.query.filter_by(user_id=user.id).order_by(Project.created_at.desc()).all()
    return ok({'projects': [p.to_dict() for p in projects]})


@app.route('/api/projects/<int:pid>', methods=['GET'])
def get_project(pid):
    user = current_user()
    if not user:
        return err('Not authenticated', 401)
    project = db.session.get(Project, pid)
    if not project or project.user_id != user.id:
        return err('Project not found', 404)
    return ok({'project': project.to_dict()})


@app.route('/api/projects/<int:pid>', methods=['DELETE'])
def delete_project(pid):
    user = current_user()
    if not user:
        return err('Not authenticated', 401)
    project = db.session.get(Project, pid)
    if not project or project.user_id != user.id:
        return err('Project not found', 404)
    db.session.delete(project)
    db.session.commit()
    return ok({'message': 'Project deleted'})


# ── TASKS ──────────────────────────────────────────────────
@app.route('/api/add_task', methods=['POST'])
def add_task():
    user = current_user()
    if not user:
        return err('Not authenticated', 401)

    d = request.get_json() or {}
    project_id = d.get('project_id')
    name       = (d.get('name') or '').strip()
    priority   = d.get('priority', 'medium')

    if not project_id or not name:
        return err('project_id and name are required')

    project = db.session.get(Project, project_id)
    if not project or project.user_id != user.id:
        return err('Project not found', 404)

    task = Task(project_id=project_id, name=name, priority=priority)
    db.session.add(task)
    db.session.commit()
    _log(project_id, f'Task added: "{name}"', 'info')
    _update_progress(project)

    return ok({'task': task.to_dict(), 'completion': project.completion()})


@app.route('/api/update_task', methods=['POST'])
def update_task():
    user = current_user()
    if not user:
        return err('Not authenticated', 401)

    d = request.get_json() or {}
    task_id = d.get('task_id')
    status  = d.get('status')

    if not task_id:
        return err('task_id required')

    task = db.session.get(Task, task_id)
    if not task:
        return err('Task not found', 404)

    project = db.session.get(Project, task.project_id)
    if not project or project.user_id != user.id:
        return err('Unauthorized', 403)

    if status in ('pending', 'completed'):
        task.status = status
        if status == 'completed':
            task.completed_at = datetime.utcnow()
        else:
            task.completed_at = None
        db.session.commit()
        _log(task.project_id, f'Task "{task.name}" marked as {status}',
             'success' if status == 'completed' else 'info')
        _update_progress(project)

    return ok({'task': task.to_dict(), 'completion': project.completion()})


@app.route('/api/delete_task/<int:tid>', methods=['DELETE'])
def delete_task(tid):
    user = current_user()
    if not user:
        return err('Not authenticated', 401)
    task = db.session.get(Task, tid)
    if not task:
        return err('Task not found', 404)
    project = db.session.get(Project, task.project_id)
    if not project or project.user_id != user.id:
        return err('Unauthorized', 403)
    db.session.delete(task)
    db.session.commit()
    _update_progress(project)
    return ok({'message': 'Task deleted', 'completion': project.completion()})


@app.route('/api/tasks/<int:pid>', methods=['GET'])
def get_tasks(pid):
    user = current_user()
    if not user:
        return err('Not authenticated', 401)
    project = db.session.get(Project, pid)
    if not project or project.user_id != user.id:
        return err('Project not found', 404)
    return ok({'tasks': [t.to_dict() for t in project.tasks]})


# ── DASHBOARD ──────────────────────────────────────────────
@app.route('/api/get_dashboard', methods=['GET'])
def get_dashboard():
    user = current_user()
    if not user:
        return err('Not authenticated', 401)

    projects = Project.query.filter_by(user_id=user.id).all()

    if not projects:
        return ok({
            'has_data':   False,
            'productivity': 0,
            'message':    'No Active Projects',
            'sub_message':'Upload a project to begin AI monitoring',
            'projects':   [],
            'alerts':     [],
            'total_tasks': 0,
            'completed_tasks': 0,
            'pending_tasks': 0,
        })

    total_tasks     = sum(len(p.tasks) for p in projects)
    completed_tasks = sum(sum(1 for t in p.tasks if t.status == 'completed') for p in projects)
    pending_tasks   = total_tasks - completed_tasks
    avg_completion  = round(sum(p.completion() for p in projects) / len(projects)) if projects else 0

    # Alerts
    alerts = generate_alerts(projects)

    # Recent logs
    all_logs = []
    for p in projects:
        all_logs.extend(p.logs)
    all_logs.sort(key=lambda l: l.timestamp, reverse=True)
    recent_logs = [l.to_dict() for l in all_logs[:10]]

    # Performance trend (per project completion)
    perf_data = [p.completion() for p in sorted(projects, key=lambda x: x.created_at)]

    return ok({
        'has_data':        True,
        'productivity':    avg_completion,
        'total_tasks':     total_tasks,
        'completed_tasks': completed_tasks,
        'pending_tasks':   pending_tasks,
        'projects':        [p.to_dict() for p in projects],
        'alerts':          alerts,
        'recent_logs':     recent_logs,
        'perf_data':       perf_data,
        'project_count':   len(projects),
    })


# ── CHAT ───────────────────────────────────────────────────
@app.route('/api/chat', methods=['POST'])
def chat():
    user = current_user()
    if not user:
        return err('Not authenticated', 401)

    d = request.get_json() or {}
    message    = (d.get('message') or '').strip()
    project_id = d.get('project_id')

    if not message:
        return err('Message is required')

    if not project_id:
        # Pick first active project
        project = Project.query.filter_by(user_id=user.id).first()
        if not project:
            return ok({
                'reply': (
                    "◈ AI COMMAND CENTER\n\n"
                    "No projects found. Create a project first to enable AI monitoring and chat."
                ),
                'type': 'warning'
            })
    else:
        project = db.session.get(Project, project_id)
        if not project or project.user_id != user.id:
            return err('Project not found', 404)

    result = chat_response(message, project)
    _log(project.id, f'[CHAT] Q: {message[:80]} | A: {result["reply"][:80]}', 'info')

    return ok(result)


# ── ALERTS ─────────────────────────────────────────────────
@app.route('/api/alerts', methods=['GET'])
def get_alerts():
    user = current_user()
    if not user:
        return err('Not authenticated', 401)
    projects = Project.query.filter_by(user_id=user.id).all()
    alerts   = generate_alerts(projects)
    return ok({'alerts': alerts, 'count': len(alerts)})


# ── LOGS ───────────────────────────────────────────────────
@app.route('/api/logs/<int:pid>', methods=['GET'])
def get_logs(pid):
    user = current_user()
    if not user:
        return err('Not authenticated', 401)
    project = db.session.get(Project, pid)
    if not project or project.user_id != user.id:
        return err('Project not found', 404)
    logs = AILog.query.filter_by(project_id=pid).order_by(AILog.timestamp.desc()).limit(20).all()
    return ok({'logs': [l.to_dict() for l in logs]})


# ── PROFILE ────────────────────────────────────────────────
@app.route('/api/profile', methods=['GET'])
def get_profile():
    user = current_user()
    if not user:
        return err('Not authenticated', 401)

    projects = Project.query.filter_by(user_id=user.id).all()
    total_tasks     = sum(len(p.tasks) for p in projects)
    completed_tasks = sum(sum(1 for t in p.tasks if t.status == 'completed') for p in projects)

    return ok({
        'user':         user.to_dict(),
        'projects':     [p.to_dict() for p in projects],
        'stats': {
            'project_count':   len(projects),
            'total_tasks':     total_tasks,
            'completed_tasks': completed_tasks,
            'pending_tasks':   total_tasks - completed_tasks,
            'productivity':    round((completed_tasks / total_tasks * 100) if total_tasks else 0),
        }
    })


@app.route('/api/profile', methods=['PUT'])
def update_profile():
    user = current_user()
    if not user:
        return err('Not authenticated', 401)
    d = request.get_json() or {}
    if d.get('name'):
        user.name = d['name'].strip()
    db.session.commit()
    return ok({'user': user.to_dict(), 'message': 'Profile updated'})


# ── HEALTH ─────────────────────────────────────────────────
@app.route('/api/health', methods=['GET'])
def health():
    return ok({'status': 'online', 'version': '2.0', 'timestamp': datetime.utcnow().isoformat()})


# ── Global error handlers — always return JSON, never crash ──
@app.errorhandler(400)
def bad_request(e):
    return jsonify({'success': False, 'error': str(e)}), 400

@app.errorhandler(401)
def unauthorized(e):
    return jsonify({'success': False, 'error': 'Not authenticated'}), 401

@app.errorhandler(403)
def forbidden(e):
    return jsonify({'success': False, 'error': 'Forbidden'}), 403

@app.errorhandler(404)
def not_found(e):
    return jsonify({'success': False, 'error': 'Endpoint not found'}), 404

@app.errorhandler(405)
def method_not_allowed(e):
    return jsonify({'success': False, 'error': 'Method not allowed'}), 405

@app.errorhandler(Exception)
def handle_exception(e):
    db.session.rollback()   # prevent broken transactions
    import traceback
    print('[ERROR]', traceback.format_exc())
    return jsonify({'success': False, 'error': 'Internal server error: ' + str(e)}), 500


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False)
