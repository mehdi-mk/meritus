from flask import Flask, render_template, request, redirect, url_for, flash, jsonify
from datetime import datetime
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, UserMixin, login_user, login_required, logout_user, current_user
from flask_mail import Mail, Message
from flask_migrate import Migrate
from itsdangerous import URLSafeTimedSerializer, SignatureExpired
from werkzeug.security import generate_password_hash, check_password_hash
import os
from dotenv import load_dotenv
from sqlalchemy.sql import func
# from .models import User, JobApplication



load_dotenv()

app = Flask(__name__)

# Configuration
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'a_default_secret_key_for_development_only')
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Email Configuration
app.config['MAIL_SERVER'] = 'localhost'
app.config['MAIL_PORT'] = 8025
app.config['MAIL_USE_TLS'] = False
app.config['MAIL_USE_SSL'] = False
app.config['MAIL_USERNAME'] = 'your-dev-email@example.com'
app.config['MAIL_PASSWORD'] = None
app.config['MAIL_DEFAULT_SENDER'] = 'your-dev-email@example.com'

db = SQLAlchemy(app)
migrate = Migrate(app, db)

login_manager = LoginManager(app)
login_manager.login_view = 'login'
mail = Mail(app)
s = URLSafeTimedSerializer(app.config['SECRET_KEY'])


# Class #1
class User(UserMixin, db.Model):
    __tablename__ = 'user'
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(100), unique=True)
    password = db.Column(db.String(200))
    confirmed = db.Column(db.Boolean, nullable=False, default=False)
    first_name = db.Column(db.String(100))
    last_name = db.Column(db.String(100))
    phone = db.Column(db.String(50))
    country = db.Column(db.String(100))
    city = db.Column(db.String(100))
    bio = db.Column(db.Text)
    # user_type = db.Column(db.String(20), default='job_seeker')  # job_seeker, employer, both
    company_name = db.Column(db.String(150))
    company_description = db.Column(db.Text)
    industry = db.Column(db.String(100))
    experiences = db.relationship('Experience', backref='user', lazy=True, cascade="all, delete-orphan")
    certificates = db.relationship('Certificate', backref='user', lazy=True, cascade="all, delete-orphan")
    degrees = db.relationship('Degree', backref='user', lazy=True, cascade="all, delete-orphan")
    applications = db.relationship('JobApplication', back_populates='applicant', lazy=True,
                                   cascade="all, delete-orphan")
    notifications = db.relationship('Notification', backref='user', lazy=True, cascade="all, delete-orphan")

    def to_dict(self):
        return {
            'id': self.id,
            'email': self.email,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'phone': self.phone,
            'country': self.country,
            'city': self.city,
            'bio': self.bio,
            # 'user_type': self.user_type,
            'company_name': self.company_name,
            'company_description': self.company_description,
            'industry': self.industry
        }


# Class #2
class SkillSource(db.Model):
    __tablename__ = 'skill_sources'
    skill_id = db.Column(db.Integer, db.ForeignKey('skill.id'), primary_key=True)
    source_id = db.Column(db.Integer, primary_key=True)
    source_type = db.Column(db.String(20), primary_key=True)


