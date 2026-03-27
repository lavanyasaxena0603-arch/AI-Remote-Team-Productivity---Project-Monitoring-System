"""
AI Command Center — Database Models
SQLAlchemy ORM models for all entities
"""
from datetime import datetime
from database import db


class User(db.Model):
    __tablename__ = 'users'
    id         = db.Column(db.Integer, primary_key=True)
    name       = db.Column(db.String(120), nullable=False)
    email      = db.Column(db.String(200), unique=True, nullable=False)
    password   = db.Column(db.String(256), nullable=False)
    role       = db.Column(db.String(20), default='individual')   # individual | company
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    avatar_seed = db.Column(db.String(60), default='')

    projects   = db.relationship('Project', backref='owner', lazy=True, cascade='all,delete')

    def to_dict(self):
        return {
            'id':         self.id,
            'name':       self.name,
            'email':      self.email,
            'role':       self.role,
            'created_at': self.created_at.isoformat(),
        }


class Project(db.Model):
    __tablename__ = 'projects'
    id          = db.Column(db.Integer, primary_key=True)
    name        = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, default='')
    user_id     = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at  = db.Column(db.DateTime, default=datetime.utcnow)
    deadline    = db.Column(db.DateTime, nullable=True)

    tasks       = db.relationship('Task', backref='project', lazy=True, cascade='all,delete')
    logs        = db.relationship('AILog', backref='project', lazy=True, cascade='all,delete')

    def completion(self):
        if not self.tasks:
            return 0
        done = sum(1 for t in self.tasks if t.status == 'completed')
        return round((done / len(self.tasks)) * 100)

    def to_dict(self):
        total     = len(self.tasks)
        completed = sum(1 for t in self.tasks if t.status == 'completed')
        pending   = total - completed
        return {
            'id':           self.id,
            'name':         self.name,
            'description':  self.description,
            'user_id':      self.user_id,
            'created_at':   self.created_at.isoformat(),
            'deadline':     self.deadline.isoformat() if self.deadline else None,
            'total_tasks':  total,
            'completed_tasks': completed,
            'pending_tasks':   pending,
            'completion':   self.completion(),
        }


class Task(db.Model):
    __tablename__ = 'tasks'
    id         = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(db.Integer, db.ForeignKey('projects.id'), nullable=False)
    name       = db.Column(db.String(300), nullable=False)
    status     = db.Column(db.String(20), default='pending')   # pending | completed
    priority   = db.Column(db.String(20), default='medium')    # low | medium | high
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    completed_at = db.Column(db.DateTime, nullable=True)

    def to_dict(self):
        return {
            'id':           self.id,
            'project_id':   self.project_id,
            'name':         self.name,
            'status':       self.status,
            'priority':     self.priority,
            'created_at':   self.created_at.isoformat(),
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
        }


class Progress(db.Model):
    __tablename__ = 'progress'
    id                    = db.Column(db.Integer, primary_key=True)
    project_id            = db.Column(db.Integer, db.ForeignKey('projects.id'), unique=True)
    completion_percentage = db.Column(db.Float, default=0.0)
    updated_at            = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'project_id':            self.project_id,
            'completion_percentage': self.completion_percentage,
            'updated_at':            self.updated_at.isoformat(),
        }


class AILog(db.Model):
    __tablename__ = 'ai_logs'
    id         = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(db.Integer, db.ForeignKey('projects.id'), nullable=False)
    message    = db.Column(db.Text, nullable=False)
    log_type   = db.Column(db.String(20), default='info')   # info | warning | alert | success
    timestamp  = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id':         self.id,
            'project_id': self.project_id,
            'message':    self.message,
            'log_type':   self.log_type,
            'timestamp':  self.timestamp.isoformat(),
        }