# Class #3
class Skill(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    type = db.Column(db.String(50), nullable=False)
    title = db.Column(db.String(150), nullable=False)
    status = db.Column(db.String(20), nullable=False, default='Claimed')
    attestation_count = db.Column(db.Integer, default=0)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    is_public = db.Column(db.Boolean, nullable=False, default=True)

    skill_sources = db.relationship('SkillSource', backref='skill', lazy=True, cascade="all, delete-orphan")

    def get_acquired_at_sources(self):
        """Get all sources where this skill was acquired"""
        print("Executing get_acquired_at_sources on class Skill: ", self.skill_sources)
        sources = []

        for skill_source in self.skill_sources:
            source_id = skill_source.source_id
            source_type = skill_source.source_type

            if source_type == 'experience':
                source = Experience.query.get(source_id)
                if source:
                    sources.append({
                        'id': source.id,
                        'type': 'Experience',
                        'title': source.position_title
                    })
            elif source_type == 'certificate':
                source = Certificate.query.get(source_id)
                if source:
                    sources.append({
                        'id': source.id,
                        'type': 'Certificate',
                        'title': source.title
                    })
            elif source_type == 'degree':
                source = Degree.query.get(source_id)
                if source:
                    sources.append({
                        'id': source.id,
                        'type': 'Degree',
                        'title': f"{source.degree} in {source.field_of_study}"
                    })

        return sources

    def to_dict(self):
        print("Executing to_dict on class Skill: ", self.status)
        status_display = self.status
        if self.status == 'Attested' and self.attestation_count > 0:
            status_display = f"Attested by {self.attestation_count} person{'s' if self.attestation_count != 1 else ''}"

        return {
            "id": self.id,
            "type": self.type,
            "title": self.title,
            "status": self.status,
            "status_display": status_display,
            "attestation_count": self.attestation_count,
            "acquired_at_sources": self.get_acquired_at_sources(),
            "is_public": self.is_public,
        }


# Class #4
class Experience(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    position_title = db.Column(db.String(150), nullable=False)
    employer = db.Column(db.String(150), nullable=False)
    country = db.Column(db.String(100))
    city = db.Column(db.String(100))
    start_date = db.Column(db.Date, nullable=False)
    end_date = db.Column(db.Date, nullable=True)
    is_present = db.Column(db.Boolean, default=False)
    employment_type = db.Column(db.String(50))
    employment_arrangement = db.Column(db.String(50))
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    is_public = db.Column(db.Boolean, nullable=False, default=True)

    def to_dict(self):
        print("Executing to_dict on class Experience.")
        return {
            'id': self.id,
            'position_title': self.position_title,
            'employer': self.employer,
            'country': self.country,
            'city': self.city,
            'start_date': self.start_date.strftime('%B %Y'),
            'end_date': self.end_date.strftime('%B %Y') if self.end_date else None,
            'is_present': self.is_present,
            'employment_type': self.employment_type,
            'employment_arrangement': self.employment_arrangement,
            'is_public': self.is_public,
        }


# Class #5
class Certificate(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(150), nullable=False)
    issuer = db.Column(db.String(150), nullable=False)
    issue_date = db.Column(db.Date, nullable=False)
    expiry_date = db.Column(db.Date, nullable=True)
    credential_id = db.Column(db.String(100))
    credential_url = db.Column(db.String(255))
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    is_public = db.Column(db.Boolean, nullable=False, default=True)

    def to_dict(self):
        print("Executing to_dict on class Certificate.")
        return {
            'id': self.id,
            'title': self.title,
            'issuer': self.issuer,
            'issue_date': self.issue_date.strftime('%B %Y'),
            'expiry_date': self.expiry_date.strftime('%B %Y') if self.expiry_date else None,
            'credential_id': self.credential_id,
            'credential_url': self.credential_url,
            'is_public': self.is_public,
        }


# Class #6
class Degree(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    degree = db.Column(db.String(150), nullable=False)
    field_of_study = db.Column(db.String(150), nullable=False)
    school = db.Column(db.String(150), nullable=False)
    country = db.Column(db.String(100))
    city = db.Column(db.String(100))
    start_date = db.Column(db.Date, nullable=False)
    end_date = db.Column(db.Date, nullable=False)
    gpa = db.Column(db.String(10))
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    is_public = db.Column(db.Boolean, nullable=False, default=True)

    def to_dict(self):
        print("Executing to_dict on class Degree.")
        return {
            'id': self.id,
            'degree': self.degree,
            'field_of_study': self.field_of_study,
            'school': self.school,
            'country': self.country,
            'city': self.city,
            'start_date': self.start_date.strftime('%B %Y'),
            'end_date': self.end_date.strftime('%B %Y'),
            'gpa': self.gpa,
            'is_public': self.is_public,
        }


# Class #7
class JobPosting(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=False)
    company_name = db.Column(db.String(150), nullable=False)
    location = db.Column(db.String(200))
    salary_min = db.Column(db.Integer)
    salary_max = db.Column(db.Integer)
    employment_type = db.Column(db.String(50))  # Full-Time, Part-Time, Contract, etc.
    employment_arrangement = db.Column(db.String(50))  # On-Site, Remote, Hybrid
    status = db.Column(db.String(20), nullable=False, default='active')  # active, closed, draft
    application_deadline = db.Column(db.Date)
    posted_by = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    poster = db.relationship('User', backref='job_postings')
    required_skills = db.relationship('JobRequiredSkill', backref='job', cascade="all, delete-orphan")
    required_experiences = db.relationship('JobRequiredExperience', backref='job', cascade="all, delete-orphan")
    required_certificates = db.relationship('JobRequiredCertificate', backref='job', cascade="all, delete-orphan")
    required_degrees = db.relationship('JobRequiredDegree', backref='job', cascade="all, delete-orphan")
    applications = db.relationship('JobApplication', back_populates='job', lazy=True, cascade="all, delete-orphan")

    def to_dict(self):
        print("Executing to_dict on class JobPosting.")
        return {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'company_name': self.company_name,
            'location': self.location,
            'salary_min': self.salary_min,
            'salary_max': self.salary_max,
            'employment_type': self.employment_type,
            'employment_arrangement': self.employment_arrangement,
            'status': self.status,
            'application_deadline': self.application_deadline.strftime(
                '%Y-%m-%d') if self.application_deadline else None,
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M'),
            'required_skills': [skill.to_dict() for skill in self.required_skills],
            'required_experiences': [exp.to_dict() for exp in self.required_experiences],
            'required_certificates': [cert.to_dict() for cert in self.required_certificates],
            'required_degrees': [degree.to_dict() for degree in self.required_degrees]
        }


# Class #8
class JobApplication(db.Model):
    __tablename__ = 'job_application'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    job_id = db.Column(db.Integer, db.ForeignKey('job_posting.id'), nullable=False)
    status = db.Column(db.String(50), default='Submitted', nullable=False)  # e.g., Submitted, Under Review, etc.
    applied_at = db.Column(db.DateTime(timezone=True), server_default=func.now())

    # Relationships to easily access applicant and job details
    applicant = db.relationship('User', back_populates='applications')
    job = db.relationship('JobPosting', back_populates='applications')

    def to_dict(self):
        print("Executing to_dict on class JobApplication.")
        return {
            'id': self.id,
            'user_id': self.user_id,
            'job_id': self.job_id,
            'status': self.status,
            'applied_at': self.applied_at.strftime('%Y-%m-%d %H:%M:%S')
        }


# Class #9
class JobRequiredSkill(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    job_id = db.Column(db.Integer, db.ForeignKey('job_posting.id'), nullable=False)
    skill_title = db.Column(db.String(150), nullable=False)
    skill_type = db.Column(db.String(50), nullable=False)  # Technical, Behavioral, Conceptual
    is_required = db.Column(db.Boolean, default=True)  # Required vs Preferred

    def to_dict(self):
        print("Executing to_dict on class JobRequiredSkill.")
        return {
            'id': self.id,
            'skill_title': self.skill_title,
            'skill_type': self.skill_type,
            'is_required': self.is_required
        }


# Class #10
class JobRequiredExperience(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    job_id = db.Column(db.Integer, db.ForeignKey('job_posting.id'), nullable=False)
    years_required = db.Column(db.Integer, nullable=False)
    industry = db.Column(db.String(100))
    role_title = db.Column(db.String(150))
    is_required = db.Column(db.Boolean, default=True)

    def to_dict(self):
        print("Executing to_dict on class JobRequiredExperience.")
        return {
            'id': self.id,
            'years_required': self.years_required,
            'industry': self.industry,
            'role_title': self.role_title,
            'is_required': self.is_required
        }


# Class #11
class JobRequiredCertificate(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    job_id = db.Column(db.Integer, db.ForeignKey('job_posting.id'), nullable=False)
    certificate_title = db.Column(db.String(150), nullable=False)
    issuer = db.Column(db.String(150))
    is_required = db.Column(db.Boolean, default=True)

    def to_dict(self):
        print("Executing to_dict on class JobRequiredCertificate.")
        return {
            'id': self.id,
            'certificate_title': self.certificate_title,
            'issuer': self.issuer,
            'is_required': self.is_required
        }


# Class #12
class JobRequiredDegree(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    job_id = db.Column(db.Integer, db.ForeignKey('job_posting.id'), nullable=False)
    degree_level = db.Column(db.String(100), nullable=False)  # Bachelor's, Master's, etc.
    field_of_study = db.Column(db.String(150))
    is_required = db.Column(db.Boolean, default=True)

    def to_dict(self):
        print("Executing to_dict on class JobRequiredDegree.")
        return {
            'id': self.id,
            'degree_level': self.degree_level,
            'field_of_study': self.field_of_study,
            'is_required': self.is_required
        }


# Class #13
class Notification(db.Model):
    __tablename__ = 'notifications'
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(100), nullable=False)
    message = db.Column(db.String(255), nullable=False)
    is_read = db.Column(db.Boolean, default=False, nullable=False)
    link = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now())
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)

    def to_dict(self):
        # print("Executing to_dict on class Notification.")
        return {
            'id': self.id,
            'title': self.title,
            'message': self.message,
            'is_read': self.is_read,
            'link': self.link,
            'created_at': self.created_at.strftime('%b %d, %Y, %I:%M %p')
        }


@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

@app.route('/')
def index():
    print("Executing index() on app.")
    return render_template('index.html')

@app.route('/signup', methods=['GET', 'POST'])
def signup():
    print("Executing signup() on app.")
    if request.method == 'POST':
        email = request.form.get('email')
        password = request.form.get('password')
        user = User.query.filter_by(email=email).first()
        if user:
            flash('Email address already exists')
            return redirect(url_for('signup'))
        hashed_password = generate_password_hash(password, method='pbkdf2:sha256')
        new_user = User(email=email, password=hashed_password, confirmed=False)
        try:
            db.session.add(new_user)
            db.session.flush()
            token = s.dumps(email, salt='email-confirm')
            msg = Message('Confirm Email', sender=app.config['MAIL_USERNAME'], recipients=[email])
            link = url_for('confirm_email', token=token, _external=True)
            msg.body = f'Your email confirmation link is {link}'
            mail.send(msg)
            db.session.commit()
            flash('A confirmation email has been sent. Please check your inbox.', 'success')
            return redirect(url_for('login'))
        except Exception as e:
            db.session.rollback()
            print(f"Error sending confirmation email: {e}")
            flash('There was a problem sending the confirmation email. Please try again.', 'danger')
            return redirect(url_for('signup'))
    return render_template('signup.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    print("Executing login() on app.")
    if request.method == 'POST':
        email = request.form.get('email')
        password = request.form.get('password')
        user = User.query.filter_by(email=email).first()
        if not user or not check_password_hash(user.password, password):
            flash('Please check your login details and try again.')
            return redirect(url_for('login'))
        login_user(user)
        return redirect(url_for('dashboard'))
    return render_template('login.html')

@app.route('/confirm_email/<token>')
def confirm_email(token):
    print("Executing confirm_email(token) on app.")
    try:
        email = s.loads(token, salt='email-confirm', max_age=3600)
    except SignatureExpired:
        return '<h1>The confirmation link is expired or invalid!</h1>'
    user = User.query.filter_by(email=email).first_or_404()
    if user.confirmed:
        flash('Account already confirmed. Please login.', 'success')
    else:
        user.confirmed = True
        db.session.commit()
        flash('Email confirmed successfully! You can now login.', 'success')
    return redirect(url_for('login'))

@app.route('/dashboard')
@login_required
def dashboard():
    print("Executing dashboard() on app.")
    return render_template('dashboard.html')

@app.route('/logout')
@login_required
def logout():
    print("Executing logout() on app.")
    logout_user()
    return redirect(url_for('index'))

# --- Helper for parsing dates ---
def parse_date(date_str):
    print("Executing parse_date(date_str) on app.")
    if not date_str:
        return None
    try:
        # Try parsing as YYYY-MM-DD first (from date input)
        return datetime.strptime(date_str, '%Y-%m-%d').date()
    except ValueError:
        try:
            # Fallback to YYYY-MM format (for existing functionality)
            return datetime.strptime(date_str, '%Y-%m').date()
        except ValueError:
            try:
                # Add new fallback for "Month YYYY" format from to_dict methods
                return datetime.strptime(date_str, '%B %Y').date()
            except ValueError:
                return None


# --- API Endpoints for Skills ---
# Endpoint to get user's profile items for skill form
@app.route('/api/user/profile-items', methods=['GET'])
@login_required
def get_user_profile_items():
    print("Executing get_user_profile_items() on app.")
    experiences = Experience.query.filter_by(user_id=current_user.id).all()
    certificates = Certificate.query.filter_by(user_id=current_user.id).all()
    degrees = Degree.query.filter_by(user_id=current_user.id).all()

    items = []

    for exp in experiences:
        items.append({
            'id': exp.id,
            'type': 'experience',
            'title': exp.position_title,
            'display': f"{exp.position_title} (Experience)"
        })

    for cert in certificates:
        items.append({
            'id': cert.id,
            'type': 'certificate',
            'title': cert.title,
            'display': f"{cert.title} (Certificate)"
        })

    for degree in degrees:
        items.append({
            'id': degree.id,
            'type': 'degree',
            'title': f"{degree.degree} in {degree.field_of_study}",
            'display': f"{degree.degree} in {degree.field_of_study} (Degree)"
        })

    return jsonify(items)

@app.route('/api/skills', methods=['POST'])
@login_required
def add_skill():
    print("Executing add_skill() on app.")
    data = request.get_json()

    if data is None:
        return jsonify({"error": "No JSON data received"}), 400

    acquired_at_sources = data.get('acquired_at_sources', [])

    if not acquired_at_sources:
        return jsonify({"error": "At least one source where the skill was acquired is required"}), 400

    try:
        new_skill = Skill(
            type=data['type'],
            title=data['title'],
            status='Claimed',
            user_id=current_user.id,
            is_public=data.get('is_public', True)
        )
        db.session.add(new_skill)
        db.session.flush()  # Get the skill ID

        # Add source relationships using the SkillSource model
        for source in acquired_at_sources:
            skill_source = SkillSource(
                skill_id=new_skill.id,
                source_id=source['id'],
                source_type=source['type']
            )
            db.session.add(skill_source)

        db.session.commit()
        return jsonify(new_skill.to_dict()), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@app.route('/api/skills', methods=['GET'])
@login_required
def get_skills():
    print("Executing get_skills() on app.")
    skills = Skill.query.filter_by(user_id=current_user.id).all()
    return jsonify([s.to_dict() for s in skills])

@app.route('/api/skills/<int:skill_id>', methods=['GET'])
@login_required
def get_skill(skill_id):
    print("Executing get_skill(skill_id) on app.")
    skill = Skill.query.get_or_404(skill_id)
    if skill.user_id != current_user.id:
        return jsonify({"error": "Unauthorized"}), 403
    return jsonify(skill.to_dict())

@app.route('/api/skills/<int:skill_id>', methods=['PUT'])
@login_required
def update_skill(skill_id):
    print("Executing update_skill(skill_id) on app.")
    skill = Skill.query.get_or_404(skill_id)

    if skill.user_id != current_user.id:
        return jsonify({"error": "Unauthorized"}), 403
    if skill.status not in ['Claimed', 'Attested', 'Validated']:
        return jsonify({"error": "Invalid status"}), 400

    data = request.get_json()
    acquired_at_sources = data.get('acquired_at_sources', [])

    skill.type = data.get('type', skill.type)
    skill.title = data.get('title', skill.title)
    skill.status = data.get('status', skill.status)
    skill.is_public = data.get('is_public', skill.is_public)

    try:
        # Remove existing source relationships
        SkillSource.query.filter_by(skill_id=skill.id).delete()

        # Add new source relationships
        for source in acquired_at_sources:
            skill_source = SkillSource(
                skill_id=skill.id,
                source_id=source['id'],
                source_type=source['type']
            )
            db.session.add(skill_source)

        db.session.commit()
        return jsonify(skill.to_dict())

    except Exception as e:
        db.session.rollback()
        print("Error updating skill:", str(e))
        return jsonify({"error": str(e)}), 500

@app.route('/api/skills/<int:skill_id>', methods=['DELETE'])
@login_required
def delete_skill(skill_id):
    print("Executing delete_skill(skill_id) on app.")
    skill = Skill.query.get_or_404(skill_id)
    if skill.user_id != current_user.id:
        return jsonify({"error": "Unauthorized"}), 403
    db.session.delete(skill)
    db.session.commit()
    return jsonify({"message": "Skill deleted successfully"})

# --- API Endpoints for Experience ---
@app.route('/api/experiences', methods=['GET'])
@login_required
def get_experiences():
    print("Executing get_experiences() on app.")
    exps = Experience.query.filter_by(user_id=current_user.id).order_by(Experience.is_present.desc(), Experience.end_date.desc(), Experience.start_date.desc()).all()
    return jsonify([exp.to_dict() for exp in exps])

@app.route('/api/experiences', methods=['POST'])
@login_required
def add_experience():
    print("Executing add_experience() on app.")
    data = request.get_json()
    new_experience = Experience(
        user_id=current_user.id,
        position_title=data['position_title'],
        employer=data['employer'],
        start_date=parse_date(data.get('start_date')),
        end_date=parse_date(data.get('end_date')),
        is_present=bool(data.get('is_present', False)),
        country=data.get('country'), city=data.get('city'),
        employment_type=data.get('employment_type'),
        employment_arrangement=data.get('employment_arrangement'),
        is_public=data.get('is_public', True)
    )
    db.session.add(new_experience)
    db.session.commit()
    return jsonify(new_experience.to_dict()), 201

@app.route('/api/experiences/<int:id>', methods=['GET'])
@login_required
def get_experience(id):
    print("Executing get_experience(id) on app.")
    exp = Experience.query.filter_by(id=id, user_id=current_user.id).first()
    if exp is None:
        return jsonify({'message': 'Experience not found'}), 404

    exp_dict = exp.to_dict()
    exp_dict['start_date'] = exp.start_date.strftime('%Y-%m')
    if exp.end_date:
        exp_dict['end_date'] = exp.end_date.strftime('%Y-%m')

    return jsonify(exp_dict)


@app.route('/api/experiences/<int:id>', methods=['PUT'])
@login_required
def edit_experience(id):
    print("Executing edit_experience(id) on app.")
    exp = Experience.query.get_or_404(id)
    if exp.user_id != current_user.id:
        return jsonify({'error': 'Forbidden'}), 403
    data = request.get_json()
    exp.position_title = data['position_title']
    exp.employer = data['employer']
    exp.start_date = parse_date(data['start_date'])
    exp.end_date = parse_date(data.get('end_date'))
    exp.is_present = bool(data.get('is_present', False))
    exp.country = data.get('country')
    exp.city = data.get('city')
    exp.employment_type = data.get('employment_type')
    exp.employment_arrangement = data.get('employment_arrangement')
    exp.is_public = data.get('is_public', exp.is_public)
    db.session.commit()
    return jsonify(exp.to_dict())

@app.route('/api/experiences/<int:id>', methods=['DELETE'])
@login_required
def delete_experience(id):
    print("Executing delete_experience(id) on app.")
    exp = Experience.query.get_or_404(id)
    if exp.user_id != current_user.id: return jsonify({'error': 'Forbidden'}), 403
    db.session.delete(exp)
    db.session.commit()
    return jsonify({'message': 'Experience deleted successfully'}), 200

# --- API Endpoints for Certificate ---
@app.route('/api/certificates', methods=['GET'])
@login_required
def get_certificates():
    print("Executing get_certificates() on app.")
    certs = Certificate.query.filter_by(user_id=current_user.id).order_by(Certificate.issue_date.desc()).all()
    return jsonify([cert.to_dict() for cert in certs])

@app.route('/api/certificates', methods=['POST'])
@login_required
def add_certificate():
    print("Executing add_certificate() on app.")
    data = request.get_json()
    new_cert = Certificate(
        user_id=current_user.id,
        title=data['title'],
        issuer=data['issuer'],
        issue_date=parse_date(data.get('issue_date')),
        expiry_date=parse_date(data.get('expiry_date')),
        credential_id=data.get('credential_id'),
        credential_url=data.get('credential_url'),
        is_public=data.get('is_public', True)
    )
    db.session.add(new_cert)
    db.session.commit()
    return jsonify(new_cert.to_dict()), 201

@app.route('/api/certificates/<int:id>', methods=['GET'])
@login_required
def get_certificate(id):
    print("Executing get_certificate(id) on app.")
    cert = Certificate.query.filter_by(id=id, user_id=current_user.id).first()
    if cert is None:
        return jsonify({'message': 'Certificate not found'}), 404

    cert_dict = cert.to_dict()
    cert_dict['issue_date'] = cert.issue_date.strftime('%Y-%m')
    if cert.expiry_date:
        cert_dict['expiry_date'] = cert.expiry_date.strftime('%Y-%m')

    return jsonify(cert_dict)


@app.route('/api/certificates/<int:id>', methods=['PUT'])
@login_required
def edit_certificate(id):
    print("Executing edit_certificate(id) on app.")
    cert = Certificate.query.get_or_404(id)
    if cert.user_id != current_user.id:
        return jsonify({'error': 'Forbidden'}), 403
    data = request.get_json()
    cert.title = data['title']
    cert.issuer = data['issuer']
    cert.issue_date = parse_date(data['issue_date'])
    cert.expiry_date = parse_date(data.get('expiry_date'))
    cert.credential_id = data.get('credential_id')
    cert.credential_url = data.get('credential_url')
    cert.is_public = data.get('is_public', cert.is_public)
    db.session.commit()
    return jsonify(cert.to_dict())

@app.route('/api/certificates/<int:id>', methods=['DELETE'])
@login_required
def delete_certificate(id):
    print("Executing delete_certificate(id) on app.")
    cert = Certificate.query.get_or_404(id)
    if cert.user_id != current_user.id: return jsonify({'error': 'Forbidden'}), 403
    db.session.delete(cert)
    db.session.commit()
    return jsonify({'message': 'Certificate deleted successfully'}), 200

# --- API Endpoints for Degree ---
@app.route('/api/degrees', methods=['GET'])
@login_required
def get_degrees():
    print("Executing get_degrees() on app.")

    degrees = Degree.query.filter_by(user_id=current_user.id).order_by(Degree.end_date.desc()).all()
    return jsonify([degree.to_dict() for degree in degrees])

@app.route('/api/degrees', methods=['POST'])
@login_required
def add_degree():
    print("Executing add_degree() on app.")
    data = request.get_json()
    new_degree = Degree(
        user_id=current_user.id,
        degree=data['degree'],
        field_of_study=data['field_of_study'],
        school=data['school'],
        start_date=parse_date(data.get('start_date')),
        end_date=parse_date(data.get('end_date')),
        country=data.get('country'), city=data.get('city'),
        gpa=data.get('gpa'),
        is_public=data.get('is_public', True)
    )
    db.session.add(new_degree)
    db.session.commit()
    return jsonify(new_degree.to_dict()), 201

@app.route('/api/degrees/<int:id>', methods=['GET'])
@login_required
def get_degree(id):
    print("Executing get_degree(id) on app.")
    degree = Degree.query.filter_by(id=id, user_id=current_user.id).first()
    if degree is None:
        return jsonify({'message': 'Degree not found'}), 404

    degree_dict = degree.to_dict()
    degree_dict['start_date'] = degree.start_date.strftime('%Y-%m')
    degree_dict['end_date'] = degree.end_date.strftime('%Y-%m')

    return jsonify(degree_dict)


@app.route('/api/degrees/<int:id>', methods=['PUT'])
@login_required
def edit_degree(id):
    print("Executing edit_degree(id) on app.")
    degree = Degree.query.get_or_404(id)
    if degree.user_id != current_user.id:
        return jsonify({'error': 'Forbidden'}), 403
    data = request.get_json()
    degree.degree = data['degree']
    degree.field_of_study = data['field_of_study']
    degree.school = data['school']
    degree.start_date = parse_date(data['start_date'])
    degree.end_date = parse_date(data['end_date'])
    degree.country = data.get('country')
    degree.city = data.get('city')
    degree.gpa = data.get('gpa')
    degree.is_public = data.get('is_public', degree.is_public)
    db.session.commit()
    return jsonify(degree.to_dict())

@app.route('/api/degrees/<int:id>', methods=['DELETE'])
@login_required
def delete_degree(id):
    print("Executing delete_degree(id) on app.")
    degree = Degree.query.get_or_404(id)
    if degree.user_id != current_user.id: return jsonify({'error': 'Forbidden'}), 403
    db.session.delete(degree)
    db.session.commit()
    return jsonify({'message': 'Degree deleted successfully'}), 200


# --- API Endpoints for Account ---
@app.route('/api/account', methods=['GET'])
@login_required
def get_account():
    print("Executing get_account() on app.")
    return jsonify(current_user.to_dict())

@app.route('/api/account', methods=['PUT'])
@login_required
def update_account():
    data = request.get_json()
    user = User.query.get(current_user.id)
    user.first_name = data.get('first_name', user.first_name)
    user.last_name = data.get('last_name', user.last_name)
    user.phone = data.get('phone', user.phone)
    user.country = data.get('country', user.country)
    user.city = data.get('city', user.city)
    user.bio = data.get('bio', user.bio)
    db.session.commit()
    return jsonify(user.to_dict())


# --- API Endpoints for Job Management ---
@app.route('/api/jobs', methods=['POST'])
@login_required
def create_job():
    print("Executing create_job() on app.")
    data = request.get_json()

    try:
        new_job = JobPosting(
            title=data['title'],
            description=data['description'],
            company_name=data['company_name'],
            location=data.get('location'),
            salary_min=data.get('salary_min'),
            salary_max=data.get('salary_max'),
            employment_type=data.get('employment_type'),
            employment_arrangement=data.get('employment_arrangement'),
            application_deadline=parse_date(data.get('application_deadline')),
            posted_by=current_user.id,
            status='active'
        )

        db.session.add(new_job)
        db.session.flush()  # Get the job ID

        # Add required skills
        for skill in data.get('required_skills', []):
            job_skill = JobRequiredSkill(
                job_id=new_job.id,
                skill_title=skill['title'],
                skill_type=skill['type'],
                is_required=skill.get('is_required', True)
            )
            db.session.add(job_skill)

        # Add required experiences
        for exp in data.get('required_experiences', []):
            job_exp = JobRequiredExperience(
                job_id=new_job.id,
                years_required=exp['years_required'],
                industry=exp.get('industry'),
                role_title=exp.get('role_title'),
                is_required=exp.get('is_required', True)
            )
            db.session.add(job_exp)

        # Add required certificates
        for cert in data.get('required_certificates', []):
            job_cert = JobRequiredCertificate(
                job_id=new_job.id,
                certificate_title=cert['title'],
                issuer=cert.get('issuer'),
                is_required=cert.get('is_required', True)
            )
            db.session.add(job_cert)

        # Add required degrees
        for degree in data.get('required_degrees', []):
            job_degree = JobRequiredDegree(
                job_id=new_job.id,
                degree_level=degree['level'],
                field_of_study=degree.get('field_of_study'),
                is_required=degree.get('is_required', True)
            )
            db.session.add(job_degree)

        db.session.commit()
        return jsonify(new_job.to_dict()), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


@app.route('/api/jobs', methods=['GET'])
@login_required
def get_jobs():
    print("Executing get_jobs() on app.")
    # Get jobs posted by current user (for employers)
    jobs = JobPosting.query.filter_by(posted_by=current_user.id).order_by(JobPosting.created_at.desc()).all()
    return jsonify([job.to_dict() for job in jobs])


@app.route('/api/jobs/browse', methods=['GET'])
@login_required
def browse_jobs():
    print("Executing browse_jobs() on app.")
    try:
        # Query all job postings that are not 'Draft' or 'Archived'
        jobs = JobPosting.query.filter(
            JobPosting.status.notin_(['Draft', 'Archived']),
            JobPosting.posted_by != current_user.id  # This is the new line
        ).order_by(JobPosting.created_at.desc()).all()

        return jsonify([job.to_dict() for job in jobs]), 200

    except Exception as e:
        # Log the exception for debugging
        print(f"Error fetching browse jobs: {e}")
        return jsonify({"error": "Failed to retrieve jobs"}), 500


@app.route('/api/jobs/<int:job_id>', methods=['GET'])
@login_required
def get_job(job_id):
    print("Executing get_job(job_id) on app.")
    job = JobPosting.query.get_or_404(job_id)
    if job.posted_by != current_user.id:
        return jsonify({"error": "Unauthorized"}), 403
    return jsonify(job.to_dict())


@app.route('/api/jobs/<int:job_id>', methods=['PUT'])
@login_required
def update_job(job_id):
    print("Executing update_job(job_id) on app.")
    job = JobPosting.query.get_or_404(job_id)
    if job.posted_by != current_user.id:
        return jsonify({"error": "Unauthorized"}), 403

    data = request.get_json()

    try:
        # Update basic job info
        job.title = data.get('title', job.title)
        job.description = data.get('description', job.description)
        job.company_name = data.get('company_name', job.company_name)
        job.location = data.get('location', job.location)
        job.salary_min = data.get('salary_min', job.salary_min)
        job.salary_max = data.get('salary_max', job.salary_max)
        job.employment_type = data.get('employment_type', job.employment_type)
        job.employment_arrangement = data.get('employment_arrangement', job.employment_arrangement)
        job.application_deadline = parse_date(data.get('application_deadline')) if data.get(
            'application_deadline') else job.application_deadline
        job.updated_at = datetime.utcnow()

        # Remove existing requirements
        JobRequiredSkill.query.filter_by(job_id=job.id).delete()
        JobRequiredExperience.query.filter_by(job_id=job.id).delete()
        JobRequiredCertificate.query.filter_by(job_id=job.id).delete()
        JobRequiredDegree.query.filter_by(job_id=job.id).delete()

        # Add updated requirements (same logic as create_job)
        for skill in data.get('required_skills', []):
            job_skill = JobRequiredSkill(
                job_id=job.id,
                skill_title=skill['title'],
                skill_type=skill['type'],
                is_required=skill.get('is_required', True)
            )
            db.session.add(job_skill)

        for exp in data.get('required_experiences', []):
            job_exp = JobRequiredExperience(
                job_id=job.id,
                years_required=exp['years_required'],
                industry=exp.get('industry'),
                role_title=exp.get('role_title'),
                is_required=exp.get('is_required', True)
            )
            db.session.add(job_exp)

        for cert in data.get('required_certificates', []):
            job_cert = JobRequiredCertificate(
                job_id=job.id,
                certificate_title=cert['title'],
                issuer=cert.get('issuer'),
                is_required=cert.get('is_required', True)
            )
            db.session.add(job_cert)

        for degree in data.get('required_degrees', []):
            job_degree = JobRequiredDegree(
                job_id=job.id,
                degree_level=degree['level'],
                field_of_study=degree.get('field_of_study'),
                is_required=degree.get('is_required', True)
            )
            db.session.add(job_degree)

        db.session.commit()
        return jsonify(job.to_dict())

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


@app.route('/api/jobs/<int:job_id>', methods=['DELETE'])
@login_required
def delete_job(job_id):
    print("Executing delete_job(job_id) on app.")
    job = JobPosting.query.get_or_404(job_id)
    if job.posted_by != current_user.id:
        return jsonify({"error": "Unauthorized"}), 403

    db.session.delete(job)
    db.session.commit()
    return jsonify({"message": "Job deleted successfully"})


@app.route('/api/jobs/<int:job_id>/status', methods=['PUT'])
@login_required
def update_job_status(job_id):
    print("Executing update_job_status(job_id) on app.")
    job = JobPosting.query.get_or_404(job_id)
    if job.posted_by != current_user.id:
        return jsonify({"error": "Unauthorized"}), 403

    data = request.get_json()
    status = data.get('status')

    if status not in ['active', 'closed', 'draft']:
        return jsonify({"error": "Invalid status"}), 400

    job.status = status
    job.updated_at = datetime.utcnow()
    db.session.commit()

    return jsonify({"message": f"Job status updated to {status}"})


@app.route('/api/jobs/<int:job_id>/apply', methods=['POST'])
@login_required
def apply_to_job(job_id):
    print("Executing apply_to_job(job_id) on app.")
    """Handles a user's application to a specific job."""
    job = JobPosting.query.get_or_404(job_id)

    # Prevent the employer from applying to their own job
    if job.posted_by == current_user.id:
        return jsonify({'error': 'You cannot apply to your own job posting.'}), 403

    # Check if the user has already applied
    existing_application = JobApplication.query.filter_by(user_id=current_user.id, job_id=job_id).first()
    if existing_application:
        return jsonify({'error': 'You have already applied to this job.'}), 409

    # Create the new application record
    new_application = JobApplication(user_id=current_user.id, job_id=job_id, status='Submitted')
    db.session.add(new_application)

    # Create a notification for the employer
    employer_notification = Notification(
        user_id=job.posted_by,
        title='New Application Received',
        message=f'You have a new application for your job posting: "{job.title}".',
        link=url_for('dashboard', _external=True)  # Or a more specific link
    )
    db.session.add(employer_notification)

    # Create a confirmation notification for the applicant
    applicant_notification = Notification(
        user_id=current_user.id,
        title='Application Submitted!',
        message=f'Your application for "{job.title}" has been successfully submitted.',
        link=url_for('dashboard', _external=True)  # Or a more specific link
    )
    db.session.add(applicant_notification)

    db.session.commit()

    return jsonify({
        'message': 'Application submitted successfully!',
        'application_id': new_application.id
    }), 201


@app.route('/api/applications', methods=['GET'])
@login_required
def get_received_applications():
    print("Executing get_received_applications() on app.")
    """
    API endpoint for a user to view all applications for their job postings.
    """
    applications = db.session.query(
        JobApplication.id,
        JobApplication.status,
        JobApplication.applied_at,
        JobPosting.title,
        User.first_name,
        User.last_name,
        User.email
    ).join(JobPosting, JobApplication.job_id == JobPosting.id)\
     .join(User, JobApplication.user_id == User.id)\
     .filter(JobPosting.posted_by == current_user.id)\
     .order_by(JobApplication.applied_at.desc())\
     .all()

    # We then format the results into the JSON structure the frontend expects.
    all_applications = [
        {
            'application_id': app.id,
            'job_title': app.title,
            'applicant_name': f"{app.first_name or ''} {app.last_name or ''}".strip(),
            'applicant_email': app.email,
            'status': app.status,
            'applied_at': app.applied_at.isoformat()
        }
        for app in applications
    ]

    return jsonify(all_applications)


@app.route('/api/applications/<int:application_id>/status', methods=['PUT'])
@login_required
def update_application_status(application_id):
    print("Executing update_application_status(application_id) on app.")
    """
    Updates the status of a specific job application.
    Accessible only by the user who posted the job.
    """
    application = JobApplication.query.get_or_404(application_id)
    job = JobPosting.query.get_or_404(application.job_id)

    # Authorization: Ensure the current user is the one who posted the job
    if job.posted_by != current_user.id:
        return jsonify({"error": "Unauthorized"}), 403

    data = request.get_json()
    new_status = data.get('status')

    # Validate that the new status is one of the allowed values
    valid_statuses = ["Submitted", "Under Review", "Rejected", "Offer Sent", "Accepted"]
    if not new_status or new_status not in valid_statuses:
        return jsonify({"error": "Invalid status provided"}), 400

    # Update the application status
    application.status = new_status

    # Create a notification for the applicant about the status change
    notification = Notification(
        user_id=application.user_id,
        title="Application Status Updated",
        message=f'The status for your application to "{job.title}" has changed to: {new_status}.',
        link=url_for('dashboard', _external=True)  # This can be made more specific later
    )
    db.session.add(notification)
    db.session.commit()

    return jsonify({"message": f"Application status updated to {new_status}"})


@app.route('/api/my-applications', methods=['GET'])
@login_required
def get_my_applications():
    """
    API endpoint for a user to retrieve all the applications they have submitted.
    """
    # This query joins the application with the job posting to get job details.
    # It filters to only include applications submitted by the current user.
    applications = db.session.query(
        JobApplication.id,
        JobApplication.status,
        JobApplication.applied_at,
        JobPosting.title.label('job_title'),
        JobPosting.company_name
    ).join(JobPosting, JobApplication.job_id == JobPosting.id)\
     .filter(JobApplication.user_id == current_user.id)\
     .order_by(JobApplication.applied_at.desc())\
     .all()

    # We format the results into the JSON structure the frontend expects.
    user_applications = [
        {
            'id': app.id,
            'job_title': app.job_title,
            'company_name': app.company_name,
            'status': app.status.replace('_', ' ').title(), # Format status for display
            'applied_at': app.applied_at.strftime('%B %d, %Y')
        }
        for app in applications
    ]

    return jsonify(user_applications)


# NOTIFICATIONS

@app.route('/api/notifications', methods=['GET'])
@login_required
def get_notifications():
    """Fetches all notifications for the current user."""
    notifications = Notification.query.filter_by(user_id=current_user.id).order_by(Notification.created_at.desc()).all()
    return jsonify([n.to_dict() for n in notifications])


@app.route('/api/notifications/mark-all-as-read', methods=['POST'])
@login_required
def mark_all_notifications_as_read():
    """Marks all unread notifications for the current user as read."""
    Notification.query.filter_by(user_id=current_user.id, is_read=False).update({'is_read': True})
    db.session.commit()
    return jsonify({'message': 'All notifications marked as read'})


@app.route('/api/notifications/<int:notification_id>/mark-as-read', methods=['POST'])
@login_required
def mark_notification_as_read(notification_id):
    """Marks a single notification as read."""
    notification = Notification.query.get_or_404(notification_id)
    if notification.user_id != current_user.id:
        # Forbidden
        return jsonify({'error': 'Permission denied'}), 403

    notification.is_read = True
    db.session.commit()
    return jsonify({'message': f'Notification {notification_id} marked as read'})


@app.route('/migrate-db')
def migrate_db():
    """Temporary route to create new tables - remove after use"""
    try:
        db.create_all()
        return "Database tables created successfully!"
    except Exception as e:
        return f"Error creating tables: {str(e)}"


if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True)